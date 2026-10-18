const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';
const fixturePath = path.join(__dirname, '../../backend/test/fixtures/analytic-geometry-kp.xls');

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

test.describe('KP Excel workflow', () => {
  test('import preview shows tree preview', async ({ page }) => {
    test.skip(!fs.existsSync(fixturePath), 'fixture missing');
    const uid = `kpw_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });

    await page.goto('/knowledge-points/import', { waitUntil: 'domcontentloaded' });
    const skip = page.getByTestId('onboarding-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();

    await page.getByTestId('kp-import-file').setInputFiles(fixturePath);
    await page.getByTestId('kp-import-preview').click();
    await expect(page.getByTestId('kp-import-tree-preview')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('kp-import-tree-preview')).not.toBeEmpty();
  });

  test('job list and standalone review route', async ({ page }) => {
    const uid = `kplist_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await page.evaluate(async ({ base }) => {
      await fetch(`${base}/onboarding/import-sample`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Bank-Id': localStorage.getItem('currentBankId') },
      });
    }, { base: apiBase });

    const jobId = await page.evaluate(async ({ base }) => {
      const headers = {
        'Content-Type': 'application/json',
        'X-Bank-Id': localStorage.getItem('currentBankId'),
      };
      const start = await fetch(`${base}/questions/kp-tag-jobs`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ subject: '解析几何', maxKpsPerQuestion: 1 }),
      });
      const body = await start.json();
      return body.jobId;
    }, { base: apiBase });

    await page.goto(`/knowledge-points/review/${jobId}`, { waitUntil: 'domcontentloaded' });
    const skip = page.getByTestId('onboarding-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await expect(page.getByTestId('kp-tag-job-list')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('kp-tag-job-review')).toBeVisible();
  });

  test('tag job review panel visible on step 2', async ({ page }) => {
    const uid = `kpr_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await page.evaluate(async ({ base }) => {
      await fetch(`${base}/onboarding/import-sample`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Bank-Id': localStorage.getItem('currentBankId') },
      });
    }, { base: apiBase });

    await page.goto('/knowledge-points/import', { waitUntil: 'domcontentloaded' });
    const skip = page.getByTestId('onboarding-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();

    await page.getByTestId('kp-workflow-step-2').click();
    await expect(page.getByTestId('kp-tag-job-review')).toBeVisible();
    await expect(page.getByTestId('kp-tag-job-start')).toBeVisible();
    await expect(page.getByTestId('kp-tag-job-list')).toBeVisible();
  });
});
