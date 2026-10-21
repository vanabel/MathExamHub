const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { assertMinContrastIn } = require('../helpers/contrastAssert');

const shotRoot = path.join(__dirname, '../../docs/screenshots/dark-contrast');

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

test.describe('dark mode contrast', () => {
  test.use({ colorScheme: 'dark' });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'dark'));
  });

  test('question card answer block meets contrast when expanded', async ({ page }) => {
    const uid = `contrast_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    const bankId = await page.evaluate(() => localStorage.getItem('currentBankId'));
    await page.request.post(`${apiBase}/onboarding/import-sample`, {
      headers: bankId ? { 'X-Bank-Id': bankId } : {},
    });

    await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
    const skip = page.getByTestId('onboarding-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();

    const reveal = page.getByTestId('question-list-reveal-answer').first();
    await expect(reveal).toBeVisible({ timeout: 15000 });
    await reveal.click();
    await expect(page.getByTestId('question-list-answer-block').first()).toBeVisible();

    await assertMinContrastIn(page, '[data-testid="question-list-answer-block"]', 4.5);

    fs.mkdirSync(path.join(shotRoot, 'dark'), { recursive: true });
    await page.locator('.question-card').first().screenshot({
      path: path.join(shotRoot, 'dark', 'question-card-answer-expanded.png'),
    });
  });

  test('latex export page main panels meet contrast', async ({ page }) => {
    const uid = `contrast_exp_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await page.goto('/latex-export', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('latex-export-selection-summary')).toBeVisible();
    await assertMinContrastIn(page, '[data-testid="latex-export-selection-summary"]', 4.5);
  });

  test('latex import guide meets contrast', async ({ page }) => {
    const uid = `contrast_imp_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await page.goto('/latex-import', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('latex-import-header')).toBeVisible();
    await assertMinContrastIn(page, '[data-testid="latex-import-header"]', 4.5);
  });
});

test.describe('light mode answer card screenshot', () => {
  test.use({ colorScheme: 'light' });

  test('capture expanded answer card', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'light'));
    const uid = `contrast_light_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    const bankId = await page.evaluate(() => localStorage.getItem('currentBankId'));
    await page.request.post(`${apiBase}/onboarding/import-sample`, {
      headers: bankId ? { 'X-Bank-Id': bankId } : {},
    });
    await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('question-list-reveal-answer').first().click();
    await expect(page.getByTestId('question-list-answer-block').first()).toBeVisible();
    fs.mkdirSync(path.join(shotRoot, 'light'), { recursive: true });
    await page.locator('.question-card').first().screenshot({
      path: path.join(shotRoot, 'light', 'question-card-answer-expanded.png'),
    });
  });
});
