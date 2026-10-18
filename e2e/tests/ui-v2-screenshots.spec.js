/**
 * Capture UI v2 before/after screenshots for all major routes.
 * Usage: UI_V2_PHASE=before|after npx playwright test ui-v2-screenshots.spec.js
 */
const { test } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';
const phase = process.env.UI_V2_PHASE || 'after';
const outRoot = path.join(__dirname, '../../docs/screenshots/ui-v2', phase);
const fixtureDir = path.join(__dirname, '../../backend/test/fixtures/exam-structure');
const kpFixture = path.join(__dirname, '../../backend/test/fixtures/analytic-geometry-kp.xls');

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

function buildMathexamZip() {
  const zipPath = path.join(os.tmpdir(), `ui-v2-${Date.now()}.zip`);
  execSync(`zip -j "${zipPath}" exam.tex exam-body.tex`, { cwd: fixtureDir });
  return zipPath;
}

async function snap(page, slug, vp) {
  const dir = path.join(outRoot, vp.name);
  fs.mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(dir, `${slug}.png`),
    fullPage: true,
  });
}

async function captureAll(page, ctx) {
  page.on('dialog', (d) => d.accept());
  for (const vp of VIEWPORTS) {
    await snap(page, 'login', vp);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await snap(page, 'register', vp);

    await registerAndLogin(page, ctx);
    const skipTour = page.getByTestId('onboarding-skip');
    if (await skipTour.isVisible().catch(() => false)) await skipTour.click();

    await page.goto('/latex-import', { waitUntil: 'domcontentloaded' });
    await snap(page, 'latex-import', vp);

    try {
      const zipPath = buildMathexamZip();
      await page.locator('#fileInput').setInputFiles(zipPath);
      await page.getByRole('button', { name: '直接导入' }).click({ timeout: 120000 });
      await page.getByTestId('latex-import-success-link').waitFor({ timeout: 240000 });
      await snap(page, 'latex-import-done', vp);
    } catch (err) {
      console.warn('latex import skipped for screenshots:', err.message);
    }

    await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
    if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
    await snap(page, 'question-list', vp);

    await page.goto('/question-add', { waitUntil: 'domcontentloaded' });
    await snap(page, 'question-add', vp);

    const firstEdit = page.locator('[data-testid="question-list-edit"]').first();
    if (await firstEdit.isVisible().catch(() => false)) {
      await firstEdit.click();
      await page.waitForURL(/question-edit/);
      await snap(page, 'question-edit', vp);
    }

    await page.goto('/latex-export', { waitUntil: 'domcontentloaded' });
    await snap(page, 'latex-export', vp);

    if (fs.existsSync(kpFixture)) {
      await page.goto('/knowledge-points/import', { waitUntil: 'domcontentloaded' });
      await snap(page, 'kp-import', vp);
      await page.goto('/knowledge-points', { waitUntil: 'domcontentloaded' });
      await snap(page, 'knowledge-points', vp);
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
  }
}

test.describe('UI v2 screenshots', () => {
  test(`capture ${phase}`, async ({ page }) => {
    test.setTimeout(600000);
    fs.mkdirSync(outRoot, { recursive: true });
    const uid = `ui_v2_${Date.now()}`;
    await captureAll(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
  });
});
