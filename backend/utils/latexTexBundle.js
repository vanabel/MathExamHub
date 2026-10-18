const path = require('path');

const INPUT_RE = /\\(?:input|include)\{([^}]+)\}/g;

function normalizeRelPath(name) {
  return String(name || '')
    .trim()
    .replace(/^\.\/?/, '')
    .replace(/\\/g, '/');
}

function withTexExt(name) {
  const n = normalizeRelPath(name);
  return /\.tex$/i.test(n) ? n : `${n}.tex`;
}

function lookupFile(filesByPath, requested, baseDir = '') {
  const raw = normalizeRelPath(requested);
  const candidates = [
    raw,
    withTexExt(raw),
    path.posix.join(baseDir, raw),
    path.posix.join(baseDir, withTexExt(raw)),
    path.posix.basename(raw),
    withTexExt(path.posix.basename(raw)),
  ].map(normalizeRelPath);

  for (const key of candidates) {
    if (filesByPath[key] != null) return { key, content: filesByPath[key] };
  }
  return null;
}

/**
 * Expand \\input / \\include recursively.
 */
function expandTexInputs(rootContent, filesByPath, opts = {}) {
  const missing = [];
  const visited = new Set();

  function expand(content, currentFile) {
    const baseDir = path.posix.dirname(normalizeRelPath(currentFile || 'main.tex'));
    return content.replace(INPUT_RE, (full, inc) => {
      const hit = lookupFile(filesByPath, inc, baseDir);
      if (!hit) {
        missing.push(inc);
        return `% mathexamhub: missing input ${inc}\n`;
      }
      const visitKey = hit.key;
      if (visited.has(visitKey)) {
        return `% mathexamhub: skipped cyclic input ${inc}\n`;
      }
      visited.add(visitKey);
      const expanded = expand(hit.content, hit.key);
      visited.delete(visitKey);
      return `\n${expanded}\n`;
    });
  }

  const mainFile = opts.mainFile || 'main.tex';
  return {
    content: expand(rootContent, mainFile),
    missing: [...new Set(missing)],
  };
}

function pickMainTexFile(filesByPath) {
  const entries = Object.entries(filesByPath);
  const prefer = entries.find(([name]) => /(^|\/)exam\.tex$/i.test(name));
  if (prefer) return prefer;
  const withClass = entries.find(([, body]) => /\\documentclass/.test(body));
  if (withClass) return withClass;
  return entries.sort((a, b) => b[1].length - a[1].length)[0] || null;
}

function buildFilesMapFromUploads(texUploads) {
  const filesByPath = {};
  for (const f of texUploads) {
    const base = path.basename(f.originalname || f.filename || 'main.tex');
    filesByPath[normalizeRelPath(base)] = f.content;
  }
  return filesByPath;
}

module.exports = {
  expandTexInputs,
  pickMainTexFile,
  buildFilesMapFromUploads,
  normalizeRelPath,
};
