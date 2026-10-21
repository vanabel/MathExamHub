const LEGACY_DIFFICULTY_MAP = {
  简单: '易',
  易: '易',
  中等: '中',
  中: '中',
  较难: '难',
  困难: '难',
  难: '难',
};

const COEFFICIENT_BY_NORMALIZED = {
  易: 0.4,
  中: 0.6,
  难: 1.0,
};

/**
 * @param {string | null | undefined} value
 * @returns {'易' | '中' | '难'}
 */
export function normalizeDifficultyLabel(value) {
  if (value == null || String(value).trim() === '') {
    return '中';
  }
  const trimmed = String(value).trim();
  if (LEGACY_DIFFICULTY_MAP[trimmed]) {
    return LEGACY_DIFFICULTY_MAP[trimmed];
  }
  if (trimmed === '易' || trimmed === '中' || trimmed === '难') {
    return trimmed;
  }
  return '中';
}

/**
 * @param {string | null | undefined} difficulty
 * @returns {number}
 */
export function getDifficultyCoefficient(difficulty) {
  const normalized = normalizeDifficultyLabel(difficulty);
  return COEFFICIENT_BY_NORMALIZED[normalized] ?? 0.6;
}

/**
 * @param {{ difficulty?: string, totalScore?: number }} question
 * @returns {number}
 */
export function getDifficultyScore(question) {
  const coefficient = getDifficultyCoefficient(question?.difficulty);
  return coefficient * (Number(question?.totalScore) || 0);
}

/**
 * @param {{ difficulty?: string, totalScore?: number }} question
 * @returns {number}
 */
export function getAverageDifficultyCoefficient(questions) {
  if (!questions.length) return 0;
  const sum = questions.reduce(
    (acc, q) => acc + getDifficultyCoefficient(q.difficulty),
    0,
  );
  return sum / questions.length;
}
