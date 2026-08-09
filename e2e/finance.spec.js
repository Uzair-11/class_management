const { test, expect } = require('@playwright/test');
const { loginHelper } = require('./test-helpers');

test.describe('Finance & Expenses Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginHelper(page);
    await page.goto('/branches/1/finance');
  });

  test('FIN-E2E-01: Load finance overview and branch balances', async ({ page }) => {
    await expect(page.locator('text=Branch Finance Dashboard')).toBeVisible();
    await expect(page.locator('text=Total Income')).toBeVisible();
  });

  test('FIN-E2E-02: Record expense entry for branch', async ({ page }) => {
    await page.fill('input[placeholder="e.g. Monthly power bill"]', 'Office Utility Bill');
    await page.fill('input[type="number"][min="1"]', '450');
    await page.click('button:has-text("Submit Expense Entry")');
    await expect(page.locator('text=Office Utility Bill')).toBeVisible();
  });

  test('FIN-E2E-03: View fee collection ledger table', async ({ page }) => {
    await page.goto('/reports/fees');
    await expect(page.locator('table')).toBeVisible();
  });
});
