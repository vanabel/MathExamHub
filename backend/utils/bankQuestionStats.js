const mongoose = require('mongoose');
const Question = require('../models/Question');
const ExamBlueprint = require('../models/ExamBlueprint');
const KnowledgePoint = require('../models/KnowledgePoint');
const { activeQuestionFilter } = require('../constants/questionLifecycle');
const { DIFFICULTY_VALUES } = require('../constants/difficulty');
const { getSubtreeNodeIds } = require('../utils/knowledgePointTree');

async function countMatchingPool(bankId, section) {
  const filter = activeQuestionFilter({
    bankId,
    type: section.type,
  });
  if (section.knowledgePointIds?.length) {
    const kpSet = new Set();
    for (const kpId of section.knowledgePointIds) {
      const subtree = await getSubtreeNodeIds(bankId, kpId);
      subtree.forEach((id) => kpSet.add(String(id)));
    }
    filter.knowledgePointIds = { $in: [...kpSet].map((id) => new mongoose.Types.ObjectId(id)) };
  }
  return Question.countDocuments(filter);
}

async function buildBlueprintCoverageGaps(bankId) {
  const blueprints = await ExamBlueprint.find({ bankId })
    .select('title sections')
    .sort({ updatedAt: -1 })
    .limit(15)
    .lean();
  const gaps = [];
  for (const bp of blueprints) {
    for (let si = 0; si < (bp.sections || []).length; si += 1) {
      const section = bp.sections[si];
      const available = await countMatchingPool(bankId, section);
      const needed = section.count || 0;
      if (available < needed) {
        gaps.push({
          blueprintId: bp._id,
          blueprintTitle: bp.title,
          sectionIndex: si,
          type: section.type,
          needed,
          available,
          shortfall: needed - available,
        });
      }
    }
  }
  return gaps.slice(0, 40);
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

  const blueprintGaps = await buildBlueprintCoverageGaps(bankId);

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
  countMatchingPool,
};
