import { test } from '@playwright/test';

/**
 * Mark all tests in a describe block as slow
 * This triples the timeout for all tests within the block
 */
export function markSuiteAsSlow() {
  test.describe.configure({ timeout: 180000 });
  test.beforeEach(() => {
    test.slow();
  });
}

/**
 * Helper to add extra wait time for overlay operations
 * Many tests fail because overlays take time to animate in/out
 */
export async function waitForOverlayAnimation(page: any, ms = 500) {
  await page.waitForTimeout(ms);
  // Also wait for any animations to complete
  await page.waitForFunction(() => {
    const animations = document.getAnimations();
    return animations.length === 0 || animations.every(a => a.playState !== 'running');
  }, { timeout: 5000 }).catch(() => {
    // Ignore timeout, some animations might be continuous
  });
}

/**
 * Helper to ensure overlays are properly closed
 */
export async function ensureOverlaysClosed(page: any) {
  const overlayCount = await page.locator('.overlay:visible').count();
  if (overlayCount > 0) {
    // Try Escape key multiple times
    for (let i = 0; i < overlayCount + 1; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
  }
  
  // Final check
  const remainingOverlays = await page.locator('.overlay:visible').count();
  if (remainingOverlays > 0) {
    console.warn(`Warning: ${remainingOverlays} overlay(s) still visible after cleanup`);
  }
}

/**
 * Retry helper for flaky operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
