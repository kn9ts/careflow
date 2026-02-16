/**
 * Playwright Configuration for CareFlow E2E Tests
 *
 * This configuration is optimized for both local development and CI/CD pipelines.
 * It includes automatic trace and screenshot capture on failure for debugging.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail build if .only is left in code (CI only)
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,

  // Limit workers in CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    // HTML reporter for detailed test reports
    [
      'html',
      {
        outputFolder: 'playwright-report',
        open: process.env.CI ? 'never' : 'on-failure',
      },
    ],
    // List reporter for console output
    ['list'],
    // JUnit reporter for CI/CD integration (optional)
    ...(process.env.CI
      ? [
          [
            'junit',
            {
              outputFile: 'test-results/junit.xml',
            },
          ],
        ]
      : []),
  ],

  // Global test settings
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3001',

    // Capture trace on first retry (for debugging)
    trace: 'on-first-retry',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Capture video on failure (useful for debugging)
    video: 'retain-on-failure',

    // Browser context options
    contextOptions: {
      // Ignore HTTPS errors (useful for local testing)
      ignoreHTTPSErrors: true,
    },

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Test timeout
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports (optional)
    // {
    //   name: "Mobile Chrome",
    //   use: { ...devices["Pixel 5"] },
    // },
    // {
    //   name: "Mobile Safari",
    //   use: { ...devices["iPhone 12"] },
    // },
  ],

  // Development server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Output directory for test artifacts
  outputDir: 'test-results/artifacts',
});
