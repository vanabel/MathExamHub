const { test, expect } = require('@playwright/test');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';

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

test.describe('Delivery polish R2', () => {
  test('generate returns structured subject mismatch shortfall', async ({ page }) => {
    const uid = `dpr2_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });

    const shortfall = await page.evaluate(async ({ base }) => {
      const bankId = localStorage.getItem('currentBankId');
      const headers = {
        'Content-Type': 'application/json',
        'X-Bank-Id': bankId,
      };
      await fetch(`${base}/questions/create`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          type: '判断题',
          subject: '解析几何',
          difficulty: '中',
          totalScore: 2,
          questionText: 'test',
          correctAnswer: '对',
        }),
      });
      const bp = await fetch(`${base}/exam-blueprints`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          title: 'alias-test',
          subject: '高等代数',
          totalScore: 2,
          sections: [{ questionType: '判断题', scorePerQuestion: 2, count: 1 }],
        }),
      }).then((r) => r.json());
      const gen = await fetch(`${base}/exams/generate`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ blueprintId: bp._id }),
      }).then((r) => r.json());
      return gen.shortfalls?.[0];
    }, { base: apiBase });

    expect(shortfall?.reasonCode).toBe('subject_mismatch');
    expect(shortfall?.filterStages).toBeTruthy();
  });

  test('recycle bin shows bank tab', async ({ page }) => {
    const uid = `dpr2rb_${Date.now()}`;
    await registerAndLogin(page, { uid, password: 'E2EPass123!', email: `${uid}@example.com` });
    await page.goto('/recycle-bin', { waitUntil: 'domcontentloaded' });
    const skip = page.getByTestId('onboarding-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await page.getByTestId('recycle-tab-banks').click();
    await expect(page.getByTestId('bank-recycle-empty')).toBeVisible({ timeout: 15000 });
  });
});
