const fs = require('fs');
const path = require('path');
const { LatexParser } = require('../utils/latexParser');
const { validateQuestionBatch } = require('../utils/questionValidator');
const { normalizeDifficulty } = require('../constants/difficulty');
const { computeContentHash } = require('../utils/contentHash');
const Question = require('../models/Question');
const QuestionBank = require('../models/QuestionBank');
const KnowledgePoint = require('../models/KnowledgePoint');
const ExamBlueprint = require('../models/ExamBlueprint');
const User = require('../models/User');
const bankService = require('./bankService');
const { fillBankLatexMetadata } = require('../utils/latexExamMetadata');
const { activeQuestionFilter } = require('../constants/questionLifecycle');

const SAMPLE_TEX_PATH = path.join(__dirname, '../test/fixtures/package-examples.tex');
const RICH_BANK_PATH = path.join(__dirname, '../test/fixtures/onboarding-rich-bank.json');

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

function loadRichBankFixture() {
  if (!fs.existsSync(RICH_BANK_PATH)) {
    const err = new Error('Rich onboarding fixture missing');
    err.status = 500;
    throw err;
  }
  return JSON.parse(fs.readFileSync(RICH_BANK_PATH, 'utf8'));
}

function onboardingPayload(user) {
  return {
    sampleImported: Boolean(user?.onboardingSampleImported),
    tourCompleted: Boolean(user?.onboardingTourCompleted),
    tourStep: user?.onboardingTourStep ?? 0,
  };
}

async function ensureKnowledgePointTree(bankId, subject, defs) {
  const idByKey = new Map();
  const pathByKey = new Map();
  const roots = defs.filter((d) => !d.parent);
  const children = defs.filter((d) => d.parent);
  for (const def of roots) {
    const pathStr = `/${def.name}`;
    let doc = await KnowledgePoint.findOne({ bankId, path: pathStr });
    if (!doc) {
      doc = await KnowledgePoint.create({
        bankId,
        name: def.name,
        subject,
        parentId: null,
        path: pathStr,
        order: 0,
      });
    }
    idByKey.set(def.key, doc._id);
    pathByKey.set(def.key, pathStr);
  }
  for (const def of children) {
    const parentPath = pathByKey.get(def.parent);
    const pathStr = `${parentPath}/${def.name}`;
    let doc = await KnowledgePoint.findOne({ bankId, path: pathStr });
    if (!doc) {
      doc = await KnowledgePoint.create({
        bankId,
        name: def.name,
        subject,
        parentId: idByKey.get(def.parent),
        path: pathStr,
        order: 0,
      });
    }
    idByKey.set(def.key, doc._id);
    pathByKey.set(def.key, pathStr);
  }
  return idByKey;
}

async function ensureStarterBlueprint(bankId, username, spec) {
  const existing = await ExamBlueprint.findOne({
    bankId,
    title: spec.title,
    isTemplate: true,
  });
  if (existing) return existing;

  const doc = new ExamBlueprint({
    title: spec.title,
    subject: spec.subject,
    totalScore: spec.totalScore,
    randomSeed: spec.randomSeed,
    allowRelaxation: spec.allowRelaxation,
    maxVariantOverlapPct: spec.maxVariantOverlapPct,
    sections: spec.sections,
    isTemplate: spec.isTemplate,
    sharedWithBank: spec.sharedWithBank,
    bankId,
    createdBy: username,
  });
  await doc.save();
  return doc;
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

  const fixture = loadRichBankFixture();
  const subject = fixture.subject || '高等代数';
  const kpMap = await ensureKnowledgePointTree(
    targetBankId,
    subject,
    fixture.knowledgePoints || [],
  );

  const bank = await QuestionBank.findById(targetBankId);
  if (!bank) {
    const err = new Error('题库不存在');
    err.status = 404;
    throw err;
  }

  const { documentMetadata } = parseSampleTexQuestions();
  let bankMetadataUpdated = false;
  if (fillBankLatexMetadata(bank, documentMetadata)) {
    await bank.save();
    bankMetadataUpdated = true;
  }

  let imported = 0;
  let skipped = 0;
  for (const q of fixture.questions || []) {
    const payload = {
      questionText: q.questionText,
      type: q.type,
      totalScore: q.totalScore || 0,
      correctAnswer: q.correctAnswer || '',
      difficulty: normalizeDifficulty(q.difficulty, '中'),
      subject: q.subject || subject,
      options: q.options,
    };
    const hash = computeContentHash(payload);
    if (hash) {
      const existing = await Question.findOne({ bankId: targetBankId, contentHash: hash })
        .select('_id')
        .lean();
      if (existing) {
        skipped += 1;
        continue;
      }
    }
    const knowledgePointIds = (q.knowledgePointKeys || [])
      .map((k) => kpMap.get(k))
      .filter(Boolean);
    const doc = new Question({
      bankId: targetBankId,
      questionText: payload.questionText,
      type: payload.type,
      totalScore: payload.totalScore,
      correctAnswer: payload.correctAnswer,
      difficulty: payload.difficulty,
      subject: payload.subject,
      createdBy: fresh.username,
      options: payload.options,
      knowledgePointIds,
      source: { kind: 'onboarding-sample', fileName: fixture.sourceFileName || 'onboarding-rich-bank.json' },
    });
    await doc.save();
    imported += 1;
  }

  const starter = await ensureStarterBlueprint(
    targetBankId,
    fresh.username,
    fixture.starterBlueprint,
  );

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
    starterBlueprintId: starter._id,
    knowledgePointsCreated: kpMap.size,
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
  RICH_BANK_PATH,
  parseSampleTexQuestions,
  loadRichBankFixture,
  onboardingPayload,
  importSampleBankForUser,
  updateTourProgress,
};
