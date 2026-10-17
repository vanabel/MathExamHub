const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildQuestionListFilter,
  parseListPagination,
  parseListSort,
  ALLOWED_PAGE_SIZES,
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
    assert.equal(filter.status.$ne, 'deleted');
  });

  it('supports exact score or min/max range', () => {
    const bankId = '507f1f77bcf86cd799439011';
    const exact = buildQuestionListFilter({ bankId, query: { score: '10' } });
    assert.equal(exact.totalScore, 10);

    const range = buildQuestionListFilter({ bankId, query: { minScore: '5', maxScore: '15' } });
    assert.equal(range.totalScore.$gte, 5);
    assert.equal(range.totalScore.$lte, 15);
  });

  it('parses page and pageSize pagination', () => {
    const p = parseListPagination({ page: '3', pageSize: '10' });
    assert.equal(p.pageSize, 10);
    assert.equal(p.page, 3);
    assert.equal(p.offset, 20);
    assert.equal(p.explicit, true);
    assert.deepEqual(ALLOWED_PAGE_SIZES, [10, 20, 50, 100]);
  });

  it('parses legacy limit/offset pagination', () => {
    const p = parseListPagination({ limit: '30', offset: '10' });
    assert.equal(p.limit, 30);
    assert.equal(p.offset, 10);
    assert.equal(p.explicit, true);
  });

  it('parses sort', () => {
    assert.deepEqual(parseListSort({ sortBy: 'totalScore', sortOrder: 'asc' }), { totalScore: 1 });
  });
});
