const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('root .npmrc (pnpm run update)', () => {
  it('disables verify-deps-before-run', () => {
    const npmrc = fs.readFileSync(path.join(__dirname, '../../.npmrc'), 'utf8');
    assert.match(npmrc, /^\s*verify-deps-before-run=false\s*$/m);
  });
});
