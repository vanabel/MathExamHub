const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { hasMinRole } = require('../constants/bankRoles');

describe('bankRoles', () => {
  it('owner can write', () => {
    assert.equal(hasMinRole('owner', 'editor'), true);
  });
  it('viewer cannot write', () => {
    assert.equal(hasMinRole('viewer', 'editor'), false);
  });
});
