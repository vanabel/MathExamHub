const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateAbVariants } = require('../services/examVariantService');

function q(id, overrides = {}) {
  return {
    _id: String(id),
    type: '填空题',
    difficulty: '中',
    totalScore: 4,
    subject: '解析几何',
    status: 'published',
    knowledgePointIds: [],
    ...overrides,
  };
}

describe('generateAbVariants score gap', () => {
  it('requires allowScoreGap when blueprint target exceeds actual total', () => {
    const pool = [q('1'), q('2'), q('3')];
    const blueprint = {
      title: 'ab-gap',
      totalScore: 100,
      randomSeed: 1,
      allowRelaxation: false,
      sections: [{ type: '填空题', count: 3, scoreEach: 4 }],
    };
    const ab = generateAbVariants(blueprint, pool, new Map(), 1, 100, 0.5, {
      allowScoreGap: false,
    });
    assert.equal(ab.scoreGapRequiresConfirm, true);
    assert.ok(ab.scoreGap?.variantA || ab.resultA.scoreGapRequiresConfirm);

    const allowed = generateAbVariants(blueprint, pool, new Map(), 1, 100, 0.5, {
      allowScoreGap: true,
    });
    assert.equal(allowed.scoreGapRequiresConfirm, false);
    assert.equal(allowed.resultA.success, true);
  });
});
