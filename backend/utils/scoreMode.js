/**
 * @param {number[]} values
 * @returns {number|null}
 */
function scoreMode(values) {
  if (!values?.length) return null;
  const freq = new Map();
  for (const raw of values) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    const key = Math.round(n * 100) / 100;
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  if (!freq.size) return null;
  let bestKey = null;
  let bestCount = -1;
  for (const [k, c] of freq) {
    if (c > bestCount) {
      bestCount = c;
      bestKey = k;
    }
  }
  return bestKey;
}

module.exports = { scoreMode };
