const { test, expect } = require('@playwright/test');
const path = require('path');

const shots = path.join(__dirname, '../../docs/screenshots');
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
    if (!loginRes.ok) {
      throw new Error(`login failed: ${loginRes.status}`);
    }
    const me = await fetch(`${base}/auth/me`, { credentials: 'include' }).then((r) => r.json());
    if (me.user) {
      localStorage.setItem('currentUser', JSON.stringify(me.user));
    }
    const banks = await fetch(`${base}/banks/mine`, { credentials: 'include' }).then((r) => r.json());
    const personal = (banks.banks || []).find((b) => b.isPersonalDefault) || (banks.banks || [])[0];
    if (personal) {
      localStorage.setItem('currentBankId', personal._id);
    }
  }, { apiBase, username: uid, pass: password, mail: email });
  await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
}

test.describe('product smoke', () => {
  test('login → import sample → wizard coverage → generate → export', async ({ page }) => {
    const uid = `e2e_${Date.now()}`;
    const password = 'E2EPass123!';
    const email = `${uid}@example.com`;

    page.on('dialog', (dialog) => dialog.accept());

    await registerAndLogin(page, { uid, password, email });
    await expect(page).toHaveURL(/\/question-list/, { timeout: 30000 });

    async function ensureSampleImported() {
      const onboarding = page.getByTestId('onboarding-panel');
      if (await onboarding.isVisible().catch(() => false)) {
        await page.getByTestId('onboarding-import-sample').click();
        await expect(page.getByTestId('onboarding-import-sample')).toContainText(/已导入|导入/, { timeout: 60000 });
        await page.screenshot({ path: path.join(shots, 'onboarding-import.png'), fullPage: true });
        await page.getByTestId('onboarding-skip').click();
        return;
      }
      await page.evaluate(async ({ base }) => {
        const bankId = localStorage.getItem('currentBankId');
        await fetch(`${base}/onboarding/import-sample`, {
          method: 'POST',
          credentials: 'include',
          headers: bankId ? { 'X-Bank-Id': bankId } : {},
        });
      }, { base: apiBase });
    }

    await ensureSampleImported();

    const questionTotal = await page.evaluate(async ({ base }) => {
      const bankId = localStorage.getItem('currentBankId');
      const res = await fetch(`${base}/questions/list?limit=1`, {
        credentials: 'include',
        headers: bankId ? { 'X-Bank-Id': bankId } : {},
      });
      const data = await res.json();
      return data.total ?? (Array.isArray(data) ? data.length : 0);
    }, { base: apiBase });
    expect(questionTotal).toBeGreaterThan(30);

    await page.goto('/exam-wizard', { waitUntil: 'domcontentloaded' });
    if (await page.getByTestId('onboarding-panel').isVisible().catch(() => false)) {
      await page.getByTestId('onboarding-skip').click();
    }
    await expect(page.getByRole('heading', { name: /自动组卷向导/ })).toBeVisible();

    const starterClone = page.getByRole('button', { name: '克隆' }).first();
    await expect(starterClone).toBeVisible({ timeout: 15000 });
    await starterClone.click();
    await page.getByTestId('wizard-coverage-check').waitFor({ state: 'visible', timeout: 30000 });
    await page.getByTestId('wizard-coverage-check').click({ timeout: 60000 });
    await expect(page.getByTestId('wizard-coverage-result')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: path.join(shots, 'onboarding-wizard.png'), fullPage: true });

    await page.getByTestId('wizard-generate').click();
    const previewTab = page.getByRole('button', { name: '2. 预览' });
    await expect(previewTab).toBeEnabled({ timeout: 90000 });
    await previewTab.click();
    await expect(page.getByText(/将当前预览中的 [1-9]\d* 道题/)).toBeVisible({ timeout: 30000 });

    await page.getByRole('button', { name: '3. 导出' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('wizard-export-latex').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/i);
  });
});
