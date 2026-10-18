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

test.describe('KP job dismiss and filters', () => {
  test('dismiss removes job from pending filter', async ({ page }) => {
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

    await page.goto('/knowledge-points/import', { waitUntil: 'domcontentloaded' });
    const skip = page.getByTestId('onboarding-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();

    await page.getByTestId('kp-job-list-filter').selectOption('pending');
    await expect(page.getByTestId('kp-tag-job-list')).toBeVisible();

    await page.evaluate(async ({ base, id }) => {
      const headers = { 'X-Bank-Id': localStorage.getItem('currentBankId') };
      await fetch(`${base}/questions/kp-tag-jobs/${id}/dismiss`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
    }, { base: apiBase, id: jobId });

    await page.getByRole('button', { name: '刷新' }).click();
    await page.getByTestId('kp-job-list-filter').selectOption('dismissed');
    await expect(page.getByText('已关闭')).toBeVisible({ timeout: 30000 });

    const summary = await page.evaluate(async ({ base }) => {
      const headers = { 'X-Bank-Id': localStorage.getItem('currentBankId') };
      const res = await fetch(`${base}/questions/kp-tag-jobs/review-summary`, {
        credentials: 'include',
        headers,
      });
      return res.json();
    }, { base: apiBase });
    expect(summary.pendingRowCount).toBe(0);
  });
});
