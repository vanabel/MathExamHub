const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  analyzeBlueprintCoverage,
  analyzeBlueprintCoverageMultiSeed,
  buildGapListQuery,
} = require('../utils/blueprintCoverage');

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

describe('blueprintCoverage', () => {
  it('detects slot gap when difficulty mix cannot be met', () => {
    const pool = [
      q('1', { difficulty: '中' }),
      q('2', { difficulty: '中' }),
    ];
    const blueprint = {
      title: 't',
      subject: '解析几何',
      randomSeed: 99,
      allowRelaxation: false,
      sections: [{
        type: '填空题',
        count: 2,
        scoreEach: 4,
        difficultyMix: { 易: 1, 难: 1 },
      }],
    };
    const analysis = analyzeBlueprintCoverage(blueprint, pool, new Map());
    assert.equal(analysis.ok, false);
    assert.ok(analysis.gaps.length >= 1);
    assert.ok(analysis.gaps[0].listQuery.type === '填空题');
  });

  it('multi-seed reports best and worst gap counts', () => {
    const pool = [
      q('1', { difficulty: '中' }),
      q('2', { difficulty: '难' }),
    ];
    const blueprint = {
      title: 't',
      subject: '解析几何',
      randomSeed: 10,
      allowRelaxation: false,
      sections: [{
        type: '填空题',
        count: 2,
        scoreEach: 4,
        difficultyMix: { 易: 1, 难: 1 },
      }],
    };
    const analysis = analyzeBlueprintCoverageMultiSeed(blueprint, pool, new Map(), { seedTrials: 4 });
    assert.equal(analysis.multiSeed.seedTrials, 4);
    assert.equal(analysis.multiSeed.attempts.length, 4);
    assert.ok(analysis.multiSeed.best);
    assert.ok(analysis.multiSeed.worst);
    assert.ok(analysis.multiSeed.worst.gapCount >= analysis.multiSeed.best.gapCount);
  });

  it('buildGapListQuery includes score band', () => {
    const qry = buildGapListQuery({
      type: '填空题',
      scoreEach: 10,
      scoreTolerancePct: 0.15,
      knowledgePointIds: [],
    }, '难');
    assert.equal(qry.difficulty, '难');
    assert.equal(qry.minScore, 8.5);
    assert.equal(qry.maxScore, 11.5);
  });
});
