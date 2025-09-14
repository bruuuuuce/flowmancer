import { Page, expect } from '@playwright/test';

/**
 * Waits for an overlay to be fully visible and interactive
 */
export async function waitForOverlay(page: Page, overlayTitle: string, timeout = 15000) {
  // First wait for any overlay to appear
  await page.waitForSelector('.overlay', { state: 'visible', timeout });
  
  // Then find the specific overlay by title
  const overlay = page.locator('.overlay').filter({ 
    has: page.locator(`h3:text("${overlayTitle}")`) 
  });
  
  // Wait for it to be visible
  await expect(overlay).toBeVisible({ timeout });
  
  // Wait a bit for animations to complete
  await page.waitForTimeout(500);
  
  return overlay;
}

/**
 * Safely opens an overlay by clicking the button and waiting for it to appear
 */
export async function openOverlay(page: Page, buttonName: string, overlayTitle?: string) {
  // Click the button
  const button = page.getByRole('button', { name: buttonName });
  await expect(button).toBeVisible({ timeout: 5000 });
  await button.click();
  
  // Wait for overlay to appear
  const title = overlayTitle || buttonName;
  return await waitForOverlay(page, title);
}

/**
 * Safely closes an overlay and waits for it to disappear
 */
export async function closeOverlay(page: Page, overlay: any) {
  // Find close button within the overlay
  const closeButton = overlay.locator('button[title="Close"]').first();
  
  if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    // Fallback to Escape key
    await page.keyboard.press('Escape');
  }
  
  // Wait for overlay to disappear
  await expect(overlay).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(300); // Wait for animation
}

/**
 * Checks if Stats badges are visible in the overlay
 */
export async function verifyStatsBadges(statsOverlay: any) {
  // Check for RPS badge - try multiple selectors
  const rpsSelectors = [
    '.badge:has-text("RPS")',
    '.stats-badge:has-text("RPS")',
    'div:has-text("RPS:")',
    'text=/RPS/i'
  ];
  
  let rpsFound = false;
  for (const selector of rpsSelectors) {
    const count = await statsOverlay.locator(selector).count();
    if (count > 0) {
      rpsFound = true;
      break;
    }
  }
  
  if (!rpsFound) {
    throw new Error('RPS badge not found in Stats overlay');
  }
  
  // Check for In Flight badge - try multiple selectors
  const inflightSelectors = [
    '.badge:has-text("In flight")',
    '.stats-badge:has-text("In Flight")',
    'div:has-text("In flight:")',
    'text=/In.*(flight|Flight)/i'
  ];
  
  let inflightFound = false;
  for (const selector of inflightSelectors) {
    const count = await statsOverlay.locator(selector).count();
    if (count > 0) {
      inflightFound = true;
      break;
    }
  }
  
  if (!inflightFound) {
    throw new Error('In Flight badge not found in Stats overlay');
  }
  
  return { rpsFound, inflightFound };
}
