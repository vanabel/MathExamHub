const { test, expect } = require('@playwright/test');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';

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

test.describe('question list reveal answer', () => {
  test('MathJax typesets revealed answer on collapsed card', async ({ page }) => {
    const uid = `qlans_${Date.now()}`;
    const password = 'E2EPass123!';
    await registerAndLogin(page, { uid, password, email: `${uid}@example.com` });

    const bankId = await page.evaluate(() => localStorage.getItem('currentBankId'));
    await page.evaluate(async ({ base, bank }) => {
      const hdr = { 'Content-Type': 'application/json', 'X-Bank-Id': bank };
      await fetch(`${base}/onboarding/import-sample`, { method: 'POST', credentials: 'include', headers: hdr });
      await fetch(`${base}/questions/create`, {
        method: 'POST',
        credentials: 'include',
        headers: hdr,
        body: JSON.stringify({
          type: '填空题',
          subject: '解析几何',
          difficulty: '中',
          totalScore: 5,
          questionText: '求 $x$ 使 $x^2=4$。',
          correctAnswer: '$x=\\pm 2$ 或 $$\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$$',
        }),
      });
    }, { base: apiBase, bank: bankId });

    await page.goto('/question-list', { waitUntil: 'domcontentloaded' });
    const skip = page.getByTestId('onboarding-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();

    await expect(page.getByTestId('question-list-reveal-answer').first()).toBeVisible({ timeout: 30000 });
    await page.getByTestId('question-list-reveal-answer').first().click();

    const detail = page.locator('[data-answer-detail-qid]').first();
    await expect(detail).toBeVisible();

    await expect
      .poll(async () => {
        return detail.evaluate((el) => {
          const hasMathJax = !!el.querySelector('#MathJax_Message, .MathJax, mjx-container, .MathJax_Display');
          const text = el.innerText || '';
          const hasRawDollar = /\$\$|\$[^$]+\$/.test(text);
          return hasMathJax && !hasRawDollar;
        });
      }, { timeout: 20000 })
      .toBe(true);
  });
});
