const Question = require('../models/Question');
const { requireBankWrite } = require('../middleware/bankContext');
const { QUESTION_STATUS } = require('../constants/questionLifecycle');
const {
  restoreQuestion,
  permanentDeleteQuestion,
} = require('../services/questionLifecycle');

/**
 * 须在 `/questions/:id` 等动态路由之前注册。
 * @param {import('express').Router} router
 */
function registerRecycleBinRoutes(router) {
  router.get('/recycle-bin', async (req, res) => {
    try {
      const items = await Question.find({
        bankId: req.bankId,
        status: QUESTION_STATUS.DELETED,
      })
        .sort({ deletedAt: -1 })
        .select('_id questionText type subject totalScore difficulty deletedAt deletedBy createdAt contentHash')
        .lean();
      res.json({ items, count: items.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list recycle bin' });
    }
  });

  router.post('/recycle-bin/:id/restore', requireBankWrite, async (req, res) => {
    try {
      const result = await restoreQuestion(req.params.id, req.bankId);
      if (!result.ok) {
        const status = result.error === 'not_found' ? 404 : 409;
        return res.status(status).json({
          error: result.message || result.error,
          code: result.error,
        });
      }
      res.json({ success: true, question: result.question });
    } catch (error) {
      res.status(500).json({ error: 'Restore failed' });
    }
  });

  router.delete('/recycle-bin/:id', requireBankWrite, async (req, res) => {
    try {
      const removed = await permanentDeleteQuestion(req.params.id, req.bankId);
      if (!removed) {
        return res.status(404).json({ error: '回收站中未找到该题目' });
      }
      res.json({ success: true, permanentlyDeletedId: removed._id });
    } catch (error) {
      res.status(500).json({ error: 'Permanent delete failed' });
    }
  });
}

module.exports = registerRecycleBinRoutes;
