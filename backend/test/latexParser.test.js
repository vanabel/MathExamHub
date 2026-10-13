const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { LatexParser } = require('../utils/latexParser');

describe('LatexParser', () => {
  it('parses minimal fill-in fixture with two problems', () => {
    const texPath = path.join(__dirname, 'fixtures', 'minimal-fillin.tex');
    const content = fs.readFileSync(texPath, 'utf-8');
    const parser = new LatexParser();
    const questions = parser.parse(content);

    assert.equal(questions.length, 2);
    assert.equal(questions[0].type, '填空题');
    assert.ok(questions[0].questionText.includes('1+1'));
    assert.ok(questions[1].totalScore === 5 || questions[1].totalScore === 0);
  });

  it('returns empty array for content without problems', () => {
    const parser = new LatexParser();
    const questions = parser.parse('\\documentclass{article}\\begin{document}\\end{document}');
    assert.equal(questions.length, 0);
  });
});
