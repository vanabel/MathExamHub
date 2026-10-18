const Question = require('../models/Question');
const ExamBlueprint = require('../models/ExamBlueprint');
const { scoreMode } = require('../utils/scoreMode');

function buildSectionsFromQuestions(questions) {
  if (!questions.length) {
    return { sections: [], totalScore: 0, subject: '' };
  }

  const sections = [];
  let current = null;

  for (const q of questions) {
    const partKey = String(q.latexPartTitle || '').trim();
    const type = q.type || '解答题';
    const groupKey = partKey ? `part:${partKey}` : `type:${type}`;

    if (!current || current.groupKey !== groupKey) {
      current = {
        groupKey,
        type,
        partTitle: partKey,
        scores: [],
        count: 0,
      };
      sections.push(current);
    }
    current.count += 1;
    current.scores.push(Number(q.totalScore) || 0);
  }

  const mapped = sections.map((s) => {
    const scoreEach = scoreMode(s.scores) || 2;
    return {
      type: s.type,
      count: s.count,
      scoreEach,
      difficultyMix: { 易: 0, 中: 0, 难: 0 },
      knowledgePointIds: [],
    };
  });

  const totalScore = mapped.reduce((sum, sec) => sum + sec.count * sec.scoreEach, 0);
  const subjects = questions.map((q) => String(q.subject || '').trim()).filter(Boolean);

  const subjectCounts = new Map();
  for (const s of subjects) {
    subjectCounts.set(s, (subjectCounts.get(s) || 0) + 1);
  }
  let bestSubject = '';
  let bestSubjectCount = -1;
  for (const [s, c] of subjectCounts) {
    if (c > bestSubjectCount) {
      bestSubjectCount = c;
      bestSubject = s;
    }
  }

  return {
    sections: mapped,
    totalScore,
    subject: bestSubject || subjects[0] || '',
  };
}

async function loadBankQuestionsOrdered(bankId) {
  return Question.find({ bankId })
    .sort({ createdAt: 1, _id: 1 })
    .select('type totalScore subject latexPartTitle createdAt')
    .lean();
}

async function createBlueprintFromImportedPaper(bankId, username, options = {}) {
  const questions = await loadBankQuestionsOrdered(bankId);
  if (!questions.length) {
    const err = new Error('题库暂无题目，无法生成蓝图');
    err.status = 400;
    throw err;
  }

  const { sections, totalScore, subject } = buildSectionsFromQuestions(questions);
  const title = (options.title || '从导入试卷生成').trim();
  const asTemplate = Boolean(options.asTemplate);

  const doc = new ExamBlueprint({
    title,
    subject,
    totalScore,
    randomSeed: options.randomSeed ?? 42,
    allowRelaxation: options.allowRelaxation !== false,
    maxVariantOverlapPct: options.maxVariantOverlapPct ?? 0.2,
    sections,
    isTemplate: asTemplate,
    sharedWithBank: asTemplate ? Boolean(options.sharedWithBank) : false,
    bankId,
    createdBy: username,
  });
  await doc.save();
  return doc;
}

async function scoreStatsByType(bankId) {
  const questions = await Question.find({ bankId }).select('type totalScore').lean();
  const byType = {};
  for (const q of questions) {
    const type = q.type || '解答题';
    if (!byType[type]) byType[type] = [];
    byType[type].push(Number(q.totalScore) || 0);
  }
  const result = {};
  for (const [type, scores] of Object.entries(byType)) {
    const mode = scoreMode(scores);
    const distinct = [...new Set(scores.filter((s) => s > 0))].sort((a, b) => a - b);
    result[type] = {
      mode,
      count: scores.length,
      distinctScores: distinct.slice(0, 12),
    };
  }
  return { byType: result };
}

module.exports = {
  buildSectionsFromQuestions,
  createBlueprintFromImportedPaper,
  scoreStatsByType,
};
