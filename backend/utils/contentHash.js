const crypto = require('crypto');
const { normalizeText } = require('./duplicateDetector');

/**
 * 基于题干归一化文本生成内容指纹（用于去重与迁移）。
 * @param {{ questionText?: string, originalLaTeX?: string }} question
 */
function computeContentHash(question) {
  const raw = question.originalLaTeX || question.questionText || '';
  const normalized = normalizeText(raw);
  if (!normalized) {
    return null;
  }
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * @param {{ _id?: unknown, questionText?: string, originalLaTeX?: string }} question
 * @param {Set<string>} usedHashes
 */
function resolveContentHash(question, usedHashes) {
  let hash = computeContentHash(question);
  if (!hash) return null;
  if (!usedHashes.has(hash)) {
    usedHashes.add(hash);
    return hash;
  }
  const suffix = String(question._id || 'dup').slice(-8);
  const suffixed = `${hash}-${suffix}`;
  usedHashes.add(suffixed);
  return suffixed;
}

module.exports = {
  computeContentHash,
  resolveContentHash,
};
