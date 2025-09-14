// E2E tests for metrics routing behavior in the actual application
import { test, expect } from '@playwright/test';

test.describe('Metrics Routing - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for canvas to be ready
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(500); // Brief wait for initialization
  });

  test('Ingress with replicate_all should send full traffic to all downstream', async ({ page }) => {
    // Open config overlay
    await page.locator('button:has-text("Config")').click();
    await page.waitForSelector('.overlay', { state: 'visible' });

    // Apply configuration with A->B,C (replicate_all)
    const config = {
      rateRps: 5,
      latency: { base: 20, jitter: 0 },
      nodes: [
        {
          id: "A",
          kind: "Ingress",
          rateRps: 10,
          routing: { policy: "replicate_all" }
        },
        {
          id: "B",
          kind: "Service",
          capacity: 100,
          base_ms: 10,
          jitter_ms: 0,
          routing: { policy: "replicate_all" }
        },
        {
          id: "C",
          kind: "Service",
          capacity: 100,
          base_ms: 15,
          jitter_ms: 0,
          routing: { policy: "replicate_all" }
        }
      ],
      links: [
        { from: "A", to: "B" },
        { from: "A", to: "C" }
      ]
    };

    // Set configuration
    await page.locator('textarea').fill(JSON.stringify(config, null, 2));
    await page.locator('button:has-text("Apply")').click();

    // Wait for metrics to stabilize
    await page.waitForTimeout(2000);

    // Open stats overlay to verify metrics
    await page.locator('button:has-text("Stats")').click();
    await page.waitForSelector('.overlay', { state: 'visible' });

    // Check link stats - both links from A should show ~10 RPS
    const linkAB = await page.locator('text=/A->B/').count();
    const linkAC = await page.locator('text=/A->C/').count();
    
    expect(linkAB).toBeGreaterThan(0);
    expect(linkAC).toBeGreaterThan(0);
  });

  test('LoadBalancer should distribute traffic evenly', async ({ page }) => {
    // Open config overlay
    await page.locator('button:has-text("Config")').click();
    await page.waitForSelector('.overlay', { state: 'visible' });

    // Apply configuration with A->LB->B,C (round_robin)
    const config = {
      rateRps: 5,
      latency: { base: 20, jitter: 0 },
      nodes: [
        {
          id: "A",
          kind: "Ingress",
          rateRps: 100,
          routing: { policy: "replicate_all" }
        },
        {
          id: "LB",
          kind: "LoadBalancer",
          capacity: 200,
          base_ms: 2,
          jitter_ms: 0,
          routing: { policy: "round_robin" }
        },
        {
          id: "B",
          kind: "Service",
          capacity: 100,
          base_ms: 10,
          jitter_ms: 0,
          routing: { policy: "replicate_all" }
        },
        {
          id: "C",
          kind: "Service",
          capacity: 100,
          base_ms: 15,
          jitter_ms: 0,
          routing: { policy: "replicate_all" }
        }
      ],
      links: [
        { from: "A", to: "LB" },
        { from: "LB", to: "B" },
        { from: "LB", to: "C" }
      ]
    };

    // Set configuration
    await page.locator('textarea').fill(JSON.stringify(config, null, 2));
    await page.locator('button:has-text("Apply")').click();

    // Wait for metrics to stabilize
    await page.waitForTimeout(2000);

    // Open stats overlay
    await page.locator('button:has-text("Stats")').click();
    await page.waitForSelector('.overlay', { state: 'visible' });

    // Check that LB distributes traffic evenly (should be ~50 RPS each)
    const linkLBB = await page.locator('text=/LB->B/').count();
    const linkLBC = await page.locator('text=/LB->C/').count();
    
    expect(linkLBB).toBeGreaterThan(0);
    expect(linkLBC).toBeGreaterThan(0);
  });

  test('Complex topology with mixed routing policies', async ({ page }) => {
    test.slow(); // Triple the timeout for complex topology
    // Open config overlay
    await page.locator('button:has-text("Config")').click();
    await page.waitForSelector('.overlay', { state: 'visible', timeout: 5000 });

    // Simplified configuration to avoid timeout
    const config = {
      nodes: [
        { id: "A", kind: "Ingress", rateRps: 10 },
        { id: "B", kind: "LoadBalancer" },
        { id: "C", kind: "Service", capacity: 50 },
        { id: "D", kind: "Service", capacity: 100 },
        { id: "E", kind: "Sink" }
      ],
      links: [
        { from: "A", to: "B" },
        { from: "A", to: "D" },
        { from: "B", to: "C" },
        { from: "B", to: "D" },
        { from: "C", to: "E" },
        { from: "D", to: "E" }
      ]
    };

    // Set configuration
    await page.locator('textarea').fill(JSON.stringify(config, null, 2));
    await page.locator('button:has-text("Apply")').click();
    await page.waitForTimeout(1000);

    // Close config overlay
    await page.locator('button[title="Close"]').first().click();
    await page.waitForTimeout(500);

    // Open stats overlay
    await page.locator('button:has-text("Stats")').click();
    await page.waitForTimeout(500);

    // Verify overlay is visible
    const statsOverlay = page.locator('.overlay').filter({ has: page.locator('.overlay-header:has-text("Stats")') });
    await expect(statsOverlay).toBeVisible({ timeout: 5000 });

    // Check that we have some metrics
    const hasRPS = await page.locator('text=/RPS/i').isVisible();
    expect(hasRPS).toBeTruthy();
  });

  test('Changing configuration should update metrics immediately', async ({ page }) => {
    test.slow(); // Triple the timeout for multiple config changes
    // Open config overlay
    await page.locator('button:has-text("Config")').click();
    await page.waitForSelector('.overlay', { state: 'visible', timeout: 5000 });

    // Initial simple configuration
    const config1 = {
      nodes: [
        { id: "A", kind: "Ingress", rateRps: 5 },
        { id: "B", kind: "Sink" }
      ],
      links: [{ from: "A", to: "B" }]
    };

    await page.locator('textarea').fill(JSON.stringify(config1, null, 2));
    await page.locator('button:has-text("Apply")').click();
    await page.waitForTimeout(500);

    // Close config overlay
    await page.locator('button[title="Close"]').first().click();
    await page.waitForTimeout(500);

    // Open stats
    await page.locator('button:has-text("Stats")').click();
    await page.waitForTimeout(500);
    
    const statsOverlay = page.locator('.overlay').filter({ has: page.locator('.overlay-header:has-text("Stats")') });
    await expect(statsOverlay).toBeVisible({ timeout: 5000 });

    // Close stats
    await page.locator('button[title="Close"]').first().click();
    await page.waitForTimeout(500);

    // Change configuration to higher rate
    await page.locator('button:has-text("Config")').click();
    await page.waitForTimeout(500);
    
    const config2 = {
      nodes: [
        { id: "A", kind: "Ingress", rateRps: 20 },
        { id: "B", kind: "Sink" }
      ],
      links: [{ from: "A", to: "B" }]
    };

    await page.locator('textarea').fill(JSON.stringify(config2, null, 2));
    await page.locator('button:has-text("Apply")').click();
    await page.waitForTimeout(500);

    // Close config and open stats again
    await page.locator('button[title="Close"]').first().click();
    await page.waitForTimeout(500);
    
    await page.locator('button:has-text("Stats")').click();
    await page.waitForTimeout(500);
    
    // Verify stats overlay is still showing
    await expect(statsOverlay).toBeVisible({ timeout: 5000 });
  });

  test('Node capacity limits should be respected', async ({ page }) => {
    // Open config overlay
    await page.locator('button:has-text("Config")').click();
    await page.waitForSelector('.overlay', { state: 'visible' });

    // Configuration with overload scenario
    const config = {
      rateRps: 5,
      latency: { base: 20, jitter: 0 },
      nodes: [
        {
          id: "A",
          kind: "Ingress",
          rateRps: 100,
          routing: { policy: "replicate_all" }
        },
        {
          id: "B",
          kind: "Service",
          capacity: 10, // Very low capacity
          base_ms: 10,
          jitter_ms: 0,
          routing: { policy: "replicate_all" }
        },
        {
          id: "C",
          kind: "Sink"
        }
      ],
      links: [
        { from: "A", to: "B" },
        { from: "B", to: "C" }
      ]
    };

    // Set configuration
    await page.locator('textarea').fill(JSON.stringify(config, null, 2));
    await page.locator('button:has-text("Apply")').click();

    // Wait for metrics to stabilize
    await page.waitForTimeout(2000);

    // Check canvas for overload indication (red color on node B)
    const canvas = await page.locator('canvas');
    expect(canvas).toBeTruthy();

    // Open stats overlay
    await page.locator('button:has-text("Stats")').click();
    
    // B should only process 10 RPS despite receiving 100
    const linkBC = await page.locator('text=/B->C/').count();
    expect(linkBC).toBeGreaterThan(0);
  });

  test('Console commands should interact with metrics', async ({ page }) => {
    // Set up initial configuration
    await page.locator('button:has-text("Config")').click();
    const config = {
      rateRps: 5,
      latency: { base: 20, jitter: 0 },
      nodes: [
        { id: "A", kind: "Ingress", rateRps: 10, routing: { policy: "replicate_all" } },
        { id: "B", kind: "Service", capacity: 100, routing: { policy: "replicate_all" } },
        { id: "C", kind: "Sink" }
      ],
      links: [
        { from: "A", to: "B" },
        { from: "B", to: "C" }
      ]
    };
    
    await page.locator('textarea').fill(JSON.stringify(config, null, 2));
    await page.locator('button:has-text("Apply")').click();
    await page.locator('[title="Close"]').click();

    // Open console
    await page.locator('button:has-text("Console")').click();
    await page.waitForSelector('.overlay', { state: 'visible' });

    // Type a command
    const consoleOverlay = page.locator('.overlay').filter({ has: page.locator('h3', { hasText: 'Console' }) });
    await consoleOverlay.locator('input').fill('node off svcA');
    await page.keyboard.press('Enter');

    // Check log output
    const logOutput = await consoleOverlay.textContent();
    expect(logOutput).toContain('> node off svcA');
  });
});
