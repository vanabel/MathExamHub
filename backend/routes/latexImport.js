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
const QuestionBank = require('../models/QuestionBank');
const KnowledgePoint = require('../models/KnowledgePoint');
const platformSettingsService = require('../services/platformSettingsService');
const { suggestQuestionMetadata, buildQuestionMetadataInput } = require('../services/llmAssistService');
const { settingsForLlmAssist } = require('../services/llmProviderResolve');
const { extractImagesFromStem } = require('../utils/questionImages');
const latexImportLlmHelper = require('../services/latexImportLlmHelper');
const {
  attachLlmSuggestions: defaultAttachLlmSuggestions,
  parseMetadataOverrides,
} = latexImportLlmHelper;
const {
  fillBankLatexMetadata,
  metadataForExportForm,
} = require('../utils/latexExamMetadata');

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
  return {
    questions,
    filePrefix,
    imageMap,
    sourceFileName: texFile.originalname,
    documentMetadata: parser.documentMetadata,
  };
}

/**
 * @param {import('express').Router} router
 */
function registerLatexImportRoutes(router, opts = {}) {
  const requireBankWriteMw = opts.requireBankWrite || requireBankWrite;
  const attachLlmSuggestions = opts.attachLlmSuggestions || defaultAttachLlmSuggestions;

  router.post(
    '/import/latex/preview',
    requireBankWriteMw,
    upload.fields([{ name: 'file', maxCount: 1 }, { name: 'images', maxCount: 20 }]),
    async (req, res) => {
      try {
        const {
          questions,
          filePrefix,
          imageMap,
          sourceFileName,
          documentMetadata,
        } = await parseTexUpload(req);
        const validation = validateQuestionBatch(questions);
        const bank = await QuestionBank.findById(req.bankId).lean();
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
        let llmSuggestions = [];
        let knowledgePoints = [];
        let llmPreviewTruncated = false;
        let llmPreviewCap = null;
        let llmPreviewProcessed = null;
        if (req.body.llmPreview === 'true') {
          const llm = await attachLlmSuggestions(validation.questions, req.bankId);
          llmSuggestions = llm.llmSuggestions;
          knowledgePoints = (llm.knowledgePoints || []).map((k) => ({
            _id: k._id,
            path: k.path || k.name,
          }));
          llmPreviewTruncated = Boolean(llm.llmPreviewTruncated);
          llmPreviewCap = llm.llmPreviewCap;
          llmPreviewProcessed = llm.llmPreviewProcessed;
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
          parsedDocumentMetadata: documentMetadata,
          bankLatexMetadata: bank?.latexExamMetadata || {},
          exportDefaults: metadataForExportForm(bank, documentMetadata),
          llmSuggestions,
          knowledgePoints,
          llmPreviewTruncated,
          llmPreviewCap,
          llmPreviewProcessed,
        });
      } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message || '预览失败' });
      }
    },
  );

  router.post(
    '/import/latex',
    requireBankWriteMw,
    upload.fields([{ name: 'file', maxCount: 1 }, { name: 'images', maxCount: 20 }]),
    async (req, res) => {
      try {
        const { questions, sourceFileName, documentMetadata } = await parseTexUpload(req);
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
        // 默认跳过重复；含回收站内软删除题（仍占 contentHash / 相似匹配）
        const skipDuplicates = req.body.skipDuplicates !== 'false';
        const duplicateThreshold = parseFloat(req.body.duplicateThreshold) || 0.85;
        const dupResult = await detectDuplicatesInBatch(
          validation.questions,
          duplicateThreshold,
          req.bankId,
        );

        let bankMetadataUpdated = false;
        if (req.body.applyBankMetadata !== 'false') {
          const bank = await QuestionBank.findById(req.bankId);
          if (bank) {
            bankMetadataUpdated = fillBankLatexMetadata(bank, documentMetadata);
            if (bankMetadataUpdated) {
              await bank.save();
            }
          }
        }

        const platformSettings = await platformSettingsService.getPlatformSettings();
        const overrides = parseMetadataOverrides(req.body);
        const applyLlmAssist = !overrides
          && platformSettings.llmAssistEnabled
          && req.body.llmAssist !== 'false';
        const kpNodes = applyLlmAssist
          ? await KnowledgePoint.find({ bankId: req.bankId }).select('_id path name subject').lean()
          : [];
        let llmAssistApplied = 0;

        for (let qi = 0; qi < validation.questions.length; qi += 1) {
          const q = validation.questions[qi];
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
            let difficulty = normalizeDifficulty(q.difficulty, '中');
            let knowledgePointIds = [];
            const ov = overrides?.[qi];
            if (ov) {
              if (ov.difficulty) difficulty = normalizeDifficulty(ov.difficulty, difficulty);
              if (Array.isArray(ov.knowledgePointIds)) knowledgePointIds = ov.knowledgePointIds;
              llmAssistApplied += 1;
            } else if (applyLlmAssist) {
              const suggestion = await suggestQuestionMetadata(
                buildQuestionMetadataInput(
                  { ...q, subject: q.subject || '解析几何' },
                  kpNodes,
                ),
                settingsForLlmAssist(platformSettings),
              );
              if (suggestion) {
                difficulty = suggestion.difficulty;
                knowledgePointIds = suggestion.knowledgePointIds || [];
                llmAssistApplied += 1;
              }
            }
            const stemPack = extractImagesFromStem(q.questionText, q.images || []);
            const doc = new Question({
              bankId: req.bankId,
              questionText: stemPack.stem,
              images: stemPack.images,
              type: q.type,
              totalScore: q.totalScore || 0,
              correctAnswer: q.correctAnswer ?? '',
              solution: q.solution?.trim() || undefined,
              difficulty,
              subject: q.subject || '解析几何',
              createdBy: req.user.username,
              options: q.options,
              originalLaTeX: q.originalLaTeX,
              knowledgePointIds,
              source: { kind: 'latex-import', fileName: sourceFileName },
            });
            await doc.save();
            saved.push(doc);
          } catch (err) {
            failed.push({ question: q, error: err.message });
          }
        }

        const bank = await QuestionBank.findById(req.bankId).lean();
        res.json({
          success: true,
          imported: saved.length,
          skipped: skipped.length,
          failed: failed.length,
          questions: saved,
          skippedItems: skipped,
          failures: failed,
          warnings: validation.warnings,
          bankMetadataUpdated,
          exportDefaults: metadataForExportForm(bank, documentMetadata),
          llmAssistApplied,
        });
      } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message || '导入失败' });
      }
    },
  );
}

module.exports = registerLatexImportRoutes;
