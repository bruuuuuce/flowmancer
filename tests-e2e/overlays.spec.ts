import { test, expect } from '@playwright/test';
import { openOverlay, closeOverlay, verifyStatsBadges } from './helpers/overlay-helpers';

function overlayByTitle(page, title: string) {
  return page.locator('.overlay').filter({ has: page.locator('h3', { hasText: title }) });
}

function getConsoleOverlay(page) {
  return overlayByTitle(page, 'Console');
}

function getConfigOverlay(page) {
  return overlayByTitle(page, 'Config JSON');
}

function getStatsOverlay(page) {
  return overlayByTitle(page, 'Stats');
}

function getScriptsOverlay(page) {
  return overlayByTitle(page, 'Scripts');
}

function getPumlOverlay(page) {
  return overlayByTitle(page, 'PUML Graph');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Stats overlay opens and closes', async ({ page }) => {
  test.setTimeout(45000);
  
  // Open Stats overlay using helper
  const stats = await openOverlay(page, 'Stats');
  
  // Verify it's visible
  await expect(stats).toBeVisible();
  
  // Close using helper
  await closeOverlay(page, stats);
});

test('Config overlay: Load baseline and Apply shows no error', async ({ page }) => {
  await page.getByRole('button', { name: 'Config' }).click();
  const cfg = getConfigOverlay(page);
  await expect(cfg).toBeVisible();

  // Click Load baseline and ensure textarea updated
  await cfg.getByRole('button', { name: 'Load baseline' }).click();
  const textarea = cfg.locator('textarea');
  await expect(textarea).toHaveValue(/"rateRps"/);

  // Apply and ensure no error message is shown
  await cfg.getByRole('button', { name: 'Apply' }).click();
  await expect(cfg.locator('div[style*="color:#f88"]')).toHaveCount(0);

  // Close
  await cfg.getByTitle('Close').click();
  await expect(cfg).toHaveCount(0);
});

test('Console overlay: execute command and see output', async ({ page }) => {
  await page.getByRole('button', { name: 'Console' }).click();
  const cons = getConsoleOverlay(page);
  await expect(cons).toBeVisible();

  // Test the new interactive console with ScriptInterpreter
  const input = cons.locator('input[placeholder]');
  
  // Test adding a node
  await input.fill('node add TestNode Service capacity=100');
  await input.press('Enter');
  await expect(cons.getByText('> node add TestNode Service capacity=100')).toBeVisible();
  await expect(cons.getByText('Added node TestNode (Service)')).toBeVisible();
  
  // Test help command
  await input.fill('help');
  await input.press('Enter');
  await expect(cons.getByText('Available commands:')).toBeVisible();

  await cons.getByTitle('Close').click();
  await expect(cons).toHaveCount(0);
});

test('Scripts overlay: run script and verify logs in Console', async ({ page }) => {
  // Open Scripts and run
  await page.getByRole('button', { name: 'Scripts' }).click();
  const scripts = getScriptsOverlay(page);
  await expect(scripts).toBeVisible();
  await scripts.getByRole('button', { name: 'Run' }).click();

  // Open Console to view logs
  await page.getByRole('button', { name: 'Console' }).click();
  const cons = getConsoleOverlay(page);
  await expect(cons).toBeVisible();

  await expect(cons.getByText('[script] start')).toBeVisible();
  await expect(cons.getByText('[script] end')).toBeVisible({ timeout: 5000 });
});

test('PUML overlay: generate from current and apply without error', async ({ page }) => {
  await page.getByRole('button', { name: 'PUML' }).click();
  const puml = getPumlOverlay(page);
  await expect(puml).toBeVisible();

  await puml.getByRole('button', { name: 'Generate from current' }).click();
  await puml.getByRole('button', { name: 'Apply' }).click();

  await expect(puml.locator('div[style*="color:#f88"]')).toHaveCount(0);
});


// Additional coverage: Stats overlay shows metrics badges
import { expect as pwExpect } from '@playwright/test';

test('Stats overlay shows RPS and In flight badges', async ({ page }) => {
  test.setTimeout(45000);
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Open Stats overlay using helper
  const stats = await openOverlay(page, 'Stats');
  
  // Verify badges using helper
  const badges = await verifyStatsBadges(stats);
  expect(badges.rpsFound).toBeTruthy();
  expect(badges.inflightFound).toBeTruthy();
});
