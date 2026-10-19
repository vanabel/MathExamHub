const { test, expect } = require('@playwright/test');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';

async function registerAndLogin(page, uid) {
  const password = 'E2EPass123!';
  const email = `${uid}@example.com`;
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

async function createMinimalQuestion(page) {
  return page.evaluate(async ({ apiBase: base }) => {
    const bankId = localStorage.getItem('currentBankId');
    const res = await fetch(`${base}/questions/create`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(bankId ? { 'X-Bank-Id': bankId } : {}),
      },
      body: JSON.stringify({
        subject: '解析几何',
        type: '填空题',
        totalScore: 5,
        difficulty: '中',
        questionText: 'E2E 题干',
        correctAnswer: 'E2E 答案',
        solution: '',
      }),
    });
    if (!res.ok) throw new Error(`create question failed: ${res.status}`);
    const data = await res.json();
    return data._id;
  }, { apiBase });
}

async function assertStemPairLayout(page) {
  const metrics = await page.evaluate(() => {
    const text = document.getElementById('questionText');
    const answer = document.getElementById('questionAnswer');
    const solution = document.getElementById('questionSolution');
    const form = text?.closest('form');
    if (!text || !answer || !solution || !form) return null;

    const textStyle = getComputedStyle(text);
    const lineHeight = parseFloat(textStyle.lineHeight) || parseFloat(textStyle.fontSize) * 1.5;
    const textBox = text.getBoundingClientRect();
    const answerBox = answer.getBoundingClientRect();
    const solutionBox = solution.getBoundingClientRect();
    const formBox = form.getBoundingClientRect();

    return {
      textTop: textBox.top,
      answerTop: answerBox.top,
      textHeight: textBox.height,
      answerHeight: answerBox.height,
      minFiveLines: lineHeight * 5,
      solutionWidth: solutionBox.width,
      formWidth: formBox.width,
    };
  });

  expect(metrics).toBeTruthy();
  expect(Math.abs(metrics.textTop - metrics.answerTop)).toBeLessThan(2);
  expect(metrics.textHeight).toBeGreaterThanOrEqual(metrics.minFiveLines - 2);
  expect(metrics.answerHeight).toBeGreaterThanOrEqual(metrics.minFiveLines - 2);
  expect(Math.abs(metrics.textHeight - metrics.answerHeight)).toBeLessThan(4);
  expect(metrics.solutionWidth).toBeGreaterThanOrEqual(metrics.formWidth * 0.95);
}

test.describe('question form stem layout at 1440px', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('question-add side-by-side stem and answer', async ({ page }) => {
    const uid = `qform_add_${Date.now()}`;
    await registerAndLogin(page, uid);
    await page.goto('/question-add', { waitUntil: 'domcontentloaded' });
    const skip = page.getByTestId('onboarding-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await expect(page.getByTestId('question-form-text')).toBeVisible({ timeout: 15000 });
    await assertStemPairLayout(page);
  });

  test('question-edit side-by-side stem and answer', async ({ page }) => {
    const uid = `qform_edit_${Date.now()}`;
    await registerAndLogin(page, uid);
    const qid = await createMinimalQuestion(page);
    expect(qid).toBeTruthy();
    await page.goto(`/question-edit/${qid}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('question-form-text')).toBeVisible({ timeout: 15000 });
    await assertStemPairLayout(page);
  });
});
