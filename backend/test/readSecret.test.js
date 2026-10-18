const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { readNewPassword } = require('../scripts/lib/readSecret');

describe('readNewPassword', () => {
  const prev = process.env.RESET_PASSWORD;

  afterEach(() => {
    if (prev === undefined) delete process.env.RESET_PASSWORD;
    else process.env.RESET_PASSWORD = prev;
  });

  it('reads from RESET_PASSWORD env without echoing', async () => {
    process.env.RESET_PASSWORD = 'secret-from-env';
    const pwd = await readNewPassword({ envVar: 'RESET_PASSWORD' });
    assert.equal(pwd, 'secret-from-env');
  });
});
