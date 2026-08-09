const { test, expect } = require('@playwright/test');
const { loginHelper } = require('./test-helpers');

test.describe('Dashboard & Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginHelper(page);
  });

  test('DASH-E2E-01: Admin dashboard renders core metrics cards', async ({ page }) => {
    await expect(page.locator('text=Total Active Students')).toBeVisible();
    await expect(page.locator('text=Accessible Branches')).toBeVisible();
  });

  test('DASH-E2E-02: Navigation links navigate to respective module pages', async ({ page }) => {
    await page.click('a[href="/students"]');
    await expect(page).toHaveURL(/.*students/);

    await page.click('a[href="/attendance"]');
    await expect(page).toHaveURL(/.*attendance/);
  });
});
