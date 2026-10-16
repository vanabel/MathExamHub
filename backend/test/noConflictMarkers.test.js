const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const path = require('path');

describe('repo hygiene', () => {
  it('has no git merge conflict markers in text sources', () => {
    const script = path.join(__dirname, '../../scripts/check-no-conflict-markers.sh');
    const out = execSync(`bash "${script}"`, { encoding: 'utf8' });
    assert.match(out, /No merge conflict markers/);
  });
});
