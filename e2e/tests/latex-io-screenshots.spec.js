/**
 * LaTeX import/export redesign screenshots @ 1440px (light + dark).
 * Run (needs API proxy on :8080, e.g. node e2e/scripts/ui-v2-static-server.js):
 *   PLAYWRIGHT_API_URL=http://127.0.0.1:8080/api LATEX_IO_SCREENSHOT_SCHEME=light|dark npx playwright test latex-io-screenshots
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const scheme = process.env.LATEX_IO_SCREENSHOT_SCHEME || '';
const phase = process.env.UI_V2_PHASE || 'after';
const outRoot = path.join(__dirname, '../../docs/screenshots/latex-io', scheme, phase);
const VIEWPORT = { width: 1440, height: 900 };
const DEVICE_SCALE = 2;
const mathexamTemplateZip = path.join(
  __dirname,
  '../../frontend/public/downloads/mathexam-v2.3.3.zip',
);
const apiBase =
  process.env.PLAYWRIGHT_API_URL
  || `${(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '')}/api`;

const {
  registerAndLoginSession,
  appOrigin,
} = require('../helpers/screenshotAuth');
const { seedViaPageRequest } = require('../helpers/seedUiV2ScreenshotRequest');
const { assertPageReady, assertNoHorizontalOverflow } = require('../helpers/screenshotAssert');
const { assertMinContrastIn } = require('../helpers/contrastAssert');

function mathexamZipForImport() {
  if (!fs.existsSync(mathexamTemplateZip)) {
    throw new Error(`missing template zip: ${mathexamTemplateZip}`);
  }
  return mathexamTemplateZip;
}

async function snap(page, slug) {
  await assertPageReady(page, slug);
  await assertNoHorizontalOverflow(page, slug);
  await page.setViewportSize(VIEWPORT);
  await page.waitForTimeout(400);
  fs.mkdirSync(outRoot, { recursive: true });
  await page.screenshot({ path: path.join(outRoot, `${slug}.png`), fullPage: true });
}

test.describe('LaTeX IO screenshots', () => {
  test.skip(!scheme, 'Set LATEX_IO_SCREENSHOT_SCHEME=light|dark');

  test.use({
    colorScheme: scheme === 'dark' ? 'dark' : 'light',
    deviceScaleFactor: DEVICE_SCALE,
    viewport: VIEWPORT,
  });

  test(`capture import/export ${scheme}`, async ({ page }) => {
    test.setTimeout(600000);
    page.on('dialog', (d) => d.accept());

    if (scheme === 'dark') {
      await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'dark'));
    } else {
      await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'light'));
    }

    const runId = Date.now();
    const session = await registerAndLoginSession(page, {
      uid: `latex_io_${scheme}_${runId}`,
      password: 'E2EPass123!',
      email: `latex_io_${scheme}_${runId}@example.com`,
    });
    const bankId = session.bankId || (await page.evaluate(() => localStorage.getItem('currentBankId')));
    await seedViaPageRequest(page, bankId);

    await page.goto(`${appOrigin}/latex-import`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('latex-import-flow-steps')).toBeVisible({ timeout: 30000 });
    await snap(page, 'latex-import-step-1');

    const zipPath = mathexamZipForImport();
    await page.locator('#fileInput').setInputFiles(zipPath);
    await page.getByRole('button', { name: '预览题目' }).click({ timeout: 120000 });
    await expect(page.getByTestId('latex-import-preview-panel')).toBeVisible({ timeout: 180000 });
    if (scheme === 'dark') {
      await assertMinContrastIn(page, '[data-testid="latex-import-preview-question-body"]', 4.5);
    }
    await snap(page, 'latex-import-step-2');

    await page.getByRole('button', { name: '确认导入' }).click({ timeout: 120000 });
    await expect(page.getByTestId('latex-import-result-panel')).toBeVisible({ timeout: 180000 });
    await snap(page, 'latex-import-step-3');

    await page.goto(`${appOrigin}/latex-export`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('latex-export-selection-summary')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('latex-export-structure-preview')).toBeVisible();
    const listRes = await page.request.get(`${apiBase}/questions/list?limit=3`, {
      headers: bankId ? { 'X-Bank-Id': bankId } : {},
    });
    if (listRes.ok()) {
      const body = await listRes.json();
      const rows = Array.isArray(body) ? body : body.questions || [];
      const ids = rows.map((q) => q._id).filter(Boolean);
      for (const id of ids.slice(0, 4)) {
        const row = page.locator('.export-question-row').filter({
          has: page.locator(`input[aria-label="选择题目 ${id}"]`),
        });
        await row.click().catch(() => {});
      }
      await expect(page.getByTestId('latex-export-selection-summary')).toContainText(/已选择 [1-9]/, { timeout: 15000 });
    }
    await snap(page, 'latex-export');
  });
});
