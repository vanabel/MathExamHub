const { test, expect } = require('@playwright/test');
const path = require('path');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';
const shots = path.join(__dirname, '../../docs/screenshots/smart-select');

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

test.describe('LaTeX export smart select dialog', () => {
  test('shows validation and result summary', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    const uid = `ssel_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });

    await page.evaluate(async ({ base }) => {
      const bankId = localStorage.getItem('currentBankId');
      await fetch(`${base}/onboarding/import-sample`, {
        method: 'POST',
        credentials: 'include',
        headers: bankId ? { 'X-Bank-Id': bankId } : {},
      });
    }, { base: apiBase });

    await page.goto('/latex-export', { waitUntil: 'domcontentloaded' });
    const skip = page.getByTestId('onboarding-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();

    await page.getByRole('button', { name: '智能选择' }).click();
    await expect(page.getByRole('heading', { name: '智能选择题目' })).toBeVisible();

    await page.locator('#targetCount').fill('0');
    await page.getByRole('button', { name: '应用' }).click();
    await expect(page.getByTestId('smart-select-validation-errors')).toContainText('大于 0');

    await page.locator('#targetCount').fill('3');
    await page.locator('#targetTotalScore').fill('9999');
    await page.getByRole('button', { name: '应用' }).click();
    await expect(page.getByTestId('smart-select-result-summary')).toBeVisible({ timeout: 10000 });
  });
});
