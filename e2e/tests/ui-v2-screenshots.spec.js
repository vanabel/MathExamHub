/**
 * Capture UI v2 before/after screenshots for all major routes.
 * Usage: UI_V2_PHASE=before|after npx playwright test ui-v2-screenshots.spec.js
 */
const { test } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { seedUiV2ScreenshotBank, kpFixture } = require('../helpers/uiV2ScreenshotSeed');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';
const phase = process.env.UI_V2_PHASE || 'after';
const outRoot = path.join(__dirname, '../../docs/screenshots/ui-v2', phase);

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
];

async function registerAndLogin(page, { uid, password, email }) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ apiBase: base, username, pass, mail }) => {
    await fetch(`${base}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass, email: mail }),
    });
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass }),
    });
    if (!loginRes.ok) throw new Error(`login failed: ${loginRes.status}`);
    const me = await fetch(`${base}/auth/me`, { credentials: 'include' }).then((r) => r.json());
    if (me.user) localStorage.setItem('currentUser', JSON.stringify(me.user));
    const banks = await fetch(`${base}/banks/mine`, { credentials: 'include' }).then((r) => r.json());
    const personal = (banks.banks || []).find((b) => b.isPersonalDefault) || (banks.banks || [])[0];
    if (personal) localStorage.setItem('currentBankId', personal._id);
  }, { apiBase, username: uid, pass: password, mail: email });
}

async function loginOnly(page, { uid, password }) {
  await page.evaluate(async ({ apiBase: base, username, pass }) => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentBankId');
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass }),
    });
    if (!loginRes.ok) throw new Error(`login failed: ${loginRes.status}`);
    const me = await fetch(`${base}/auth/me`, { credentials: 'include' }).then((r) => r.json());
    if (me.user) localStorage.setItem('currentUser', JSON.stringify(me.user));
    const banks = await fetch(`${base}/banks/mine`, { credentials: 'include' }).then((r) => r.json());
    const personal = (banks.banks || []).find((b) => b.isPersonalDefault) || (banks.banks || [])[0];
    if (personal) localStorage.setItem('currentBankId', personal._id);
  }, { apiBase, username: uid, pass: password });
}

async function snapAuthPages(page, vp, ctx) {
  await page.evaluate(() => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentBankId');
  });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await snap(page, 'login', vp);
  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await snap(page, 'register', vp);
  await loginOnly(page, ctx);
}

async function waitForKpJob(page, jobId, maxMs = 90000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const status = await page.evaluate(async ({ base, id }) => {
      const bankId = localStorage.getItem('currentBankId');
      const res = await fetch(`${base}/questions/kp-tag-jobs/${id}`, {
        credentials: 'include',
        headers: bankId ? { 'X-Bank-Id': bankId } : {},
      });
      const job = await res.json();
      return { status: job.status, rows: (job.rows || []).length };
    }, { base: apiBase, id: jobId });
    if (status.status === 'review' || (status.rows > 0 && status.status === 'completed')) {
      return;
    }
    if (status.status === 'failed') break;
    await page.waitForTimeout(1500);
  }
}

async function snap(page, slug, vp) {
  const dir = path.join(outRoot, vp.name);
  fs.mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.waitForTimeout(500);
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

async function captureAll(page, ctx) {
  page.on('dialog', (d) => d.accept());

  await registerAndLogin(page, ctx);
  const seedMeta = await page.evaluate(
    async ({ base, fnBody }) => {
      // eslint-disable-next-line no-eval
      const fn = eval(`(${fnBody})`);
      return fn({ base });
    },
    { base: apiBase, fnBody: seedUiV2ScreenshotBank.toString() },
  );

  if (seedMeta?.jobId) {
    await waitForKpJob(page, seedMeta.jobId).catch((err) => {
      console.warn('kp tag job wait skipped:', err.message);
      seedMeta.jobId = null;
    });
  }

  const skipTour = page.getByTestId('onboarding-skip');
  if (await skipTour.isVisible().catch(() => false)) await skipTour.click();

  for (const vp of VIEWPORTS) {
    await snapAuthPages(page, vp, ctx);

    await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
    if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
    await page.waitForSelector('.question-card', { timeout: 60000 }).catch(() => {});
    await snap(page, 'question-list', vp);

    await page.goto('/question-add', { waitUntil: 'domcontentloaded' });
    await snap(page, 'question-add', vp);

    await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
    let onEdit = false;
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
        await page.goto(`/question-edit/${qid}`, { waitUntil: 'domcontentloaded' });
        onEdit = true;
      }
    }
    if (onEdit) await snap(page, 'question-edit', vp);

    await page.goto('/latex-export', { waitUntil: 'domcontentloaded' });
    const exportRows = page.locator('.export-question-row');
    await exportRows.first().waitFor({ timeout: 60000 }).catch(() => {});
    const rowCount = await exportRows.count().catch(() => 0);
    if (rowCount > 0) {
      await exportRows.nth(0).click();
      if (rowCount > 1) await exportRows.nth(1).click();
    }
    await page.getByTestId('latex-export-selection-summary').waitFor({ timeout: 15000 }).catch(() => {});
    await snap(page, 'latex-export', vp);

    await page.goto('/latex-import', { waitUntil: 'domcontentloaded' });
    await snap(page, 'latex-import', vp);

    if (fs.existsSync(kpFixture)) {
      await page.goto('/knowledge-points/import', { waitUntil: 'domcontentloaded' });
      await snap(page, 'kp-import', vp);
      await page.goto('/knowledge-points', { waitUntil: 'domcontentloaded' });
      await snap(page, 'knowledge-points', vp);
    }

    if (seedMeta?.jobId) {
      await page.goto(`/knowledge-points/review/${seedMeta.jobId}`, { waitUntil: 'domcontentloaded' });
      await snap(page, 'kp-tag-review', vp);
    }

    await page.goto('/duplicates', { waitUntil: 'domcontentloaded' });
    await snap(page, 'duplicates', vp);
    await page.goto('/recycle-bin', { waitUntil: 'domcontentloaded' });
    await snap(page, 'recycle-bin', vp);
    await page.goto('/exam-wizard', { waitUntil: 'domcontentloaded' });
    await snap(page, 'exam-wizard', vp);
    await page.goto('/exam-history', { waitUntil: 'domcontentloaded' });
    await snap(page, 'exam-history', vp);
    await page.goto('/question-quality', { waitUntil: 'domcontentloaded' });
    await snap(page, 'question-quality', vp);
    await page.goto('/bank-stats', { waitUntil: 'domcontentloaded' });
    await snap(page, 'bank-stats', vp);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await snap(page, 'admin-forbidden', vp);
    await page.goto('/this-route-does-not-exist-ui-v2', { waitUntil: 'domcontentloaded' });
    await snap(page, 'not-found', vp);
  }
}

test.describe('UI v2 screenshots', () => {
  test.skip(!process.env.UI_V2_PHASE, 'Set UI_V2_PHASE=before|after to capture screenshots');

  test(`capture ${phase}`, async ({ page }) => {
    test.setTimeout(1200000);
    fs.mkdirSync(outRoot, { recursive: true });
    const uid = `ui_v2_${Date.now()}`;
    await captureAll(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
  });
});
