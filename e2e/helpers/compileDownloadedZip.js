#!/usr/bin/env node
/**
 * Compile a mathexam export ZIP with XeLaTeX (same helper as scenario tests).
 * Usage: node e2e/helpers/compileDownloadedZip.js /path/to/export.zip
 */
const fs = require('fs');
const path = require('path');
const { compileExportZip, hasXeLaTeX } = require('../../backend/test/scenario/latexCompileHelper');

const zipPath = process.argv[2];
if (!zipPath) {
  console.error('Usage: node compileDownloadedZip.js <export.zip>');
  process.exit(1);
}
if (!hasXeLaTeX()) {
  console.error('xelatex not found');
  process.exit(1);
}
const buf = fs.readFileSync(path.resolve(zipPath));
const { pdfPath } = compileExportZip(buf);
if (!fs.existsSync(pdfPath)) {
  console.error('PDF missing after compile');
  process.exit(1);
}
console.log('Compiled PDF:', pdfPath);
