const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  collectIncludegraphicsRefs,
  filterZipImageAssetsByRefs,
} = require('../utils/latexIncludegraphicsRefs');

describe('latexIncludegraphicsRefs', () => {
  it('filters zip assets to includegraphics references only', () => {
    const refs = collectIncludegraphicsRefs(String.raw`\includegraphics{fig1}\includegraphics{subdir/fig2.pdf}`);
    const assets = [
      { baseName: 'fig1', fileName: 'fig1.png', rel: 'fig1.png' },
      { baseName: 'exam', fileName: 'exam.pdf', rel: 'exam.pdf' },
      { baseName: 'fig2', fileName: 'fig2.pdf', rel: 'subdir/fig2.pdf' },
    ];
    const kept = filterZipImageAssetsByRefs(assets, refs);
    assert.equal(kept.length, 2);
    assert.ok(kept.some((a) => a.baseName === 'fig1'));
    assert.ok(kept.some((a) => a.baseName === 'fig2'));
  });
});
