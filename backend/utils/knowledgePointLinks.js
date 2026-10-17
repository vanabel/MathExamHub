function syncKnowledgePointIdsFromLinks(links) {
  return [...new Set((links || []).map((l) => String(l.knowledgePointId)).filter(Boolean))];
}

function reconcileLinksFromIds(existingLinks, knowledgePointIds, { newSource = 'manual' } = {}) {
  const ids = (knowledgePointIds || []).map(String).filter(Boolean);
  const byId = new Map(
    (existingLinks || []).map((l) => [String(l.knowledgePointId), l]),
  );
  return ids.map((id) => {
    const prev = byId.get(id);
    if (prev) {
      return {
        knowledgePointId: id,
        source: prev.source || newSource,
        confidence: prev.confidence,
      };
    }
    return { knowledgePointId: id, source: newSource };
  });
}

function linksFromLlmSuggestions(suggestions, { replace = false, existingLinks = [] } = {}) {
  const incoming = (suggestions || []).map((s) => ({
    knowledgePointId: String(s.knowledgePointId),
    source: 'llm',
    confidence: s.confidence,
  }));
  if (replace) return incoming;
  const byId = new Map(
    (existingLinks || []).map((l) => [String(l.knowledgePointId), l]),
  );
  for (const link of incoming) {
    byId.set(link.knowledgePointId, link);
  }
  return [...byId.values()];
}

function mergeKnowledgePointIds(existing, toAdd, replace = false) {
  const add = (toAdd || []).map(String).filter(Boolean);
  if (replace) return [...new Set(add)];
  const cur = (existing || []).map(String).filter(Boolean);
  return [...new Set([...cur, ...add])];
}

module.exports = {
  syncKnowledgePointIdsFromLinks,
  reconcileLinksFromIds,
  linksFromLlmSuggestions,
  mergeKnowledgePointIds,
};
