import { defineConfig } from '@playwright/test';

const runningInCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:5195',
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    // Reduce software-WebGL frame readback overhead on GitHub runners.
    // Preserve true browser interactions, error screenshots, trace actions
    // and local video; only continuous CI visual recording is disabled.
    trace: runningInCI
      ? { mode: 'retain-on-failure', screenshots: false, snapshots: false, sources: true }
      : 'retain-on-failure',
    video: runningInCI ? 'off' : 'retain-on-failure'
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      }
    }
  ],
  webServer: {
    command: process.env.DONGJAK_UI_ONLY==='1' ? 'npm run dev:ui' : 'npm run dev:map',
    url: 'http://127.0.0.1:5195',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
