/**
 * LaTeX import/export redesign screenshots @ 1440px (light + dark).
 * Run: LATEX_IO_SCREENSHOT_SCHEME=light|dark npm run e2e -- latex-io-screenshots
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const scheme = process.env.LATEX_IO_SCREENSHOT_SCHEME || '';
const phase = process.env.UI_V2_PHASE || 'after';
const outRoot = path.join(__dirname, '../../docs/screenshots/latex-io', scheme, phase);
const VIEWPORT = { width: 1440, height: 900 };
const fixtureDir = path.join(__dirname, '../../backend/test/fixtures/exam-structure');
const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';

const {
  registerAndLoginSession,
  appOrigin,
} = require('../helpers/screenshotAuth');
const { seedViaPageRequest } = require('../helpers/seedUiV2ScreenshotRequest');
const { assertPageReady, assertNoHorizontalOverflow } = require('../helpers/screenshotAssert');

function buildMathexamZip() {
  const zipPath = path.join(os.tmpdir(), `latex-io-shot-${Date.now()}.zip`);
  execSync(`zip -j "${zipPath}" exam.tex exam-body.tex`, { cwd: fixtureDir });
  return zipPath;
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

  test.use({ colorScheme: scheme === 'dark' ? 'dark' : 'light' });

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

    const zipPath = buildMathexamZip();
    await page.locator('#fileInput').setInputFiles(zipPath);
    await page.getByRole('button', { name: '预览题目' }).click({ timeout: 120000 });
    await expect(page.getByTestId('latex-import-preview-panel')).toBeVisible({ timeout: 180000 });
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
      const ids = (await listRes.json()).questions?.map((q) => q._id) || [];
      for (const id of ids.slice(0, 2)) {
        await page.locator(`.export-question-row`).filter({ has: page.locator(`input[aria-label="选择题目 ${id}"]`) }).click().catch(() => {});
      }
    }
    await snap(page, 'latex-export');
  });
});
