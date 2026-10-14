const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateQuestionBatch, validateQuestionRecord } = require('../utils/questionValidator');

describe('questionValidator', () => {
  it('rejects missing stem', () => {
    const r = validateQuestionRecord({ type: '填空题', totalScore: 5 }, 0);
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => e.code === 'MISSING_STEM'));
  });

  it('batch summary counts valid rows', () => {
    const batch = validateQuestionBatch([
      { questionText: 'a', type: '填空题', totalScore: 3 },
      { type: '填空题', totalScore: 3 },
    ]);
    assert.equal(batch.summary.valid, 1);
    assert.equal(batch.summary.errorCount, 1);
  });
});
