/**
 * Jest Configuration for CareFlow
 * Comprehensive test setup for all modules
 */

module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/.env.local",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  collectCoverageFrom: [
    "lib/**/*.js",
    "app/**/*.js",
    "components/**/*.js",
    "context/**/*.js",
    "hooks/**/*.js",
    "models/**/*.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
  testTimeout: 10000,
  // Run tests in parallel
  maxWorkers: "50%",
  // Transform ESM modules
  transform: {},
  // Use experimental V8 coverage
  collectCoverageFrom: [
    "lib/**/*.js",
    "!lib/firebase.js",
    "!lib/notifications.js",
  ],
};
