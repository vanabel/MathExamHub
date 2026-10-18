const path = require('path');

const INCLUDEGRAPHICS_RE = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;

function normalizeStem(name) {
  return String(name || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\.(png|jpg|jpeg|gif|pdf)$/i, '');
}

/**
 * Collect \\includegraphics{...} reference stems from LaTeX snippets.
 */
function collectIncludegraphicsRefs(...textParts) {
  const refs = new Set();
  for (const part of textParts) {
    if (part == null) continue;
    const text = String(part);
    INCLUDEGRAPHICS_RE.lastIndex = 0;
    let match;
    while ((match = INCLUDEGRAPHICS_RE.exec(text)) !== null) {
      const raw = match[1].trim();
      refs.add(raw);
      refs.add(normalizeStem(raw));
      refs.add(path.posix.basename(raw));
      refs.add(normalizeStem(path.posix.basename(raw)));
    }
  }
  refs.delete('');
  return refs;
}

function zipAssetMatchesRefs(asset, refs) {
  if (!refs.size) return false;
  const candidates = [
    asset.rel,
    asset.fileName,
    asset.baseName,
    normalizeStem(asset.rel),
    normalizeStem(asset.fileName),
    normalizeStem(asset.baseName),
  ].filter(Boolean);
  return candidates.some((c) => refs.has(c) || refs.has(normalizeStem(c)));
}

function filterZipImageAssetsByRefs(imageAssets, refs) {
  return (imageAssets || []).filter((asset) => zipAssetMatchesRefs(asset, refs));
}

module.exports = {
  collectIncludegraphicsRefs,
  filterZipImageAssetsByRefs,
};
