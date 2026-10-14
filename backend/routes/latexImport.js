const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { LatexParser } = require('../utils/latexParser');
const Question = require('../models/Question');
const { detectDuplicatesInBatch } = require('../utils/duplicateDetector');
const { computeContentHash } = require('../utils/contentHash');
const { validateQuestionBatch } = require('../utils/questionValidator');
const { normalizeDifficulty } = require('../constants/difficulty');
const { requireBankWrite } = require('../middleware/bankContext');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.tex')) {
      cb(null, true);
    } else if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      /\.(png|jpg|jpeg|gif|pdf)$/i.test(file.originalname)
    ) {
      cb(null, true);
    } else {
      cb(new Error('只支持 .tex 与图片/PDF'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

function generateFilePrefix(texFileName, fileContent) {
  const courseMatch = fileContent.match(/\\course\{([^}]+)\}/);
  const course = courseMatch ? courseMatch[1].trim() : '解析几何';
  const yearMatch = fileContent.match(/\\grade\{([^}]+)\}/);
  const year = yearMatch ? yearMatch[1].trim() : '';
  const finalMiddleMatch = fileContent.match(/\\finalmiddle\{([^}]+)\}/);
  const finalMiddle = finalMiddleMatch ? finalMiddleMatch[1].trim() : '';
  const parts = [course];
  if (year) parts.push(year);
  if (finalMiddle) {
    const typeMap = { 期末: 'final', 期中: 'midterm', Final: 'final', Middle: 'midterm', Midterm: 'midterm' };
    parts.push(typeMap[finalMiddle] || finalMiddle.toLowerCase());
  }
  return parts.join('-');
}

function processUploadedImages(imageFiles, filePrefix) {
  const imageMap = {};
  for (const imgFile of imageFiles) {
    const extMatch = imgFile.originalname.match(/\.(png|jpg|jpeg|gif|pdf)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
    const originalName = imgFile.originalname.replace(/\.(png|jpg|jpeg|gif|pdf)$/i, '');
    const newFileName = `${filePrefix}-${originalName}.${ext}`;
    fs.renameSync(imgFile.path, path.join(uploadDir, newFileName));
    imageMap[originalName] = newFileName;
    imageMap[imgFile.originalname] = newFileName;
  }
  return imageMap;
}

async function parseTexUpload(req) {
  if (!req.files?.file?.length) {
    const err = new Error('请上传 .tex 文件');
    err.status = 400;
    throw err;
  }
  const texFile = req.files.file[0];
  const imageFiles = req.files.images || [];
  const fileContent = fs.readFileSync(texFile.path, 'utf-8');
  const texFileName = texFile.originalname.replace(/\.tex$/i, '');
  const filePrefix = generateFilePrefix(texFileName, fileContent);
  const imageMap = processUploadedImages(imageFiles, filePrefix);
  const parser = new LatexParser();
  const questions = parser.parse(fileContent, { imageMap, filePrefix });
  fs.unlinkSync(texFile.path);
  return { questions, filePrefix, imageMap, sourceFileName: texFile.originalname };
}

/**
 * @param {import('express').Router} router
 */
function registerLatexImportRoutes(router) {
  router.post(
    '/import/latex/preview',
    requireBankWrite,
    upload.fields([{ name: 'file', maxCount: 1 }, { name: 'images', maxCount: 20 }]),
    async (req, res) => {
      try {
        const { questions, filePrefix, imageMap, sourceFileName } = await parseTexUpload(req);
        const validation = validateQuestionBatch(questions);
        const duplicateThreshold = parseFloat(req.body.duplicateThreshold) || 0.85;
        let duplicateWarnings = [];
        if (req.body.checkDuplicates !== 'false' && validation.questions.length) {
          const dup = await detectDuplicatesInBatch(
            validation.questions,
            duplicateThreshold,
            req.bankId,
          );
          duplicateWarnings = dup.duplicates.map((entry) => ({
            question: entry.question,
            duplicates: entry.duplicates,
          }));
        }
        res.json({
          success: validation.summary.errorCount === 0,
          filePrefix,
          imageMap,
          sourceFileName,
          questions: validation.questions,
          errors: validation.errors,
          warnings: validation.warnings,
          summary: validation.summary,
          duplicates: duplicateWarnings,
          duplicateCount: duplicateWarnings.length,
        });
      } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message || '预览失败' });
      }
    },
  );

  router.post(
    '/import/latex',
    requireBankWrite,
    upload.fields([{ name: 'file', maxCount: 1 }, { name: 'images', maxCount: 20 }]),
    async (req, res) => {
      try {
        const { questions, sourceFileName } = await parseTexUpload(req);
        const validation = validateQuestionBatch(questions);
        if (validation.summary.errorCount > 0) {
          return res.status(400).json({
            error: '解析结果未通过校验',
            errors: validation.errors,
            warnings: validation.warnings,
            summary: validation.summary,
          });
        }

        const saved = [];
        const skipped = [];
        const failed = [];
        const skipDuplicates = req.body.skipDuplicates !== 'false';
        const duplicateThreshold = parseFloat(req.body.duplicateThreshold) || 0.85;
        const dupResult = await detectDuplicatesInBatch(
          validation.questions,
          duplicateThreshold,
          req.bankId,
        );

        for (const q of validation.questions) {
          const dupEntry = dupResult.duplicates.find((d) => d.question === q);
          const hash = computeContentHash(q);
          let skipReason = null;
          if (skipDuplicates && hash) {
            const existing = await Question.findOne({ bankId: req.bankId, contentHash: hash })
              .select('_id')
              .lean();
            if (existing) skipReason = 'exact_hash';
          }
          if (!skipReason && skipDuplicates && dupEntry?.duplicates?.length) {
            skipReason = dupEntry.duplicates[0].matchType === 'exact_hash'
              ? 'exact_hash'
              : 'similar';
          }
          if (skipReason) {
            skipped.push({ question: q, reason: skipReason });
            continue;
          }
          try {
            const doc = new Question({
              bankId: req.bankId,
              questionText: q.questionText,
              type: q.type,
              totalScore: q.totalScore || 0,
              correctAnswer: q.correctAnswer || q.solution || '',
              difficulty: normalizeDifficulty(q.difficulty, '中'),
              subject: q.subject || '解析几何',
              createdBy: req.user.username,
              options: q.options,
              originalLaTeX: q.originalLaTeX,
              source: { kind: 'latex-import', fileName: sourceFileName },
            });
            await doc.save();
            saved.push(doc);
          } catch (err) {
            failed.push({ question: q, error: err.message });
          }
        }

        res.json({
          success: true,
          imported: saved.length,
          skipped: skipped.length,
          failed: failed.length,
          questions: saved,
          skippedItems: skipped,
          failures: failed,
          warnings: validation.warnings,
        });
      } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message || '导入失败' });
      }
    },
  );
}

module.exports = registerLatexImportRoutes;
