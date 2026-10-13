const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeText,
  calculateSimilarity,
} = require('../utils/duplicateDetector');

describe('duplicateDetector', () => {
  it('normalizeText strips HTML and collapses whitespace', () => {
    const a = normalizeText('<b>Hello</b>  World');
    const b = normalizeText('helloworld');
    assert.equal(a, b);
  });

  it('calculateSimilarity returns 1 for identical normalized text', () => {
    const t = '设 $f(x)=x^2$ 求导';
    assert.equal(calculateSimilarity(t, t), 1);
  });

  it('calculateSimilarity returns 0 for unrelated text', () => {
    assert.ok(calculateSimilarity('abc', 'xyz') < 0.5);
  });

  it('calculateSimilarity is higher for overlapping content than unrelated', () => {
    const related = calculateSimilarity('椭圆的标准方程', '椭圆标准方程为');
    const unrelated = calculateSimilarity('椭圆的标准方程', '矩阵的秩');
    assert.ok(related > unrelated);
  });
});
