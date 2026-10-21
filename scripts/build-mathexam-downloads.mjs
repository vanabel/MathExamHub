#!/usr/bin/env node
/**
 * Sync mathexam.sty + import sample into frontend/public/downloads and build template zip.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(repoRoot, 'TeX/VERSION'), 'utf8').trim();
const stySrc = path.join(repoRoot, 'TeX/mathexam.sty');
const sampleSrc = path.join(repoRoot, 'docs/templates/mathexam-import-sample.tex');
const outDir = path.join(repoRoot, 'frontend/public/downloads');
const styDest = path.join(outDir, 'mathexam.sty');
const sampleDest = path.join(outDir, 'mathexam-import-sample.tex');
const zipDest = path.join(outDir, `mathexam-v${version}.zip`);

if (!fs.existsSync(stySrc)) {
  console.error('Missing TeX/mathexam.sty');
  process.exit(1);
}
if (!fs.existsSync(sampleSrc)) {
  console.error('Missing docs/templates/mathexam-import-sample.tex');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(stySrc, styDest);
fs.copyFileSync(sampleSrc, sampleDest);

if (fs.existsSync(zipDest)) fs.unlinkSync(zipDest);
const zip = spawnSync(
  'zip',
  ['-j', zipDest, styDest, sampleDest],
  { cwd: outDir, encoding: 'utf8' },
);
if (zip.status !== 0) {
  console.error('zip failed:', zip.stderr || zip.stdout);
  process.exit(zip.status || 1);
}

console.log(`mathexam downloads ready (v${version}):`, outDir);
