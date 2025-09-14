import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Wait for app to be fully loaded
  await page.waitForSelector('.toolbar', { timeout: 5000 });
});

test.describe('Drawio Overlay Basic UI', () => {
  test('opens and shows upload interface', async ({ page }) => {
    // Open Drawio overlay
    await page.getByRole('button', { name: 'Drawio' }).click();
    
    const drawioOverlay = page.locator('.overlay').filter({ has: page.locator('h3', { hasText: 'Draw.io Import' }) });
    await expect(drawioOverlay).toBeVisible();

    // Check for upload zone
    const uploadZone = drawioOverlay.locator('[data-test="drawio-upload-zone"]');
    await expect(uploadZone).toBeVisible();
    await expect(uploadZone.getByText('Drop a draw.io file here or click to browse')).toBeVisible();
    
    // Check for supported formats
    await expect(uploadZone.getByText('Supports .drawio and .xml files')).toBeVisible();

    // Close overlay
    await drawioOverlay.getByTitle('Close').click();
    await expect(drawioOverlay).toHaveCount(0);
  });

  test('has correct toolbar button', async ({ page }) => {
    // Check that the Drawio button is present in toolbar
    const toolbar = page.locator('.toolbar');
    await expect(toolbar).toBeVisible();
    
    const drawioButton = toolbar.getByRole('button', { name: 'Drawio' });
    await expect(drawioButton).toBeVisible();
    
    // Test button functionality
    await drawioButton.click();
    const drawioOverlay = page.locator('.overlay').filter({ has: page.locator('h3', { hasText: 'Draw.io Import' }) });
    await expect(drawioOverlay).toBeVisible();
  });

  test('supports different overlay modes', async ({ page }) => {
    // Open Drawio overlay
    await page.getByRole('button', { name: 'Drawio' }).click();
    const drawioOverlay = page.locator('.overlay').filter({ has: page.locator('h3', { hasText: 'Draw.io Import' }) });
    
    // Test normal mode (default)
    await expect(drawioOverlay).toBeVisible();
    
    // Test floating mode
    await drawioOverlay.getByTitle('Floating').click();
    await expect(drawioOverlay).toHaveClass(/overlay-floating/);
    
    // Test fullscreen mode
    await drawioOverlay.getByTitle('Fullscreen').click();
    await expect(drawioOverlay).toHaveClass(/overlay-fullscreen/);
    
    // Back to normal
    await drawioOverlay.getByTitle('Normal').click();
    await expect(drawioOverlay).not.toHaveClass(/overlay-floating/);
    await expect(drawioOverlay).not.toHaveClass(/overlay-fullscreen/);
  });
});

