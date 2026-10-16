const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawnSync } = require('child_process');

function hasXeLaTeX() {
  const r = spawnSync('xelatex', ['--version'], { encoding: 'utf8' });
  return r.status === 0;
}

function compileExportZip(zipBuffer, { preferExamTex = true } = {}) {
  if (!Buffer.isBuffer(zipBuffer)) {
    throw new Error('compileExportZip expects zip buffer');
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mathexam-export-'));
  const zipPath = path.join(dir, 'export.zip');
  fs.writeFileSync(zipPath, zipBuffer);
  execSync('unzip -q export.zip', { cwd: dir });
  let texFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.tex'));
  if (preferExamTex) {
    texFiles = texFiles.filter((f) => !/-answer\.tex$/i.test(f));
  }
  if (!texFiles.length) {
    throw new Error('No .tex in export zip');
  }
  const sourceTex = texFiles.find((f) => /^[\x20-\x7e]+\.tex$/.test(f)) || texFiles[0];
  const mainTex = 'exam.tex';
  if (sourceTex !== mainTex) {
    fs.copyFileSync(path.join(dir, sourceTex), path.join(dir, mainTex));
  }
  let lastErr = null;
  for (let pass = 0; pass < 2; pass += 1) {
    try {
      execSync(`xelatex -interaction=nonstopmode -halt-on-error "${mainTex}"`, {
        cwd: dir,
        stdio: 'pipe',
        env: process.env,
      });
    } catch (err) {
      lastErr = err;
      const logPath = path.join(dir, mainTex.replace(/\.tex$/i, '.log'));
      if (fs.existsSync(logPath)) {
        const tail = fs.readFileSync(logPath, 'utf8').slice(-4000);
        err.message += `\n--- xelatex log tail ---\n${tail}`;
      }
      throw err;
    }
  }
  const pdfPath = path.join(dir, mainTex.replace(/\.tex$/i, '.pdf'));
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not produced: ${pdfPath}${lastErr ? `\n${lastErr.message}` : ''}`);
  }
  return { workDir: dir, mainTex, pdfPath };
}

module.exports = {
  hasXeLaTeX,
  compileExportZip,
};
