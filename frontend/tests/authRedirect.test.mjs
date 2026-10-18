import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loginUrlWithRedirect, sanitizeRedirectPath } from '../src/utils/authRedirect.js';

describe('authRedirect', () => {
  it('rejects external redirect targets', () => {
    assert.equal(sanitizeRedirectPath('//evil.com'), '');
    assert.equal(sanitizeRedirectPath('https://x'), '');
  });

  it('builds login URL with encoded redirect', () => {
    const url = loginUrlWithRedirect('/question-list?type=填空题');
    const q = new URL(url, 'http://localhost');
    assert.equal(q.pathname, '/login');
    assert.match(q.searchParams.get('redirect'), /question-list/);
  });
});
