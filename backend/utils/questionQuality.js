const { DIFFICULTY_VALUES } = require('../constants/difficulty');

function isEmptyAnswer(val) {
  if (val == null) return true;
  if (typeof val === 'string') return !val.trim();
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') return Object.keys(val).length === 0;
  return false;
}

function missingSolution(originalLaTeX) {
  const tex = String(originalLaTeX || '');
  if (!tex) return true;
  return !/\\begin\s*\{solution\}/i.test(tex) && !/\\score\s*\{/i.test(tex);
}

function assessQuestionQuality(q) {
  const issues = [];
  if (isEmptyAnswer(q.correctAnswer)) issues.push('missing_answer');
  if (!q.difficulty || !DIFFICULTY_VALUES.includes(q.difficulty)) issues.push('missing_difficulty');
  if (!q.knowledgePointIds || !q.knowledgePointIds.length) issues.push('missing_kp');
  if (missingSolution(q.originalLaTeX) && ['解答题', '计算题', '证明题'].includes(q.type)) {
    issues.push('missing_solution');
  }
  return issues;
}

function mergeQualityMongoFilter(baseFilter, qualityFilter) {
  if (!qualityFilter) return baseFilter;
  let extra = null;
  switch (qualityFilter) {
    case 'missing_answer':
      extra = { $or: [{ correctAnswer: null }, { correctAnswer: '' }] };
      break;
    case 'missing_kp':
      extra = { $or: [{ knowledgePointIds: { $exists: false } }, { knowledgePointIds: { $size: 0 } }] };
      break;
    case 'missing_difficulty':
      extra = { difficulty: { $nin: DIFFICULTY_VALUES } };
      break;
    case 'incomplete':
      extra = {
        $or: [
          { correctAnswer: null },
          { correctAnswer: '' },
          { knowledgePointIds: { $exists: false } },
          { knowledgePointIds: { $size: 0 } },
          { difficulty: { $nin: DIFFICULTY_VALUES } },
        ],
      };
      break;
    default:
      break;
  }
  if (!extra) return baseFilter;
  return { $and: [baseFilter, extra] };
}

module.exports = {
  assessQuestionQuality,
  mergeQualityMongoFilter,
};
