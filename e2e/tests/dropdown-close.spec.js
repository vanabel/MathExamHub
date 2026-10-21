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

async function openQuestionList(page) {
  await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
  const skip = page.getByTestId('onboarding-skip');
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

async function expectPanelClosed(page, testId) {
  const panel = page.getByTestId(testId);
  const count = await panel.count();
  if (count === 0) return;
  await expect(panel).not.toHaveClass(/show/);
}

test.describe('dropdown menus close after item click', () => {
  test('navbar 题库 menu closes on navigation', async ({ page }) => {
    const uid = `dd_bank_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await openQuestionList(page);

    await page.getByTestId('nav-menu-bank').click();
    await expect(page.getByTestId('nav-menu-bank-panel')).toHaveClass(/show/);
    await page.getByTestId('nav-menu-bank-panel').getByRole('link', { name: '添加题目' }).click();
    await expectPanelClosed(page, 'nav-menu-bank-panel');
    await expect(page).toHaveURL(/question-add/);
  });

  test('navbar 组卷 menu closes on navigation', async ({ page }) => {
    const uid = `dd_exam_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await openQuestionList(page);

    await page.getByTestId('nav-menu-exam').click();
    await expect(page.getByTestId('nav-menu-exam-panel')).toHaveClass(/show/);
    await page.getByTestId('nav-menu-exam-panel').getByRole('link', { name: '组卷历史' }).click();
    await expectPanelClosed(page, 'nav-menu-exam-panel');
    await expect(page).toHaveURL(/exam-history/);
  });

  test('navbar 工具 menu closes on navigation', async ({ page }) => {
    const uid = `dd_tools_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await openQuestionList(page);

    await page.getByTestId('nav-menu-tools').click();
    await expect(page.getByTestId('nav-menu-tools-panel')).toHaveClass(/show/);
    await page.getByTestId('nav-menu-tools-panel').getByRole('link', { name: 'LaTeX 导入' }).click();
    await expectPanelClosed(page, 'nav-menu-tools-panel');
    await expect(page).toHaveURL(/latex-import/);
  });

  test('user menu closes after theme choice (no route change)', async ({ page }) => {
    const uid = `dd_theme_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await openQuestionList(page);

    await page.getByTestId('nav-user-menu').click();
    await expect(page.getByTestId('nav-user-menu-panel')).toHaveClass(/show/);
    await page.getByTestId('nav-theme-dark').click();
    await expectPanelClosed(page, 'nav-user-menu-panel');
    await expect(page).toHaveURL(/question-list/);
  });

  test('question list 导入/导出 menu closes on navigation', async ({ page }) => {
    const uid = `dd_list_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await openQuestionList(page);

    await page.getByTestId('question-list-more-menu').click();
    await expect(page.getByTestId('question-list-more-menu-panel')).toHaveClass(/show/);
    await page.getByTestId('question-list-more-menu-panel').getByRole('link', { name: 'LaTeX 导出' }).click();
    await expect(page).toHaveURL(/latex-export/);
    await expectPanelClosed(page, 'question-list-more-menu-panel');
  });

  test('card ⋮ menu closes after choosing 编辑', async ({ page }) => {
    const uid = `dd_card_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await openQuestionList(page);

    await page.request.post(`${apiBase}/onboarding/import-sample`, {
      headers: { 'Content-Type': 'application/json', 'X-Bank-Id': await page.evaluate(() => localStorage.getItem('currentBankId')) },
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const cardMenu = page.locator('.question-card__menu.dropdown').first();
    await expect(cardMenu).toBeVisible({ timeout: 15000 });
    await cardMenu.locator('[data-bs-toggle="dropdown"]').click();
    const cardPanel = cardMenu.locator('.dropdown-menu');
    await expect(cardPanel).toHaveClass(/show/);
    await cardPanel.getByTestId('question-list-edit').click();
    await expect(page).toHaveURL(/question-edit/);
    await expect(cardPanel).toHaveCount(0);
  });
});
