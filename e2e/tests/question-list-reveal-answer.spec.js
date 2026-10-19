const { test, expect } = require('@playwright/test');

const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000/api';

const WIDE_ANSWER =
  '$$\\cos\\alpha,\\ \\cos\\beta,\\ \\cos\\gamma$$ 即 '
  + '$$\\sec^2\\theta = 1 + \\tan^2\\theta$$ '
  + '$$\\cos\\alpha + \\sin\\beta = 1$$';

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

async function seedWideAnswerQuestion(page, bankId) {
  await page.evaluate(async ({ base, bank, answer }) => {
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
        totalScore: 10,
        questionText: '已知向量 $\\vec a,\\vec b$，求夹角。',
        correctAnswer: answer,
      }),
    });
  }, { base: apiBase, bank: bankId, answer: WIDE_ANSWER });
}

async function openListAndRevealAnswer(page) {
  await page.goto('/question-list?q=求夹角', { waitUntil: 'domcontentloaded' });
  const skip = page.getByTestId('onboarding-skip');
  if (await skip.isVisible().catch(() => false)) await skip.click();
  const card = page.locator('.question-card').filter({ hasText: '求夹角' }).first();
  await expect(card).toBeVisible({ timeout: 30000 });
  await card.getByTestId('question-list-reveal-answer').click();
  await expect(page.locator('[data-answer-detail-qid]').first()).toBeVisible();
  await expect
    .poll(async () => page.locator('.question-card__math-scroll .MathJax_Display').count())
    .toBeGreaterThan(0);
}

/** @returns {string[]} issue messages */
async function collectAnswerDisplayMathIssues(page) {
  return page.evaluate(() => {
    const issues = [];
    const scrollBoxes = document.querySelectorAll('.question-card__math-scroll');
    for (const box of scrollBoxes) {
      const displays = box.querySelectorAll('.MathJax_Display');
      if (box.scrollWidth >= 3 * box.clientWidth) {
        issues.push(`scrollWidth ${box.scrollWidth} >= 3*clientWidth ${box.clientWidth}`);
      }
      for (const disp of displays) {
        const br = box.getBoundingClientRect();
        const mr = disp.getBoundingClientRect();
        if (mr.width <= 0 || mr.height <= 0) {
          issues.push('display box has zero size');
          continue;
        }
        const glyph = disp.querySelector('.math span') || disp.querySelector('.math') || disp;
        const gr = glyph.getBoundingClientRect();
        if (gr.left < br.left - 1) {
          issues.push(`glyph left ${gr.left} < box left ${br.left}`);
        }
        const sampleX = Math.min(br.right - 3, Math.max(br.left + 3, gr.left + Math.min(8, gr.width / 2)));
        const sampleY = gr.top + gr.height / 2;
        const hit = document.elementFromPoint(sampleX, sampleY);
        if (!hit || !box.contains(hit)) {
          issues.push('no visible glyph at sample point');
        }
      }
    }
    return issues;
  });
}

test.describe('question list reveal answer', () => {
  test('MathJax typesets revealed answer on collapsed card', async ({ page }) => {
    const uid = `qlans_${Date.now()}`;
    const password = 'E2EPass123!';
    await registerAndLogin(page, { uid, password, email: `${uid}@example.com` });
    const bankId = await page.evaluate(() => localStorage.getItem('currentBankId'));
    await seedWideAnswerQuestion(page, bankId);
    await openListAndRevealAnswer(page);

    const detail = page.locator('[data-answer-detail-qid]').first();
    await expect
      .poll(async () => detail.evaluate((el) => {
        const hasMathJax = !!el.querySelector('.MathJax_Display, .MathJax');
        const text = el.innerText || '';
        const hasRawDollar = /\$\$|\$[^$]+\$/.test(text);
        return hasMathJax && !hasRawDollar;
      }), { timeout: 20000 })
      .toBe(true);
  });

  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    test(`display formulas healthy in answer box at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const uid = `qlmath_${viewport.width}_${Date.now()}`;
      const password = 'E2EPass123!';
      await registerAndLogin(page, { uid, password, email: `${uid}@example.com` });
      const bankId = await page.evaluate(() => localStorage.getItem('currentBankId'));
      await seedWideAnswerQuestion(page, bankId);
      await openListAndRevealAnswer(page);

      await expect
        .poll(async () => collectAnswerDisplayMathIssues(page), { timeout: 20000 })
        .toEqual([]);
    });
  }
});
