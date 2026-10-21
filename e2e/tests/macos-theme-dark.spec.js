const { test, expect } = require('@playwright/test');

test.describe('macOS dark theme', () => {
  test.use({ colorScheme: 'dark' });

  test('login page applies data-bs-theme dark', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mathexamColorScheme', 'dark');
    });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('login-page')).toBeVisible();

    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-bs-theme'));
    expect(theme).toBe('dark');

    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bodyBg).toBe('rgb(30, 30, 30)');

    const cardBg = await page.locator('.auth-card').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(cardBg).toBe('rgb(44, 44, 46)');
  });
});
