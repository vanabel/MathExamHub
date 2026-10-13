const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const bankService = require('../services/bankService');

const router = express.Router();

router.use(requireAuth);

router.get('/mine', async (req, res) => {
  try {
    const banks = await bankService.listBanksForUser(req.user._id);
    res.json({ banks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to list banks' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: '题库名称必填' });
    }
    const bank = await bankService.createSharedBank(req.user, String(name).trim());
    res.status(201).json(bank);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create bank' });
  }
});

router.post('/:bankId/members', async (req, res) => {
  try {
    const { username, role = 'editor' } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'username 必填' });
    }
    const invitee = await bankService.addMember(req.params.bankId, req.user._id, {
      username,
      role,
    });
    res.json({
      message: '成员已添加',
      user: { id: invitee._id, username: invitee.username },
      role,
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to add member' });
  }
});

module.exports = router;
