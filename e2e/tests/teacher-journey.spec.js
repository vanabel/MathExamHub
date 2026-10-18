const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const { assertExportZipBuffer, readDownloadBuffer } = require('../helpers/assertExportPdf');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';
const shots = path.join(__dirname, '../../docs/screenshots');
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
    await fetch(`${base}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass }),
    });
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
    await page.locator('input[type="file"]').first().setInputFiles(zipPath);
    await page.getByRole('button', { name: '预览题目' }).click();
    await expect(page.getByText(/预览识别到的题目/)).toBeVisible({ timeout: 120000 });
    await page.screenshot({ path: path.join(shots, 'journey-import-preview.png'), fullPage: true });
    await page.getByRole('button', { name: '确认导入' }).click();
    await expect(page.getByTestId('latex-import-success-link')).toBeVisible({ timeout: 120000 });
    await page.screenshot({ path: path.join(shots, 'journey-import-done.png'), fullPage: true });

    await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
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
      await page.getByTestId('kp-import-file').setInputFiles(kpFixture);
      await page.getByTestId('kp-import-preview').click();
      await page.getByTestId('kp-import-apply').click();
      await expect(page.getByText(/导入|成功/)).toBeVisible({ timeout: 60000 });
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
        for (let i = 0; i < 45; i += 1) {
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

    await page.goto('/exam-wizard', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '克隆' }).first().click();
    await page.locator('label.form-label', { hasText: '科目' }).locator('..').locator('input').fill('高等代数');
    await page.locator('#allowRelax').check();
    await page.getByTestId('wizard-generate').click();
    await expect(page.getByTestId('wizard-coverage-result').or(page.getByText(/缺口|subject_mismatch|科目/i))).toBeVisible({ timeout: 120000 });
    await page.screenshot({ path: path.join(shots, 'journey-wizard-gap.png'), fullPage: true });

    await page.locator('label.form-label', { hasText: '科目' }).locator('..').locator('input').fill('解析几何');
    await page.locator('label.form-label', { hasText: '目标总分' }).locator('..').locator('input').fill('0');
    await page.getByTestId('wizard-generate').click();
    await expect(page.getByRole('button', { name: '2. 预览' })).toBeEnabled({ timeout: 180000 });
    await page.getByRole('button', { name: '2. 预览' }).click();
    await page.screenshot({ path: path.join(shots, 'journey-wizard-preview.png'), fullPage: true });

    await page.getByRole('button', { name: '3. 导出' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('wizard-export-latex').click();
    const download = await downloadPromise;
    const buf = readDownloadBuffer(await download);
    if (process.env.E2E_COMPILE_TEX !== '0') {
      const result = assertExportZipBuffer(buf, { expectAcademicYear: '2026至2027' });
      expect(result.skipped).not.toBe(true);
    }
  });
});
