/**
 * Dark-mode contrast on LaTeX import preview + export list (runs in CI e2e-smoke).
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

test.describe('LaTeX IO dark contrast', () => {
  test.use({ colorScheme: 'dark' });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'dark'));
  });

  test('import preview question body and export rows meet contrast', async ({ page }) => {
    test.setTimeout(360000);
    page.on('dialog', (d) => d.accept());

    const uid = `lio_contrast_${Date.now()}`;
    const session = await registerAndLoginSession(page, {
      uid,
      password: 'E2EPass123!',
      email: `${uid}@example.com`,
    });
    const bankId = session.bankId;
    await seedViaPageRequest(page, bankId);

    await page.goto(`${appOrigin}/latex-import`, { waitUntil: 'domcontentloaded' });
    expect(fs.existsSync(mathexamTemplateZip)).toBeTruthy();
    await page.locator('#fileInput').setInputFiles(mathexamTemplateZip);
    await page.getByRole('button', { name: '预览题目' }).click({ timeout: 120000 });
    await expect(page.getByTestId('latex-import-preview-panel')).toBeVisible({ timeout: 180000 });

    const body = page.getByTestId('latex-import-preview-question-body').first();
    await expect(body).toBeVisible();
    await assertMinContrastIn(page, '[data-testid="latex-import-preview-question-body"]', 4.5);

    await page.goto(`${appOrigin}/latex-export`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('latex-export-selection-summary')).toBeVisible({ timeout: 30000 });
    const listRes = await page.request.get(`${apiBase}/questions/list?limit=2`, {
      headers: bankId ? { 'X-Bank-Id': bankId } : {},
    });
    if (listRes.ok()) {
      const payload = await listRes.json();
      const rows = Array.isArray(payload) ? payload : payload.questions || [];
      const id = rows[0]?._id;
      if (id) {
        await page.locator('.export-question-row').first().click();
      }
    }
    await assertMinContrastIn(page, '.export-question-row__preview', 4.5);
  });
});
