const express = require('express');
const { requireBankWrite } = require('../middleware/bankContext');
const { softDeleteQuestion } = require('../services/questionLifecycle');
const {
  findAllDuplicatesInBank,
  formatGroupsForApi,
} = require('../utils/duplicateDetector');

/**
 * @param {import('express').Router} router
 */
function registerDuplicateReviewRoutes(router) {
  router.get('/duplicates', async (req, res) => {
    try {
      const threshold = parseFloat(req.query.threshold) || 0.85;
      const { exactGroups, nearGroups, duplicateGroups } = await findAllDuplicatesInBank(
        req.bankId,
        threshold,
      );
      const formatted = formatGroupsForApi(duplicateGroups);
      res.json({
        duplicateGroups: formatted,
        exactGroupCount: exactGroups.length,
        nearGroupCount: nearGroups.length,
        totalDuplicates: duplicateGroups.reduce((sum, g) => sum + g.questions.length, 0),
        totalGroups: duplicateGroups.length,
        threshold,
      });
    } catch (error) {
      console.error('检测重复题目失败:', error);
      res.status(500).json({ error: 'Failed to detect duplicates' });
    }
  });

  router.post('/duplicates/cleanup', requireBankWrite, async (req, res) => {
    try {
      const threshold = parseFloat(req.query.threshold) || parseFloat(req.body?.threshold) || 0.85;
      const keepOldest = req.query.keepOldest !== 'false' && req.body?.keepOldest !== false;
      const dryRun = req.query.dryRun === 'true' || req.body?.dryRun === true;

      const { duplicateGroups } = await findAllDuplicatesInBank(req.bankId, threshold);
      const recycledIds = [];
      const kept = [];

      for (const group of duplicateGroups) {
        if (group.questions.length <= 1) continue;

        const sortedGroup = [...group.questions].sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB;
        });

        const toKeep = keepOldest ? sortedGroup[0] : sortedGroup[sortedGroup.length - 1];
        kept.push(toKeep._id);
        const toDelete = sortedGroup.filter((q) => String(q._id) !== String(toKeep._id));

        for (const question of toDelete) {
          if (dryRun) {
            recycledIds.push(question._id);
          } else {
            const removed = await softDeleteQuestion(
              question._id,
              req.bankId,
              req.user.username,
            );
            if (removed) recycledIds.push(removed._id);
          }
        }
      }

      res.json({
        success: true,
        dryRun,
        softDeleted: true,
        recycledCount: recycledIds.length,
        recycledIds,
        deletedCount: recycledIds.length,
        deletedIds: recycledIds,
        keptIds: kept,
      });
    } catch (error) {
      console.error('清理重复题目失败:', error);
      res.status(500).json({ error: 'Failed to cleanup duplicates' });
    }
  });
}

module.exports = registerDuplicateReviewRoutes;
