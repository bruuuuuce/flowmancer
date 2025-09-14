import { test, expect } from '@playwright/test';

test.describe('Debug Keyboard Shortcuts', () => {
  test('debug S key for Stats', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
    
    // Check if page has focus
    const hasFocus = await page.evaluate(() => document.hasFocus());
    console.log('Page has focus:', hasFocus);
    
    // Try to focus the body
    await page.locator('body').click();
    await page.waitForTimeout(500);
    
    // Check for any existing overlays
    const overlaysBefore = await page.locator('.overlay').count();
    console.log('Overlays before pressing S:', overlaysBefore);
    
    // Try different ways to press S
    console.log('Pressing S key...');
    await page.keyboard.press('s');
    await page.waitForTimeout(1000);
    
    // Check for overlays after
    const overlaysAfter = await page.locator('.overlay').count();
    console.log('Overlays after pressing S:', overlaysAfter);
    
    // Check if any overlay is visible
    const visibleOverlays = await page.locator('.overlay:visible').count();
    console.log('Visible overlays:', visibleOverlays);
    
    // Try clicking the Stats button directly
    console.log('Trying to click Stats button directly...');
    const statsButton = page.locator('button:has-text("Stats")');
    const statsButtonVisible = await statsButton.isVisible();
    console.log('Stats button visible:', statsButtonVisible);
    
    if (statsButtonVisible) {
      await statsButton.click();
      await page.waitForTimeout(1000);
      
      const overlaysAfterClick = await page.locator('.overlay:visible').count();
      console.log('Visible overlays after clicking Stats button:', overlaysAfterClick);
      
      // Check overlay content only if visible
      if (overlaysAfterClick > 0) {
        const overlayContent = await page.locator('.overlay:visible').first().textContent();
        console.log('Overlay content:', overlayContent?.substring(0, 100));
      }
    }
    
    // Check if keyboard shortcuts are even working
    const keyboardShortcutsWork = await page.evaluate(() => {
      // Check if there are any event listeners for keydown
      const listeners = (window as any).getEventListeners?.(document);
      return listeners ? Object.keys(listeners) : [];
    });
    console.log('Event listeners on document:', keyboardShortcutsWork);
  });
});