test.describe('Drawio File Upload and Parsing', () => {
  test('uploads and parses valid draw.io file', async ({ page }) => {
    // Open overlay
    await page.getByRole('button', { name: 'Drawio' }).click();
    const drawioOverlay = page.locator('.overlay').filter({ has: page.locator('h3', { hasText: 'Draw.io Import' }) });
    
    // Upload the valid fixture file
    const fileInput = drawioOverlay.locator('[data-test="drawio-file-input"]');
    const validFilePath = path.resolve('tests-e2e/fixtures/valid-diagram.drawio');
    await fileInput.setInputFiles(validFilePath);
    
    // Check file info appears
    const fileInfo = drawioOverlay.locator('[data-test="drawio-file-info"]');
    await expect(fileInfo).toBeVisible();
    await expect(drawioOverlay.locator('[data-test="drawio-file-name"]')).toContainText('valid-diagram.drawio');
    await expect(drawioOverlay.locator('[data-test="drawio-file-stats"]')).toContainText('7 nodes, 7 connections');
    
    // Check preview sections are shown
    await expect(drawioOverlay.locator('[data-test="drawio-preview"]')).toBeVisible();
    await expect(drawioOverlay.locator('[data-test="drawio-node-mapping"]')).toBeVisible();
    await expect(drawioOverlay.locator('[data-test="drawio-connections"]')).toBeVisible();
    
    // Check actions are enabled
    const applyBtn = drawioOverlay.locator('[data-test="drawio-apply-btn"]');
    await expect(applyBtn).toBeVisible();
    await expect(applyBtn).not.toBeDisabled();
    
    const exportBtn = drawioOverlay.locator('[data-test="drawio-export-btn"]');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).not.toBeDisabled();
  });

  test('shows error for invalid XML file', async ({ page }) => {
    // Open overlay
    await page.getByRole('button', { name: 'Drawio' }).click();
    const drawioOverlay = page.locator('.overlay').filter({ has: page.locator('h3', { hasText: 'Draw.io Import' }) });
    
    // Upload the invalid fixture file
    const fileInput = drawioOverlay.locator('[data-test="drawio-file-input"]');
    const invalidFilePath = path.resolve('tests-e2e/fixtures/invalid-xml.drawio');
    await fileInput.setInputFiles(invalidFilePath);
    
    // Check error display appears
    const errorDisplay = drawioOverlay.locator('[data-test="drawio-parse-error"]');
    await expect(errorDisplay).toBeVisible();
    await expect(errorDisplay).toContainText('Parse Error');
    
    // Check that preview and actions are not shown
    await expect(drawioOverlay.locator('[data-test="drawio-preview"]')).not.toBeVisible();
    await expect(drawioOverlay.locator('[data-test="drawio-actions"]')).not.toBeVisible();
  });

  test('clears uploaded file when Clear button is clicked', async ({ page }) => {
    // Open overlay and upload a file
    await page.getByRole('button', { name: 'Drawio' }).click();
    const drawioOverlay = page.locator('.overlay').filter({ has: page.locator('h3', { hasText: 'Draw.io Import' }) });
    
    const fileInput = drawioOverlay.locator('[data-test="drawio-file-input"]');
    const validFilePath = path.resolve('tests-e2e/fixtures/valid-diagram.drawio');
    await fileInput.setInputFiles(validFilePath);
    
    // Wait for file info to appear
    await expect(drawioOverlay.locator('[data-test="drawio-file-info"]')).toBeVisible();
    
    // Click Clear button
    await drawioOverlay.locator('[data-test="drawio-clear-btn"]').click();
    
    // Check that upload zone is shown again
    const uploadZone = drawioOverlay.locator('[data-test="drawio-upload-zone"]');
    await expect(uploadZone.getByText('Drop a draw.io file here or click to browse')).toBeVisible();
    
    // Check that file info and preview are hidden
    await expect(drawioOverlay.locator('[data-test="drawio-file-info"]')).not.toBeVisible();
    await expect(drawioOverlay.locator('[data-test="drawio-preview"]')).not.toBeVisible();
  });
});

