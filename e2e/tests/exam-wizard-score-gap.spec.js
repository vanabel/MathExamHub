const { test, expect } = require('@playwright/test');
const path = require('path');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';
const shots = path.join(__dirname, '../../docs/screenshots');

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

test.describe('Exam wizard score gap modal', () => {
  test('shows modal and confirms before preview', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    const uid = `sgap_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });

    await page.evaluate(async ({ base }) => {
      const bankId = localStorage.getItem('currentBankId');
      await fetch(`${base}/onboarding/import-sample`, {
        method: 'POST',
        credentials: 'include',
        headers: bankId ? { 'X-Bank-Id': bankId } : {},
      });
    }, { base: apiBase });

    await page.goto('/exam-wizard', { waitUntil: 'domcontentloaded' });
    const skip = page.getByTestId('onboarding-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();

    await page.getByRole('button', { name: '克隆' }).first().click();
    await page.locator('#allowRelax').check();
    await page.locator('label.form-label', { hasText: '目标总分' }).locator('..').locator('input').fill('100');

    await page.getByTestId('wizard-generate').click();
    await expect(page.getByTestId('wizard-score-gap-modal')).toBeVisible({ timeout: 120000 });
    await page.screenshot({ path: path.join(shots, 'wizard-score-gap-modal.png'), fullPage: true });

    await page.getByTestId('wizard-score-gap-confirm').click();
    await expect(page.getByTestId('wizard-score-gap-modal')).toBeHidden({ timeout: 120000 });
    await expect(page.getByRole('button', { name: '2. 预览' })).toBeEnabled({ timeout: 120000 });
  });
});
