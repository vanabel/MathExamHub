/**
 * Compact LaTeX export config panel (runs in CI e2e-smoke).
 */
const { test, expect } = require('@playwright/test');
const { registerAndLoginSession, appOrigin } = require('../helpers/screenshotAuth');
const { seedViaPageRequest } = require('../helpers/seedUiV2ScreenshotRequest');
const { assertMinContrastIn } = require('../helpers/contrastAssert');

test.describe('LaTeX export compact config', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'dark'));
  });

  test.use({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } });

  test('sections, more options, download in viewport', async ({ page }) => {
    test.setTimeout(120000);
    page.on('dialog', (d) => d.accept());

    const uid = `lex_compact_e2e_${Date.now()}`;
    const session = await registerAndLoginSession(page, {
      uid,
      password: 'E2EPass123!',
      email: `${uid}@example.com`,
    });
    await seedViaPageRequest(page, session.bankId);

    await page.goto(`${appOrigin}/latex-export`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByTestId('latex-export-selection-summary')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('latex-export-structure-preview')).toBeVisible();
    await expect(page.getByTestId('latex-export-more-options')).toBeVisible();

    await expect(page.locator('.export-config-section__label').filter({ hasText: '文件' })).toBeVisible();
    await expect(page.locator('.export-config-section__label').filter({ hasText: '试卷信息' })).toBeVisible();
    await expect(page.locator('.export-config-section__label').filter({ hasText: '考试' })).toBeVisible();
    await expect(page.locator('.export-config-section__label').filter({ hasText: '导出内容' })).toBeVisible();

    const downloadBtn = page.getByTestId('latex-export-download-btn');
    await expect(downloadBtn).toBeVisible();
    const inViewport = await downloadBtn.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight;
    });
    expect(inViewport).toBeTruthy();

    await page.getByTestId('latex-export-more-options').locator('summary').click();
    await expect(page.getByRole('spinbutton', { name: '学年起始年' })).toBeVisible();

    await assertMinContrastIn(page, '.export-config-section__label', 4.5);
  });
});
