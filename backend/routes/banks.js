const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const bankService = require('../services/bankService');
const QuestionBank = require('../models/QuestionBank');
const router = express.Router();

const METADATA_KEYS = [
  'packageOptions', 'documentClass', 'documentClassOptions',
  'university', 'school', 'course', 'AorB', 'semester',
  'examDate', 'academicYearStart', 'academicYearEnd',
  'finalmiddle', 'totaltime', 'openclose', 'degree', 'totalstu', 'major',
  'grade', 'examiner', 'director', 'dean', 'preambleLines', 'exportMode',
];

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

router.get('/:bankId/latex-metadata', async (req, res) => {
  try {
    await bankService.assertBankAccess(req.user._id, req.params.bankId, 'viewer');
    const bank = await QuestionBank.findById(req.params.bankId)
      .select('name latexExamMetadata')
      .lean();
    if (!bank) {
      return res.status(404).json({ error: '题库不存在' });
    }
    res.json({
      bankId: bank._id,
      name: bank.name,
      latexExamMetadata: bank.latexExamMetadata || {},
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || '读取失败' });
  }
});

router.patch('/:bankId/latex-metadata', async (req, res) => {
  try {
    await bankService.assertBankAccess(req.user._id, req.params.bankId, 'editor');
    const bank = await QuestionBank.findById(req.params.bankId);
    if (!bank) {
      return res.status(404).json({ error: '题库不存在' });
    }
    if (!bank.latexExamMetadata) {
      bank.latexExamMetadata = {};
    }
    for (const key of METADATA_KEYS) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        bank.latexExamMetadata[key] = req.body[key];
      }
    }
    bank.markModified('latexExamMetadata');
    await bank.save();
    res.json({
      bankId: bank._id,
      latexExamMetadata: bank.latexExamMetadata,
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || '更新失败' });
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
