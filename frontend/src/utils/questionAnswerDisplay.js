const SUBJECTIVE = new Set(['解答题', '计算题', '证明题', '简答题', '作图题']);

export function isEmptyAnswer(val) {
  if (val == null) return true;
  if (typeof val === 'string') return !val.trim();
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') return Object.keys(val).length === 0;
  return false;
}

export function answerForDisplay(question) {
  if (!question) return '';
  if (!isEmptyAnswer(question.correctAnswer)) return question.correctAnswer;
  if (SUBJECTIVE.has(question.type) && !isEmptyAnswer(question.solution)) {
    return question.solution;
  }
  return question.correctAnswer;
}

export function showAnswerBlock(question) {
  return !isEmptyAnswer(answerForDisplay(question));
}

export function showSolutionBlock(question) {
  if (isEmptyAnswer(question?.solution)) return false;
  if (!isEmptyAnswer(question.correctAnswer)) return true;
  return SUBJECTIVE.has(question.type);
}
