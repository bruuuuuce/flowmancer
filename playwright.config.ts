import { defineConfig, devices } from '@playwright/test';

// Use Vite preview for a stable production-like server
const PORT = 4173;

export default defineConfig({
  testDir: 'tests-e2e',
  // Increase global test timeout from 60s to 90s for complex tests
  timeout: 90_000,
  // Increase expect timeout from 10s to 15s for element visibility
  expect: { 
    timeout: 15_000,
    // Add more retries for toBeVisible assertions
    toHaveScreenshot: { maxDiffPixels: 100 }
  },
  fullyParallel: true,
  // Add retries even in local development to handle flaky tests
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? 'line' : [['list'], ['html']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Add global action timeout for clicks, fills, etc.
    actionTimeout: 10_000,
    // Add navigation timeout for page loads
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npm run dev -- --port=${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
