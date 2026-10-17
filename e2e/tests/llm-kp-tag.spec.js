const { test, expect } = require('@playwright/test');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';

async function registerAndLogin(page, { uid, password, email }) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ apiBase: base, username, pass, mail }) => {
    await fetch(`${base}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass, email: mail }),
    });
    await fetch(`${base}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass }),
    });
    const me = await fetch(`${base}/auth/me`, { credentials: 'include' }).then((r) => r.json());
    if (me.user) localStorage.setItem('currentUser', JSON.stringify(me.user));
    const banks = await fetch(`${base}/banks/mine`, { credentials: 'include' }).then((r) => r.json());
    const personal = (banks.banks || []).find((b) => b.isPersonalDefault) || (banks.banks || [])[0];
    if (personal) localStorage.setItem('currentBankId', personal._id);
  }, { apiBase, username: uid, pass: password, mail: email });
}

test.describe('LLM knowledge point tagging', () => {
  test('dry-run suggest returns suggestions for sample bank', async ({ page }) => {
    const uid = `kptag_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });

    await page.evaluate(async ({ base }) => {
      const bankId = localStorage.getItem('currentBankId');
      await fetch(`${base}/onboarding/import-sample`, {
        method: 'POST',
        credentials: 'include',
        headers: bankId ? { 'X-Bank-Id': bankId } : {},
      });
    }, { base: apiBase });

    const result = await page.evaluate(async ({ base }) => {
      const bankId = localStorage.getItem('currentBankId');
      const headers = {
        'Content-Type': 'application/json',
        ...(bankId ? { 'X-Bank-Id': bankId } : {}),
      };
      const listRes = await fetch(`${base}/questions/list?limit=3`, { credentials: 'include', headers });
      const list = await listRes.json();
      const questions = list.questions || list;
      const ids = questions.slice(0, 2).map((q) => q._id);
      const tagRes = await fetch(`${base}/questions/llm-tag-knowledge-points`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ questionIds: ids }),
      });
      return tagRes.json();
    }, { base: apiBase });

    expect(result.dryRun).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].questionId).toBeTruthy();
  });
});
