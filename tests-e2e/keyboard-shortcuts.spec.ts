import { test, expect } from '@playwright/test';
import { ensureOverlaysClosed, waitForOverlayAnimation } from './helpers/test-config';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
    // Ensure clean state - close any overlays that might be open
    await ensureOverlaysClosed(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await ensureOverlaysClosed(page);
  });

  test('Space key toggles play/pause', async ({ page }) => {
    // Check initial state (running)
    const pauseBtn = page.locator('button:has-text("Pause")');
    await expect(pauseBtn).toBeVisible();

    // Press Space to pause
    await page.keyboard.press(' ');
    const playBtn = page.locator('button:has-text("Play")');
    await expect(playBtn).toBeVisible();

    // Press Space again to resume
    await page.keyboard.press(' ');
    await expect(pauseBtn).toBeVisible();
  });

  test('S key toggles Stats overlay', async ({ page }) => {
    test.slow(); // This test is flaky due to overlay timing
    
    // Initially Stats should be hidden
    await expect(page.locator('.overlay').filter({ hasText: 'Stats' })).not.toBeVisible();

    // Press S to show Stats
    await page.keyboard.press('s');
    await waitForOverlayAnimation(page, 500);
    
    // Check if Stats overlay is visible
    const statsOverlay = page.locator('.overlay').filter({ has: page.locator('.overlay-header:has-text("Stats")') });
    await expect(statsOverlay).toBeVisible({ timeout: 15000 });

    // Press S again to hide
    await page.keyboard.press('s');
    await waitForOverlayAnimation(page, 500);
    await expect(statsOverlay).not.toBeVisible({ timeout: 15000 });
  });

  test('C key toggles Config overlay', async ({ page }) => {
    await expect(page.locator('.overlay:has-text("Config JSON")')).not.toBeVisible();
    
    await page.keyboard.press('c');
    await expect(page.locator('.overlay:has-text("Config JSON")')).toBeVisible();
    
    await page.keyboard.press('c');
    await expect(page.locator('.overlay:has-text("Config JSON")')).not.toBeVisible();
  });

  test('O key toggles Console overlay', async ({ page }) => {
    test.slow(); // This test is flaky due to overlay timing
    
    // Initially Console should be hidden
    const consoleOverlay = page.locator('.overlay').filter({ has: page.locator('.overlay-header:has-text("Console")') });
    await expect(consoleOverlay).not.toBeVisible();
    
    // Press O to show Console
    await page.keyboard.press('o');
    await waitForOverlayAnimation(page, 500);
    await expect(consoleOverlay).toBeVisible({ timeout: 15000 });
    
    // Press O again to hide
    await page.keyboard.press('o');
    await waitForOverlayAnimation(page, 500);
    await expect(consoleOverlay).not.toBeVisible({ timeout: 15000 });
  });

  test('R key toggles Scripts overlay', async ({ page }) => {
    await expect(page.locator('.overlay:has-text("Scripts")')).not.toBeVisible();
    
    await page.keyboard.press('r');
    await expect(page.locator('.overlay:has-text("Scripts")')).toBeVisible();
    
    await page.keyboard.press('r');
    await expect(page.locator('.overlay:has-text("Scripts")')).not.toBeVisible();
  });

  test('P key toggles PUML overlay', async ({ page }) => {
    await expect(page.locator('.overlay:has-text("PUML Graph")')).not.toBeVisible();
    
    await page.keyboard.press('p');
    await expect(page.locator('.overlay:has-text("PUML Graph")')).toBeVisible();
    
    await page.keyboard.press('p');
    await expect(page.locator('.overlay:has-text("PUML Graph")')).not.toBeVisible();
  });

  test('E key toggles ELK settings overlay', async ({ page }) => {
    await expect(page.locator('.overlay:has-text("ELK Layout")')).not.toBeVisible();
    
    await page.keyboard.press('e');
    await expect(page.locator('.overlay:has-text("ELK Layout")')).toBeVisible();
    
    await page.keyboard.press('e');
    await expect(page.locator('.overlay:has-text("ELK Layout")')).not.toBeVisible();
  });

  test('D key toggles DrawIO overlay', async ({ page }) => {
    await expect(page.locator('.overlay:has-text("Draw.io")')).not.toBeVisible();
    
    await page.keyboard.press('d');
    await expect(page.locator('.overlay:has-text("Draw.io")')).toBeVisible();
    
    await page.keyboard.press('d');
    await expect(page.locator('.overlay:has-text("Draw.io")')).not.toBeVisible();
  });

  test('Escape closes all overlays', async ({ page }) => {
    test.slow(); // This test involves multiple overlays and needs more time
    
    // Open multiple overlays with waits
    await page.keyboard.press('s'); // Stats
    await page.waitForTimeout(200);
    await page.keyboard.press('c'); // Config
    await page.waitForTimeout(200);
    await page.keyboard.press('o'); // Console
    await page.waitForTimeout(200);
    
    // Verify they are visible
    const statsOverlay = page.locator('.overlay').filter({ has: page.locator('.overlay-header:has-text("Stats")') });
    const configOverlay = page.locator('.overlay').filter({ has: page.locator('.overlay-header:has-text("Config JSON")') });
    const consoleOverlay = page.locator('.overlay').filter({ has: page.locator('.overlay-header:has-text("Console")') });
    
    await expect(statsOverlay).toBeVisible({ timeout: 5000 });
    await expect(configOverlay).toBeVisible({ timeout: 5000 });
    await expect(consoleOverlay).toBeVisible({ timeout: 5000 });
    
    // Press Escape to close all
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Verify all are closed
    await expect(statsOverlay).not.toBeVisible({ timeout: 5000 });
    await expect(configOverlay).not.toBeVisible({ timeout: 5000 });
    await expect(consoleOverlay).not.toBeVisible({ timeout: 5000 });
  });

  test('Shift+? shows keyboard shortcuts help', async ({ page }) => {
    // Press Shift+?
    await page.keyboard.press('Shift+?');
    
    // Console should open
    await expect(page.locator('.overlay:has-text("Console")')).toBeVisible();
    
    // Help text should be visible
    await expect(page.locator('.overlay:has-text("Keyboard Shortcuts")')).toBeVisible();
    await expect(page.locator('.overlay:has-text("Space    - Play/Pause")')).toBeVisible();
  });

  test('Shortcuts do not trigger when typing in input', async ({ page }) => {
    // Open Config overlay
    await page.keyboard.press('c');
    await expect(page.locator('.overlay:has-text("Config JSON")')).toBeVisible();
    
    // Focus on the textarea
    const textarea = page.locator('.overlay:has-text("Config JSON") textarea');
    await textarea.focus();
    
    // Type 's' in the textarea
    await page.keyboard.type('s');
    
    // Stats overlay should NOT open
    await expect(page.locator('.overlay:has-text("Stats")')).not.toBeVisible();
    
    // The 's' should be in the textarea
    const value = await textarea.inputValue();
    expect(value).toContain('s');
  });

  test('Escape works even in input fields', async ({ page }) => {
    // Open Config overlay
    await page.keyboard.press('c');
    await expect(page.locator('.overlay:has-text("Config JSON")')).toBeVisible();
    
    // Focus on the textarea
    const textarea = page.locator('.overlay:has-text("Config JSON") textarea');
    await textarea.focus();
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Config overlay should be closed
    await expect(page.locator('.overlay:has-text("Config JSON")')).not.toBeVisible();
  });
});
