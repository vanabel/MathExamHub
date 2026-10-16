const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const requireAuth = require('../middleware/requireAuth');

describe('requireAuth', () => {
  it('returns 401 when session is missing', () => {
    let code;
    const req = { isAuthenticated: () => false };
    const res = {
      status(c) {
        code = c;
        return { json() {} };
      },
    };
    let nextCalled = false;
    requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(code, 401);
    assert.equal(nextCalled, false);
  });

  it('calls next when authenticated', () => {
    let nextCalled = false;
    const req = { isAuthenticated: () => true, user: { _id: '1' } };
    const res = { status: () => ({ json() {} }) };
    requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });
});
