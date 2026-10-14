const Question = require('../models/Question');
const { QUESTION_STATUS } = require('../constants/questionLifecycle');
/**
 * @param {import('mongoose').Types.ObjectId} questionId
 * @param {import('mongoose').Types.ObjectId} bankId
 * @param {string} deletedBy
 */
async function softDeleteQuestion(questionId, bankId, deletedBy) {
  const doc = await Question.findOne({
    _id: questionId,
    bankId,
    status: { $ne: QUESTION_STATUS.DELETED },
  });
  if (!doc) return null;

  doc.status = QUESTION_STATUS.DELETED;
  doc.deletedAt = new Date();
  doc.deletedBy = deletedBy;
  doc.updatedAt = new Date();
  await doc.save();
  return doc;
}

/**
 * @param {import('mongoose').Types.ObjectId} questionId
 * @param {import('mongoose').Types.ObjectId} bankId
 */
async function restoreQuestion(questionId, bankId) {
  const doc = await Question.findOne({
    _id: questionId,
    bankId,
    status: QUESTION_STATUS.DELETED,
  });
  if (!doc) return { ok: false, error: 'not_found' };

  doc.status = QUESTION_STATUS.PUBLISHED;
  doc.deletedAt = undefined;
  doc.deletedBy = undefined;
  doc.updatedAt = new Date();

  try {
    await doc.save();
    return { ok: true, question: doc };
  } catch (err) {
    if (err.code === 11000) {
      return {
        ok: false,
        error: 'content_hash_conflict',
        message: '恢复失败：题库中已有相同 contentHash 的在库题目，请先处理冲突或永久删除其一',
      };
    }
    throw err;
  }
}

/**
 * @param {import('mongoose').Types.ObjectId} questionId
 * @param {import('mongoose').Types.ObjectId} bankId
 */
async function permanentDeleteQuestion(questionId, bankId) {
  const doc = await Question.findOneAndDelete({
    _id: questionId,
    bankId,
    status: QUESTION_STATUS.DELETED,
  });
  return doc;
}

module.exports = {
  softDeleteQuestion,
  restoreQuestion,
  permanentDeleteQuestion,
};
