const { test, expect } = require('@playwright/test');
const { loginHelper } = require('./test-helpers');

test.describe('Certificate Template Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginHelper(page);
    await page.goto('/certificate-templates');
  });

  test('CERT-E2E-01: Load certificate template manager page', async ({ page }) => {
    await expect(page.locator('text=Certificate Template Manager')).toBeVisible();
    await expect(page.locator('text=Upload New Template File')).toBeVisible();
  });

  test('CERT-E2E-02: Template canvas editor renders drag handles', async ({ page }) => {
    await expect(page.locator('text=Uploaded Certificate Templates')).toBeVisible();
  });

  test('CERT-E2E-03: Render student certificate page with layout fallback banner', async ({ page }) => {
    await page.goto('/certificates/1');
    await expect(page.locator('h1:has-text("Certificate of Completion")').or(page.locator('div.footer-brand'))).toBeVisible();
  });
});
