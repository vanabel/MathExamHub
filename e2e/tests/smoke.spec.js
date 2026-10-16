const { test, expect } = require('@playwright/test');
const path = require('path');

const shots = path.join(__dirname, '../../docs/screenshots');

test.describe('product smoke', () => {
  test('login → import sample → wizard coverage → generate → export', async ({ page }) => {
    const uid = `e2e_${Date.now()}`;
    const password = 'E2EPass123!';

    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/register');
    await page.locator('#floatingUsername').fill(uid);
    await page.locator('#floatingEmail').fill(`${uid}@example.com`);
    await page.locator('#floatingPassword').fill(password);
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    await page.locator('#loginUsername').fill(uid);
    await page.locator('#loginPassword').fill(password);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/question-list/, { timeout: 20000 });

    const onboarding = page.getByTestId('onboarding-panel');
    if (await onboarding.isVisible().catch(() => false)) {
      await page.getByTestId('onboarding-import-sample').click();
      await expect(page.getByTestId('onboarding-import-sample')).toContainText(/已导入|导入/, { timeout: 60000 });
      await page.screenshot({ path: path.join(shots, 'onboarding-import.png'), fullPage: true });
      await page.getByTestId('onboarding-skip').click();
    }

    await page.goto('/exam-wizard');
    await expect(page.getByRole('heading', { name: /组卷向导/ })).toBeVisible();

    const starterClone = page.getByRole('button', { name: '克隆' }).first();
    if (await starterClone.isVisible().catch(() => false)) {
      await starterClone.click();
    }

    await page.getByTestId('wizard-coverage-check').click();
    await expect(page.getByTestId('wizard-coverage-result')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: path.join(shots, 'onboarding-wizard.png'), fullPage: true });

    await page.getByTestId('wizard-generate').click();
    await expect(page.getByText(/预览|第 1 题|大题/)).toBeVisible({ timeout: 60000 });

    await page.getByRole('button', { name: '3. 导出' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('wizard-export-latex').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/i);
  });
});
