const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  activeQuestionFilter,
  examPoolFilter,
  QUESTION_STATUS,
} = require('../constants/questionLifecycle');

describe('questionLifecycle filters', () => {
  it('activeQuestionFilter excludes deleted', () => {
    const q = activeQuestionFilter({ bankId: 'abc' });
    assert.equal(q.status.$ne, QUESTION_STATUS.DELETED);
    assert.equal(q.bankId, 'abc');
  });

  it('examPoolFilter excludes deleted and archived', () => {
    const q = examPoolFilter({ bankId: 'x' });
    assert.deepEqual(q.status.$nin, [QUESTION_STATUS.DELETED, QUESTION_STATUS.ARCHIVED]);
  });
});
