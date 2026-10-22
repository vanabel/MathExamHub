/**
 * LaTeX IO v2 — view mode + expand (CI e2e-smoke).
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { assertMinContrastIn } = require('../helpers/contrastAssert');
const { registerAndLoginSession, appOrigin } = require('../helpers/screenshotAuth');
const { seedViaPageRequest } = require('../helpers/seedUiV2ScreenshotRequest');

const mathexamTemplateZip = path.join(
  __dirname,
  '../../frontend/public/downloads/mathexam-v2.3.3.zip',
);
const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';

test.describe('LaTeX IO v2 view and expand', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'dark'));
  });

  test.use({ colorScheme: 'dark', viewport: { width: 1280, height: 800 } });

  test('export view mode and row expand', async ({ page }) => {
    test.setTimeout(120000);
    const uid = `lio_v2_export_${Date.now()}`;
    const session = await registerAndLoginSession(page, {
      uid,
      password: 'E2EPass123!',
      email: `${uid}@example.com`,
    });
    await seedViaPageRequest(page, session.bankId);

    await page.goto(`${appOrigin}/latex-export`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('latex-export-view-mode')).toBeVisible({ timeout: 30000 });

    const firstRow = page.locator('.export-question-row').first();
    await expect(firstRow).toBeVisible();
    const preview = firstRow.locator('.export-question-row__preview');
    await expect(preview).toBeVisible();
    const collapsedClass = await preview.evaluate((el) => el.className.includes('export-question-row__preview--expanded'));
    expect(collapsedClass).toBeFalsy();

    await page.getByTestId('latex-export-view-mode').getByText('LaTeX 源码', { exact: true }).click();
    await expect(firstRow.locator('.latex-io-source-pre')).toBeVisible();

    await page.getByTestId('latex-export-view-mode').getByText('预览', { exact: true }).click();
    await expect(firstRow.locator('.export-question-row__preview')).toBeVisible();

    await page.getByTestId('latex-export-row-expand').first().click();
    await expect(firstRow.locator('.export-question-row__preview--expanded')).toBeVisible();
  });

  test('import preview view mode, expand, and contrast', async ({ page }) => {
    test.setTimeout(360000);
    page.on('dialog', (d) => d.accept());

    const uid = `lio_v2_import_${Date.now()}`;
    const session = await registerAndLoginSession(page, {
      uid,
      password: 'E2EPass123!',
      email: `${uid}@example.com`,
    });
    await seedViaPageRequest(page, session.bankId);

    await page.goto(`${appOrigin}/latex-import`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('latex-import-upload-zone')).toBeVisible();
    await assertMinContrastIn(page, '[data-testid="latex-import-upload-label"]', 4.5);

    expect(fs.existsSync(mathexamTemplateZip)).toBeTruthy();
    await page.locator('#fileInput').setInputFiles(mathexamTemplateZip);
    await page.getByRole('button', { name: '预览题目' }).click({ timeout: 120000 });
    await expect(page.getByTestId('latex-import-preview-panel')).toBeVisible({ timeout: 180000 });

    await expect(page.getByTestId('latex-import-view-mode')).toBeVisible();
    const body = page.getByTestId('latex-import-preview-question-body').first();
    await assertMinContrastIn(page, '[data-testid="latex-import-preview-question-body"]', 4.5);

    await page.getByTestId('latex-import-view-mode').getByText('LaTeX 源码', { exact: true }).click();
    await expect(page.locator('.latex-io-question-card .latex-io-source-pre').first()).toBeVisible();

    await page.getByTestId('latex-import-view-mode').getByText('预览', { exact: true }).click();
    await page.getByTestId('latex-import-row-expand').first().click();
    await expect(body).toHaveClass(/export-question-row__preview--expanded/);
  });
});
