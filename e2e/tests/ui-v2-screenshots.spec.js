/**
 * Capture UI v2 before/after screenshots for all major routes.
 * Requires frontend built with VUE_APP_API_BASE_URL=/api and ui-v2-static-server.js (same-origin cookies).
 * Usage: UI_V2_PHASE=after PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npx playwright test ui-v2-screenshots.spec.js
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { kpFixture } = require('../helpers/uiV2ScreenshotSeed');
const { seedViaPageRequest } = require('../helpers/seedUiV2ScreenshotRequest');
const {
  registerAndLoginSession,
  captureLoggedOutAuthPages,
  persistAuthStorageState,
  appOrigin,
  apiBase,
} = require('../helpers/screenshotAuth');
// apiBase defaults to ${PLAYWRIGHT_BASE_URL}/api — use ui-v2-static-server.js for same-origin session cookies.
const { assertPageReady, assertNoHorizontalOverflow } = require('../helpers/screenshotAssert');

const phase = process.env.UI_V2_PHASE || 'after';
const outRoot = path.join(__dirname, '../../docs/screenshots/ui-v2', phase);

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
];

async function waitForKpJob(page, jobId, maxMs = 90000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const status = await page.request.get(`${apiBase}/questions/kp-tag-jobs/${jobId}`, {
      headers: { 'X-Bank-Id': await page.evaluate(() => localStorage.getItem('currentBankId') || '') },
    });
    if (!status.ok()) break;
    const job = await status.json();
    if (job.status === 'review' || ((job.rows || []).length > 0 && job.status === 'completed')) {
      return job;
    }
    if (job.status === 'failed') break;
    await page.waitForTimeout(1500);
  }
  return null;
}

async function snap(page, slug, vp) {
  await assertPageReady(page, slug);
  await assertNoHorizontalOverflow(page, slug);
  const dir = path.join(outRoot, vp.name);
  fs.mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    if (window.MathJax?.Hub) {
      return new Promise((resolve) => {
        window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub], resolve);
      });
    }
    return undefined;
  }).catch(() => {});
  await page.screenshot({
    path: path.join(dir, `${slug}.png`),
    fullPage: true,
  });
}

async function snapPublic(page, slug, vp) {
  const dir = path.join(outRoot, vp.name);
  fs.mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.waitForTimeout(300);
  if (slug === 'login') {
    await expect(page.getByTestId('login-page')).toBeVisible();
  }
  await assertNoHorizontalOverflow(page, slug);
  await page.screenshot({ path: path.join(dir, `${slug}.png`), fullPage: true });
}

async function gotoAuthed(page, urlPath) {
  await page.goto(`${appOrigin}${urlPath}`, { waitUntil: 'domcontentloaded' });
}

async function captureAll(page, browser, ctx) {
  page.on('dialog', (d) => d.accept());

  const session = await registerAndLoginSession(page, ctx);
  const bankId = session.bankId || (await page.evaluate(() => localStorage.getItem('currentBankId')));
  await persistAuthStorageState(page.context(), page, session);
  const seedMeta = await seedViaPageRequest(page, bankId);

  if (seedMeta?.jobId) {
    const job = await waitForKpJob(page, seedMeta.jobId).catch(() => null);
    if (!job) seedMeta.jobId = null;
  }

  const skipTour = page.getByTestId('onboarding-skip');
  await gotoAuthed(page, '/question-list');
  if (await skipTour.isVisible().catch(() => false)) await skipTour.click();

  for (const vp of VIEWPORTS) {
    await captureLoggedOutAuthPages(browser, vp, async (authPage, slug, viewport) => {
      if (slug === 'login') {
        await expect(authPage.getByTestId('login-page')).toBeVisible();
      }
      await snapPublic(authPage, slug, viewport);
    });

    const meRes = await page.request.get(`${apiBase}/auth/me`);
    expect(meRes.ok(), 'authenticated API session before viewport captures').toBeTruthy();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    await gotoAuthed(page, '/question-list');
    if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
    await page.waitForSelector('.question-card', { timeout: 60000 });
    await expect(page.locator('.question-card').first()).toBeVisible();
    await snap(page, 'question-list', vp);

    await gotoAuthed(page, '/question-add');
    await snap(page, 'question-add', vp);

    let onEdit = false;
    await gotoAuthed(page, '/question-list');
    const menuBtn = page.locator('[data-testid^="question-list-row-menu-"]').first();
    if (await menuBtn.isVisible().catch(() => false)) {
      await menuBtn.click();
      const editLink = page.locator('[data-testid="question-list-edit"]').first();
      if (await editLink.isVisible().catch(() => false)) {
        await editLink.click();
        onEdit = await page.waitForURL(/question-edit/, { timeout: 15000 }).then(() => true).catch(() => false);
      }
    }
    if (!onEdit) {
      const qid = await page.evaluate(async ({ base }) => {
        const bankId = localStorage.getItem('currentBankId');
        const res = await fetch(`${base}/questions/list?limit=1`, {
          credentials: 'include',
          headers: bankId ? { 'X-Bank-Id': bankId } : {},
        });
        const data = await res.json();
        return data.questions?.[0]?._id || null;
      }, { base: apiBase });
      if (qid) {
        await gotoAuthed(page, `/question-edit/${qid}`);
        onEdit = true;
      }
    }
    if (onEdit) {
      await expect(page).toHaveURL(/question-edit/);
      await snap(page, 'question-edit', vp);
    }

    await gotoAuthed(page, '/latex-export');
    const exportRows = page.locator('.export-question-row');
    await exportRows.first().waitFor({ timeout: 60000 });
    const rowCount = await exportRows.count();
    expect(rowCount).toBeGreaterThan(0);
    await exportRows.nth(0).click();
    if (rowCount > 1) await exportRows.nth(1).click();
    await page.getByTestId('latex-export-selection-summary').waitFor({ timeout: 15000 });
    await snap(page, 'latex-export', vp);

    await gotoAuthed(page, '/latex-import');
    await snap(page, 'latex-import', vp);

    if (fs.existsSync(kpFixture)) {
      await gotoAuthed(page, '/knowledge-points/import');
      await snap(page, 'kp-import', vp);
      await gotoAuthed(page, '/knowledge-points');
      await snap(page, 'knowledge-points', vp);
    }

    if (seedMeta?.jobId) {
      await gotoAuthed(page, `/knowledge-points/review/${seedMeta.jobId}`);
      await snap(page, 'kp-tag-review', vp);
    }

    await gotoAuthed(page, '/duplicates');
    await snap(page, 'duplicates', vp);
    await gotoAuthed(page, '/recycle-bin');
    await snap(page, 'recycle-bin', vp);
    await gotoAuthed(page, '/exam-wizard');
    await snap(page, 'exam-wizard', vp);
    await gotoAuthed(page, '/exam-history');
    await snap(page, 'exam-history', vp);
    await gotoAuthed(page, '/question-quality');
    await snap(page, 'question-quality', vp);
    await gotoAuthed(page, '/bank-stats');
    await snap(page, 'bank-stats', vp);
    await gotoAuthed(page, '/admin');
    await snap(page, 'admin-forbidden', vp);
    await gotoAuthed(page, '/this-route-does-not-exist-ui-v2');
    await snap(page, 'not-found', vp);
  }

}

test.describe('UI v2 screenshots', () => {
  test.skip(!process.env.UI_V2_PHASE, 'Set UI_V2_PHASE=before|after to capture screenshots');

  test(`capture ${phase}`, async ({ page, browser }) => {
    test.setTimeout(1200000);
    fs.mkdirSync(outRoot, { recursive: true });
    const uid = `ui_v2_${Date.now()}`;
    await captureAll(page, browser, {
      uid,
      password: 'E2EPass123!',
      email: `${uid}@example.com`,
    });
  });
});
