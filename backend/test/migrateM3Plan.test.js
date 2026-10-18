const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  planOrphanQuestionBindings,
  parseMigrateM3Args,
} = require('../scripts/lib/migrateM3Plan');

describe('parseMigrateM3Args', () => {
  it('defaults to dry-run unless --apply', () => {
    assert.deepEqual(parseMigrateM3Args([]), {
      dryRun: true,
      apply: false,
      fallbackUserId: null,
      fallbackUsername: null,
    });
    assert.equal(parseMigrateM3Args(['--apply']).dryRun, false);
  });

  it('parses fallback username and user id', () => {
    const args = parseMigrateM3Args([
      '--fallback-username=vanabel',
      '--fallback-user-id=abc123',
    ]);
    assert.equal(args.fallbackUsername, 'vanabel');
    assert.equal(args.fallbackUserId, 'abc123');
  });
});

describe('planOrphanQuestionBindings', () => {
  const fallback = { _id: 'f1', username: 'vanabel' };
  const userByUsername = new Map([
    ['alice', { _id: 'u1', username: 'alice' }],
  ]);

  it('counts bind to createdBy vs fallback personal bank', () => {
    const orphans = [
      { _id: 'q1', createdBy: 'alice' },
      { _id: 'q2', createdBy: 'unknown' },
      { _id: 'q3' },
    ];
    const plan = planOrphanQuestionBindings(orphans, userByUsername, fallback);
    assert.equal(plan.total, 3);
    assert.equal(plan.bindToCreatedBy, 1);
    assert.equal(plan.bindToFallback, 2);
    assert.equal(plan.skipped, 0);
    assert.equal(plan.fallbackUsername, 'vanabel');
  });

  it('skips when no fallback and no createdBy match', () => {
    const plan = planOrphanQuestionBindings([{ _id: 'q1' }], userByUsername, null);
    assert.equal(plan.skipped, 1);
    assert.equal(plan.bindToFallback, 0);
  });
});
