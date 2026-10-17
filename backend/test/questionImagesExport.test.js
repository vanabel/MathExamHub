const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { LatexGenerator } = require('../utils/latexParser');

describe('generateImagesLaTeX export', () => {
  it('emits includegraphics from structured images', () => {
    const gen = new LatexGenerator();
    const latex = gen.generateImagesLaTeX([
      { url: 'course-fig3.pdf', label: '3', caption: '图3', width: '0.5\\textwidth' },
    ]);
    assert.match(latex, /\\includegraphics\[width=0\.5\\textwidth\]\{fig3\}/);
    assert.match(latex, /\\label\{fig:3\}/);
  });
});
