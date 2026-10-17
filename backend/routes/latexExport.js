const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const Question = require('../models/Question');
const QuestionBank = require('../models/QuestionBank');
const ExamBlueprint = require('../models/ExamBlueprint');
const ExamPaper = require('../models/ExamPaper');
const { LatexGenerator } = require('../utils/latexParser');
const { resolveExportMetadata } = require('../utils/latexExamMetadata');
const { requireBankWrite } = require('../middleware/bankContext');

/**
 * @param {import('express').Router} router
 */
function registerLatexExportRoutes(router) {
  router.post('/export/latex', requireBankWrite, async (req, res) => {
    try {
      const { questionIds, metadata: formMetadata = {}, blueprintId, paperId } = req.body;

      if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({ error: '请选择要导出的题目' });
      }

      const questions = await Question.find({
        _id: { $in: questionIds },
        bankId: req.bankId,
      });

      if (questions.length === 0) {
        return res.status(404).json({ error: '未找到指定的题目' });
      }

      const bank = await QuestionBank.findById(req.bankId).lean();
      let blueprint = null;
      let paper = null;
      if (blueprintId) {
        blueprint = await ExamBlueprint.findOne({ _id: blueprintId, bankId: req.bankId }).lean();
      }
      if (paperId) {
        paper = await ExamPaper.findOne({ _id: paperId, bankId: req.bankId }).lean();
        if (paper?.blueprintId && !blueprint) {
          blueprint = await ExamBlueprint.findById(paper.blueprintId).lean();
        }
      }

      const exportMetadata = resolveExportMetadata({
        bank,
        blueprint,
        paper,
        form: formMetadata,
      });

      const questionsData = questions.map((q) => ({
        type: q.type,
        totalScore: q.totalScore,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        options: q.options,
        solution: q.solution,
        subject: q.subject,
        originalLaTeX: q.originalLaTeX,
      }));

      const generator = new LatexGenerator();
      const exportMode = exportMetadata.exportMode || 'exam';

      let examContent;
      let answerContent = null;
      if (exportMode === 'both') {
        const docs = generator.generateDocuments(questionsData, exportMetadata);
        examContent = docs.exam;
        answerContent = docs.answer;
      } else {
        examContent = generator.generate(questionsData, {
          ...exportMetadata,
          exportMode,
        });
      }

      const collectImagesFromLatex = (latexContent) => {
        const imageFilesMap = {};
        const includegraphicsRegex = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
        let imgMatch;
        const uploadDirLocal = path.join(__dirname, '../uploads');
        let files = [];
        try {
          files = fs.readdirSync(uploadDirLocal);
        } catch (error) {
          console.error('读取 uploads 目录失败:', error);
        }

        while ((imgMatch = includegraphicsRegex.exec(latexContent)) !== null) {
          const originalName = imgMatch[1].trim();
          const nameWithoutExt = originalName.replace(/\.(png|jpg|jpeg|gif|pdf)$/i, '');
          for (const file of files) {
            const fileWithoutExt = file.replace(/\.(png|jpg|jpeg|gif|pdf)$/i, '');
            if (fileWithoutExt.endsWith(`-${nameWithoutExt}`) || fileWithoutExt === nameWithoutExt) {
              imageFilesMap[originalName] = file;
              break;
            }
          }
        }

        const imageTagRegex = /<image\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
        let tagMatch;
        while ((tagMatch = imageTagRegex.exec(latexContent)) !== null) {
          imageFilesMap[tagMatch[1]] = tagMatch[1];
        }
        return imageFilesMap;
      };

      const imageFilesMap = {
        ...collectImagesFromLatex(examContent),
        ...(answerContent ? collectImagesFromLatex(answerContent) : {}),
      };

      const archive = archiver('zip', { zlib: { level: 9 } });
      let baseFilename = formMetadata.filename || exportMetadata.course || `mathexam-${Date.now()}`;
      baseFilename = String(baseFilename).replace(/\.tex$/, '').replace(/\.zip$/, '');
      const zipFilename = `${baseFilename}.zip`;
      const encodedFilename = encodeURIComponent(zipFilename);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
      archive.pipe(res);

      archive.append(examContent, { name: `${baseFilename}.tex` });
      if (answerContent) {
        archive.append(answerContent, { name: `${baseFilename}-answer.tex` });
      }

      const mathexamStyPath = path.join(__dirname, '../../TeX/mathexam.sty');
      if (fs.existsSync(mathexamStyPath)) {
        archive.file(mathexamStyPath, { name: 'mathexam.sty' });
      }

      const uploadDir = path.join(__dirname, '../uploads');
      for (const [originalName, actualFile] of Object.entries(imageFilesMap)) {
        const imagePath = path.join(uploadDir, actualFile);
        if (fs.existsSync(imagePath)) {
          let zipFileName = originalName;
          if (!/\.(png|jpg|jpeg|gif|pdf)$/i.test(originalName)) {
            const ext = actualFile.match(/\.(png|jpg|jpeg|gif|pdf)$/i)?.[1] || 'pdf';
            zipFileName = `${originalName}.${ext}`;
          }
          archive.file(imagePath, { name: zipFileName });
        }
      }

      await archive.finalize();
    } catch (error) {
      console.error('导出 LaTeX 文件失败:', error);
      res.status(500).json({ error: '导出失败: ' + error.message });
    }
  });
}

module.exports = registerLatexExportRoutes;
