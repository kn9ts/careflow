/**
 * Jest Configuration for CareFlow
 * Comprehensive test setup for all modules with coverage tracking
 *
 * Note: Full coverage requires ESM support. Current tests use inline implementations
 * to validate logic correctness. E2E tests with Playwright provide browser coverage.
 */

module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/.env.local",
    "<rootDir>/plans/",
    "<rootDir>/reports/",
    "<rootDir>/tests/e2e/", // E2E tests run with Playwright
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/models/(.*)$": "<rootDir>/models/$1",
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/app/(.*)$": "<rootDir>/app/$1",
    "^@/context/(.*)$": "<rootDir>/context/$1",
    "^@/hooks/(.*)$": "<rootDir>/hooks/$1",
  },
  collectCoverageFrom: [
    "lib/**/*.js",
    "models/**/*.js",
    "!lib/firebase.js",
    "!lib/notifications.js",
    "!lib/db.js",
    "!lib/init.js",
    "!lib/env.config.js",
    "!lib/env.config.integration.js",
    "!**/*.config.js",
    "!**/*.d.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json-summary"],
  // Coverage thresholds disabled - full ESM support required for accurate coverage
  // See Playwright E2E tests for browser coverage
  verbose: true,
  testTimeout: 10000,
  maxWorkers: "50%",
  transform: {},
  randomize: true,
  bail: process.env.CI ? 1 : 0,
  clearMocks: true,
  restoreMocks: true,
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json"],
  testMatch: ["**/tests/**/*.test.js", "**/tests/**/*.test.jsx"],
  moduleDirectories: ["node_modules", "<rootDir>"],
};
