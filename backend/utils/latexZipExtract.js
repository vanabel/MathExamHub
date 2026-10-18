const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { normalizeRelPath } = require('./latexTexBundle');

const MAX_ZIP_ENTRIES = 500;
const MAX_ENTRY_BYTES = 8 * 1024 * 1024;

function isZipSlip(entryName, destRoot) {
  const resolved = path.resolve(destRoot, entryName);
  const root = path.resolve(destRoot);
  return !resolved.startsWith(`${root}${path.sep}`) && resolved !== root;
}

/**
 * Extract .tex + image assets from zip into a temp directory (caller must rm -rf tempRoot).
 */
function extractZipBundle(zipPath) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mathexam-import-zip-'));
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  if (entries.length > MAX_ZIP_ENTRIES) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    const err = new Error(`ZIP 条目过多（>${MAX_ZIP_ENTRIES}）`);
    err.status = 400;
    throw err;
  }

  const filesByPath = {};
  const imageAssets = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const rel = normalizeRelPath(entry.entryName);
    if (!rel || rel.includes('..')) continue;
    if (entry.header.size > MAX_ENTRY_BYTES) continue;

    const outPath = path.join(tempRoot, rel);
    if (isZipSlip(entry.entryName, tempRoot)) continue;

    if (/\.tex$/i.test(rel)) {
      filesByPath[rel] = entry.getData().toString('utf8');
      const base = path.posix.basename(rel);
      filesByPath[base] = filesByPath[rel];
      continue;
    }

    if (/\.(png|jpg|jpeg|gif|pdf)$/i.test(rel)) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      const data = entry.getData();
      fs.writeFileSync(outPath, data);
      const base = path.basename(rel);
      const stem = base.replace(/\.(png|jpg|jpeg|gif|pdf)$/i, '');
      imageAssets.push({
        rel,
        fullPath: outPath,
        baseName: stem,
        fileName: base,
      });
    }
  }

  return { filesByPath, imageAssets, tempRoot };
}

function rmTempDir(dir) {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

module.exports = {
  extractZipBundle,
  rmTempDir,
};
