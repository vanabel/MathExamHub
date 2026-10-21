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
  }, { apiBase, username: uid, pass: password, mail: email });
}

test.describe('bank LaTeX header modal', () => {
  test('grouped form shows live preview and preamble toggle', async ({ page }) => {
    const uid = `hdr_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });

    await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
    const skip = page.getByTestId('onboarding-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();

    await page.getByTestId('navbar-bank-header-btn').click();
    await expect(page.getByText('学校信息')).toBeVisible();
    await expect(page.getByText('考试信息')).toBeVisible();
    await expect(page.getByTestId('bank-header-preview-pane')).toBeVisible();

    await page.getByPlaceholder('例：西南大学').fill('测试大学');
    await expect(page.getByTestId('bank-header-preview-pane')).toContainText('测试大学');

    const preambleToggle = page.getByTestId('bank-header-toggle-preamble');
    await preambleToggle.scrollIntoViewIfNeeded();
    await preambleToggle.click({ timeout: 60000 });
    await expect(page.getByTestId('bank-header-preamble')).toBeVisible();
    await expect(page.getByTestId('bank-header-preamble')).toContainText('\\usepackage');

    await page.getByTestId('bank-header-exam-date').fill('2026-10-18');
    await expect(page.getByText('9 月 1 日')).toBeVisible();

    await page.getByTestId('bank-header-academic-year-start').fill('2026');
    await page.getByTestId('bank-header-save').click();
    await expect(page.getByTestId('bank-header-year-error')).toBeVisible();

    await page.getByTestId('bank-header-clear-academic-year').click();
    await expect(page.getByTestId('bank-header-academic-year-start')).toHaveValue('');
  });
});
