/**
 * Jest Configuration for CareFlow
 * Comprehensive test setup for all modules with coverage tracking
 *
 * Updated to support ESM modules for WebRTC testing
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
  // Transform ESM modules including @jest/globals
  transformIgnorePatterns: ["node_modules/(?!(@jest|jest-.*|firebase)/)"],
  // Only collect coverage from pure JS files, exclude JSX files
  collectCoverageFrom: [
    "lib/**/*.js",
    "models/**/*.js",
    "context/**/*.js",
    "hooks/**/*.js",
    "!**/*.jsx", // Exclude JSX files from coverage
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
  // Coverage thresholds - will fail if coverage drops below these values
  coverageThreshold: {
    global: {
      statements: 55,
      branches: 50,
      functions: 60,
      lines: 55,
    },
    // Module-specific thresholds (stricter for core modules)
    "./lib/**/*.js": {
      statements: 60,
      branches: 55,
      functions: 65,
      lines: 60,
    },
    "./models/**/*.js": {
      statements: 65,
      branches: 60,
      functions: 70,
      lines: 65,
    },
    "./context/**/*.js": {
      statements: 70,
      branches: 65,
      functions: 75,
      lines: 70,
    },
    "./hooks/**/*.js": {
      statements: 65,
      branches: 60,
      functions: 70,
      lines: 65,
    },
  },
  verbose: true,
  testTimeout: 10000,
  maxWorkers: "50%",
  transform: {
    "^.+\\.js$": ["babel-jest", { configFile: "./babel.jest.config.js" }],
  },
  // Tests are pure JavaScript, no JSX transformation needed
  testMatch: ["**/tests/**/*.test.js"],
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json"],
  moduleDirectories: ["node_modules", "<rootDir>"],
};
