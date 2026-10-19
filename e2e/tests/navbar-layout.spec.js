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

function intersects(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

const widths = [1024, 1280, 1440];

test.describe('navbar bank header vs user menu layout', () => {
  for (const width of widths) {
    test(`header button and user menu do not overlap at ${width}px`, async ({ page }) => {
      const uid = `nav_${width}_long_display_name_${Date.now()}`;
      await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });

      await page.setViewportSize({ width, height: 900 });
      await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
      const skip = page.getByTestId('onboarding-skip');
      if (await skip.isVisible().catch(() => false)) await skip.click();

      const headerBtn = page.getByTestId('navbar-bank-header-btn');
      const userMenu = page.getByTestId('nav-user-menu');
      await expect(headerBtn).toBeVisible({ timeout: 15000 });
      await expect(userMenu).toBeVisible();

      const boxes = await page.evaluate(() => {
        const a = document.querySelector('[data-testid="navbar-bank-header-btn"]');
        const b = document.querySelector('[data-testid="nav-user-menu"]');
        if (!a || !b) return null;
        return {
          header: a.getBoundingClientRect(),
          user: b.getBoundingClientRect(),
        };
      });
      expect(boxes).toBeTruthy();
      expect(intersects(boxes.header, boxes.user)).toBe(false);
    });
  }
});
