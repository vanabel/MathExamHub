const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { countReviewRows, isJobReviewOpen } = require('../utils/kpTagJobReviewCounts');

describe('kpTagJobReviewCounts', () => {
  it('countReviewRows tallies statuses', () => {
    const counts = countReviewRows([
      { status: 'pending' },
      { status: 'accepted' },
      { status: 'rejected' },
      { status: 'edited' },
      { status: 'pending' },
    ]);
    assert.equal(counts.pending, 2);
    assert.equal(counts.accepted, 1);
    assert.equal(counts.rejected, 1);
    assert.equal(counts.edited, 1);
  });

  it('isJobReviewOpen when completed and not applied', () => {
    assert.equal(isJobReviewOpen({ status: 'completed', appliedAt: null }), true);
    assert.equal(isJobReviewOpen({ status: 'completed', appliedAt: new Date() }), false);
    assert.equal(isJobReviewOpen({ status: 'running' }), true);
    assert.equal(isJobReviewOpen({ status: 'completed', appliedAt: null, dismissedAt: new Date() }), false);
  });
});
