const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildQuestionListFilter,
  parseListPagination,
  parseListSort,
} = require('../utils/questionListQuery');

describe('questionListQuery', () => {
  it('builds text and type filters', () => {
    const bankId = '507f1f77bcf86cd799439011';
    const filter = buildQuestionListFilter({
      bankId,
      query: { q: '勾股', type: '填空题', difficulty: '中' },
    });
    assert.equal(filter.bankId, bankId);
    assert.equal(filter.type, '填空题');
    assert.equal(filter.difficulty, '中');
    assert.ok(filter.questionText.$all);
  });

  it('parses pagination', () => {
    const p = parseListPagination({ limit: '30', offset: '10' });
    assert.equal(p.limit, 30);
    assert.equal(p.offset, 10);
    assert.equal(p.explicit, true);
  });

  it('parses sort', () => {
    assert.deepEqual(parseListSort({ sortBy: 'totalScore', sortOrder: 'asc' }), { totalScore: 1 });
  });
});
