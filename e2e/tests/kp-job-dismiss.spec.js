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
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass }),
    });
    if (!loginRes.ok) throw new Error(`login failed: ${loginRes.status}`);
    const me = await fetch(`${base}/auth/me`, { credentials: 'include' }).then((r) => r.json());
    if (me.user) localStorage.setItem('currentUser', JSON.stringify(me.user));
    const banks = await fetch(`${base}/banks/mine`, { credentials: 'include' }).then((r) => r.json());
    const personal = (banks.banks || []).find((b) => b.isPersonalDefault) || (banks.banks || [])[0];
    if (personal) localStorage.setItem('currentBankId', personal._id);
    await fetch(`${base}/onboarding/tour`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tourCompleted: true, tourStep: 4 }),
    });
  }, { apiBase, username: uid, pass: password, mail: email });
  await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/question-list/, { timeout: 30000 });
}

test.describe('KP job dismiss and filters', () => {
  test('dismiss clears pending badge and lists under dismissed filter', async ({ page }) => {
    const uid = `kpd_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });

    const jobId = await page.evaluate(async ({ base }) => {
      await fetch(`${base}/onboarding/import-sample`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Bank-Id': localStorage.getItem('currentBankId') },
      });
      const headers = {
        'Content-Type': 'application/json',
        'X-Bank-Id': localStorage.getItem('currentBankId'),
      };
      const start = await fetch(`${base}/questions/kp-tag-jobs`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ subject: '高等代数', maxKpsPerQuestion: 1 }),
      });
      const body = await start.json();
      return body.jobId;
    }, { base: apiBase });

    expect(jobId).toBeTruthy();

    await page.evaluate(async ({ base, id }) => {
      const headers = { 'X-Bank-Id': localStorage.getItem('currentBankId') };
      await fetch(`${base}/questions/kp-tag-jobs/${id}/dismiss`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
    }, { base: apiBase, id: jobId });

    const apiCheck = await page.evaluate(async ({ base }) => {
      const headers = { 'X-Bank-Id': localStorage.getItem('currentBankId') };
      const dismissed = await fetch(`${base}/questions/kp-tag-jobs?filter=dismissed`, {
        credentials: 'include',
        headers,
      }).then((r) => r.json());
      const summary = await fetch(`${base}/questions/kp-tag-jobs/review-summary`, {
        credentials: 'include',
        headers,
      }).then((r) => r.json());
      return { dismissedCount: (dismissed.jobs || []).length, summary };
    }, { base: apiBase });

    expect(apiCheck.dismissedCount).toBeGreaterThan(0);
    expect(apiCheck.summary.pendingRowCount).toBe(0);

    await page.goto('/knowledge-points/import', { waitUntil: 'domcontentloaded' });
    await page.locator('input[placeholder="解析几何"]').fill('高等代数');
    await page.getByTestId('kp-workflow-step-2').click();
    await page.getByTestId('kp-tag-job-list').locator('button', { hasText: '刷新' }).click();
    await expect(page.getByTestId('kp-job-status-label').filter({ hasText: '已关闭' })).toBeVisible({ timeout: 30000 });
  });
});
