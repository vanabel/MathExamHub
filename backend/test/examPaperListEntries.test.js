const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildExamPaperEntries, paginateEntries } = require('../utils/examPaperListEntries');

describe('examPaperListEntries', () => {
  it('counts pairs as one entry', () => {
    const gid = 'g1';
    const papers = [
      { _id: '1', variantGroupId: gid, variantLabel: 'A', createdAt: new Date('2026-01-02') },
      { _id: '2', variantGroupId: gid, variantLabel: 'B', createdAt: new Date('2026-01-02') },
      { _id: '3', createdAt: new Date('2026-01-01') },
    ];
    const entries = buildExamPaperEntries(papers);
    assert.equal(entries.length, 2);
    const page = paginateEntries(entries, 0, 10);
    assert.equal(page.total, 2);
    assert.equal(page.pairs.length, 1);
    assert.equal(page.singles.length, 1);
  });
});
