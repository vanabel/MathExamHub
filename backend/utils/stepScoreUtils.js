/**
 * Parse \\score{n} step marks from answer/solution LaTeX (per-step, not cumulative).
 */

function collectScoreStrings(parts) {
  const texts = [];
  if (parts == null) return texts;
  if (Array.isArray(parts)) {
    for (const p of parts) texts.push(String(p));
    return texts;
  }
  texts.push(String(parts));
  return texts;
}

function sumStepScoresFromText(text) {
  if (!text) return { sum: 0, scores: [] };
  const scores = [];
  const re = /\\score\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(String(m[1]).trim(), 10);
    if (!Number.isNaN(n)) scores.push(n);
  }
  return { sum: scores.reduce((a, b) => a + b, 0), scores };
}

function normalizeScoreText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sumStepScoresForQuestion(question) {
  const answerText = collectScoreStrings(question.correctAnswer).join('\n');
  const solutionText = String(question.solution || '').trim();
  const answerNorm = normalizeScoreText(answerText);
  const solutionNorm = normalizeScoreText(solutionText);
  const duplicateAnswerSolution = solutionNorm
    && answerNorm
    && (answerNorm === solutionNorm || answerNorm.includes(solutionNorm) || solutionNorm.includes(answerNorm));

  const chunks = duplicateAnswerSolution
    ? collectScoreStrings(question.solution || question.correctAnswer)
    : [
      ...collectScoreStrings(question.correctAnswer),
      ...collectScoreStrings(question.solution),
    ];
  let sum = 0;
  const allScores = [];
  for (const t of chunks) {
    const { sum: s, scores } = sumStepScoresFromText(t);
    sum += s;
    allScores.push(...scores);
  }
  return { sum, scores: allScores };
}

function stepScoreMismatch(question) {
  const total = Number(question.totalScore);
  if (!total || total <= 0) return null;
  const { sum, scores } = sumStepScoresForQuestion(question);
  if (scores.length === 0) return null;
  if (sum === total) return null;
  return { sum, totalScore: total, scores };
}

module.exports = {
  sumStepScoresFromText,
  sumStepScoresForQuestion,
  stepScoreMismatch,
};
