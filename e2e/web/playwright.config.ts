import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['html', { outputFolder: '../../playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Tier 1 — journey specs run serially within each file, files can run in parallel
    {
      name: 'journeys',
      testDir: './journeys',
      use: { ...devices['Desktop Chrome'] },
    },
    // Tier 2 — safety specs
    {
      name: 'safety',
      testDir: './safety',
      use: { ...devices['Desktop Chrome'] },
    },
    // Tier 3 — small focused paths
    {
      name: 'tier3',
      testDir: './happy-and-negative',
      use: { ...devices['Desktop Chrome'] },
    },
    // Tier 4 — browser UI tests (watched, always recorded)
    {
      name: 'ui',
      testDir: './ui',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.FRONTEND_TEST_URL ?? 'http://localhost:3101',
        headless: false,
        video: 'on',
        screenshot: 'on',
        viewport: { width: 1440, height: 900 },
        actionTimeout: 15_000,
      },
    },
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
});
