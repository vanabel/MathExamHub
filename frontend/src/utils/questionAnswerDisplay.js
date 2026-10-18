export function isEmptyAnswer(val) {
  if (val == null) return true;
  if (typeof val === 'string') return !val.trim();
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') return Object.keys(val).length === 0;
  return false;
}

export function answerForDisplay(question) {
  if (!question) return '';
  if (isEmptyAnswer(question.correctAnswer)) return '';
  return question.correctAnswer;
}

export function showAnswerBlock(question) {
  return !isEmptyAnswer(question?.correctAnswer);
}

export function showSolutionBlock(question) {
  return !isEmptyAnswer(question?.solution);
}
