const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { extractZipBundle, rmTempDir } = require('../utils/latexZipExtract');

describe('latexZipExtract', () => {
  it('extracts tex and blocks zip-slip paths', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-test-'));
    const zipPath = path.join(tmp, 'bundle.zip');
    const zip = new AdmZip();
    zip.addFile('exam.tex', Buffer.from('\\documentclass{article}\\begin{document}\\end{document}'));
    zip.addFile('../evil.tex', Buffer.from('bad'));
    zip.writeZip(zipPath);

    const { filesByPath, tempRoot } = extractZipBundle(zipPath);
    assert.ok(filesByPath['exam.tex']);
    assert.equal(filesByPath['../evil.tex'], undefined);
    rmTempDir(tempRoot);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
