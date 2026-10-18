const express = require('express');
const ExamBlueprint = require('../models/ExamBlueprint');
const requireAuth = require('../middleware/requireAuth');
const { bankContext, requireBankWrite } = require('../middleware/bankContext');
const {
  normalizeBlueprintBody,
  formatBlueprintValidationError,
} = require('../utils/blueprintInput');

const router = express.Router();

router.use(requireAuth);
router.use(bankContext);

function canUseTemplate(doc, username) {
  if (!doc.isTemplate) return true;
  if (doc.sharedWithBank) return true;
  return doc.createdBy === username;
}

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

/** 题库内蓝图模板库（本人模板 + 已共享模板） */
router.get('/library', async (req, res) => {
  try {
    const username = req.user.username;
    const list = await ExamBlueprint.find({
      bankId: req.bankId,
      isTemplate: true,
      $or: [{ sharedWithBank: true }, { createdBy: username }],
    })
      .sort({ updatedAt: -1 })
      .lean();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list template library' });
  }
});

router.post('/', requireBankWrite, async (req, res) => {
  try {
    const body = normalizeBlueprintBody(req.body);
    const doc = new ExamBlueprint({
      ...body,
      bankId: req.bankId,
      createdBy: req.user.username,
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    const formatted = formatBlueprintValidationError(error);
    if (formatted) return res.status(400).json(formatted);
    res.status(400).json({ error: error.message || 'Invalid blueprint' });
  }
});

router.post('/:id/clone', requireBankWrite, async (req, res) => {
  try {
    const source = await ExamBlueprint.findOne({ _id: req.params.id, bankId: req.bankId });
    if (!source) return res.status(404).json({ error: 'Blueprint not found' });
    if (!canUseTemplate(source, req.user.username)) {
      return res.status(403).json({ error: '无权使用该模板' });
    }

    const asTemplate = Boolean(req.body?.asTemplate);
    const title = (req.body?.title || `${source.title}（副本）`).trim();
    const doc = new ExamBlueprint({
      title,
      subject: source.subject,
      totalScore: source.totalScore,
      sections: source.sections,
      randomSeed: req.body?.randomSeed ?? Date.now(),
      allowRelaxation: source.allowRelaxation,
      maxVariantOverlapPct: source.maxVariantOverlapPct,
      latexExamMetadata: source.latexExamMetadata,
      isTemplate: asTemplate,
      sharedWithBank: asTemplate ? Boolean(req.body?.sharedWithBank) : false,
      clonedFromId: source._id,
      bankId: req.bankId,
      createdBy: req.user.username,
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Clone failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await ExamBlueprint.findOne({ _id: req.params.id, bankId: req.bankId });
    if (!doc) return res.status(404).json({ error: 'Blueprint not found' });
    if (!canUseTemplate(doc, req.user.username)) {
      return res.status(403).json({ error: '无权访问该蓝图' });
    }
    res.json(doc);
  } catch (error) {
    res.status(400).json({ error: 'Invalid id' });
  }
});

router.put('/:id', requireBankWrite, async (req, res) => {
  try {
    const doc = await ExamBlueprint.findOne({ _id: req.params.id, bankId: req.bankId });
    if (!doc) return res.status(404).json({ error: 'Blueprint not found' });
    const fields = [
      'title', 'subject', 'totalScore', 'sections', 'randomSeed', 'allowRelaxation',
      'maxVariantOverlapPct', 'isTemplate', 'sharedWithBank',
    ];
    const body = normalizeBlueprintBody(req.body);
    for (const key of fields) {
      if (typeof body[key] !== 'undefined') doc[key] = body[key];
    }
    if (doc.isTemplate && doc.sharedWithBank && doc.createdBy !== req.user.username) {
      return res.status(403).json({ error: '仅模板创建者可修改共享设置' });
    }
    await doc.save();
    res.json(doc);
  } catch (error) {
    const formatted = formatBlueprintValidationError(error);
    if (formatted) return res.status(400).json(formatted);
    res.status(400).json({ error: error.message || 'Update failed' });
  }
});

module.exports = router;
