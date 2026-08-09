const { test, expect } = require('@playwright/test');

const loginHelper = async (page) => {
  await page.goto('/login');
  await page.fill('input[type="text"]', '9000000001');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*dashboard/);

  // If force password modal appears, clear it
  const pwdModal = page.locator('text=Password Reset Required');
  if (await pwdModal.isVisible()) {
    await page.fill('input[placeholder="Enter current password"]', 'Admin@123');
    await page.fill('input[placeholder="At least 6 characters"]', 'Admin@123');
    await page.fill('input[placeholder="Re-enter new password"]', 'Admin@123');
    await page.click('button:has-text("Save New Password")');
    await expect(pwdModal).toBeHidden();
  }
};

module.exports = { loginHelper };
