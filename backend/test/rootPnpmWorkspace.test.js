const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('root pnpm-workspace.yaml (pnpm run update)', () => {
  const yaml = fs.readFileSync(path.join(__dirname, '../../pnpm-workspace.yaml'), 'utf8');

  it('sets verifyDepsBeforeRun false (pnpm 11; not .npmrc)', () => {
    assert.match(yaml, /^\s*verifyDepsBeforeRun:\s*false\s*$/m);
  });

  it('sets strictDepBuilds false so denied electron builds do not fail install', () => {
    assert.match(yaml, /^\s*strictDepBuilds:\s*false\s*$/m);
  });

  it('includes root package only in pnpm workspace', () => {
    assert.match(yaml, /^\s*-\s*['"]?\.['"]?\s*$/m);
  });
});
