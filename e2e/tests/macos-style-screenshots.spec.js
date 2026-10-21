/**
 * macOS UI refresh screenshots (1440px). Requires built frontend + API.
 * Light: MACOS_SCREENSHOT_SCHEME=light UI_V2_PHASE=after
 * Dark:  MACOS_SCREENSHOT_SCHEME=dark  UI_V2_PHASE=after
 * Before baseline: docs/screenshots/ui-v2/after (main pre-refresh).
 */
const { test } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const scheme = process.env.MACOS_SCREENSHOT_SCHEME || 'light';
const phase = process.env.UI_V2_PHASE || 'after';
const outRoot = path.join(__dirname, '../../docs/screenshots/macos-style', scheme, phase);

const {
  registerAndLoginSession,
  captureLoggedOutAuthPages,
  appOrigin,
  apiBase,
} = require('../helpers/screenshotAuth');
const { seedViaPageRequest } = require('../helpers/seedUiV2ScreenshotRequest');
const { assertPageReady, assertNoHorizontalOverflow } = require('../helpers/screenshotAssert');

const VIEWPORT = { width: 1440, height: 900 };

async function snap(page, slug) {
  await assertPageReady(page, slug);
  await assertNoHorizontalOverflow(page, slug);
  await page.setViewportSize(VIEWPORT);
  await page.waitForTimeout(350);
  fs.mkdirSync(outRoot, { recursive: true });
  await page.screenshot({ path: path.join(outRoot, `${slug}.png`), fullPage: true });
}

test.describe('macOS style screenshots', () => {
  test.skip(!process.env.MACOS_SCREENSHOT_SCHEME, 'Set MACOS_SCREENSHOT_SCHEME=light|dark');

  test.use({ colorScheme: scheme === 'dark' ? 'dark' : 'light' });

  test(`capture ${scheme} ${phase}`, async ({ page, browser }) => {
    test.setTimeout(900000);
    if (scheme === 'dark') {
      await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'dark'));
    } else {
      await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'light'));
    }

    await captureLoggedOutAuthPages(browser, VIEWPORT, async (authPage, slug) => {
      await snap(authPage, slug);
    });

    const session = await registerAndLoginSession(page, {
      uid: `macos_ui_${scheme}_${Date.now()}`,
      password: 'E2EPass123!',
      email: `macos_${scheme}@example.com`,
    });
    const bankId = session.bankId || (await page.evaluate(() => localStorage.getItem('currentBankId')));
    await seedViaPageRequest(page, bankId);

    const skipTour = page.getByTestId('onboarding-skip');
    const routes = [
      '/question-list',
      '/question-add',
      '/latex-import',
      '/latex-export',
      '/exam-wizard',
      '/knowledge-points',
      '/duplicates',
      '/recycle-bin',
      '/question-quality',
      '/bank-stats',
      '/login',
    ];

    for (const route of routes) {
      await page.goto(`${appOrigin}${route}`, { waitUntil: 'domcontentloaded' });
      if (route === '/question-list' && (await skipTour.isVisible().catch(() => false))) {
        await skipTour.click();
      }
      const slug = route.replace(/^\//, '').replace(/\//g, '-') || 'home';
      await snap(page, slug);
    }

    await page.goto(`${appOrigin}/question-list`, { waitUntil: 'domcontentloaded' });
    const headerBtn = page.getByRole('button', { name: '试卷头' });
    if (await headerBtn.isVisible().catch(() => false)) {
      await headerBtn.click();
      await page.getByText('题库 LaTeX 试卷头默认值').waitFor({ timeout: 10000 });
      await snap(page, 'dialog-bank-header');
      await page.keyboard.press('Escape');
    }
  });
});
