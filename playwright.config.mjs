import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.DONGJAK_TARGET_URL || 'https://dongjak-walk-safety-preview.pages.dev/';
export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  retries: 0,
  timeout: 70_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-json/results.json' }]
  ],
  use: {
    baseURL, trace: process.env.DONGJAK_TRACE === '1' ? 'retain-on-failure' : 'off', screenshot: 'only-on-failure',
    video: 'off', actionTimeout: 12_000, navigationTimeout: 30_000
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } }
  ]
});
