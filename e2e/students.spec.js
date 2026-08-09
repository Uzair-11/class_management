const { test, expect } = require('@playwright/test');
const { loginHelper } = require('./test-helpers');

test.describe('Students Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginHelper(page);
    await page.goto('/students');
  });

  test('STU-E2E-01: List existing students in table', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('tbody tr')).not.toHaveCount(0);
  });

  test('STU-E2E-02: Add new student modal and submit', async ({ page }) => {
    await page.click('button:has-text("+ Add Student")');
    await page.fill('input[placeholder="e.g. Ayesha Siddiqui"]', 'Playwright New Student');
    await page.fill('input[placeholder="Contact phone"]', '9111122233');
    await page.fill('input[placeholder="Full residential address"]', 'E2E Test Address');
    await page.selectOption('select.form-select >> nth=0', { index: 1 });
    await page.selectOption('select.form-select >> nth=1', { index: 0 });
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Playwright New Student')).toBeVisible();
  });

  test('STU-E2E-03: Filter students by branch', async ({ page }) => {
    await page.selectOption('#branch-filter', { label: 'Central Branch' });
    await expect(page.locator('table')).toBeVisible();
  });
});
