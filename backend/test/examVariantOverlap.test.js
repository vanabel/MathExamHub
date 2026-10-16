const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeVariantOverlap } = require('../utils/examVariantOverlap');

describe('examVariantOverlap', () => {
  it('computes overlap ratio', () => {
    const { overlapCount, overlapRatio } = computeVariantOverlap(['a', 'b', 'c'], ['b', 'c', 'd']);
    assert.equal(overlapCount, 2);
    assert.equal(overlapRatio, 2 / 3);
  });
});
