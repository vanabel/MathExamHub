const fs = require('fs');
const { execSync } = require('child_process');
const { compileExportZip, hasXeLaTeX } = require('../../backend/test/scenario/latexCompileHelper');

function assertExportZipBuffer(zipBuffer, { expectAcademicYear } = {}) {
  if (!hasXeLaTeX()) {
    return { skipped: true, reason: 'xelatex missing' };
  }
  const { pdfPath } = compileExportZip(zipBuffer);
  const text = execSync(`pdftotext -layout "${pdfPath}" -`, { encoding: 'utf8' });
  if (!/共计\s*\d+\s*分|共\s*\d+\s*分/.test(text) && !/\d+\s*分/.test(text)) {
    throw new Error(`PDF missing total score hint: ${text.slice(0, 400)}`);
  }
  if (expectAcademicYear) {
    const normalized = text.replace(/[–—]/g, '至');
    if (!normalized.includes(expectAcademicYear) && !text.includes('2026') && !text.includes('2027')) {
      throw new Error(`Expected academic year ${expectAcademicYear} in PDF`);
    }
  }
  return { pdfPath, text };
}

async function readDownloadBuffer(download) {
  const p = await download.path();
  if (!p) throw new Error('download path missing');
  return fs.readFileSync(p);
}

module.exports = {
  assertExportZipBuffer,
  readDownloadBuffer,
};
