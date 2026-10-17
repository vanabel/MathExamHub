function mergeKnowledgePointIds(existing, toAdd, replace = false) {
  const add = (toAdd || []).map(String).filter(Boolean);
  if (replace) return [...new Set(add)];
  const cur = (existing || []).map(String).filter(Boolean);
  return [...new Set([...cur, ...add])];
}

module.exports = {
  mergeKnowledgePointIds,
};
