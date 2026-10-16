const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const requirePlatformAdmin = require('../middleware/requirePlatformAdmin');

describe('requirePlatformAdmin', () => {
  it('returns 403 for non-admin roles', () => {
    let code;
    const req = { user: { role: 'Basic' } };
    const res = {
      status(c) {
        code = c;
        return { json() {} };
      },
    };
    let nextCalled = false;
    requirePlatformAdmin(req, res, () => {
      nextCalled = true;
    });
    assert.equal(code, 403);
    assert.equal(nextCalled, false);
  });

  it('calls next for admin role', () => {
    let nextCalled = false;
    const req = { user: { role: 'admin' } };
    const res = { status: () => ({ json() {} }) };
    requirePlatformAdmin(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });
});
