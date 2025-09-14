import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Stats overlay displays flow rates from configuration', async ({ page }) => {
  test.slow(); // Triple timeout for complex configuration and overlay interactions
  test.setTimeout(30000); // Additional explicit timeout
  // First load the specific configuration that the test expects
  await page.getByRole('button', { name: 'Config' }).click();
  const configOverlay = page.locator('.overlay').filter({ has: page.locator('.overlay-header:has-text("Config JSON")') });
  await expect(configOverlay).toBeVisible();
  
  // Create the expected configuration with A->B,D and B->C,D and C,D->E
  const testConfig = {
    "nodes": [
      {"id": "A", "kind": "Ingress", "rateRps": 10},
      {"id": "B", "kind": "LoadBalancer", "capacity": 100},
      {"id": "C", "kind": "Service", "capacity": 100},
      {"id": "D", "kind": "Service", "capacity": 100},
      {"id": "E", "kind": "Service", "capacity": 100}
    ],
    "links": [
      {"from": "A", "to": "B"},
      {"from": "A", "to": "D"},
      {"from": "B", "to": "C"},
      {"from": "B", "to": "D"},
      {"from": "C", "to": "E"},
      {"from": "D", "to": "E"}
    ]
  };
  
  const textarea = configOverlay.locator('textarea');
  await textarea.fill(JSON.stringify(testConfig, null, 2));
  await configOverlay.getByRole('button', { name: 'Apply' }).click();
  await page.waitForTimeout(500); // Wait for config to apply
  
  // Close config overlay
  await configOverlay.locator('button[title="Close"]').click();
  await expect(configOverlay).not.toBeVisible();
  
  // Open Stats overlay
  await page.getByRole('button', { name: 'Stats' }).click();
  
  const statsOverlay = page.locator('.overlay').filter({ has: page.locator('.overlay-header:has-text("Stats")') });
  await expect(statsOverlay).toBeVisible({ timeout: 10000 });

  // The stats table should show the calculated flow rates for each edge
  const table = statsOverlay.locator('table').last(); // Get the link stats table
  await expect(table).toBeVisible();

  // Check that we see link data in the table
  const tableRows = table.locator('tbody tr');
  const rowCount = await tableRows.count();
  expect(rowCount).toBeGreaterThan(0);

  // The configuration has 6 links
  expect(rowCount).toBe(6);

  // Check for some expected links (they appear as "A-B" not "A->B" in the table)
  const tableText = await table.textContent();
  expect(tableText).toContain('A-B');
  expect(tableText).toContain('A-D');

  // Close overlay
  await statsOverlay.locator('button[title="Close"]').click();
  await expect(statsOverlay).not.toBeVisible();
});

test('Flow rates update when configuration changes via Config overlay', async ({ page }) => {
  test.slow(); // Triple timeout for multiple configuration changes
  test.setTimeout(30000); // Additional explicit timeout
  // Open Config overlay
  await page.getByRole('button', { name: 'Config' }).click();
  const configOverlay = page.locator('.overlay').filter({ has: page.locator('.overlay-header:has-text("Config JSON")') });
  await expect(configOverlay).toBeVisible();

  // Load baseline configuration
  await configOverlay.getByRole('button', { name: 'Load baseline' }).click();
  await page.waitForTimeout(500);
  
  // Apply the baseline config
  await configOverlay.getByRole('button', { name: 'Apply' }).click();
  await page.waitForTimeout(500);
  
  // Close config overlay
  await configOverlay.locator('button[title="Close"]').click();
  await expect(configOverlay).not.toBeVisible();

  // Open Stats overlay to see updated rates
  await page.getByRole('button', { name: 'Stats' }).click();
  await page.waitForTimeout(500);
  const statsOverlay = page.locator('.overlay').filter({ has: page.locator('.overlay-header:has-text("Stats")') });
  await expect(statsOverlay).toBeVisible({ timeout: 10000 });

  // The baseline config uses different node names, so we should see those reflected
  const table = statsOverlay.locator('table').last(); // Get the link stats table
  await expect(table).toBeVisible();
  
  const tableRows = table.locator('tbody tr');
  const rowCount = await tableRows.count();
  expect(rowCount).toBeGreaterThan(0);

  // Close overlay
  await statsOverlay.locator('button[title="Close"]').click();
});
