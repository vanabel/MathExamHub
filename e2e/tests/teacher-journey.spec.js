const { test, expect } = require('@playwright/test');

async function setWizardSubject(page, subject) {
  const select = page.getByTestId('wizard-subject-select');
  await expect(select).toBeVisible({ timeout: 15000 });
  const hasOption = await select.evaluate(
    (el, subj) => Array.from(el.options).some((o) => o.value === subj),
    subject,
  );
  if (hasOption) {
    await select.selectOption(subject);
    return;
  }
  await select.selectOption('__custom__');
  const custom = page.getByTestId('wizard-subject-custom');
  await expect(custom).toBeVisible({ timeout: 10000 });
  await custom.fill(subject);
}
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const { assertExportZipBuffer, readDownloadBuffer } = require('../helpers/assertExportPdf');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';
const shots = path.join(__dirname, '../../docs/screenshots');
if (!fs.existsSync(shots)) fs.mkdirSync(shots, { recursive: true });
const fixtureDir = path.join(__dirname, '../../backend/test/fixtures/exam-structure');
const kpFixture = path.join(__dirname, '../../backend/test/fixtures/analytic-geometry-kp.xls');

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
  const zipPath = path.join(os.tmpdir(), `teacher-journey-${Date.now()}.zip`);
  execSync(`zip -j "${zipPath}" exam.tex exam-body.tex`, { cwd: fixtureDir });
  return zipPath;
}

test.describe('Teacher journey', () => {
  test('zip import → header → list → KP → wizard gap → export compile', async ({ page }) => {
    test.setTimeout(360000);
    page.on('dialog', (d) => d.accept());

    const uid = `tchr_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });

    const zipPath = buildMathexamZip();
    await page.goto('/latex-import', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('onboarding-panel')).not.toBeVisible();
    await expect(page).toHaveURL(/\/latex-import/);
    await page.locator('#fileInput').setInputFiles(zipPath);
    await page.getByRole('button', { name: '直接导入' }).click({ timeout: 120000 });
    await expect(page.getByTestId('latex-import-success-link')).toBeVisible({ timeout: 180000 });
    await page.getByTestId('latex-import-generate-blueprint').click();
    await expect(page.getByTestId('latex-import-open-wizard')).toBeVisible({ timeout: 60000 });
    const wizardPath = await page.getByTestId('latex-import-open-wizard').getAttribute('href');
    await page.screenshot({ path: path.join(shots, 'journey-import-done.png'), fullPage: true });

    await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
    const skipTour = page.getByTestId('onboarding-skip');
    if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
    await page.getByTestId('navbar-bank-header-btn').click();
    await page.getByTestId('bank-header-exam-date').fill('2026-10-18');
    await page.locator('label.form-label', { hasText: '课程' }).locator('..').locator('input').fill('解析几何');
    await page.getByTestId('bank-header-save').click();
    await page.screenshot({ path: path.join(shots, 'journey-bank-header.png'), fullPage: true });

    await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('question-list-type').selectOption('判断题');
    await page.screenshot({ path: path.join(shots, 'journey-list-filter.png'), fullPage: true });

    if (fs.existsSync(kpFixture)) {
      await page.goto('/knowledge-points/import', { waitUntil: 'domcontentloaded' });
      await page.locator('input[placeholder="解析几何"]').fill('解析几何');
      await page.getByTestId('kp-import-file').setInputFiles(kpFixture);
      await page.getByTestId('kp-import-preview').click();
      await page.getByTestId('kp-import-apply').click();
      await expect(page.getByText(/合并完成/)).toBeVisible({ timeout: 60000 });
    }

    const jobId = await page.evaluate(async ({ base }) => {
      const headers = {
        'Content-Type': 'application/json',
        'X-Bank-Id': localStorage.getItem('currentBankId'),
      };
      const start = await fetch(`${base}/questions/kp-tag-jobs`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ subject: '解析几何', maxKpsPerQuestion: 1 }),
      });
      const body = await start.json();
      return body.jobId;
    }, { base: apiBase });

    if (jobId) {
      await page.evaluate(async ({ base, id }) => {
        const headers = { 'X-Bank-Id': localStorage.getItem('currentBankId') };
        for (let i = 0; i < 25; i += 1) {
          const res = await fetch(`${base}/questions/kp-tag-jobs/${id}`, { credentials: 'include', headers });
          const job = await res.json();
          if (job.status === 'completed' || job.status === 'failed') break;
          await new Promise((r) => setTimeout(r, 2000));
        }
        const res = await fetch(`${base}/questions/kp-tag-jobs/${id}`, { credentials: 'include', headers });
        const job = await res.json();
        const rows = (job.rows || []).slice(0, 5).map((r) => ({
          questionId: r.questionId,
          status: 'accepted',
          acceptedKnowledgePointIds: r.acceptedKnowledgePointIds?.length
            ? r.acceptedKnowledgePointIds
            : (r.suggestions || []).map((s) => s.knowledgePointId).filter(Boolean),
        })).filter((r) => r.acceptedKnowledgePointIds?.length);
        if (rows.length) {
          await fetch(`${base}/questions/kp-tag-jobs/${id}/review`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows }),
          });
          await fetch(`${base}/questions/kp-tag-jobs/${id}/apply`, {
            method: 'POST',
            credentials: 'include',
            headers,
          });
        } else {
          await fetch(`${base}/questions/kp-tag-jobs/${id}/dismiss`, {
            method: 'POST',
            credentials: 'include',
            headers,
          });
        }
      }, { base: apiBase, id: jobId });
    }

    await page.goto(wizardPath, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/exam-wizard/, { timeout: 30000 });
    await setWizardSubject(page, '高等代数');
    await page.locator('#allowRelax').uncheck();
    await page.getByTestId('wizard-coverage-check').click();
    await expect(page.getByTestId('wizard-coverage-result')).toContainText(/缺口/, { timeout: 180000 });
    await page.screenshot({ path: path.join(shots, 'journey-wizard-gap.png'), fullPage: true });

    await setWizardSubject(page, '解析几何');
    await page.locator('#allowRelax').check();
    await page.getByTestId('wizard-coverage-check').click();
    await expect(page.getByTestId('wizard-coverage-result')).toContainText(/覆盖检查通过/, { timeout: 180000 });
    await page.getByTestId('wizard-generate').click();
    const scoreGapModal = page.getByTestId('wizard-score-gap-modal');
    if (await scoreGapModal.isVisible().catch(() => false)) {
      await page.getByTestId('wizard-score-gap-confirm').click();
    }
    await expect(page.getByRole('button', { name: '2. 预览' })).toBeEnabled({ timeout: 180000 });
    await page.getByRole('button', { name: '2. 预览' }).click();
    await page.screenshot({ path: path.join(shots, 'journey-wizard-preview.png'), fullPage: true });

    await page.getByRole('button', { name: '3. 导出' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('wizard-export-latex').click();
    const download = await downloadPromise;
    const buf = await readDownloadBuffer(download);
    if (process.env.E2E_COMPILE_TEX !== '0') {
      const result = assertExportZipBuffer(buf, { expectAcademicYear: '2026至2027' });
      expect(result.skipped).not.toBe(true);
    }
  });
});
