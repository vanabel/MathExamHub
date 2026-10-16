const express = require('express');
const mongoose = require('mongoose');
const ExamBlueprint = require('../models/ExamBlueprint');
const ExamPaper = require('../models/ExamPaper');
const Question = require('../models/Question');
const requireAuth = require('../middleware/requireAuth');
const { bankContext, requireBankWrite } = require('../middleware/bankContext');
const { generateExamPaper, pickSwapReplacement } = require('../services/examGenerator');
const { generateAbVariants } = require('../services/examVariantService');
const {
  recordQuestionUsage,
  mapQuestionsForApi,
  createExamPaperDoc,
  buildGeneratePayload,
} = require('../services/examPaperService');
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

async function loadBlueprint(req) {
  let blueprint = req.body.blueprint;
  const blueprintId = req.body.blueprintId;
  if (blueprintId) {
    const doc = await ExamBlueprint.findOne({
      _id: blueprintId,
      bankId: req.bankId,
    }).lean();
    if (!doc) return { error: 'Blueprint not found', status: 404 };
    blueprint = doc;
  }
  if (!blueprint?.sections?.length) {
    return { error: '需要提供 blueprint 或 blueprintId', status: 400 };
  }
  return { blueprint, blueprintId };
}

router.post('/generate', requireBankWrite, async (req, res) => {
  try {
    const loaded = await loadBlueprint(req);
    if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
    const { blueprint, blueprintId } = loaded;

    const pool = await Question.find(examPoolFilter({ bankId: req.bankId })).lean();
    const kpExpansionMap = await buildKpExpansionMap(req.bankId, blueprint);
    const result = generateExamPaper(blueprint, pool, kpExpansionMap);

    if (result.success && result.questionIds.length) {
      await recordQuestionUsage(req.bankId, result.questionIds);
    }

    const paper = await createExamPaperDoc({
      bankId: req.bankId,
      blueprintId,
      blueprint,
      result,
      username: req.user.username,
    });

    const questions = mapQuestionsForApi(pool, result.questionIds);
    res.status(200).json(buildGeneratePayload(paper, result, questions));
  } catch (error) {
    console.error('generate exam failed', error);
    res.status(500).json({ error: error.message || 'Generate failed' });
  }
});

router.post('/generate-variants', requireBankWrite, async (req, res) => {
  try {
    const loaded = await loadBlueprint(req);
    if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
    const { blueprint, blueprintId } = loaded;

    const maxPct = typeof req.body.maxVariantOverlapPct === 'number'
      ? req.body.maxVariantOverlapPct
      : (blueprint.maxVariantOverlapPct ?? 0.2);
    const seedA = Number(req.body.seedA ?? blueprint.randomSeed ?? 42);
    const seedBStart = Number(req.body.seedB ?? seedA + 1009);

    const pool = await Question.find(examPoolFilter({ bankId: req.bankId })).lean();
    const kpExpansionMap = await buildKpExpansionMap(req.bankId, blueprint);

    const ab = generateAbVariants(
      blueprint,
      pool,
      kpExpansionMap,
      seedA,
      seedBStart,
      maxPct,
    );

    const allIds = [...new Set([
      ...ab.resultA.questionIds,
      ...ab.resultB.questionIds,
    ].map(String))];

    if (allIds.length) {
      await recordQuestionUsage(req.bankId, allIds);
    }

    const paperA = await createExamPaperDoc({
      bankId: req.bankId,
      blueprintId,
      blueprint: { ...blueprint, randomSeed: ab.seedA },
      result: ab.resultA,
      username: req.user.username,
      variantLabel: 'A',
      variantGroupId: ab.variantGroupId,
    });
    const paperB = await createExamPaperDoc({
      bankId: req.bankId,
      blueprintId,
      blueprint: { ...blueprint, randomSeed: ab.seedB },
      result: ab.resultB,
      username: req.user.username,
      variantLabel: 'B',
      variantGroupId: ab.variantGroupId,
    });

    const warnings = [...(ab.warnings || [])];
    if (ab.resultA.warnings?.length) warnings.push(...ab.resultA.warnings);
    if (ab.resultB.warnings?.length) warnings.push(...ab.resultB.warnings);

    res.status(200).json({
      variantGroupId: ab.variantGroupId,
      maxVariantOverlapPct: maxPct,
      overlapRatio: ab.overlapRatio,
      overlapCount: ab.overlapCount,
      warnings,
      variants: {
        A: {
          ...buildGeneratePayload(paperA, ab.resultA, mapQuestionsForApi(pool, ab.resultA.questionIds)),
          variantLabel: 'A',
        },
        B: {
          ...buildGeneratePayload(paperB, ab.resultB, mapQuestionsForApi(pool, ab.resultB.questionIds)),
          variantLabel: 'B',
        },
      },
    });
  } catch (error) {
    console.error('generate variants failed', error);
    res.status(500).json({ error: error.message || 'Generate variants failed' });
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
        usageCount: q.usageCount,
        lastUsedAt: q.lastUsedAt,
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
