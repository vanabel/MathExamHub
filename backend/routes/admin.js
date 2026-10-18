const express = require('express');
const User = require('../models/User');
const QuestionBank = require('../models/QuestionBank');
const Question = require('../models/Question');
const requireAuth = require('../middleware/requireAuth');
const requirePlatformAdmin = require('../middleware/requirePlatformAdmin');
const { activeQuestionFilter } = require('../constants/questionLifecycle');
const {
  getPlatformSettingsPublic,
  updatePlatformSettings,
} = require('../services/platformSettingsService');
const bankService = require('../services/bankService');
const { logPlatformAudit } = require('../services/platformAuditService');

const router = express.Router();

router.use(requireAuth);
router.use(requirePlatformAdmin);

router.get('/stats', async (req, res) => {
  try {
    const [userCount, bankCount, questionCount] = await Promise.all([
      User.countDocuments(),
      QuestionBank.countDocuments(),
      Question.countDocuments(activeQuestionFilter({})),
    ]);
    res.json({ userCount, bankCount, questionCount });
  } catch (error) {
    console.error('admin stats failed:', error);
    res.status(500).json({ error: 'Failed to load platform stats' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('username email role createdTime updatedTime')
      .sort({ createdTime: -1 })
      .limit(500)
      .lean();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list users' });
  }
});

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!role || typeof role !== 'string') {
      return res.status(400).json({ error: 'role 为必填' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: role.trim(), updatedTime: new Date() },
      { new: true },
    ).select('username email role');
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ user });
  } catch (error) {
    res.status(400).json({ error: '更新角色失败' });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const settings = await getPlatformSettingsPublic();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

router.patch('/settings', async (req, res) => {
  try {
    const settings = await updatePlatformSettings(req.body || {});
    res.json({ settings });
  } catch (error) {
    res.status(400).json({ error: '更新设置失败' });
  }
});

router.post('/banks/:bankId/archive', async (req, res) => {
  try {
    const bank = await bankService.softDeleteBank(
      req.user._id,
      req.params.bankId,
      req.user.username,
      { asPlatformAdmin: true },
    );
    await logPlatformAudit({
      action: 'bank.archive',
      actorUserId: req.user._id,
      actorUsername: req.user.username,
      targetType: 'QuestionBank',
      targetId: bank._id,
      bankId: bank._id,
      detail: { bankName: bank.name, via: 'platform_admin' },
    });
    res.json({ ok: true, bankId: bank._id, name: bank.name });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || '归档失败' });
  }
});

router.post('/banks/:bankId/restore', async (req, res) => {
  try {
    const bank = await bankService.restoreBank(
      req.user._id,
      req.params.bankId,
      { asPlatformAdmin: true },
    );
    await logPlatformAudit({
      action: 'bank.restore',
      actorUserId: req.user._id,
      actorUsername: req.user.username,
      targetType: 'QuestionBank',
      targetId: bank._id,
      bankId: bank._id,
      detail: { bankName: bank.name, via: 'platform_admin' },
    });
    res.json({ ok: true, bankId: bank._id, name: bank.name });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || '恢复失败' });
  }
});

module.exports = router;
