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

function pngLeftColumnHasInk(pngBuffer, columnPx = 3) {
  if (pngBuffer.length < 64 || pngBuffer[0] !== 0x89) return true;
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  const idatChunks = [];
  while (offset + 12 <= pngBuffer.length) {
    const len = pngBuffer.readUInt32BE(offset);
    const type = pngBuffer.toString('ascii', offset + 4, offset + 8);
    const data = pngBuffer.subarray(offset + 8, offset + 8 + len);
    if (type === 'IHDR' && data.length >= 13) {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + len;
  }
  if (!width || !height || bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    return pngBuffer.some((b, i) => i > 200 && b < 240);
  }
  const zlib = require('zlib');
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  let pos = 0;
  for (let y = 0; y < height; y++) {
    pos += 1;
    for (let x = 0; x < Math.min(columnPx, width); x++) {
      const i = pos + x * bpp;
      const r = raw[i];
      const g = raw[i + 1];
      const b = raw[i + 2];
      const a = colorType === 6 ? raw[i + 3] : 255;
      if (a > 16 && (r < 245 || g < 245 || b < 245)) return true;
    }
    pos += stride;
  }
  return false;
}

/** @returns {string[]} issue messages */
async function collectAnswerDisplayMathIssues(page) {
  return page.evaluate(() => {
    const issues = [];
    function nearestHorizontalScrollContainer(el) {
      let n = el;
      while (n && n !== document.body) {
        const s = window.getComputedStyle(n);
        const ox = s.overflowX;
        if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 1) return n;
        n = n.parentElement;
      }
      return null;
    }
    const scrollBoxes = document.querySelectorAll('.question-card__math-scroll');
    for (const box of scrollBoxes) {
      const displays = box.querySelectorAll('.MathJax_Display');
      if (box.scrollWidth >= 3 * box.clientWidth) {
        issues.push(`scrollWidth ${box.scrollWidth} >= 3*clientWidth ${box.clientWidth}`);
      }
      for (const disp of displays) {
        const mr = disp.getBoundingClientRect();
        if (mr.width <= 0 || mr.height <= 0) {
          issues.push('display box has zero size');
          continue;
        }
        const glyph = disp.querySelector('.math span') || disp.querySelector('.math') || disp;
        const scrollEl = nearestHorizontalScrollContainer(glyph) || box;
        scrollEl.scrollLeft = 0;
        box.scrollLeft = 0;
        disp.scrollLeft = 0;
        const sr = scrollEl.getBoundingClientRect();
        const gr = glyph.getBoundingClientRect();
        if (gr.left < sr.left - 0.5) {
          issues.push(`glyph left ${gr.left} < scroll container left ${sr.left}`);
        }
        const sampleX = Math.min(sr.right - 2, Math.max(sr.left + 1, gr.left + 1));
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

async function assertDisplayLeftColumnNotBlank(page) {
  const disp = page.locator('.question-card__math-scroll .MathJax_Display').first();
  await expect(disp).toBeVisible();
  const box = await disp.boundingBox();
  expect(box).toBeTruthy();
  const clipW = Math.min(4, Math.max(1, box.width));
  const clipH = Math.min(Math.max(8, box.height), 48);
  const png = await page.screenshot({
    clip: { x: box.x, y: box.y, width: clipW, height: clipH },
  });
  expect(pngLeftColumnHasInk(png)).toBe(true);
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
      await assertDisplayLeftColumnNotBlank(page);
    });
  }
});
