const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  difficultyNeedsM2Migration,
  questionNeedsStemImageMigration,
} = require('../scripts/lib/databaseHealthReport');

describe('databaseHealthReport helpers', () => {
  it('detects legacy difficulty labels', () => {
    assert.equal(difficultyNeedsM2Migration('简单'), true);
    assert.equal(difficultyNeedsM2Migration('中'), false);
  });

  it('detects stem HTML still embedded in questionText', () => {
    assert.equal(
      questionNeedsStemImageMigration({
        questionText: 'See <img src="/x.png">',
        images: [],
      }),
      true,
    );
    assert.equal(
      questionNeedsStemImageMigration({
        questionText: 'Plain text',
        images: [],
      }),
      false,
    );
  });
});
