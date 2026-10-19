const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';

function ensurePdfFixtureInUploads(filename) {
  const src = path.join(__dirname, '../../backend/test/fixtures/fig2.pdf');
  const destDir = path.join(__dirname, '../../backend/uploads');
  const dest = path.join(destDir, filename);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
  return filename;
}

async function registerAndLogin(page, { uid, password, email }) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ base, username, pass, mail }) => {
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
  }, { base: apiBase, username: uid, pass: password, mail: email });
}

test.describe('question list PDF idle stability', () => {
  test('no PDF worker storm while list is idle', async ({ page }) => {
    const uid = `qlpdf_${Date.now()}`;
    const password = 'E2EPass123!';
    await registerAndLogin(page, { uid, password, email: `${uid}@example.com` });

    const bankId = await page.evaluate(() => localStorage.getItem('currentBankId'));
    const pdfFile = ensurePdfFixtureInUploads(`e2e-cube-${Date.now()}.pdf`);
    const figLabel = 'demo-2024-1-正方体';

    await page.evaluate(async ({ base, bank, pdf, label }) => {
      const hdr = { 'Content-Type': 'application/json', 'X-Bank-Id': bank };
      await fetch(`${base}/onboarding/import-sample`, { method: 'POST', credentials: 'include', headers: hdr });
      await fetch(`${base}/questions/create`, {
        method: 'POST',
        credentials: 'include',
        headers: hdr,
        body: JSON.stringify({
          type: '解答题',
          subject: '解析几何',
          difficulty: '中',
          totalScore: 8,
          questionText: `如图\\ref{fig:${label}}，求体积。`,
          correctAnswer: '见解答',
          images: [{ url: pdf, label, caption: '正方体' }],
        }),
      });
    }, { base: apiBase, bank: bankId, pdf: pdfFile, label: figLabel });

    let workerLoads = 0;
    let pdfUploadFetches = 0;
    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('pdf.worker')) workerLoads += 1;
      if (/\/api\/uploads\/.*\.pdf/i.test(u)) pdfUploadFetches += 1;
    });

    await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
    const onboardingSkip = page.getByTestId('onboarding-skip');
    if (await onboardingSkip.isVisible().catch(() => false)) {
      await onboardingSkip.click();
    }
    await expect(page.getByTestId('question-list-header')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.pdf-container').first()).toBeVisible({ timeout: 30000 });

    await page.waitForTimeout(10000);

    const pdfCards = await page.locator('.pdf-container').count();
    expect(workerLoads).toBeLessThanOrEqual(2);
    expect(pdfUploadFetches).toBeLessThanOrEqual(Math.max(pdfCards, 1) * 3);
  });
});
