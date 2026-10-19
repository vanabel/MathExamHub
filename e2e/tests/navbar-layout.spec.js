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

const ROW_ALIGN_WIDTHS = [1280, 1440];
const NAVBAR_ITEM_TESTIDS = [
  'nav-question-list',
  'navbar-bank-select',
  'navbar-bank-header-btn',
  'nav-user-menu',
];

async function assertSingleRowNavbar(page) {
  const metrics = await page.evaluate((testIds) => {
    const tops = testIds.map((id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) return null;
      return el.getBoundingClientRect().top;
    });
    const nav = document.querySelector('[data-testid="app-navbar"]');
    const navBox = nav ? nav.getBoundingClientRect() : null;
    const docEl = document.documentElement;
    return {
      tops,
      navHeight: navBox ? navBox.height : null,
      scrollWidth: docEl.scrollWidth,
      clientWidth: docEl.clientWidth,
    };
  }, NAVBAR_ITEM_TESTIDS);

  expect(metrics.tops.every((t) => t != null)).toBe(true);
  const minTop = Math.min(...metrics.tops);
  const maxTop = Math.max(...metrics.tops);
  expect(maxTop - minTop).toBeLessThan(8);
  expect(metrics.navHeight).toBeLessThan(64);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

async function openQuestionList(page) {
  await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
  const skip = page.getByTestId('onboarding-skip');
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await expect(page.getByTestId('navbar-bank-select')).toBeVisible({ timeout: 15000 });
}

async function expandMobileNavbar(page) {
  const toggler = page.locator('.navbar-toggler');
  if (await toggler.isVisible().catch(() => false)) {
    await toggler.click();
    await page.locator('#navbarNav.show, #navbarNav.collapsing').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }
}

async function assertPanelWithinViewport(page, panelTestId) {
  const metrics = await page.evaluate((testId) => {
    const el = document.querySelector(`[data-testid="${testId}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      right: r.right,
      innerWidth: window.innerWidth,
    };
  }, panelTestId);
  expect(metrics).toBeTruthy();
  expect(metrics.right).toBeLessThanOrEqual(metrics.innerWidth + 0.5);
  expect(metrics.left).toBeGreaterThanOrEqual(-0.5);
}

test.describe('navbar desktop single row', () => {
  for (const width of ROW_ALIGN_WIDTHS) {
    test(`nav items align on one row at ${width}px`, async ({ page }) => {
      const uid = `nav_row_${width}_${Date.now()}`;
      await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
      await page.setViewportSize({ width, height: 900 });
      await openQuestionList(page);
      await assertSingleRowNavbar(page);
    });
  }

  test('long bank name stays on one row at 1440px', async ({ page }) => {
    const uid = `nav_long_bank_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openQuestionList(page);

    const select = page.getByTestId('navbar-bank-select');
    const fullTitle = await select.getAttribute('title');
    expect(fullTitle).toBeTruthy();
    expect(fullTitle.length).toBeGreaterThan(20);

    await assertSingleRowNavbar(page);

    const headerBtn = page.getByTestId('navbar-bank-header-btn');
    const userMenu = page.getByTestId('nav-user-menu');
    const boxes = await page.evaluate(() => {
      const a = document.querySelector('[data-testid="navbar-bank-header-btn"]');
      const b = document.querySelector('[data-testid="nav-user-menu"]');
      return {
        header: a.getBoundingClientRect(),
        user: b.getBoundingClientRect(),
      };
    });
    expect(intersects(boxes.header, boxes.user)).toBe(false);
  });
});

const DROPDOWN_VIEWPORT_WIDTHS = [1440, 1280, 992];

test.describe('navbar dropdown viewport bounds', () => {
  for (const width of DROPDOWN_VIEWPORT_WIDTHS) {
    test(`user menu panel stays in viewport at ${width}px`, async ({ page }) => {
      const uid = `nav_user_dd_${width}_${Date.now()}`;
      await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
      await page.setViewportSize({ width, height: 900 });
      await openQuestionList(page);

      await page.getByTestId('nav-user-menu').click();
      await expect(page.getByTestId('nav-user-menu-panel')).toHaveClass(/show/);
      await assertPanelWithinViewport(page, 'nav-user-menu-panel');
    });

    test(`tools menu panel stays in viewport at ${width}px`, async ({ page }) => {
      const uid = `nav_tools_dd_${width}_${Date.now()}`;
      await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
      await page.setViewportSize({ width, height: 900 });
      await openQuestionList(page);

      await page.getByTestId('nav-menu-tools').click();
      await expect(page.getByTestId('nav-menu-tools-panel')).toHaveClass(/show/);
      await assertPanelWithinViewport(page, 'nav-menu-tools-panel');
    });
  }

  test('user menu panel stays in viewport at 390px inside collapsed navbar', async ({ page }) => {
    const uid = `nav_user_dd_390_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
    const skip = page.getByTestId('onboarding-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await expandMobileNavbar(page);
    await expect(page.getByTestId('nav-user-menu')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('nav-user-menu').click();
    await expect(page.getByTestId('nav-user-menu-panel')).toHaveClass(/show/);
    await assertPanelWithinViewport(page, 'nav-user-menu-panel');
  });
});

test.describe('navbar bank header vs user menu layout', () => {
  test('header button and user menu do not overlap at 1024px', async ({ page }) => {
    const width = 1024;
    const uid = `nav_${width}_overlap_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await page.setViewportSize({ width, height: 900 });
    await openQuestionList(page);

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
});
