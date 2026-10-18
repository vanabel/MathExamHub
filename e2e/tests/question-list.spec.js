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

test.describe('question list pagination and filters', () => {
  test('URL query drives server pagination and survives reload', async ({ page }) => {
    const uid = `ql_${Date.now()}`;
    const password = 'E2EPass123!';
    await registerAndLogin(page, { uid, password, email: `${uid}@example.com` });

    await page.evaluate(async ({ base }) => {
      await fetch(`${base}/onboarding/import-sample`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Bank-Id': localStorage.getItem('currentBankId') },
      });
    }, { base: apiBase });

    await page.goto('/question-list?page=1&pageSize=10', { waitUntil: 'domcontentloaded' });
    const onboardingSkip = page.getByTestId('onboarding-skip');
    if (await onboardingSkip.isVisible().catch(() => false)) {
      await onboardingSkip.click();
    }
    await expect(page.getByTestId('question-list-pagination')).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveURL(/page=1/);
    await expect(page).toHaveURL(/pageSize=10/);

    const firstPageCount = await page.locator('.question-card').count();
    expect(firstPageCount).toBeLessThanOrEqual(10);
    expect(firstPageCount).toBeGreaterThan(0);

    await page.getByTestId('question-list-page-size').selectOption('20');
    await expect(page).toHaveURL(/pageSize=20/);
    await expect(page).toHaveURL(/page=1/);

    await page.getByTestId('question-list-next-page').click();
    await expect(page).toHaveURL(/page=2/);

    await page.reload({ waitUntil: 'domcontentloaded' });
    if (await onboardingSkip.isVisible().catch(() => false)) {
      await onboardingSkip.click();
    }
    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL(/pageSize=20/);

    await page.getByTestId('question-list-type').selectOption('填空题');
    await expect(page).toHaveURL(/type=%E5%A1%AB%E7%A9%BA%E9%A2%98|type=填空题/);
    const filteredCards = page.locator('.question-card');
    await expect(filteredCards.first()).toBeVisible({ timeout: 15000 });
    const badgeText = await filteredCards.first().locator('.badge.bg-secondary').textContent();
    expect(badgeText).toContain('填空题');

    await page.getByTestId('question-list-difficulty').selectOption('难');
    await expect(page.getByTestId('question-list-filter-chips')).toBeVisible();
    await expect(page.getByTestId('question-list-filter-chips')).toContainText('难度：难');

    await page.getByTestId('question-list-clear-filters').click();
    await expect(page).not.toHaveURL(/difficulty=/);
    await expect(page.getByTestId('question-list-filter-chips')).not.toBeVisible();
  });

  for (const width of [1024, 1280]) {
    test(`filter toolbar layout at ${width}px (no clipped selects, ≤2 rows)`, async ({ page }) => {
      const uid = `qltb_${width}_${Date.now()}`;
      await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
      await page.evaluate(async ({ base }) => {
        await fetch(`${base}/onboarding/import-sample`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-Bank-Id': localStorage.getItem('currentBankId') },
        });
      }, { base: apiBase });

      await page.setViewportSize({ width, height: 900 });
      await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
      const onboardingSkip = page.getByTestId('onboarding-skip');
      if (await onboardingSkip.isVisible().catch(() => false)) {
        await onboardingSkip.click();
      }
      const toolbar = page.getByTestId('question-list-filters');
      await expect(toolbar).toBeVisible({ timeout: 30000 });

      const layout = await toolbar.evaluate((el) => {
        const selects = el.querySelectorAll('select');
        for (const sel of selects) {
          if (sel.scrollHeight > sel.clientHeight + 1) {
            return { ok: false, reason: `select clipped: ${sel.getAttribute('data-testid')}` };
          }
        }
        const children = [...el.children];
        const tops = children.map((c) => Math.round(c.getBoundingClientRect().top));
        const rowCount = new Set(tops).size;
        if (rowCount > 2) {
          return { ok: false, reason: `toolbar rows ${rowCount}`, rowCount };
        }
        return { ok: true, rowCount };
      });
      expect(layout.ok, layout.reason || 'layout check failed').toBe(true);
    });
  }
});
