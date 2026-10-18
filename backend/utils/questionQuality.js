const { DIFFICULTY_VALUES } = require('../constants/difficulty');
const { stepScoreMismatch } = require('./stepScoreUtils');
const { danglingRefsForQuestion } = require('./latexRefLabels');
const {
  isEmptyAnswer,
  effectiveCorrectAnswer,
  mongoMissingAnswerFilter,
} = require('./questionAnswerUtil');

function missingSolution(originalLaTeX) {
  const tex = String(originalLaTeX || '');
  if (!tex) return true;
  return !/\\begin\s*\{solution\}/i.test(tex) && !/\\score\s*\{/i.test(tex);
}

function assessQuestionQuality(q, context = {}) {
  const issues = [];
  if (isEmptyAnswer(effectiveCorrectAnswer(q))) issues.push('missing_answer');
  if (!q.difficulty || !DIFFICULTY_VALUES.includes(q.difficulty)) issues.push('missing_difficulty');
  if (!q.knowledgePointIds || !q.knowledgePointIds.length) issues.push('missing_kp');
  if (missingSolution(q.originalLaTeX) && ['解答题', '计算题', '证明题'].includes(q.type)) {
    issues.push('missing_solution');
  }
  if (stepScoreMismatch(q)) {
    issues.push('step_score_mismatch');
  }
  const bankLabels = context.bankLabelSet;
  if (bankLabels) {
    const dangling = danglingRefsForQuestion(q, bankLabels);
    if (dangling.length) issues.push('dangling_ref');
  }
  return issues;
}

function mergeQualityMongoFilter(baseFilter, qualityFilter) {
  if (!qualityFilter) return baseFilter;
  let extra = null;
  switch (qualityFilter) {
    case 'missing_answer':
      extra = mongoMissingAnswerFilter();
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
          mongoMissingAnswerFilter(),
          { knowledgePointIds: { $exists: false } },
          { knowledgePointIds: { $size: 0 } },
          { difficulty: { $nin: DIFFICULTY_VALUES } },
        ],
      };
      break;
    case 'dangling_ref':
      extra = {
        $or: [
          { originalLaTeX: { $regex: '\\\\(?:ref|cref|Cref|eqref|Ref|pageref)\\{', $options: 'i' } },
          { questionText: { $regex: '\\\\(?:ref|cref|Cref|eqref|Ref|pageref)\\{', $options: 'i' } },
        ],
      };
      break;
    case 'missing_solution':
      extra = {
        type: { $in: ['解答题', '计算题', '证明题'] },
        $or: [
          { originalLaTeX: null },
          { originalLaTeX: '' },
          {
            originalLaTeX: {
              $not: /(\\begin\s*\{solution\}|\\score\s*\{)/i,
            },
          },
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
