const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const bankService = require('../services/bankService');

describe('platform admin bank helpers', () => {
  it('isPlatformAdminUser recognizes admin roles', () => {
    assert.equal(bankService.isPlatformAdminUser({ role: 'admin' }), true);
    assert.equal(bankService.isPlatformAdminUser({ role: 'Admin' }), true);
    assert.equal(bankService.isPlatformAdminUser({ role: 'user' }), false);
  });
});
