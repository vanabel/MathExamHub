const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { LatexParser } = require('../utils/latexParser');

const repoRoot = path.join(__dirname, '../..');
const version = fs.readFileSync(path.join(repoRoot, 'TeX/VERSION'), 'utf8').trim();
const samplePath = path.join(repoRoot, 'frontend/public/downloads/mathexam-import-sample.tex');
const styPath = path.join(repoRoot, 'frontend/public/downloads/mathexam.sty');
const zipPath = path.join(repoRoot, 'frontend/public/downloads', `mathexam-v${version}.zip`);

describe('mathexam import sample template', () => {
  it('parses bundled sample into choice, fill-in, and subjective questions', () => {
    assert.ok(fs.existsSync(samplePath), 'run scripts/build-mathexam-downloads.mjs first');
    const content = fs.readFileSync(samplePath, 'utf8');
    const questions = new LatexParser().parse(content);
    assert.equal(questions.length, 3);
    const types = questions.map((q) => q.type);
    assert.deepEqual(types, ['单选题', '填空题', '解答题']);
    assert.equal(questions[0].correctAnswer, 'B');
    assert.equal(questions[1].correctAnswer, '5');
    assert.ok(questions[2].solution.includes("y'=2x") || questions[2].solution.includes('2x'));
    assert.ok(
      questions[2].originalLaTeX.includes('includegraphics'),
      'figure example should remain in original LaTeX',
    );
  });

  it('ships pinned mathexam.sty and template zip under frontend/public/downloads', () => {
    assert.ok(fs.existsSync(styPath));
    const sty = fs.readFileSync(styPath, 'utf8');
    assert.match(sty, /v2\.3\.3/);
    assert.ok(fs.existsSync(zipPath));
    assert.ok(fs.statSync(zipPath).size > 1000);
  });
});
