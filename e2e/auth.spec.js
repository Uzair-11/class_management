const { test, expect } = require('@playwright/test');
const { loginHelper } = require('./test-helpers');

test.describe('Authentication Flow', () => {
  test('AUTH-E2E-01: Admin can log in successfully and view dashboard', async ({ page }) => {
    await loginHelper(page);
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Executive Dashboard')).toBeVisible();
  });

  test('AUTH-E2E-02: Invalid login shows error alert', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="text"]', '9000000001');
    await page.fill('input[type="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid phone number or password')).toBeVisible();
  });

  test('AUTH-E2E-03: User can logout', async ({ page }) => {
    await loginHelper(page);
    await page.click('button:has-text("Logout"), button:has-text("Sign Out"), nav button:has-text("Log out")');
    await expect(page).toHaveURL(/.*login/);
  });
});
