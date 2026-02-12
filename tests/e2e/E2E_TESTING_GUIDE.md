# CareFlow End-to-End (E2E) Testing Guide

This guide explains how to test all CareFlow features using Playwright for automated browser testing.

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [Running E2E Tests](#running-e2e-tests)
3. [Test Categories](#test-categories)
4. [Writing New E2E Tests](#writing-new-e2e-tests)
5. [Feature Test Coverage](#feature-test-coverage)

---

## Setup and Configuration

### Prerequisites

```bash
# Install Playwright browsers
npx playwright install

# Install dependencies
npm install
```

### Configuration File

The Playwright configuration is in [`playwright.config.js`](../playwright.config.js):

```javascript
// Key settings:
testDir: "./tests/e2e"           // E2E test directory
baseURL: "http://localhost:3001" // Application URL
projects: [chromium, firefox, webkit] // Test on all browsers
webServer: npm run dev           // Auto-start dev server
```

---

## Running E2E Tests

### Run All E2E Tests

```bash
# Run on all browsers
npx playwright test

# Run on specific browser
npx playwright test --project=chromium

# Run specific test file
npx playwright test tests/e2e/auth.spec.js

# Run with headed browser (visible)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug
```

### View Test Report

```bash
# Open HTML report
npx playwright show-report
```

---

## Test Categories

### 1. Authentication Tests (`auth.spec.js`)

Tests for login, signup, and session management.

```javascript
// Example: Login flow test
test("should login successfully", async ({ page }) => {
  await page.goto("/login");

  // Fill credentials
  await page.fill('[data-testid="email-input"]', "test@example.com");
  await page.fill('[data-testid="password-input"]', "password123");

  // Submit form
  await page.click('[data-testid="login-button"]');

  // Verify redirect to dashboard
  await expect(page).toHaveURL("/dashboard");
});
```

### 2. WebRTC Calling Tests (`webrtc.spec.js`)

Tests for peer-to-peer calling functionality.

```javascript
// Example: WebRTC call establishment
test("should establish P2P call", async ({ browser }) => {
  // Create two browser contexts (caller and callee)
  const callerContext = await browser.newContext();
  const calleeContext = await browser.newContext();

  const callerPage = await callerContext.newPage();
  const calleePage = await calleeContext.newPage();

  // Setup both users...
  // Initiate call...
  // Verify connection...
});
```

### 3. Dashboard Tests (`dashboard.spec.js`)

Tests for dashboard tabs and navigation.

### 4. Call History Tests (`history.spec.js`)

Tests for call history display and filtering.

### 5. Recordings Tests (`recordings.spec.js`)

Tests for recording playback and management.

---

## Writing New E2E Tests

### Test File Structure

```javascript
// tests/e2e/feature.spec.js
const { test, expect } = require("@playwright/test");

test.describe("Feature Name", () => {
  // Setup before each test
  test.beforeEach(async ({ page }) => {
    // Common setup (login, navigate, etc.)
  });

  test("should do something specific", async ({ page }) => {
    // Arrange: Setup test conditions
    await page.goto("/dashboard");

    // Act: Perform the action
    await page.click('[data-testid="action-button"]');

    // Assert: Verify the result
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Using Data Test IDs

Add `data-testid` attributes to components for reliable selection:

```jsx
// In React component
<button data-testid="call-button">Call</button>
<input data-testid="phone-input" type="tel" />
```

### Handling Authentication

```javascript
// Method 1: Mock authentication state
await page.evaluate(() => {
  localStorage.setItem(
    "careflow_auth",
    JSON.stringify({
      token: "test-token",
      user: { uid: "test-user" },
    }),
  );
});

// Method 2: Use storage state
test.use({ storageState: "tests/auth-state.json" });
```

### Network Interception

```javascript
// Mock API responses
await page.route("**/api/analytics", (route) => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ totalCalls: 100 }),
  });
});

// Simulate slow network
await page.route("**/*", (route) => {
  route.continue({
    latency: 1000,
    throughput: 50,
  });
});
```

---

## Feature Test Coverage

### Authentication Flow

| Feature             | Test File      | Status  |
| ------------------- | -------------- | ------- |
| User Registration   | `auth.spec.js` | Pending |
| User Login          | `auth.spec.js` | Pending |
| Password Reset      | `auth.spec.js` | Pending |
| Session Persistence | `auth.spec.js` | Pending |
| Logout              | `auth.spec.js` | Pending |

### WebRTC Calling

| Feature                | Test File        | Status         |
| ---------------------- | ---------------- | -------------- |
| P2P Call Establishment | `webrtc.spec.js` | ✅ Implemented |
| Call Rejection         | `webrtc.spec.js` | ✅ Implemented |
| Network Disconnection  | `webrtc.spec.js` | ✅ Implemented |
| Slow Network Handling  | `webrtc.spec.js` | ✅ Implemented |
| ICE Candidate Handling | `webrtc.spec.js` | ✅ Implemented |

### Twilio Calling

| Feature              | Test File        | Status  |
| -------------------- | ---------------- | ------- |
| PSTN Call Initiation | `twilio.spec.js` | Pending |
| DTMF Tone Sending    | `twilio.spec.js` | Pending |
| Call Mute/Unmute     | `twilio.spec.js` | Pending |
| Call Hangup          | `twilio.spec.js` | Pending |

### Dashboard

| Feature           | Test File           | Status  |
| ----------------- | ------------------- | ------- |
| Tab Navigation    | `dashboard.spec.js` | Pending |
| Analytics Display | `dashboard.spec.js` | Pending |
| Call History List | `dashboard.spec.js` | Pending |
| Recordings List   | `dashboard.spec.js` | Pending |

### Call History

| Feature            | Test File         | Status  |
| ------------------ | ----------------- | ------- |
| History Pagination | `history.spec.js` | Pending |
| Call Filtering     | `history.spec.js` | Pending |
| Call Details View  | `history.spec.js` | Pending |

### Recordings

| Feature            | Test File            | Status  |
| ------------------ | -------------------- | ------- |
| Recording Playback | `recordings.spec.js` | Pending |
| Recording Download | `recordings.spec.js` | Pending |
| Recording Delete   | `recordings.spec.js` | Pending |

---

## Running Tests Against Different Environments

### Local Development

```bash
# Start dev server and run tests
npm run test:e2e
```

### Staging Environment

```bash
E2E_BASE_URL=https://staging.careflow.com npx playwright test
```

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Run E2E tests
  run: npx playwright test
  env:
    CI: true
```

---

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Mock external services** (Twilio, Firebase) for consistent tests
3. **Use page object models** for reusable page interactions
4. **Keep tests independent** - each test should work in isolation
5. **Use meaningful assertions** - verify user-visible behavior
6. **Handle async operations** with proper waits and timeouts

---

## Troubleshooting

### Common Issues

1. **Timeout errors**: Increase timeout in test config
2. **Element not found**: Check data-testid attributes
3. **Flaky tests**: Add proper waits for async operations
4. **Auth failures**: Verify storage state is valid

### Debug Mode

```bash
# Run with debug mode
npx playwright test --debug

# Generate trace on failure
npx playwright test --trace on-first-retry
```

---

## Next Steps

1. Create `auth.spec.js` for authentication tests
2. Create `dashboard.spec.js` for dashboard navigation tests
3. Create `twilio.spec.js` for Twilio calling tests
4. Create `history.spec.js` for call history tests
5. Create `recordings.spec.js` for recording management tests
