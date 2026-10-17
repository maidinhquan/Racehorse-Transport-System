import { test, expect } from '@playwright/test';

test.describe('Local Application Smoke Test', () => {
  test('landing page loads locally without external dependencies', async ({ page }) => {
    await page.goto('/');

    // Verify local app root and landing brand header
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('.lp-brand')).toBeVisible();
    await expect(page.locator('.lp-brand')).toContainText('CBN Transport');
  });
});
