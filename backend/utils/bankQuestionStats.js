const Question = require('../models/Question');
const ExamBlueprint = require('../models/ExamBlueprint');
const KnowledgePoint = require('../models/KnowledgePoint');
const { activeQuestionFilter, examPoolFilter } = require('../constants/questionLifecycle');
const { DIFFICULTY_VALUES } = require('../constants/difficulty');
const { getSubtreeNodeIds } = require('../utils/knowledgePointTree');
const { analyzeBlueprintCoverage } = require('./blueprintCoverage');
const mongoose = require('mongoose');

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

async function buildBlueprintCoverageGaps(bankId, pool) {
  const blueprints = await ExamBlueprint.find({ bankId })
    .select('title sections randomSeed subject')
    .sort({ updatedAt: -1 })
    .limit(15)
    .lean();
  const questionPool = pool || await Question.find(examPoolFilter({ bankId })).lean();
  const rows = [];
  for (const bp of blueprints) {
    const kpMap = await buildKpExpansionMap(bankId, bp);
    const analysis = analyzeBlueprintCoverage(bp, questionPool, kpMap, {
      randomSeed: bp.randomSeed,
      allowRelaxation: false,
    });
    if (analysis.ok) continue;
    for (const gap of analysis.gaps) {
      rows.push({
        blueprintId: bp._id,
        blueprintTitle: bp.title,
        sectionIndex: gap.sectionIndex,
        slot: gap.slot,
        type: gap.sectionType,
        neededDifficulty: gap.neededDifficulty,
        scoreEach: gap.scoreEach,
        message: gap.message,
        listQuery: gap.listQuery,
      });
    }
  }
  return rows.slice(0, 60);
}

async function buildBankQuestionDashboard(bankId) {
  const baseMatch = activeQuestionFilter({ bankId });
  const [byType, byDifficulty, total, kpNodes] = await Promise.all([
    Question.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Question.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
    ]),
    Question.countDocuments(baseMatch),
    KnowledgePoint.find({ bankId }).select('_id path name').lean(),
  ]);

  const kpPathById = new Map(kpNodes.map((k) => [String(k._id), k.path || k.name || '']));
  const kpCounts = await Question.aggregate([
    { $match: { ...baseMatch, knowledgePointIds: { $exists: true, $ne: [] } } },
    { $unwind: '$knowledgePointIds' },
    { $group: { _id: '$knowledgePointIds', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 25 },
  ]);

  const byKnowledgePoint = kpCounts.map((row) => ({
    knowledgePointId: row._id,
    path: kpPathById.get(String(row._id)) || String(row._id),
    count: row.count,
  }));

  const difficultyMap = Object.fromEntries(DIFFICULTY_VALUES.map((d) => [d, 0]));
  for (const row of byDifficulty) {
    if (row._id && difficultyMap[row._id] !== undefined) {
      difficultyMap[row._id] = row.count;
    }
  }

  const blueprintGaps = await buildBlueprintCoverageGaps(bankId, null);

  return {
    totalQuestions: total,
    byType: byType.map((r) => ({ type: r._id || '未知', count: r.count })),
    byDifficulty: difficultyMap,
    byKnowledgePoint,
    blueprintCoverageGaps: blueprintGaps,
  };
}

module.exports = {
  buildBankQuestionDashboard,
  buildBlueprintCoverageGaps,
  buildKpExpansionMap,
};
