const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeContentHash, resolveContentHash } = require('../utils/contentHash');

describe('contentHash', () => {
  it('is stable for the same normalized content', () => {
    const a = computeContentHash({ questionText: '设 $f(x)=x^2$' });
    const b = computeContentHash({ questionText: '设 $f(x)=x^2$' });
    assert.equal(a, b);
    assert.match(a, /^[a-f0-9]{64}$/);
  });

  it('prefers originalLaTeX over questionText', () => {
    const hash = computeContentHash({
      questionText: 'A',
      originalLaTeX: '\\fillin{1}',
    });
    const fromLatex = computeContentHash({ originalLaTeX: '\\fillin{1}' });
    assert.equal(hash, fromLatex);
  });

  it('resolveContentHash suffixes on collision', () => {
    const used = new Set();
    const q1 = { _id: '507f1f77bcf86cd799439011', questionText: 'same' };
    const q2 = { _id: '507f1f77bcf86cd799439012', questionText: 'same' };
    const h1 = resolveContentHash(q1, used);
    const h2 = resolveContentHash(q2, used);
    assert.notEqual(h1, h2);
    assert.ok(h2.startsWith(h1));
  });
});
