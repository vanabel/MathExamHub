const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('root pnpm-workspace.yaml (pnpm run update)', () => {
  const yaml = fs.readFileSync(path.join(__dirname, '../../pnpm-workspace.yaml'), 'utf8');

  it('sets verifyDepsBeforeRun false (pnpm 11 reads workspace file, not .npmrc)', () => {
    assert.match(yaml, /^\s*verifyDepsBeforeRun:\s*false\s*$/m);
  });

  it('disables electron native builds on accidental root pnpm install', () => {
    assert.match(yaml, /electron:\s*false/);
  });
});
