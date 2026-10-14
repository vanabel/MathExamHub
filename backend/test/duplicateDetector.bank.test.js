const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  bucketKey,
  lengthBucket,
  normalizeText,
  formatGroupsForApi,
} = require('../utils/duplicateDetector');

describe('duplicateDetector bank bucketing', () => {
  it('lengthBucket grows with text length', () => {
    assert.ok(lengthBucket('a') <= lengthBucket('a'.repeat(200)));
  });

  it('bucketKey groups same subject and identical normalized prefix', () => {
    const q1 = { subject: '解析几何', questionText: '椭圆的标准方程' };
    const q2 = { subject: '解析几何', questionText: '椭圆的标准方程' };
    assert.equal(bucketKey(q1), bucketKey(q2));
  });

  it('bucketKey separates different subjects', () => {
    const a = bucketKey({ subject: 'A', questionText: 'same text here' });
    const b = bucketKey({ subject: 'B', questionText: 'same text here' });
    assert.notEqual(a, b);
  });

  it('formatGroupsForApi preserves matchKind', () => {
    const out = formatGroupsForApi([
      {
        matchKind: 'exact_hash',
        contentHash: 'abc',
        questions: [{ _id: '1', questionText: 'x', type: '填空题', subject: 's' }],
      },
    ]);
    assert.equal(out[0].matchKind, 'exact_hash');
    assert.equal(out[0].contentHash, 'abc');
  });

  it('normalizeText is stable', () => {
    assert.equal(normalizeText('  Hi '), normalizeText('hi'));
  });
});
