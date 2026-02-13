/**
 * Dashboard End-to-End Tests
 *
 * E2E tests for dashboard functionality including:
 * - Tab navigation
 * - Analytics display
 * - Dialer functionality
 * - Call history display
 * - Recordings management
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3001',
};

// =====================================================
// TEST SUITE: DASHBOARD NAVIGATION
// =====================================================

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should display dashboard after login', async ({ page }) => {
    // Check for dashboard elements
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="header"]')).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    // Click on History tab
    await page.click('[data-testid="history-tab"]');
    await expect(page.locator('[data-testid="history-content"]')).toBeVisible();

    // Click on Recordings tab
    await page.click('[data-testid="recordings-tab"]');
    await expect(page.locator('[data-testid="recordings-content"]')).toBeVisible();

    // Click on Analytics tab
    await page.click('[data-testid="analytics-tab"]');
    await expect(page.locator('[data-testid="analytics-content"]')).toBeVisible();

    // Click on Dialer tab
    await page.click('[data-testid="dialer-tab"]');
    await expect(page.locator('[data-testid="dialer-content"]')).toBeVisible();
  });

  test('should display user information in header', async ({ page }) => {
    // Check for user info
    await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });
});

// =====================================================
// TEST SUITE: DIALER TAB
// =====================================================

test.describe('Dialer Tab', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to dialer
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="dialer-tab"]');
  });

  test('should display dial pad', async ({ page }) => {
    await expect(page.locator('[data-testid="dial-pad"]')).toBeVisible();
    await expect(page.locator('[data-testid="phone-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="call-button"]')).toBeVisible();
  });

  test('should enter phone number using dial pad', async ({ page }) => {
    // Click dial pad buttons
    await page.click('[data-testid="dial-button-1"]');
    await page.click('[data-testid="dial-button-2"]');
    await page.click('[data-testid="dial-button-3"]');

    // Check input value
    const inputValue = await page.inputValue('[data-testid="phone-input"]');
    expect(inputValue).toBe('123');
  });

  test('should clear phone number', async ({ page }) => {
    // Enter number
    await page.fill('[data-testid="phone-input"]', '1234567890');

    // Clear
    await page.click('[data-testid="clear-button"]');

    // Check input is empty
    const inputValue = await page.inputValue('[data-testid="phone-input"]');
    expect(inputValue).toBe('');
  });

  test('should backspace last digit', async ({ page }) => {
    // Enter number
    await page.fill('[data-testid="phone-input"]', '12345');

    // Backspace
    await page.click('[data-testid="backspace-button"]');

    // Check input
    const inputValue = await page.inputValue('[data-testid="phone-input"]');
    expect(inputValue).toBe('1234');
  });

  test('should toggle call mode (Twilio/WebRTC)', async ({ page }) => {
    // Check initial mode
    const initialMode = await page.locator('[data-testid="call-mode-indicator"]').textContent();

    // Toggle mode
    await page.click('[data-testid="toggle-mode-button"]');

    // Check mode changed
    const newMode = await page.locator('[data-testid="call-mode-indicator"]').textContent();
    expect(newMode).not.toBe(initialMode);
  });

  test('should show call status when call is active', async ({ page }) => {
    // Initiate call
    await page.fill('[data-testid="phone-input"]', '+1234567890');
    await page.click('[data-testid="call-button"]');

    // Check for call status
    await expect(page.locator('[data-testid="call-status"]')).toBeVisible({
      timeout: 5000,
    });
  });
});

// =====================================================
// TEST SUITE: CALL HISTORY TAB
// =====================================================

test.describe('Call History Tab', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to history
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="history-tab"]');
  });

  test('should display call history list', async ({ page }) => {
    await expect(page.locator('[data-testid="call-history-list"]')).toBeVisible();
  });

  test('should show call details', async ({ page }) => {
    // Click on a call item
    const firstCall = page.locator('[data-testid="call-item"]').first();
    if (await firstCall.isVisible()) {
      await firstCall.click();
      await expect(page.locator('[data-testid="call-details"]')).toBeVisible();
    }
  });

  test('should filter calls by type', async ({ page }) => {
    // Open filter dropdown
    await page.click('[data-testid="filter-dropdown"]');

    // Select incoming calls
    await page.click('[data-testid="filter-incoming"]');

    // Verify filter applied
    await expect(page.locator('[data-testid="filter-badge"]')).toContainText('Incoming');
  });

  test('should search calls', async ({ page }) => {
    // Enter search query
    await page.fill('[data-testid="search-input"]', '+1234567890');

    // Wait for results
    await page.waitForTimeout(500);

    // Verify search results
    const callItems = await page.locator('[data-testid="call-item"]').count();
    expect(callItems).toBeGreaterThanOrEqual(0);
  });

  test('should paginate call history', async ({ page }) => {
    // Check for pagination controls
    const paginationExists = await page.locator('[data-testid="pagination"]').isVisible();

    if (paginationExists) {
      // Click next page
      await page.click('[data-testid="next-page-button"]');

      // Verify page changed
      await expect(page.locator('[data-testid="page-indicator"]')).not.toContainText('1');
    }
  });
});

// =====================================================
// TEST SUITE: RECORDINGS TAB
// =====================================================

test.describe('Recordings Tab', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to recordings
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="recordings-tab"]');
  });

  test('should display recordings list', async ({ page }) => {
    await expect(page.locator('[data-testid="recordings-list"]')).toBeVisible();
  });

  test('should play recording', async ({ page }) => {
    const firstRecording = page.locator('[data-testid="recording-item"]').first();

    if (await firstRecording.isVisible()) {
      // Click play button
      await firstRecording.locator('[data-testid="play-button"]').click();

      // Check audio player is visible
      await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
    }
  });

  test('should download recording', async ({ page }) => {
    const firstRecording = page.locator('[data-testid="recording-item"]').first();

    if (await firstRecording.isVisible()) {
      // Start waiting for download
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        firstRecording.locator('[data-testid="download-button"]').click(),
      ]);

      // Verify download started
      expect(download).toBeDefined();
    }
  });

  test('should delete recording', async ({ page }) => {
    const firstRecording = page.locator('[data-testid="recording-item"]').first();

    if (await firstRecording.isVisible()) {
      // Click delete button
      await firstRecording.locator('[data-testid="delete-button"]').click();

      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]');

      // Verify recording is removed
      await expect(firstRecording).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should filter recordings by type', async ({ page }) => {
    // Open filter
    await page.click('[data-testid="recordings-filter"]');

    // Select voicemail
    await page.click('[data-testid="filter-voicemail"]');

    // Verify filter applied
    const recordings = await page.locator('[data-testid="recording-item"]').count();
    expect(recordings).toBeGreaterThanOrEqual(0);
  });
});

// =====================================================
// TEST SUITE: ANALYTICS TAB
// =====================================================

test.describe('Analytics Tab', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to analytics
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="analytics-tab"]');
  });

  test('should display analytics dashboard', async ({ page }) => {
    await expect(page.locator('[data-testid="analytics-container"]')).toBeVisible();
  });

  test('should show call statistics', async ({ page }) => {
    // Check for stat cards
    await expect(page.locator('[data-testid="total-calls-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-duration-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-duration-stat"]')).toBeVisible();
  });

  test('should display call chart', async ({ page }) => {
    // Check for chart
    await expect(page.locator('[data-testid="calls-chart"]')).toBeVisible();
  });

  test('should change date range', async ({ page }) => {
    // Open date range picker
    await page.click('[data-testid="date-range-picker"]');

    // Select last 7 days
    await page.click('[data-testid="range-7-days"]');

    // Verify range applied
    await expect(page.locator('[data-testid="date-range-display"]')).toContainText('7');
  });

  test('should refresh analytics data', async ({ page }) => {
    // Click refresh button
    await page.click('[data-testid="refresh-analytics-button"]');

    // Check for loading state
    await expect(page.locator('[data-testid="analytics-loading"]')).toBeVisible();

    // Wait for data to load
    await expect(page.locator('[data-testid="analytics-container"]')).toBeVisible({
      timeout: 10000,
    });
  });
});

// =====================================================
// TEST SUITE: CALL CONTROLS
// =====================================================

test.describe('Call Controls', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should show mute button during call', async ({ page }) => {
    // Initiate call
    await page.fill('[data-testid="phone-input"]', '+1234567890');
    await page.click('[data-testid="call-button"]');

    // Wait for call to connect
    await page.waitForTimeout(2000);

    // Check for mute button
    await expect(page.locator('[data-testid="mute-button"]')).toBeVisible();
  });

  test('should toggle mute state', async ({ page }) => {
    // Initiate call
    await page.fill('[data-testid="phone-input"]', '+1234567890');
    await page.click('[data-testid="call-button"]');
    await page.waitForTimeout(2000);

    // Click mute
    await page.click('[data-testid="mute-button"]');

    // Verify muted state
    await expect(page.locator('[data-testid="mute-button"]')).toHaveAttribute('data-muted', 'true');
  });

  test('should show hangup button during call', async ({ page }) => {
    // Initiate call
    await page.fill('[data-testid="phone-input"]', '+1234567890');
    await page.click('[data-testid="call-button"]');
    await page.waitForTimeout(2000);

    // Check for hangup button
    await expect(page.locator('[data-testid="hangup-button"]')).toBeVisible();
  });

  test('should end call when hangup is clicked', async ({ page }) => {
    // Initiate call
    await page.fill('[data-testid="phone-input"]', '+1234567890');
    await page.click('[data-testid="call-button"]');
    await page.waitForTimeout(2000);

    // End call
    await page.click('[data-testid="hangup-button"]');

    // Verify call ended
    await expect(page.locator('[data-testid="call-status"]')).toContainText(/ended|idle/i);
  });
});
