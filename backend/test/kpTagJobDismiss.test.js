const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isJobReviewOpen, jobListCategory } = require('../utils/kpTagJobReviewCounts');

describe('kp tag job dismiss', () => {
  it('dismissed jobs are not review open and excluded from pending category', () => {
    const job = {
      status: 'completed',
      appliedAt: null,
      dismissedAt: new Date(),
      rows: [{ status: 'pending' }],
    };
    assert.equal(isJobReviewOpen(job), false);
    assert.equal(jobListCategory({ ...job, reviewCounts: { pending: 1 } }), 'dismissed');
  });
});
