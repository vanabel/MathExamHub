const express = require('express');
const mongoose = require('mongoose');
const ExamBlueprint = require('../models/ExamBlueprint');
const ExamPaper = require('../models/ExamPaper');
const Question = require('../models/Question');
const requireAuth = require('../middleware/requireAuth');
const { bankContext, requireBankWrite } = require('../middleware/bankContext');
const { generateExamPaper, pickSwapReplacement } = require('../services/examGenerator');
const { getSubtreeNodeIds } = require('../utils/knowledgePointTree');
const { examPoolFilter } = require('../constants/questionLifecycle');

const router = express.Router();

router.use(requireAuth);
router.use(bankContext);

async function buildKpExpansionMap(bankId, blueprint) {
  const map = new Map();
  const ids = new Set();
  for (const section of blueprint.sections || []) {
    for (const id of section.knowledgePointIds || []) {
      ids.add(String(id));
    }
  }
  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) continue;
    const subtree = await getSubtreeNodeIds(bankId, new mongoose.Types.ObjectId(id));
    map.set(String(id), subtree.map(String));
  }
  return map;
}

router.post('/generate', requireBankWrite, async (req, res) => {
  try {
    let blueprint = req.body.blueprint;
    if (req.body.blueprintId) {
      const doc = await ExamBlueprint.findOne({
        _id: req.body.blueprintId,
        bankId: req.bankId,
      }).lean();
      if (!doc) return res.status(404).json({ error: 'Blueprint not found' });
      blueprint = doc;
    }
    if (!blueprint || !blueprint.sections?.length) {
      return res.status(400).json({ error: '需要提供 blueprint 或 blueprintId' });
    }

    const pool = await Question.find(examPoolFilter({ bankId: req.bankId })).lean();

    const kpExpansionMap = await buildKpExpansionMap(req.bankId, blueprint);
    const result = generateExamPaper(blueprint, pool, kpExpansionMap);

    const questionDocs = result.questionIds
      .map((id) => pool.find((q) => String(q._id) === String(id)))
      .filter(Boolean);

    if (result.success && result.questionIds.length) {
      await Question.updateMany(
        { _id: { $in: result.questionIds }, bankId: req.bankId },
        { $inc: { usageCount: 1 } },
      );
    }

    const paper = await ExamPaper.create({
      bankId: req.bankId,
      blueprintId: req.body.blueprintId || undefined,
      title: blueprint.title,
      subject: blueprint.subject,
      randomSeed: blueprint.randomSeed,
      questionIds: result.questionIds,
      sections: result.sections,
      stats: result.stats,
      relaxations: result.relaxations,
      warnings: result.warnings,
      shortfalls: result.shortfalls,
      createdBy: req.user.username,
    });

    res.status(result.success ? 200 : 200).json({
      paperId: paper._id,
      success: result.success,
      questionIds: result.questionIds,
      questions: questionDocs.map((q) => ({
        _id: q._id,
        type: q.type,
        difficulty: q.difficulty,
        totalScore: q.totalScore,
        subject: q.subject,
        questionText: q.questionText,
        originalLaTeX: q.originalLaTeX,
        knowledgePointIds: q.knowledgePointIds,
      })),
      sections: result.sections,
      stats: result.stats,
      relaxations: result.relaxations,
      warnings: result.warnings,
      shortfalls: result.shortfalls,
      randomSeed: blueprint.randomSeed,
    });
  } catch (error) {
    console.error('generate exam failed', error);
    res.status(500).json({ error: error.message || 'Generate failed' });
  }
});

router.post('/swap-question', requireBankWrite, async (req, res) => {
  try {
    const {
      blueprintId,
      blueprint: inlineBlueprint,
      sectionIndex,
      replaceQuestionId,
      occupiedQuestionIds = [],
      randomSeed,
    } = req.body;

    if (sectionIndex == null || !replaceQuestionId) {
      return res.status(400).json({ error: '需要 sectionIndex 与 replaceQuestionId' });
    }

    let blueprint = inlineBlueprint;
    if (blueprintId) {
      const doc = await ExamBlueprint.findOne({
        _id: blueprintId,
        bankId: req.bankId,
      }).lean();
      if (!doc) return res.status(404).json({ error: 'Blueprint not found' });
      blueprint = doc;
    }
    if (!blueprint?.sections?.length) {
      return res.status(400).json({ error: '需要提供 blueprint 或 blueprintId' });
    }

    const pool = await Question.find(examPoolFilter({ bankId: req.bankId })).lean();
    const kpExpansionMap = await buildKpExpansionMap(req.bankId, blueprint);
    const swap = pickSwapReplacement({
      blueprint,
      pool,
      kpExpansionMap,
      sectionIndex: Number(sectionIndex),
      replaceQuestionId,
      occupiedQuestionIds,
      randomSeed,
    });

    if (swap.error) {
      return res.status(404).json({
        error: swap.error === 'no_candidates' ? '没有符合约束的替换题' : swap.error,
        candidatesCount: swap.candidatesCount ?? 0,
      });
    }

    const q = swap.replacement;
    res.json({
      replacement: {
        _id: q._id,
        type: q.type,
        difficulty: q.difficulty,
        totalScore: q.totalScore,
        subject: q.subject,
        questionText: q.questionText,
        originalLaTeX: q.originalLaTeX,
        knowledgePointIds: q.knowledgePointIds,
      },
      candidatesCount: swap.candidatesCount,
    });
  } catch (error) {
    console.error('swap question failed', error);
    res.status(500).json({ error: error.message || 'Swap failed' });
  }
});

router.get('/papers/:id', async (req, res) => {
  try {
    const paper = await ExamPaper.findOne({ _id: req.params.id, bankId: req.bankId }).lean();
    if (!paper) return res.status(404).json({ error: 'Paper not found' });
    const questions = await Question.find({ _id: { $in: paper.questionIds }, bankId: req.bankId }).lean();
    res.json({ paper, questions });
  } catch (error) {
    res.status(400).json({ error: 'Invalid id' });
  }
});

module.exports = router;
