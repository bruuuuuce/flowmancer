import { test, expect } from '@playwright/test';

test.describe('Console History Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
    
    // Open console overlay
    await page.keyboard.press('o');
    await expect(page.locator('.overlay:has-text("Console")')).toBeVisible();
  });

  test('should navigate through command history with arrow keys', async ({ page }) => {
    const consoleInput = page.locator('.console-input');
    
    // Execute some commands
    await consoleInput.fill('node add TestNode1 Service');
    await consoleInput.press('Enter');
    
    await consoleInput.fill('node add TestNode2 Service');
    await consoleInput.press('Enter');
    
    await consoleInput.fill('link add TestNode1 TestNode2');
    await consoleInput.press('Enter');
    
    // Now navigate back through history
    await consoleInput.press('ArrowUp');
    await expect(consoleInput).toHaveValue('link add TestNode1 TestNode2');
    
    await consoleInput.press('ArrowUp');
    await expect(consoleInput).toHaveValue('node add TestNode2 Service');
    
    await consoleInput.press('ArrowUp');
    await expect(consoleInput).toHaveValue('node add TestNode1 Service');
    
    // Should not go further back
    await consoleInput.press('ArrowUp');
    await expect(consoleInput).toHaveValue('node add TestNode1 Service');
    
    // Navigate forward
    await consoleInput.press('ArrowDown');
    await expect(consoleInput).toHaveValue('node add TestNode2 Service');
    
    await consoleInput.press('ArrowDown');
    await expect(consoleInput).toHaveValue('link add TestNode1 TestNode2');
    
    // Go back to empty
    await consoleInput.press('ArrowDown');
    await expect(consoleInput).toHaveValue('');
  });

  test('should preserve current command when navigating', async ({ page }) => {
    const consoleInput = page.locator('.console-input');
    
    // Execute a command first
    await consoleInput.fill('node add OldNode Service');
    await consoleInput.press('Enter');
    
    // Type a new command without executing
    await consoleInput.fill('node add NewNode');
    
    // Navigate up to previous
    await consoleInput.press('ArrowUp');
    await expect(consoleInput).toHaveValue('node add OldNode Service');
    
    // Navigate back down to restore current
    await consoleInput.press('ArrowDown');
    await expect(consoleInput).toHaveValue('node add NewNode');
  });

  test('should not add empty commands to history', async ({ page }) => {
    const consoleInput = page.locator('.console-input');
    
    // Execute a valid command
    await consoleInput.fill('log test');
    await consoleInput.press('Enter');
    
    // Try to execute empty command
    await consoleInput.fill('');
    await consoleInput.press('Enter');
    
    // Navigate up - should get the last valid command
    await consoleInput.press('ArrowUp');
    await expect(consoleInput).toHaveValue('log test');
    
    // Navigate up again - should stay on the same command
    await consoleInput.press('ArrowUp');
    await expect(consoleInput).toHaveValue('log test');
  });

  test('should not add duplicate consecutive commands', async ({ page }) => {
    const consoleInput = page.locator('.console-input');
    
    // Execute same command multiple times
    await consoleInput.fill('log duplicate');
    await consoleInput.press('Enter');
    
    await consoleInput.fill('log duplicate');
    await consoleInput.press('Enter');
    
    await consoleInput.fill('log duplicate');
    await consoleInput.press('Enter');
    
    // Add different command
    await consoleInput.fill('log different');
    await consoleInput.press('Enter');
    
    // Navigate up
    await consoleInput.press('ArrowUp');
    await expect(consoleInput).toHaveValue('log different');
    
    await consoleInput.press('ArrowUp');
    await expect(consoleInput).toHaveValue('log duplicate');
    
    // Should not have more duplicates
    await consoleInput.press('ArrowUp');
    await expect(consoleInput).toHaveValue('log duplicate');
  });

  test('should persist history across console open/close', async ({ page }) => {
    const consoleInput = page.locator('.console-input');
    
    // Execute some commands
    await consoleInput.fill('node add PersistTest Service');
    await consoleInput.press('Enter');
    
    // Close console using Escape (more reliable than toggle)
    await page.keyboard.press('Escape');
    await expect(page.locator('.overlay:has-text("Console")')).not.toBeVisible();
    
    // Reopen console
    await page.keyboard.press('o');
    await expect(page.locator('.overlay:has-text("Console")')).toBeVisible();
    
    // History should still be there
    const reopenedInput = page.locator('.console-input');
    await reopenedInput.press('ArrowUp');
    await expect(reopenedInput).toHaveValue('node add PersistTest Service');
  });

  test('should show history command', async ({ page }) => {
    const consoleInput = page.locator('.console-input');
    const consoleLog = page.locator('.console-log');
    
    // Execute some commands
    await consoleInput.fill('log first');
    await consoleInput.press('Enter');
    
    await consoleInput.fill('log second');
    await consoleInput.press('Enter');
    
    await consoleInput.fill('log third');
    await consoleInput.press('Enter');
    
    // Show history
    await consoleInput.fill('history');
    await consoleInput.press('Enter');
    
    // Check that history is displayed
    await expect(consoleLog).toContainText('Command history:');
    await expect(consoleLog).toContainText('1: log first');
    await expect(consoleLog).toContainText('2: log second');
    await expect(consoleLog).toContainText('3: log third');
  });

  test('should handle special commands in history', async ({ page }) => {
    const consoleInput = page.locator('.console-input');
    const consoleLog = page.locator('.console-log');
    
    // Execute clear command
    await consoleInput.fill('log before clear');
    await consoleInput.press('Enter');
    
    await consoleInput.fill('clear');
    await consoleInput.press('Enter');
    
    // Log should be cleared
    const logLines = await consoleLog.locator('.console-line').count();
    expect(logLines).toBe(0);
    
    // But clear should be in history
    await consoleInput.press('ArrowUp');
    await expect(consoleInput).toHaveValue('clear');
    
    await consoleInput.press('ArrowUp');
    await expect(consoleInput).toHaveValue('log before clear');
  });

  test('should focus input when console opens', async ({ page }) => {
    // Close console first using Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('.overlay:has-text("Console")')).not.toBeVisible();
    
    // Reopen console
    await page.keyboard.press('o');
    await expect(page.locator('.overlay:has-text("Console")')).toBeVisible();
    
    // Input should be focused
    const consoleInput = page.locator('.console-input');
    await expect(consoleInput).toBeFocused();
  });
});
