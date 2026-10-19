const { test, expect } = require('@playwright/test');

const appOrigin = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const apiBase = process.env.PLAYWRIGHT_API_URL || `${appOrigin}/api`;

async function registerAndLogin(page) {
  const uid = `kp_pick_${Date.now()}`;
  const password = 'E2EPass123!';
  await page.request.post(`${apiBase}/auth/register`, {
    data: { username: uid, password, email: `${uid}@example.com` },
  });
  await page.request.post(`${apiBase}/auth/login`, { data: { username: uid, password } });
  const banks = await page.request.get(`${apiBase}/banks/mine`);
  const body = banks.ok() ? await banks.json() : { banks: [] };
  const bankId = body.banks?.[0]?._id || '';
  await page.goto(`${appOrigin}/login`);
  await page.evaluate(({ user, bid }) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    if (bid) localStorage.setItem('currentBankId', bid);
  }, { user: (await page.request.get(`${apiBase}/auth/me`).then((r) => r.json())).user, bid: bankId });
  return { bankId, uid };
}

async function seedManyKps(page, bankId, count = 110) {
  const hdr = { 'X-Bank-Id': bankId, 'Content-Type': 'application/json' };
  for (let i = 0; i < count; i += 1) {
    await page.request.post(`${apiBase}/knowledge-points/`, {
      headers: hdr,
      data: { name: `截图KP_${i}`, subject: '解析几何' },
    });
  }
}

test.describe('KP picker layout', () => {
  test('picker scroll box does not overlap save section', async ({ page }) => {
    const base = appOrigin;
    const { bankId } = await registerAndLogin(page);
    await seedManyKps(page, bankId, 110);
    const createRes = await page.request.post(`${apiBase}/questions/create`, {
      headers: { 'X-Bank-Id': bankId, 'Content-Type': 'application/json' },
      data: {
        type: '单选题',
        subject: '解析几何',
        difficulty: '中',
        totalScore: 4,
        questionText: '测试题干',
        correctAnswer: 'A',
      },
    });
    const created = createRes.ok() ? await createRes.json() : {};
    const qid = created._id || created.question?._id;
    expect(qid).toBeTruthy();
    await page.goto(`${base}/question-edit/${qid}`, { waitUntil: 'domcontentloaded' });
    const picker = page.getByTestId('kp-picker-list');
    await expect(picker).toBeVisible({ timeout: 30000 });
    const saveBtn = page.getByRole('button', { name: /保存修改/ });
    await expect(saveBtn).toBeVisible();
    const pickerBox = await picker.boundingBox();
    const saveBox = await saveBtn.boundingBox();
    expect(pickerBox).toBeTruthy();
    expect(saveBox).toBeTruthy();
    expect(pickerBox.y + pickerBox.height).toBeLessThanOrEqual(saveBox.y + 2);
    const overflowY = await picker.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.overflowY;
    });
    expect(overflowY).toBe('auto');
  });
});
