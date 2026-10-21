/**
 * LaTeX export config compact redesign — before/after @ 1440×900 DPR2.
 *   LATEX_EXPORT_COMPACT_PHASE=before|after
 *   LATEX_EXPORT_COMPACT_SCHEME=light|dark
 *   PLAYWRIGHT_API_URL=http://127.0.0.1:8080/api (or :3000/api in CI)
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const scheme = process.env.LATEX_EXPORT_COMPACT_SCHEME || '';
const phase = process.env.LATEX_EXPORT_COMPACT_PHASE || 'after';
const outRoot = path.join(
  __dirname,
  '../../docs/screenshots/latex-export-compact',
  scheme,
  phase,
);
const VIEWPORT = { width: 1440, height: 900 };
const DEVICE_SCALE = 2;
const apiBase =
  process.env.PLAYWRIGHT_API_URL
  || `${(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '')}/api`;

const { registerAndLoginSession, appOrigin } = require('../helpers/screenshotAuth');
const { seedViaPageRequest } = require('../helpers/seedUiV2ScreenshotRequest');
const { assertPageReady, assertNoHorizontalOverflow } = require('../helpers/screenshotAssert');

async function snapExportPage(page) {
  await assertPageReady(page, 'latex-export');
  await assertNoHorizontalOverflow(page, 'latex-export-compact');
  await page.setViewportSize(VIEWPORT);
  await page.waitForTimeout(400);
  fs.mkdirSync(outRoot, { recursive: true });
  await page.screenshot({
    path: path.join(outRoot, 'latex-export.png'),
    fullPage: false,
  });
}

test.describe('LaTeX export compact screenshots', () => {
  test.skip(!scheme, 'Set LATEX_EXPORT_COMPACT_SCHEME=light|dark');

  test.use({
    colorScheme: scheme === 'dark' ? 'dark' : 'light',
    deviceScaleFactor: DEVICE_SCALE,
    viewport: VIEWPORT,
  });

  test(`capture export page ${scheme} ${phase}`, async ({ page }) => {
    test.setTimeout(180000);
    page.on('dialog', (d) => d.accept());

    if (scheme === 'dark') {
      await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'dark'));
    } else {
      await page.addInitScript(() => localStorage.setItem('mathexamColorScheme', 'light'));
    }

    const runId = Date.now();
    const session = await registerAndLoginSession(page, {
      uid: `lex_compact_${scheme}_${phase}_${runId}`,
      password: 'E2EPass123!',
      email: `lex_compact_${scheme}_${phase}_${runId}@example.com`,
    });
    const bankId = session.bankId || (await page.evaluate(() => localStorage.getItem('currentBankId')));
    await seedViaPageRequest(page, bankId);

    await page.goto(`${appOrigin}/latex-export`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('latex-export-selection-summary')).toBeVisible({ timeout: 30000 });

    const listRes = await page.request.get(`${apiBase}/questions/list?limit=4`, {
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
      await expect(page.getByTestId('latex-export-selection-summary')).toContainText(/已选择 [1-9]/, {
        timeout: 15000,
      });
    }

    await snapExportPage(page);
  });
});
