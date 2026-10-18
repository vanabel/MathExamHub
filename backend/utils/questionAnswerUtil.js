const SUBJECTIVE_ANSWER_TYPES = new Set([
  '解答题', '计算题', '证明题', '简答题', '作图题',
]);

function isEmptyAnswer(val) {
  if (val == null) return true;
  if (typeof val === 'string') return !val.trim();
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') return Object.keys(val).length === 0;
  return false;
}

function solutionCountsAsAnswer(type) {
  return SUBJECTIVE_ANSWER_TYPES.has(type);
}

function effectiveCorrectAnswer(question) {
  if (!question) return question?.correctAnswer;
  if (!isEmptyAnswer(question.correctAnswer)) return question.correctAnswer;
  if (solutionCountsAsAnswer(question.type) && !isEmptyAnswer(question.solution)) {
    return question.solution;
  }
  return question.correctAnswer;
}

function hasDisplayableAnswer(question) {
  return !isEmptyAnswer(effectiveCorrectAnswer(question));
}

function mongoMissingAnswerFilter() {
  return {
    $and: [
      { $or: [{ correctAnswer: null }, { correctAnswer: '' }] },
      {
        $or: [
          { type: { $nin: [...SUBJECTIVE_ANSWER_TYPES] } },
          { solution: { $exists: false } },
          { solution: null },
          { solution: '' },
        ],
      },
    ],
  };
}

module.exports = {
  SUBJECTIVE_ANSWER_TYPES,
  isEmptyAnswer,
  solutionCountsAsAnswer,
  effectiveCorrectAnswer,
  hasDisplayableAnswer,
  mongoMissingAnswerFilter,
};
