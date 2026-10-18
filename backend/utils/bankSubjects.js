const { activeQuestionFilter } = require('../constants/questionLifecycle');

/**
 * Distinct non-empty subject strings for active questions in a bank.
 * @param {import('mongoose').Model} QuestionModel
 * @param {import('mongoose').Types.ObjectId|string} bankId
 */
async function listDistinctSubjectsForBank(QuestionModel, bankId) {
  const filter = activeQuestionFilter({ bankId });
  const subjects = await QuestionModel.distinct('subject', filter);
  const cleaned = subjects
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  return [...new Set(cleaned)].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

module.exports = {
  listDistinctSubjectsForBank,
};
