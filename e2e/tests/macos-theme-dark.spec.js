const { test, expect } = require('@playwright/test');

test.describe('macOS dark theme', () => {
  test.use({ colorScheme: 'dark' });

  test('login page uses dark surface without white flash', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mathexamColorScheme', 'dark');
    });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('login-page')).toBeVisible();

    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-bs-theme'));
    expect(theme).toBe('dark');

    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe('rgb(255, 255, 255)');

    const loginCard = page.locator('.auth-card');
    await expect(loginCard).toBeVisible();
    const cardBg = await loginCard.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(cardBg).not.toBe('rgb(255, 255, 255)');
  });
});
