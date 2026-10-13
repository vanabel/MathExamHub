const { DIFFICULTY_VALUES } = require('../constants/difficulty');

const QUESTION_TYPES = [
  '判断题', '填空题', '计算题', '解答题', '证明题',
  '单选题', '多选题', '作图题', '简答题',
];

/**
 * @param {object} q parsed or payload
 * @param {number} index 0-based
 */
function validateQuestionRecord(q, index = 0) {
  const errors = [];
  const warnings = [];

  if (!q.questionText || !String(q.questionText).trim()) {
    errors.push({ index, code: 'MISSING_STEM', message: '缺少题干 questionText' });
  }
  if (!q.type || !QUESTION_TYPES.includes(q.type)) {
    errors.push({ index, code: 'INVALID_TYPE', message: `无效或未识别的题型: ${q.type}` });
  }
  const score = q.totalScore != null ? Number(q.totalScore) : NaN;
  if (Number.isNaN(score) || score <= 0) {
    warnings.push({ index, code: 'SCORE_DEFAULT', message: '分值缺失或无效，导入时将使用默认值' });
  }
  if ((q.type === '单选题' || q.type === '多选题') && (!q.options || !Object.keys(q.options).length)) {
    errors.push({ index, code: 'MISSING_OPTIONS', message: '选择题缺少 options' });
  }
  if (q.difficulty && !DIFFICULTY_VALUES.includes(q.difficulty)) {
    warnings.push({ index, code: 'DIFFICULTY_NORMALIZED', message: '难度将归一化为 易/中/难' });
  }

  return { errors, warnings, valid: errors.length === 0 };
}

/**
 * @param {object[]} questions
 */
function validateQuestionBatch(questions) {
  const allErrors = [];
  const allWarnings = [];
  const valids = [];

  questions.forEach((q, index) => {
    const result = validateQuestionRecord(q, index);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    if (result.valid) valids.push(q);
  });

  return {
    questions: valids,
    errors: allErrors,
    warnings: allWarnings,
    summary: {
      total: questions.length,
      valid: valids.length,
      errorCount: allErrors.length,
      warningCount: allWarnings.length,
    },
  };
}

module.exports = {
  validateQuestionRecord,
  validateQuestionBatch,
  QUESTION_TYPES,
};
