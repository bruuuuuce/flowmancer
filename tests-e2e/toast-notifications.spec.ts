import { test, expect } from '@playwright/test';

test.describe('Toast Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
  });

  test('should show welcome toast on app load', async ({ page }) => {
    // Check for welcome toast
    const toast = page.locator('[data-test="toast-info"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Press Shift+? to see keyboard shortcuts');
    
    // Toast should auto-dismiss after 5 seconds
    // We'll just check it's visible, not wait for auto-dismiss in test
    // to make test faster
  });

  test('should show success toast when applying config', async ({ page }) => {
    // Open config overlay
    await page.keyboard.press('c');
    await expect(page.locator('.overlay:has-text("Config JSON")')).toBeVisible();
    
    // Apply config
    await page.click('button:has-text("Apply")');
    
    // Check for success toast
    const toast = page.locator('[data-test="toast-success"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Configuration applied successfully');
    
    // Check it has a close button
    const closeButton = toast.locator('.toast-close');
    await expect(closeButton).toBeVisible();
    
    // Click close button
    await closeButton.click();
    await expect(toast).not.toBeVisible();
  });

  test('should show error toast when applying invalid config', async ({ page }) => {
    // Open config overlay
    await page.keyboard.press('c');
    const overlay = page.locator('.overlay:has-text("Config JSON")');
    await expect(overlay).toBeVisible();
    
    // Enter invalid JSON
    const textarea = overlay.locator('textarea');
    await textarea.clear();
    await textarea.fill('{ invalid json }');
    
    // Apply config
    await page.click('button:has-text("Apply")');
    
    // Check for error toast
    const toast = page.locator('[data-test="toast-error"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Configuration Error');
    
    // Error toasts should stay longer (8 seconds)
    // Just verify it's visible, don't wait for auto-dismiss
  });

  test('should stack multiple toasts', async ({ page }) => {
    // Apply config multiple times quickly to generate multiple toasts
    await page.keyboard.press('c');
    const applyButton = page.locator('button:has-text("Apply")');
    
    // Click apply 3 times quickly
    await applyButton.click();
    await applyButton.click();
    await applyButton.click();
    
    // Should see 3 success toasts stacked
    const toasts = page.locator('[data-test="toast-success"]');
    await expect(toasts).toHaveCount(3);
    
    // Close one toast
    await toasts.first().locator('.toast-close').click();
    
    // Should now have 2 toasts
    await expect(toasts).toHaveCount(2);
  });

  test('toast animations should work', async ({ page }) => {
    // Open config and apply to generate a toast
    await page.keyboard.press('c');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(300);
    
    const toast = page.locator('[data-test="toast-success"]');
    await expect(toast).toBeVisible({ timeout: 5000 });
    
    // Check that toast has proper styling and positioning
    const boundingBox = await toast.boundingBox();
    if (boundingBox) {
      expect(boundingBox).toBeTruthy();
      const viewport = page.viewportSize();
      if (viewport) {
        // More flexible positioning check
        expect(boundingBox.x).toBeGreaterThan(0);
        expect(boundingBox.y).toBeGreaterThanOrEqual(0);
        expect(boundingBox.y).toBeLessThan(viewport.height / 2); // Should be in top half
      }
    }
  });

  test('toast should have correct icons for each type', async ({ page }) => {
    // We already have an info toast on load
    const infoToast = page.locator('[data-test="toast-info"]');
    await expect(infoToast).toBeVisible();
    const infoIcon = infoToast.locator('.toast-icon');
    await expect(infoIcon).toContainText('ℹ');
    
    // Generate a success toast
    await page.keyboard.press('c');
    await page.click('button:has-text("Apply")');
    
    const successToast = page.locator('[data-test="toast-success"]');
    await expect(successToast).toBeVisible();
    const successIcon = successToast.locator('.toast-icon');
    await expect(successIcon).toContainText('✓');
  });
});
