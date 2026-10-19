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

async function importSample(page) {
  await page.evaluate(async ({ base }) => {
    const bankId = localStorage.getItem('currentBankId');
    await fetch(`${base}/onboarding/import-sample`, {
      method: 'POST',
      credentials: 'include',
      headers: bankId ? { 'X-Bank-Id': bankId } : {},
    });
  }, { base: apiBase });
}

async function openWizard(page) {
  await page.goto('/exam-wizard', { waitUntil: 'domcontentloaded' });
  const skip = page.getByTestId('onboarding-skip');
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await expect(page.getByTestId('wizard-subject-select')).toBeVisible({ timeout: 15000 });
}

async function subjectOptionValues(page) {
  return page.locator('[data-testid="wizard-subject-select"] option').evaluateAll((opts) => opts.map((o) => o.value));
}

test.describe('Exam wizard subject combobox', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('lists seeded bank subjects and generate works with a listed subject', async ({ page }) => {
    const uid = `wsubj_gen_${Date.now()}`;
    await registerAndLogin(page, uid);
    await importSample(page);
    await openWizard(page);

    const options = await subjectOptionValues(page);
    expect(options).toContain('高等代数');

    await page.getByTestId('wizard-subject-select').selectOption('高等代数');
    await page.getByTestId('wizard-generate').click();
    const scoreGap = page.getByTestId('wizard-score-gap-confirm');
    if (await scoreGap.isVisible({ timeout: 5000 }).catch(() => false)) {
      await scoreGap.click();
    }
    await expect(page.getByRole('button', { name: '2. 预览' })).toBeEnabled({ timeout: 120000 });
  });

  test('custom subject saves and reloads on blueprint', async ({ page }) => {
    const uid = `wsubj_bp_${Date.now()}`;
    const customSubject = `E2E自定义科目_${Date.now()}`;
    await registerAndLogin(page, uid);
    await importSample(page);
    await openWizard(page);

    await page.getByPlaceholder('例如：高等代数期中').fill(`蓝图_${uid}`);
    await page.getByTestId('wizard-subject-select').selectOption('__custom__');
    await page.getByTestId('wizard-subject-custom').fill(customSubject);
    await page.getByTestId('wizard-save-blueprint').click();
    const blueprintSelect = page.locator('.card-header select.form-select');
    await expect(blueprintSelect).not.toHaveValue('', { timeout: 15000 });
    const blueprintId = await blueprintSelect.inputValue();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await openWizard(page);
    await blueprintSelect.selectOption(blueprintId);

    await expect(page.getByTestId('wizard-subject-select')).toHaveValue('__custom__', { timeout: 10000 });
    await expect(page.getByTestId('wizard-subject-custom')).toHaveValue(customSubject);
  });

  test('subject list refreshes when switching bank', async ({ page }) => {
    const uid = `wsubj_bank_${Date.now()}`;
    const bankBSubject = `BankB科目_${Date.now()}`;
    await registerAndLogin(page, uid);
    await importSample(page);

    const bankBId = await page.evaluate(async ({ base }) => {
      const res = await fetch(`${base}/banks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `E2E第二题库_${Date.now()}` }),
      });
      const bank = await res.json();
      return bank._id;
    }, { base: apiBase });

    await page.evaluate(async ({ base, bankBId, bankBSubject }) => {
      localStorage.setItem('currentBankId', bankBId);
      await fetch(`${base}/questions/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Bank-Id': bankBId },
        body: JSON.stringify({
          subject: bankBSubject,
          type: '填空题',
          totalScore: 5,
          difficulty: '中',
          questionText: 'Bank B stem',
          correctAnswer: 'a',
        }),
      });
    }, { base: apiBase, bankBId, bankBSubject });

    await openWizard(page);
    let options = await subjectOptionValues(page);
    expect(options).toContain(bankBSubject);
    expect(options).not.toContain('高等代数');

    const bankAId = await page.evaluate(async ({ base }) => {
      const banks = await fetch(`${base}/banks/mine`, { credentials: 'include' }).then((r) => r.json());
      const personal = (banks.banks || []).find((b) => b.isPersonalDefault);
      return personal?._id;
    }, { base: apiBase });

    await page.selectOption('[data-testid="navbar-bank-select"]', bankAId);
    await page.waitForTimeout(600);
    options = await subjectOptionValues(page);
    expect(options).toContain('高等代数');
    expect(options).not.toContain(bankBSubject);
  });
});
