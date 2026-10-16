/**
 * @param {string[]} idsA
 * @param {string[]} idsB
 * @returns {{ overlapCount: number, overlapRatio: number }}
 */
function computeVariantOverlap(idsA, idsB) {
  const setA = new Set((idsA || []).map(String));
  const b = (idsB || []).map(String);
  let overlapCount = 0;
  for (const id of b) {
    if (setA.has(id)) overlapCount += 1;
  }
  const denom = Math.max(setA.size, b.length, 1);
  return { overlapCount, overlapRatio: overlapCount / denom };
}

module.exports = { computeVariantOverlap };
