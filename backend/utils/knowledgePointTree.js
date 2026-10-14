const KnowledgePoint = require('../models/KnowledgePoint');

/**
 * 返回某节点及其所有后代节点 id（同 bank、path 前缀）。
 * @param {import('mongoose').Types.ObjectId} bankId
 * @param {import('mongoose').Types.ObjectId} nodeId
 */
async function getSubtreeNodeIds(bankId, nodeId) {
  const root = await KnowledgePoint.findOne({ _id: nodeId, bankId });
  if (!root) return [];

  const escaped = root.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const descendants = await KnowledgePoint.find({
    bankId,
    path: { $regex: `^${escaped}(/|$)` },
  }).select('_id');

  return descendants.map((d) => d._id);
}

module.exports = {
  getSubtreeNodeIds,
};
