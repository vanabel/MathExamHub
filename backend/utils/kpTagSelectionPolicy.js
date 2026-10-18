/**
 * Pick 1–maxKps suggestions: prefer deepest (leaf) nodes, then confidence.
 * Additional KPs beyond the first require confidence >= extraMinConfidence.
 */
function pathDepth(path) {
  return String(path || '')
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .length;
}

function pathOfCatalogEntry(catalog, id) {
  const hit = catalog.find((k) => k.id === id);
  return hit?.path || '';
}

function pathsConflict(pathA, pathB) {
  if (!pathA || !pathB) return false;
  const a = pathA.startsWith('/') ? pathA : `/${pathA}`;
  const b = pathB.startsWith('/') ? pathB : `/${pathB}`;
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function applyKpTagSelectionPolicy(suggestions, catalog, opts = {}) {
  const maxKps = Math.min(3, Math.max(1, Number(opts.maxKpsPerQuestion) || 1));
  const extraMinConfidence = Number(opts.extraMinConfidence) ?? 0.85;
  const list = (suggestions || []).slice();

  list.sort((a, b) => {
    const depthDiff = pathDepth(pathOfCatalogEntry(catalog, b.knowledgePointId))
      - pathDepth(pathOfCatalogEntry(catalog, a.knowledgePointId));
    if (depthDiff !== 0) return depthDiff;
    return (b.confidence || 0) - (a.confidence || 0);
  });

  const picked = [];
  for (const s of list) {
    if (picked.length >= maxKps) break;
    if (picked.length > 0 && (s.confidence || 0) < extraMinConfidence) continue;
    const p = pathOfCatalogEntry(catalog, s.knowledgePointId);
    if (picked.some((x) => pathsConflict(p, pathOfCatalogEntry(catalog, x.knowledgePointId)))) {
      continue;
    }
    picked.push(s);
  }
  return picked;
}

module.exports = {
  applyKpTagSelectionPolicy,
  pathDepth,
  pathsConflict,
};
