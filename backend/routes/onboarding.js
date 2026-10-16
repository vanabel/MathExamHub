const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { bankContext, requireBankWrite } = require('../middleware/bankContext');
const {
  importSampleBankForUser,
  updateTourProgress,
  onboardingPayload,
} = require('../services/onboardingService');
const User = require('../models/User');

const router = express.Router();

router.use(requireAuth);

router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'onboardingSampleImported onboardingTourCompleted onboardingTourStep',
    );
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ onboarding: onboardingPayload(user) });
  } catch (error) {
    res.status(500).json({ error: '读取引导状态失败' });
  }
});

router.post('/import-sample', bankContext, requireBankWrite, async (req, res) => {
  try {
    const result = await importSampleBankForUser(req.user, req.bankId);
    const user = await User.findById(req.user._id);
    res.json({ ...result, onboarding: onboardingPayload(user) });
  } catch (error) {
    console.error('import-sample failed', error);
    res.status(error.status || 500).json({ error: error.message || '导入示例失败' });
  }
});

router.patch('/tour', async (req, res) => {
  try {
    const onboarding = await updateTourProgress(req.user._id, {
      tourStep: req.body.tourStep,
      tourCompleted: req.body.tourCompleted,
    });
    res.json({ onboarding });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || '更新引导失败' });
  }
});

module.exports = router;
