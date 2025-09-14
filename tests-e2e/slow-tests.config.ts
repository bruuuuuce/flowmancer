import { test as base } from '@playwright/test';

// Custom test configuration for slow/complex tests
export const test = base.extend({
  // Override timeouts for specific slow tests
  async page({ page }, use) {
    // Set longer default timeouts for slow tests
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(45000);
    
    await use(page);
  },
});

// Mark test as slow - Playwright will triple the timeout
export function markAsSlow() {
  test.slow();
}

// Helper to wait for stable state
export async function waitForStableState(page: any, timeout = 5000) {
  // Wait for no network activity
  await page.waitForLoadState('networkidle', { timeout });
  // Additional wait for JS execution
  await page.waitForTimeout(500);
}
