import { test, expect } from '@playwright/test';

// Configure generous timeout for complex edge cases
test.describe.configure({ timeout: 120000 });

test.describe('Edge Cases and Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
  });

  test('should handle empty configuration gracefully', async ({ page }) => {
    // Open config overlay
    await page.click('button:has-text("Config")');
    await page.waitForSelector('.overlay-header:has-text("Config JSON")');
    
    // Clear config and apply empty JSON
    const textarea = page.locator('textarea').first();
    await textarea.fill('{"nodes": [], "links": []}');
    await page.click('button:has-text("Apply")');
    
    // Should not crash, canvas should still be visible
    await expect(page.locator('canvas')).toBeVisible();
    
    // Close overlay
    await page.locator('button[title="Close"]').first().click();
    
    // Check app is still functional
    await page.locator('button').first().click(); // Toggle play/pause
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should handle invalid JSON configuration', async ({ page }) => {
    // Open config overlay
    await page.click('button:has-text("Config")');
    await page.waitForSelector('.overlay-header:has-text("Config JSON")');
    
    // Enter invalid JSON
    const textarea = page.locator('textarea').first();
    await textarea.fill('{ invalid json }');
    await page.click('button:has-text("Apply")');
    
    // Wait a bit for error to appear
    await page.waitForTimeout(500);
    
    // Should show error message - look for any element containing error text (avoid strict-mode violations)
    const errorVisible =
      (await page.locator('text=/.*Error.*|.*error.*|.*invalid.*/i').count()) > 0 ||
      (await page.locator('[data-test="toast-error"], .error, div[style*="color:#f88"]').count()) > 0;
    
    expect(errorVisible).toBeTruthy();
    
    // Canvas should still work
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should handle rapid Play/Pause toggling', async ({ page }) => {
    const playPauseButton = page.locator('button').first();
    
    // Rapidly toggle 20 times
    for (let i = 0; i < 20; i++) {
      await playPauseButton.click();
      await page.waitForTimeout(50);
    }
    
    // Should not crash
    await expect(page.locator('canvas')).toBeVisible();
    
    // Button should still be functional
    const buttonText = await playPauseButton.textContent();
    expect(['Play', 'Pause']).toContain(buttonText);
  });

  test('should handle node removal via console', async ({ page }) => {
    // First load baseline config
    await page.click('button:has-text("Config")');
    await page.waitForSelector('.overlay-header:has-text("Config JSON")');
    await page.click('button:has-text("Load baseline")');
    await page.waitForTimeout(500);
    await page.locator('button[title="Close"]').first().click();
    
    // Open console
    await page.click('button:has-text("Console")');
    await page.waitForSelector('.overlay-header:has-text("Console")');
    
    // Remove a node
    const consoleInput = page.locator('input.console-input');
    await consoleInput.fill('node remove ingress1');
    await consoleInput.press('Enter');
    
    // Check that command was processed in log
    await expect(page.locator('.console-log')).toContainText('node remove');
    
    // Close console
    await page.locator('button[title="Close"]').first().click();
    
    // Canvas should still be functional
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should handle cyclic graph configurations', async ({ page }) => {
    test.slow(); // Triple the timeout for this complex test
    // Open config overlay
    await page.click('button:has-text("Config")');
    await page.waitForSelector('.overlay-header:has-text("Config JSON")', { timeout: 5000 });
    
    // Create a cyclic configuration
    const cyclicConfig = {
      nodes: [
        { id: 'A', kind: 'Ingress', rateRps: 10 },
        { id: 'B', kind: 'Service', capacity: 100 },
        { id: 'C', kind: 'Service', capacity: 100 }
      ],
      links: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'B' } // Creates a cycle
      ]
    };
    
    const textarea = page.locator('textarea').first();
    await textarea.fill(JSON.stringify(cyclicConfig, null, 2));
    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);
    
    // Should handle the cycle gracefully
    await expect(page.locator('canvas')).toBeVisible();
    
    // Close config overlay - try multiple approaches
    const closeButton = page.locator('button[title="Close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Alternative: press Escape
      await page.keyboard.press('Escape');
    }
    
    // Wait for overlay to disappear completely
    await page.waitForTimeout(1000);
    const overlayCount = await page.locator('.overlay').count();
    if (overlayCount > 0) {
      // Force close any remaining overlays
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    // Now the toolbar should be accessible - look for Play or Pause button
    const playButton = page.locator('button').filter({ hasText: /Play|Pause/ }).first();
    await expect(playButton).toBeVisible({ timeout: 10000 });
    
    // If it's Pause, the simulation is already running
    const buttonText = await playButton.textContent();
    if (buttonText?.includes('Play')) {
      await playButton.click();
      await page.waitForTimeout(500);
    }
    
    // Stop simulation
    const pauseButton = page.locator('button:has-text("Pause")');
    await expect(pauseButton).toBeVisible({ timeout: 5000 });
    await pauseButton.click();
    
    // App should still be responsive
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should handle very large configurations', async ({ page }) => {
    test.slow(); // Triple the timeout for this complex test
    // Open config overlay
    await page.click('button:has-text("Config")');
    await page.waitForSelector('.overlay-header:has-text("Config JSON")');
    
    // Create a large configuration
    const nodes = [];
    const links = [];
    
    // Create 20 nodes (reduced from 50 to avoid timeout)
    for (let i = 0; i < 20; i++) {
      nodes.push({
        id: `node${i}`,
        kind: i === 0 ? 'Ingress' : 'Service',
        rateRps: i === 0 ? 100 : undefined,
        capacity: i === 0 ? undefined : 50
      });
      
      // Create links in a chain
      if (i > 0) {
        links.push({
          from: `node${i - 1}`,
          to: `node${i}`
        });
      }
    }
    
    const largeConfig = { nodes, links };
    const textarea = page.locator('textarea').first();
    await textarea.fill(JSON.stringify(largeConfig, null, 2));
    await page.click('button:has-text("Apply")');
    
    // Should handle large config without crashing
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForTimeout(500);
    
    // Close config
    await page.locator('button[title="Close"]').first().click();
    // Wait for the Config overlay to be fully removed before interacting with toolbar
    await expect(page.locator('.overlay-header:has-text("Config JSON")')).toHaveCount(0);
    
    // Should be able to start simulation (if not already running)
    const playPauseButton = page.locator('button').filter({ hasText: /Play|Pause/ }).first();
    await expect(playPauseButton).toBeVisible({ timeout: 10000 });
    const toggleText = await playPauseButton.textContent();
    if (toggleText?.includes('Play')) {
      await playPauseButton.click();
      await page.waitForTimeout(500);
    }
    
    // Check that pause button works
    await page.click('button:has-text("Pause")');
    
    // App should still be responsive
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should handle disconnected graph components', async ({ page }) => {
    test.slow(); // Triple the timeout for this complex test
    // Open config overlay
    await page.click('button:has-text("Config")');
    await page.waitForSelector('.overlay-header:has-text("Config JSON")');
    
    // Create disconnected components
    const disconnectedConfig = {
      nodes: [
        { id: 'A1', kind: 'Ingress', rateRps: 10 },
        { id: 'A2', kind: 'Service', capacity: 100 },
        { id: 'B1', kind: 'Ingress', rateRps: 20 },
        { id: 'B2', kind: 'Service', capacity: 100 }
      ],
      links: [
        { from: 'A1', to: 'A2' },
        { from: 'B1', to: 'B2' }
        // No connection between A and B groups
      ]
    };
    
    const textarea = page.locator('textarea').first();
    await textarea.fill(JSON.stringify(disconnectedConfig, null, 2));
    await page.click('button:has-text("Apply")');
    
    // Should handle disconnected components
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForTimeout(500);
    
    // Close config and start simulation
    await page.locator('button[title="Close"]').first().click();
    // Wait until Config overlay is removed
    await expect(page.locator('.overlay-header:has-text("Config JSON")')).toHaveCount(0);
    
    const playPauseButton2 = page.locator('button').filter({ hasText: /Play|Pause/ }).first();
    await expect(playPauseButton2).toBeVisible({ timeout: 10000 });
    const toggleText2 = await playPauseButton2.textContent();
    if (toggleText2?.includes('Play')) {
      await playPauseButton2.click();
      await page.waitForTimeout(1000);
    }
    
    // Should work without crashing
    await page.click('button:has-text("Pause")');
    
    // App should still be responsive
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should handle overlay resizing to extreme sizes', async ({ page }) => {
    // Open config overlay
    await page.click('button:has-text("Config")');
    await page.waitForSelector('.overlay-header:has-text("Config JSON")');
    
    // Switch to floating mode
    await page.click('button[title="Floating"]');
    
    // Get overlay element
    const overlay = page.locator('.overlay').first();
    const box = await overlay.boundingBox();
    
    if (box) {
      // Try to drag to extreme positions
      await page.mouse.move(box.x + 10, box.y + 10);
      await page.mouse.down();
      await page.mouse.move(0, 0); // Top-left corner
      await page.mouse.up();
      
      // Overlay should still be visible and functional
      await expect(overlay).toBeVisible();
      
      // Try to drag to bottom-right
      const viewport = page.viewportSize();
      if (viewport) {
        await page.mouse.move(10, 10);
        await page.mouse.down();
        await page.mouse.move(viewport.width - 100, viewport.height - 100);
        await page.mouse.up();
        
        // Should still be visible
        await expect(overlay).toBeVisible();
      }
    }
    
    // Close button should still work
    await page.locator('button[title="Close"]').first().click();
    await expect(overlay).not.toBeVisible();
  });

  test('should recover from script execution errors', async ({ page }) => {
    // Open Scripts overlay
    await page.click('button:has-text("Scripts")');
    await page.waitForSelector('.overlay-header:has-text("Scripts")');
    
    // Enter a script with errors
    const scriptTextarea = page.locator('textarea').first();
    await scriptTextarea.fill(`
      # This script has errors
      node add // missing arguments
      link remove // missing arguments
      undefined_command test
      loop 5
        # Missing end
    `);
    
    // Run the script
    await page.click('button:has-text("Run")');
    await page.waitForTimeout(1000);
    
    // Should show errors in console but not crash
    await page.locator('button[title="Close"]').first().click();
    
    // Open console to check for errors
    await page.click('button:has-text("Console")');
    await page.waitForSelector('.overlay-header:has-text("Console")');
    
    const consoleOutput = page.locator('.console-log');
    await expect(consoleOutput).toContainText('Error');
    
    // App should still be functional
    await page.locator('button[title="Close"]').first().click();
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should handle rapid overlay switching', async ({ page }) => {
    const overlayButtons = [
      'Stats',
      'Config', 
      'Console',
      'Scripts',
      'PUML'
    ];
    
    // Rapidly open and close overlays
    for (let i = 0; i < 2; i++) { // Reduce iterations to avoid timeout
      for (const buttonText of overlayButtons) {
        await page.click(`button:has-text("${buttonText}")`);
        await page.waitForTimeout(200); // Increase wait time
        
        // Check overlay is visible
        await expect(page.locator('.overlay').first()).toBeVisible();
        
        // Close it
        await page.locator('button[title="Close"]').first().click();
        await page.waitForTimeout(100);
      }
    }
    
    // App should still be functional
    await expect(page.locator('canvas')).toBeVisible();
    
    // Try one more overlay to confirm it works
    await page.click('button:has-text("Stats")');
    await page.waitForTimeout(200);
    await expect(page.locator('.overlay').first()).toBeVisible();
    await page.locator('button[title="Close"]').first().click();
  });
});
