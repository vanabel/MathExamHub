const fs = require('fs');
const { execSync } = require('child_process');
const { compileExportZip, hasXeLaTeX } = require('../../backend/test/scenario/latexCompileHelper');

function assertExportZipBuffer(zipBuffer, { expectAcademicYear } = {}) {
  if (!hasXeLaTeX()) {
    return { skipped: true, reason: 'xelatex missing' };
  }
  const { pdfPath } = compileExportZip(zipBuffer);
  const text = execSync(`pdftotext -layout "${pdfPath}" -`, { encoding: 'utf8' });
  if (!/共计\s*100\s*分|共\s*100\s*分/.test(text) && !/100\s*分/.test(text)) {
    throw new Error(`PDF missing total score hint: ${text.slice(0, 400)}`);
  }
  if (expectAcademicYear && !text.includes(expectAcademicYear)) {
    throw new Error(`Expected academic year ${expectAcademicYear} in PDF`);
  }
  return { pdfPath, text };
}

function readDownloadBuffer(download) {
  const p = download.path();
  if (!p) throw new Error('download path missing');
  return fs.readFileSync(p);
}

module.exports = {
  assertExportZipBuffer,
  readDownloadBuffer,
};
