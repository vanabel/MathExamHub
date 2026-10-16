export const COVERAGE_GAP_BATCH_KEY = 'coverageGapBatch';

export function loadCoverageGapBatch() {
  try {
    const raw = sessionStorage.getItem(COVERAGE_GAP_BATCH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.gaps) || !data.gaps.length) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveCoverageGapBatch(payload) {
  sessionStorage.setItem(COVERAGE_GAP_BATCH_KEY, JSON.stringify(payload));
}

export function listQueryToRouteQuery(listQuery) {
  if (!listQuery) return {};
  const q = {};
  if (listQuery.type) q.type = listQuery.type;
  if (listQuery.difficulty) q.difficulty = listQuery.difficulty;
  if (listQuery.subject) q.subject = listQuery.subject;
  if (listQuery.knowledgePointId) q.knowledgePointId = listQuery.knowledgePointId;
  if (listQuery.subtree === 'true') q.subtree = 'true';
  if (listQuery.minScore != null) q.minScore = String(listQuery.minScore);
  if (listQuery.maxScore != null) q.maxScore = String(listQuery.maxScore);
  return q;
}