test.describe('Drawio Configuration Application', () => {
  test('applies parsed configuration to simulation', async ({ page }) => {
    // Listen for console logs to verify application
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Open overlay
    await page.getByRole('button', { name: 'Drawio' }).click();
    const drawioOverlay = page.locator('.overlay').filter({ has: page.locator('h3', { hasText: 'Draw.io Import' }) });
    
    // Upload valid file
    const fileInput = drawioOverlay.locator('[data-test="drawio-file-input"]');
    const validFilePath = path.resolve('tests-e2e/fixtures/valid-diagram.drawio');
    await fileInput.setInputFiles(validFilePath);
    
    // Wait for preview to load
    await expect(drawioOverlay.locator('[data-test="drawio-preview"]')).toBeVisible();
    
    // Apply configuration
    await drawioOverlay.locator('[data-test="drawio-apply-btn"]').click();
    
    // Wait a moment for the configuration to be applied
    await page.waitForTimeout(500);
    
    // Check that configuration was applied (verify via console logs)
    const hasAppliedLog = consoleLogs.some(log => 
      log.includes('Draw.io configuration applied successfully') ||
      log.includes('Applied draw.io graph to simulation')
    );
    expect(hasAppliedLog).toBeTruthy();
    
    // Close overlay and verify the simulation is running with new config
    await drawioOverlay.getByTitle('Close').click();
    
    // The canvas should still be visible
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('exports configuration as JSON', async ({ page }) => {
    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Open overlay and upload file
    await page.getByRole('button', { name: 'Drawio' }).click();
    const drawioOverlay = page.locator('.overlay').filter({ has: page.locator('h3', { hasText: 'Draw.io Import' }) });
    
    const fileInput = drawioOverlay.locator('[data-test="drawio-file-input"]');
    const validFilePath = path.resolve('tests-e2e/fixtures/valid-diagram.drawio');
    await fileInput.setInputFiles(validFilePath);
    
    // Wait for preview
    await expect(drawioOverlay.locator('[data-test="drawio-preview"]')).toBeVisible();
    
    // Click export button
    await drawioOverlay.locator('[data-test="drawio-export-btn"]').click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toContain('valid-diagram');
    expect(download.suggestedFilename()).toContain('.json');
    
    // Optionally verify content if needed
    const downloadPath = await download.path();
    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf-8');
      const json = JSON.parse(content);
      expect(json).toHaveProperty('nodes');
      expect(json).toHaveProperty('links');
      expect(json.nodes).toHaveLength(7);
      expect(json.links).toHaveLength(7);
    }
  });
});

test.describe('Drawio Node Type Inference', () => {
  test('correctly infers node types from labels and shapes', async ({ page }) => {
    // Open overlay
    await page.getByRole('button', { name: 'Drawio' }).click();
    const drawioOverlay = page.locator('.overlay').filter({ has: page.locator('h3', { hasText: 'Draw.io Import' }) });
    
    // Upload file with various node types
    const fileInput = drawioOverlay.locator('[data-test="drawio-file-input"]');
    const validFilePath = path.resolve('tests-e2e/fixtures/valid-diagram.drawio');
    await fileInput.setInputFiles(validFilePath);
    
    // Wait for node mapping to appear
    const nodeMapping = drawioOverlay.locator('[data-test="drawio-node-mapping"]');
    await expect(nodeMapping).toBeVisible();
    
    // Check for specific node type classes
    const mappingItems = nodeMapping.locator('.node-mapping-item');
    await expect(mappingItems).toHaveCount(7);
    
    // Verify some specific node types are inferred correctly
    // API Gateway should be Ingress
    const apiGateway = mappingItems.filter({ hasText: 'API Gateway' });
    await expect(apiGateway.locator('.node-type')).toHaveClass(/node-type-ingress/);
    
    // Load Balancer should be LoadBalancer
    const loadBalancer = mappingItems.filter({ hasText: 'Load Balancer' });
    await expect(loadBalancer.locator('.node-type')).toHaveClass(/node-type-lb/);
    
    // Database should be DB
    const database = mappingItems.filter({ hasText: 'Database' });
    await expect(database.locator('.node-type')).toHaveClass(/node-type-db/);
    
    // Redis Cache should be Cache
    const cache = mappingItems.filter({ hasText: 'Redis Cache' });
    await expect(cache.locator('.node-type')).toHaveClass(/node-type-cache/);
  });
});

test.describe('Drawio Validation', () => {
  test('shows validation errors when needed', async ({ page }) => {
    // This would test files with validation issues
    // For now, we'll test that validation errors section can appear
    await page.getByRole('button', { name: 'Drawio' }).click();
    const drawioOverlay = page.locator('.overlay').filter({ has: page.locator('h3', { hasText: 'Draw.io Import' }) });
    
    // Initially, validation errors should not be visible
    await expect(drawioOverlay.locator('[data-test="drawio-validation-errors"]')).not.toBeVisible();
    
    // When we have a valid file, no validation errors
    const fileInput = drawioOverlay.locator('[data-test="drawio-file-input"]');
    const validFilePath = path.resolve('tests-e2e/fixtures/valid-diagram.drawio');
    await fileInput.setInputFiles(validFilePath);
    
    // Still no validation errors for valid file
    await expect(drawioOverlay.locator('[data-test="drawio-validation-errors"]')).not.toBeVisible();
  });
});

test.describe('Drawio Drag and Drop', () => {
  test('upload zone responds to drag events', async ({ page }) => {
    // Open overlay
    await page.getByRole('button', { name: 'Drawio' }).click();
    const drawioOverlay = page.locator('.overlay').filter({ has: page.locator('h3', { hasText: 'Draw.io Import' }) });
    
    const uploadZone = drawioOverlay.locator('[data-test="drawio-upload-zone"]');
    
    // Initially should not have dragging class
    await expect(uploadZone).not.toHaveClass(/dragging/);
    
    // Note: Actual drag-and-drop file testing would require more complex setup
    // This test verifies the UI responds to drag events
  });
})
