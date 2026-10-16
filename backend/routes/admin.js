const express = require('express');
const User = require('../models/User');
const QuestionBank = require('../models/QuestionBank');
const Question = require('../models/Question');
const requireAuth = require('../middleware/requireAuth');
const requirePlatformAdmin = require('../middleware/requirePlatformAdmin');
const { activeQuestionFilter } = require('../constants/questionLifecycle');

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

module.exports = router;
