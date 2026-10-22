/**
 * Expand-align screenshots @ 1280×800 DPR2.
 * LATEX_IO_EXPAND_ALIGN_SCHEME=light|dark
 * LATEX_IO_EXPAND_ALIGN_PHASE=before|after
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const scheme = process.env.LATEX_IO_EXPAND_ALIGN_SCHEME || '';
const phase = process.env.LATEX_IO_EXPAND_ALIGN_PHASE || 'after';
const outRoot = path.join(
  __dirname,
  '../../docs/screenshots/latex-io-expand-align',
  scheme,
  phase,
);
const VIEWPORT = { width: 1280, height: 800 };
const DEVICE_SCALE = 2;
const apiBase =
  process.env.PLAYWRIGHT_API_URL
  || `${(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '')}/api`;

const { registerAndLoginSession, appOrigin } = require('../helpers/screenshotAuth');
const { seedViaPageRequest } = require('../helpers/seedUiV2ScreenshotRequest');

async function snap(page, slug) {
  await page.setViewportSize(VIEWPORT);
  await page.waitForTimeout(350);
  fs.mkdirSync(outRoot, { recursive: true });
  await page.screenshot({ path: path.join(outRoot, `${slug}.png`), fullPage: false });
}

test.describe('LaTeX IO expand-align screenshots', () => {
  test.skip(!scheme, 'Set LATEX_IO_EXPAND_ALIGN_SCHEME=light|dark');

  test.use({
    colorScheme: scheme === 'dark' ? 'dark' : 'light',
    deviceScaleFactor: DEVICE_SCALE,
    viewport: VIEWPORT,
  });

  test(`capture ${scheme} ${phase}`, async ({ page }) => {
    test.setTimeout(180000);
    page.on('dialog', (d) => d.accept());

    if (scheme === 'dark') {
      await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'dark'));
    } else {
      await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'light'));
    }

    const runId = Date.now();
    const session = await registerAndLoginSession(page, {
      uid: `lio_align_${scheme}_${phase}_${runId}`,
      password: 'E2EPass123!',
      email: `lio_align_${scheme}_${phase}_${runId}@example.com`,
    });
    const bankId = session.bankId || (await page.evaluate(() => localStorage.getItem('currentBankId')));
    await seedViaPageRequest(page, bankId);

    await page.goto(`${appOrigin}/latex-export`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('latex-export-selection-summary')).toBeVisible({ timeout: 30000 });

    const listRes = await page.request.get(`${apiBase}/questions/list?limit=6`, {
      headers: bankId ? { 'X-Bank-Id': bankId } : {},
    });
    if (listRes.ok()) {
      const body = await listRes.json();
      const rows = Array.isArray(body) ? body : body.questions || [];
      for (const q of rows.slice(0, 3)) {
        if (!q._id) continue;
        const row = page.locator('.export-question-row').filter({
          has: page.locator(`input[aria-label="选择题目 ${q._id}"]`),
        });
        await row.click().catch(() => {});
      }
    }

    await expect(page.getByTestId('latex-export-view-mode')).toBeVisible();
    await page.getByTestId('latex-export-view-mode').getByText('预览', { exact: true }).click();
    await page.waitForTimeout(250);
    await snap(page, 'export-preview-mode');

    await page.getByTestId('latex-export-view-mode').getByText('LaTeX 源码', { exact: true }).click();
    await page.waitForTimeout(250);
    await snap(page, 'export-latex-source-mode');
  });
});
