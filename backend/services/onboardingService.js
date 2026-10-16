const fs = require('fs');
const path = require('path');
const { LatexParser } = require('../utils/latexParser');
const { validateQuestionBatch } = require('../utils/questionValidator');
const { normalizeDifficulty } = require('../constants/difficulty');
const { computeContentHash } = require('../utils/contentHash');
const Question = require('../models/Question');
const QuestionBank = require('../models/QuestionBank');
const User = require('../models/User');
const bankService = require('./bankService');
const { fillBankLatexMetadata } = require('../utils/latexExamMetadata');
const { activeQuestionFilter } = require('../constants/questionLifecycle');

const SAMPLE_TEX_PATH = path.join(__dirname, '../test/fixtures/package-examples.tex');

function readSampleTexContent() {
  if (!fs.existsSync(SAMPLE_TEX_PATH)) {
    const err = new Error('示例题库文件缺失');
    err.status = 500;
    throw err;
  }
  return fs.readFileSync(SAMPLE_TEX_PATH, 'utf-8');
}

function parseSampleTexQuestions() {
  const fileContent = readSampleTexContent();
  const parser = new LatexParser();
  const questions = parser.parse(fileContent, { imageMap: {}, filePrefix: 'package-examples' });
  return { questions, documentMetadata: parser.documentMetadata, sourceFileName: 'package-examples.tex' };
}

function onboardingPayload(user) {
  return {
    sampleImported: Boolean(user?.onboardingSampleImported),
    tourCompleted: Boolean(user?.onboardingTourCompleted),
    tourStep: user?.onboardingTourStep ?? 0,
  };
}

async function importSampleBankForUser(user, bankId) {
  const fresh = await User.findById(user._id);
  if (!fresh) {
    const err = new Error('用户不存在');
    err.status = 404;
    throw err;
  }
  if (fresh.onboardingSampleImported) {
    return { alreadyImported: true, imported: 0, skipped: 0 };
  }

  let targetBankId = bankId;
  if (!targetBankId) {
    const bank = await bankService.createPersonalBank(fresh);
    targetBankId = bank._id;
  }

  const { questions, documentMetadata, sourceFileName } = parseSampleTexQuestions();
  const validation = validateQuestionBatch(questions);
  if (validation.summary.errorCount > 0) {
    const err = new Error('示例文件校验失败');
    err.status = 500;
    err.details = validation.errors;
    throw err;
  }

  const bank = await QuestionBank.findById(targetBankId);
  if (!bank) {
    const err = new Error('题库不存在');
    err.status = 404;
    throw err;
  }

  let bankMetadataUpdated = false;
  if (fillBankLatexMetadata(bank, documentMetadata)) {
    await bank.save();
    bankMetadataUpdated = true;
  }

  let imported = 0;
  let skipped = 0;
  for (const q of validation.questions) {
    const hash = computeContentHash(q);
    if (hash) {
      const existing = await Question.findOne({ bankId: targetBankId, contentHash: hash })
        .select('_id')
        .lean();
      if (existing) {
        skipped += 1;
        continue;
      }
    }
    const doc = new Question({
      bankId: targetBankId,
      questionText: q.questionText,
      type: q.type,
      totalScore: q.totalScore || 0,
      correctAnswer: q.correctAnswer || q.solution || '',
      difficulty: normalizeDifficulty(q.difficulty, '中'),
      subject: q.subject || '解析几何',
      createdBy: fresh.username,
      options: q.options,
      originalLaTeX: q.originalLaTeX,
      knowledgePointIds: [],
      source: { kind: 'onboarding-sample', fileName: sourceFileName },
    });
    await doc.save();
    imported += 1;
  }

  fresh.onboardingSampleImported = true;
  fresh.updatedTime = new Date();
  await fresh.save();

  const totalInBank = await Question.countDocuments(activeQuestionFilter({ bankId: targetBankId }));

  return {
    alreadyImported: false,
    imported,
    skipped,
    bankId: targetBankId,
    bankMetadataUpdated,
    totalQuestionsInBank: totalInBank,
  };
}

async function updateTourProgress(userId, { tourStep, tourCompleted }) {
  const fresh = await User.findById(userId);
  if (!fresh) {
    const err = new Error('用户不存在');
    err.status = 404;
    throw err;
  }
  if (tourStep != null) {
    fresh.onboardingTourStep = Math.max(0, Number(tourStep) || 0);
  }
  if (tourCompleted === true) {
    fresh.onboardingTourCompleted = true;
  }
  fresh.updatedTime = new Date();
  await fresh.save();
  return onboardingPayload(fresh);
}

module.exports = {
  SAMPLE_TEX_PATH,
  parseSampleTexQuestions,
  onboardingPayload,
  importSampleBankForUser,
  updateTourProgress,
};
