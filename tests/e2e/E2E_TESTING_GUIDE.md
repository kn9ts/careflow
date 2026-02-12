# CareFlow End-to-End (E2E) Testing Guide

This guide provides comprehensive documentation for testing all CareFlow features using Playwright for automated browser testing.

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [Running E2E Tests](#running-e2e-tests)
3. [Test Architecture](#test-architecture)
4. [Data TestID Conventions](#data-testid-conventions)
5. [Test Patterns](#test-patterns)
6. [Test Suites Reference](#test-suites-reference)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

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
export default defineConfig({
  testDir: "./tests/e2e", // E2E test directory
  baseURL: "http://localhost:3001", // Application URL
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Running E2E Tests

### Run Commands

```bash
# Run all E2E tests
npx playwright test

# Run on specific browser
npx playwright test --project=chromium

# Run specific test file
npx playwright test tests/e2e/auth.spec.js

# Run with headed browser (visible)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run specific test by name
npx playwright test -g "should login"

# View test report
npx playwright show-report
```

### Environment Variables

```bash
# Run against different environment
E2E_BASE_URL=https://staging.careflow.com npx playwright test
```

---

## Test Architecture

### Directory Structure

```
tests/e2e/
├── E2E_TESTING_GUIDE.md     # This guide
├── auth.spec.js             # Authentication tests
├── dashboard.spec.js        # Dashboard navigation tests
├── webrtc.spec.js           # WebRTC P2P calling tests
├── twilio.spec.js           # Twilio PSTN calling tests
├── notifications.spec.js    # Push notification tests
└── settings.spec.js         # User settings tests
```

### Test Categories

| Category       | File                    | Purpose                                                   |
| -------------- | ----------------------- | --------------------------------------------------------- |
| Authentication | `auth.spec.js`          | Login, registration, password reset, session management   |
| Dashboard      | `dashboard.spec.js`     | Tab navigation, dialer, history, recordings, analytics    |
| WebRTC         | `webrtc.spec.js`        | P2P calls, network conditions, ICE handling               |
| Twilio         | `twilio.spec.js`        | PSTN calls, DTMF, call controls, incoming calls           |
| Notifications  | `notifications.spec.js` | FCM, permissions, incoming/missed/voicemail notifications |
| Settings       | `settings.spec.js`      | Profile, phone config, preferences, account management    |

---

## Data TestID Conventions

### Naming Convention

Use `data-testid` attributes for reliable element selection in E2E tests:

```jsx
// Format: data-testid="component-name-action"
<button data-testid="login-button">Sign In</button>
<input data-testid="email-input" type="email" />
<div data-testid="call-status">Connected</div>
```

### Component TestIDs

#### Authentication Components

| TestID           | Element               | Location             |
| ---------------- | --------------------- | -------------------- |
| `email-input`    | Email input field     | Login, Signup pages  |
| `password-input` | Password input field  | Login, Signup pages  |
| `login-button`   | Login submit button   | Login page           |
| `signup-button`  | Signup submit button  | Signup page          |
| `logout-button`  | Logout button         | Dashboard header     |
| `reset-button`   | Password reset button | Forgot password page |

#### Dialer Components

| TestID                | Element                  | Location     |
| --------------------- | ------------------------ | ------------ |
| `dial-pad`            | Dial pad container       | DialerTab    |
| `phone-input`         | Phone number input       | DialPad      |
| `clear-button`        | Clear number button      | DialPad      |
| `backspace-button`    | Backspace button         | DialPad      |
| `dial-button-{digit}` | Individual digit buttons | DialPad      |
| `call-button`         | Initiate call button     | DialerTab    |
| `hangup-button`       | End call button          | CallControls |
| `mute-button`         | Mute toggle button       | CallControls |

#### Call Status Components

| TestID                | Element              | Location          |
| --------------------- | -------------------- | ----------------- |
| `call-status`         | Call status text     | CallStatus        |
| `call-timer`          | Call duration timer  | CallStatus        |
| `call-mode-indicator` | Twilio/WebRTC mode   | DialerTab         |
| `toggle-mode-button`  | Switch call mode     | DialerTab         |
| `incoming-call-modal` | Incoming call dialog | CallStatus        |
| `accept-call-button`  | Accept call button   | IncomingCallModal |
| `reject-call-button`  | Reject call button   | IncomingCallModal |

#### Dashboard Components

| TestID           | Element               | Location         |
| ---------------- | --------------------- | ---------------- |
| `dialer-tab`     | Dialer tab button     | DashboardSidebar |
| `history-tab`    | History tab button    | DashboardSidebar |
| `recordings-tab` | Recordings tab button | DashboardSidebar |
| `analytics-tab`  | Analytics tab button  | DashboardSidebar |
| `settings-tab`   | Settings tab button   | DashboardSidebar |

---

## Test Patterns

### Authentication Flow Pattern

All tests requiring authentication follow this pattern:

```javascript
test.beforeEach(async ({ page }) => {
  // Navigate to login
  await page.goto(`${TEST_CONFIG.baseUrl}/login`);

  // Fill credentials
  await page.fill('[data-testid="email-input"]', "test@example.com");
  await page.fill('[data-testid="password-input"]', "TestPassword123!");

  // Submit login
  await page.click('[data-testid="login-button"]');

  // Verify redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
});
```

### Mock Authentication State

For tests that don't need full login flow:

```javascript
test("should access protected route", async ({ page }) => {
  // Mock authenticated state
  await page.evaluate(() => {
    localStorage.setItem("careflow_token", JSON.stringify("valid-test-token"));
  });

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
});
```

### Grant Browser Permissions

For notification tests:

```javascript
test.beforeEach(async ({ page }) => {
  // Grant notification permission
  await page.context().grantPermissions(["notifications"]);

  // Then login...
});
```

### Simulate Events

For testing real-time features:

```javascript
// Simulate incoming call
await page.evaluate(() => {
  window.dispatchEvent(
    new CustomEvent("incoming-call", {
      detail: { from: "+1234567890", callSid: "CA123" },
    }),
  );
});

// Simulate FCM message
await page.evaluate(() => {
  window.dispatchEvent(
    new CustomEvent("fcm-message", {
      detail: {
        notification: { title: "Missed Call", body: "From +1234567890" },
        data: { type: "missed_call", from: "+1234567890" },
      },
    }),
  );
});
```

### Network Interception

```javascript
// Mock API response
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

## Test Suites Reference

### 1. Authentication Tests (`auth.spec.js`)

Tests user authentication flows.

**Test Suites:**

- **User Registration**: Form display, validation, success/error flows
- **User Login**: Form display, valid/invalid credentials, redirect behavior
- **Password Reset**: Form display, email submission, validation
- **Session Management**: Persistence, expiration handling
- **User Logout**: Logout action, session clearing
- **Protected Routes**: Access control verification

**Example:**

```javascript
test("should login successfully", async ({ page }) => {
  await page.fill('[data-testid="email-input"]', "test@example.com");
  await page.fill('[data-testid="password-input"]', "TestPassword123!");
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL(/\/dashboard/);
});
```

### 2. Dashboard Tests (`dashboard.spec.js`)

Tests dashboard navigation and core functionality.

**Test Suites:**

- **Dashboard Navigation**: Tab switching, content display
- **Dialer Tab**: Dial pad, phone input, call initiation
- **Call History Tab**: List display, filtering, pagination
- **Recordings Tab**: List display, playback, download, delete
- **Analytics Tab**: Statistics, charts, date range
- **Call Controls**: Mute, hangup, status updates

### 3. WebRTC Tests (`webrtc.spec.js`)

Tests peer-to-peer calling functionality.

**Test Suites:**

- **Basic Connection Establishment**: P2P call setup, call rejection
- **Network Condition Simulations**: Slow 3G, disconnection, intermittent connectivity
- **ICE Candidate Handling**: ICE gathering, candidate exchange

**Example:**

```javascript
test("should establish P2P call", async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // Setup both users and establish call...
});
```

### 4. Twilio PSTN Tests (`twilio.spec.js`)

Tests Twilio Voice integration for PSTN calling.

**Test Suites:**

- **Call Initiation**: PSTN call setup, phone validation, call duration
- **DTMF Tones**: Sending tones during call, digit display
- **Call Controls**: Mute/unmute, hangup, control visibility
- **Incoming Calls**: Notification display, caller ID, accept/reject
- **Call Status Updates**: Connecting, ringing, connected, ended, error states
- **Call Quality Indicators**: Quality display, audio level, network warnings

**Example:**

```javascript
test("should initiate PSTN call", async ({ page }) => {
  await page.fill('[data-testid="phone-input"]', "+1234567890");
  await page.click('[data-testid="call-button"]');
  await expect(page.locator('[data-testid="call-status"]')).toBeVisible();
});
```

### 5. Notifications Tests (`notifications.spec.js`)

Tests push notification functionality.

**Test Suites:**

- **Notification Permissions**: Permission prompt, status display, denied state
- **FCM Token Registration**: Token registration, status, unregistration
- **Incoming Call Notifications**: Notification display, caller info, action handling
- **Missed Call Notifications**: Notification display, badge update, history
- **Voicemail Notifications**: Notification display, badge, navigation
- **Notification Preferences**: Toggle settings, save preferences
- **Notification Sound**: Sound toggle, test sound

**Example:**

```javascript
test("should show incoming call notification", async ({ page }) => {
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("fcm-message", {
        detail: {
          notification: { title: "Incoming Call", body: "From +1234567890" },
          data: { type: "incoming_call", from: "+1234567890" },
        },
      }),
    );
  });
  await expect(
    page.locator('[data-testid="incoming-call-modal"]'),
  ).toBeVisible();
});
```

### 6. Settings Tests (`settings.spec.js`)

Tests user settings and account management.

**Test Suites:**

- **Settings Navigation**: Page access, section display
- **Profile Management**: Display info, name update, photo upload/remove
- **Phone Number Configuration**: Number display, CareFlow ID, copy ID
- **Notification Preferences**: Toggle settings, save preferences
- **Account Settings**: Password change, account deletion
- **Storage Management**: Usage display, recording count, clear old recordings
- **Theme and Display**: Theme options, dark mode toggle
- **Logout**: Button visibility, logout action, confirmation

**Example:**

```javascript
test("should update display name", async ({ page }) => {
  await page.click('[data-testid="settings-tab"]');
  const nameInput = page.locator('[data-testid="display-name-input"]');
  await nameInput.clear();
  await nameInput.fill("Updated Name");
  await page.click('[data-testid="save-profile-button"]');
  await expect(page.locator("text=/saved|updated/i")).toBeVisible();
});
```

---

## Best Practices

### 1. Use Data TestIDs

```jsx
// Good - reliable selection
<button data-testid="call-button">Call</button>

// Avoid - fragile selection
<button className="bg-red-500 hover:bg-red-600">Call</button>
```

### 2. Wait for Async Operations

```javascript
// Good - explicit wait
await expect(page.locator('[data-testid="call-status"]')).toBeVisible({
  timeout: 5000,
});

// Avoid - arbitrary timeout
await page.waitForTimeout(5000);
```

### 3. Use Page Object Models

```javascript
// tests/e2e/pages/LoginPage.js
class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="email-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.loginButton = page.locator('[data-testid="login-button"]');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

### 4. Keep Tests Independent

```javascript
// Each test should work in isolation
test.beforeEach(async ({ page }) => {
  // Fresh login for each test
  await page.goto("/login");
  // ... login steps
});

test.afterEach(async ({ page }) => {
  // Cleanup if needed
});
```

### 5. Handle External Services

```javascript
// Mock external APIs
await page.route("**/api.twilio.com/**", (route) => {
  route.fulfill({ status: 200, body: "{}" });
});

// Mock Firebase
await page.route("**/firebaseio.com/**", (route) => {
  route.fulfill({ status: 200, body: "{}" });
});
```

---

## Troubleshooting

### Common Issues

#### 1. Timeout Errors

```javascript
// Increase timeout for slow operations
await expect(page.locator('[data-testid="element"]')).toBeVisible({
  timeout: 30000,
});
```

#### 2. Element Not Found

```javascript
// Check if element exists before interacting
const element = page.locator('[data-testid="optional-element"]');
if (await element.isVisible()) {
  await element.click();
}
```

#### 3. Flaky Tests

```javascript
// Use proper waits instead of fixed timeouts
await page.waitForLoadState("networkidle");
await page.waitForSelector('[data-testid="loaded-content"]');
```

#### 4. Authentication State Issues

```javascript
// Clear storage before tests
test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
});
```

### Debug Mode

```bash
# Run with debug mode
npx playwright test --debug

# Generate trace on failure
npx playwright test --trace on-first-retry

# View trace
npx playwright show-trace trace.zip
```

---

## Feature Test Coverage Matrix

| Feature              | Test File                             | Key Tests                                      |
| -------------------- | ------------------------------------- | ---------------------------------------------- |
| User Registration    | `auth.spec.js`                        | Form validation, success flow, duplicate email |
| User Login           | `auth.spec.js`                        | Valid/invalid credentials, redirect            |
| Password Reset       | `auth.spec.js`                        | Email submission, validation                   |
| Session Management   | `auth.spec.js`                        | Persistence, expiration                        |
| Dashboard Navigation | `dashboard.spec.js`                   | Tab switching, content display                 |
| Dial Pad             | `dashboard.spec.js`                   | Input, clear, backspace                        |
| Call History         | `dashboard.spec.js`                   | List, filter, search, pagination               |
| Recordings           | `dashboard.spec.js`                   | Play, download, delete                         |
| Analytics            | `dashboard.spec.js`                   | Stats, charts, date range                      |
| WebRTC Calls         | `webrtc.spec.js`                      | P2P connection, network conditions             |
| Twilio PSTN Calls    | `twilio.spec.js`                      | Call initiation, DTMF, controls                |
| Incoming Calls       | `twilio.spec.js`                      | Notification, accept, reject                   |
| Push Notifications   | `notifications.spec.js`               | Permissions, FCM, handling                     |
| User Settings        | `settings.spec.js`                    | Profile, preferences, account                  |
| Call Controls        | `dashboard.spec.js`, `twilio.spec.js` | Mute, hangup, status                           |

---

## Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: E2E Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test
        env:
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Next Steps

1. Add `data-testid` attributes to remaining components
2. Create page object models for complex flows
3. Add visual regression tests
4. Set up parallel test execution
5. Configure test result reporting
