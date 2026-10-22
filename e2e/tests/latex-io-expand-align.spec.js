/**
 * Expand button right-edge alignment + full-width source/preview boxes.
 */
const { test, expect } = require('@playwright/test');
const { registerAndLoginSession, appOrigin } = require('../helpers/screenshotAuth');
const { seedViaPageRequest } = require('../helpers/seedUiV2ScreenshotRequest');

async function assertAlignedExpandButtons(page, expandTestId) {
  const buttons = page.getByTestId(expandTestId);
  const count = await buttons.count();
  expect(count).toBeGreaterThan(1);
  const rights = [];
  for (let i = 0; i < count; i += 1) {
    const box = await buttons.nth(i).boundingBox();
    expect(box).toBeTruthy();
    rights.push(box.x + box.width);
  }
  const minR = Math.min(...rights);
  const maxR = Math.max(...rights);
  expect(maxR - minR).toBeLessThanOrEqual(1);
}

async function assertSameContentWidths(page, selector) {
  const nodes = page.locator(selector);
  const count = await nodes.count();
  expect(count).toBeGreaterThan(1);
  const widths = [];
  for (let i = 0; i < count; i += 1) {
    const box = await nodes.nth(i).boundingBox();
    expect(box).toBeTruthy();
    widths.push(box.width);
  }
  const minW = Math.min(...widths);
  const maxW = Math.max(...widths);
  expect(maxW - minW).toBeLessThanOrEqual(1);
}

test.describe('LaTeX IO expand align', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'dark'));
  });

  test.use({ colorScheme: 'dark', viewport: { width: 1280, height: 800 } });

  test('export expand buttons and boxes share edges in both modes', async ({ page }) => {
    test.setTimeout(120000);
    const uid = `lio_align_export_${Date.now()}`;
    const session = await registerAndLoginSession(page, {
      uid,
      password: 'E2EPass123!',
      email: `${uid}@example.com`,
    });
    await seedViaPageRequest(page, session.bankId);

    await page.goto(`${appOrigin}/latex-export`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('latex-export-view-mode')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.export-question-row').first()).toBeVisible();

    await page.getByTestId('latex-export-view-mode').getByText('预览', { exact: true }).click();
    await assertAlignedExpandButtons(page, 'latex-export-row-expand');
    await assertSameContentWidths(page, '.export-question-row .export-question-row__preview');

    await page.getByTestId('latex-export-view-mode').getByText('LaTeX 源码', { exact: true }).click();
    await assertAlignedExpandButtons(page, 'latex-export-row-expand');
    await assertSameContentWidths(page, '.export-question-row .latex-io-source-pre');
  });
});
