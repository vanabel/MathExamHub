const express = require('express');
const ExamBlueprint = require('../models/ExamBlueprint');
const requireAuth = require('../middleware/requireAuth');
const { bankContext, requireBankWrite } = require('../middleware/bankContext');

const router = express.Router();

router.use(requireAuth);
router.use(bankContext);

router.get('/', async (req, res) => {
  try {
    const list = await ExamBlueprint.find({ bankId: req.bankId })
      .sort({ updatedAt: -1 })
      .lean();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list blueprints' });
  }
});

router.post('/', requireBankWrite, async (req, res) => {
  try {
    const doc = new ExamBlueprint({
      ...req.body,
      bankId: req.bankId,
      createdBy: req.user.username,
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid blueprint' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await ExamBlueprint.findOne({ _id: req.params.id, bankId: req.bankId });
    if (!doc) return res.status(404).json({ error: 'Blueprint not found' });
    res.json(doc);
  } catch (error) {
    res.status(400).json({ error: 'Invalid id' });
  }
});

router.put('/:id', requireBankWrite, async (req, res) => {
  try {
    const doc = await ExamBlueprint.findOne({ _id: req.params.id, bankId: req.bankId });
    if (!doc) return res.status(404).json({ error: 'Blueprint not found' });
    const fields = ['title', 'subject', 'totalScore', 'sections', 'randomSeed', 'allowRelaxation'];
    for (const key of fields) {
      if (typeof req.body[key] !== 'undefined') doc[key] = req.body[key];
    }
    await doc.save();
    res.json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Update failed' });
  }
});

module.exports = router;
