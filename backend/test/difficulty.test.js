const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDifficulty, DIFFICULTY_VALUES } = require('../constants/difficulty');
const { mapDifficultyForMigration } = require('../constants/difficulty');

describe('difficulty', () => {
  it('maps legacy labels to 易/中/难', () => {
    assert.equal(normalizeDifficulty('简单'), '易');
    assert.equal(normalizeDifficulty('中等'), '中');
    assert.equal(normalizeDifficulty('较难'), '难');
    assert.equal(mapDifficultyForMigration('困难'), '难');
  });

  it('defaults unknown values to 中', () => {
    assert.equal(normalizeDifficulty(''), '中');
    assert.equal(normalizeDifficulty(undefined), '中');
    assert.equal(normalizeDifficulty('超难'), '中');
  });

  it('accepts canonical enum values', () => {
    for (const value of DIFFICULTY_VALUES) {
      assert.equal(normalizeDifficulty(value), value);
    }
  });
});
