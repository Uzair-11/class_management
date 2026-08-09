const { test, expect } = require('@playwright/test');
const { loginHelper } = require('./test-helpers');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Uzair/.gemini/antigravity/brain/344df4e6-1e0b-4085-9f10-20b7eedf7b23';

test.describe('Visual Screenshots & Responsiveness Verification', () => {
  test('Capture 1920px, 1366px, and 768px Screenshots & Verify Zero Overflow', async ({ page }) => {
    // 1. Desktop Viewport 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginHelper(page);

    // Verify 1920px Dashboard Zero Horizontal Scroll
    const isOverflow1920 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(isOverflow1920).toBe(false);

    // Capture 1920px Desktop Screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'navbar_desktop_1920px.png'), fullPage: false });

    // Verify 1920px Students & Attendance Zero Horizontal Scroll
    await page.goto('/students');
    const isStudentsOverflow1920 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(isStudentsOverflow1920).toBe(false);

    await page.goto('/attendance');
    const isAttendanceOverflow1920 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(isAttendanceOverflow1920).toBe(false);

    // 2. Laptop Viewport 1366x768
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/dashboard');
    const isOverflow1366 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(isOverflow1366).toBe(false);

    // 3. Tablet/Mobile Viewport 768x1024
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');

    const isOverflow768 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(isOverflow768).toBe(false);

    // Open hamburger menu
    await page.locator('.hamburger-btn').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.hamburger-btn').click();
    await page.waitForTimeout(300);

    // Capture 768px Narrow Screenshot with Menu Expanded
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'navbar_narrow_768px.png'), fullPage: false });
  });
});
