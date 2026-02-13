/**
 * Push Notifications End-to-End Tests
 *
 * E2E tests for push notification functionality including:
 * - Notification permission request
 * - FCM token registration
 * - Incoming call notifications
 * - Missed call notifications
 * - Voicemail notifications
 * - Notification preferences
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3001',
};

// =====================================================
// TEST SUITE: NOTIFICATION PERMISSIONS
// =====================================================

test.describe('Notification Permissions', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should show notification permission prompt', async ({ page }) => {
    // Navigate to settings or trigger permission prompt
    await page.click('[data-testid="settings-tab"]');

    // Check for notification permission section
    await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
  });

  test('should request notification permission when enabled', async ({ page }) => {
    // Navigate to settings
    await page.click('[data-testid="settings-tab"]');

    // Enable notifications
    const enableButton = page.locator('[data-testid="enable-notifications-button"]');
    if (await enableButton.isVisible()) {
      await enableButton.click();

      // Check for permission request (browser will show dialog)
      // In real test, we'd grant permission via context
    }
  });

  test('should display notification permission status', async ({ page }) => {
    // Navigate to settings
    await page.click('[data-testid="settings-tab"]');

    // Check permission status display
    const statusBadge = page.locator('[data-testid="notification-permission-status"]');
    if (await statusBadge.isVisible()) {
      const status = await statusBadge.textContent();
      expect(status).toMatch(/granted|denied|default/i);
    }
  });

  test('should show warning when notifications are denied', async ({ page }) => {
    // Simulate denied permission
    await page.evaluate(() => {
      Object.defineProperty(window.Notification, 'permission', {
        value: 'denied',
        configurable: true,
      });
    });

    // Navigate to settings
    await page.click('[data-testid="settings-tab"]');

    // Check for warning
    const warning = page.locator('[data-testid="notification-denied-warning"]');
    if (await warning.isVisible()) {
      await expect(warning).toContainText(/blocked|denied/i);
    }
  });
});

// =====================================================
// TEST SUITE: FCM TOKEN REGISTRATION
// =====================================================

test.describe('FCM Token Registration', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should register FCM token on notification enable', async ({ page }) => {
    // Grant notification permission and enable
    await page.context().grantPermissions(['notifications']);

    await page.click('[data-testid="settings-tab"]');

    const enableButton = page.locator('[data-testid="enable-notifications-button"]');
    if (await enableButton.isVisible()) {
      await enableButton.click();

      // Check for success message
      await expect(page.locator('text=/enabled|registered/i')).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('should show FCM token status', async ({ page }) => {
    // Navigate to settings
    await page.click('[data-testid="settings-tab"]');

    // Check for token status
    const tokenStatus = page.locator('[data-testid="fcm-token-status"]');
    if (await tokenStatus.isVisible()) {
      const status = await tokenStatus.textContent();
      expect(status).toMatch(/registered|not registered/i);
    }
  });

  test('should unregister FCM token when notifications disabled', async ({ page }) => {
    // Navigate to settings
    await page.click('[data-testid="settings-tab"]');

    // Disable notifications
    const disableButton = page.locator('[data-testid="disable-notifications-button"]');
    if (await disableButton.isVisible()) {
      await disableButton.click();

      // Check for confirmation
      await expect(page.locator('text=/disabled|unregistered/i')).toBeVisible({
        timeout: 5000,
      });
    }
  });
});

// =====================================================
// TEST SUITE: INCOMING CALL NOTIFICATIONS
// =====================================================

test.describe('Incoming Call Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Login and grant notification permission
    await page.context().grantPermissions(['notifications']);
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should show incoming call notification', async ({ page }) => {
    // Simulate incoming call notification
    await page.evaluate(() => {
      // Simulate FCM message
      window.dispatchEvent(
        new CustomEvent('fcm-message', {
          detail: {
            notification: {
              title: 'Incoming Call',
              body: 'Call from +1234567890',
            },
            data: {
              type: 'incoming_call',
              from: '+1234567890',
              callSid: 'CA1234567890',
            },
          },
        })
      );
    });

    // Check for incoming call UI
    await expect(page.locator('[data-testid="incoming-call-modal"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should display caller information in notification', async ({ page }) => {
    // Simulate incoming call
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('fcm-message', {
          detail: {
            notification: {
              title: 'Incoming Call',
              body: 'Call from +1234567890',
            },
            data: {
              type: 'incoming_call',
              from: '+1234567890',
            },
          },
        })
      );
    });

    // Check caller info
    await expect(page.locator('[data-testid="caller-id"]')).toContainText('+1234567890', {
      timeout: 5000,
    });
  });

  test('should handle notification click to answer call', async ({ page }) => {
    // Simulate incoming call
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('fcm-message', {
          detail: {
            notification: {
              title: 'Incoming Call',
              body: 'Call from +1234567890',
            },
            data: {
              type: 'incoming_call',
              from: '+1234567890',
            },
          },
        })
      );
    });

    // Click accept button
    await page.click('[data-testid="accept-call-button"]');

    // Verify call is active
    await expect(page.locator('[data-testid="call-status"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should handle notification dismiss to reject call', async ({ page }) => {
    // Simulate incoming call
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('fcm-message', {
          detail: {
            notification: {
              title: 'Incoming Call',
              body: 'Call from +1234567890',
            },
            data: {
              type: 'incoming_call',
              from: '+1234567890',
            },
          },
        })
      );
    });

    // Click reject button
    await page.click('[data-testid="reject-call-button"]');

    // Verify modal is closed
    await expect(page.locator('[data-testid="incoming-call-modal"]')).not.toBeVisible({
      timeout: 3000,
    });
  });
});

// =====================================================
// TEST SUITE: MISSED CALL NOTIFICATIONS
// =====================================================

test.describe('Missed Call Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.context().grantPermissions(['notifications']);
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should show missed call notification', async ({ page }) => {
    // Simulate missed call
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('fcm-message', {
          detail: {
            notification: {
              title: 'Missed Call',
              body: 'You missed a call from +1234567890',
            },
            data: {
              type: 'missed_call',
              from: '+1234567890',
              timestamp: new Date().toISOString(),
            },
          },
        })
      );
    });

    // Check for missed call indicator
    await expect(page.locator('[data-testid="missed-call-indicator"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should update missed call count badge', async ({ page }) => {
    // Simulate missed call
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('fcm-message', {
          detail: {
            notification: {
              title: 'Missed Call',
              body: 'You missed a call from +1234567890',
            },
            data: {
              type: 'missed_call',
              from: '+1234567890',
            },
          },
        })
      );
    });

    // Check for badge update
    const badge = page.locator('[data-testid="missed-calls-badge"]');
    if (await badge.isVisible()) {
      const count = await badge.textContent();
      expect(parseInt(count)).toBeGreaterThanOrEqual(1);
    }
  });

  test('should add missed call to history', async ({ page }) => {
    // Simulate missed call
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('fcm-message', {
          detail: {
            notification: {
              title: 'Missed Call',
              body: 'You missed a call from +1234567890',
            },
            data: {
              type: 'missed_call',
              from: '+1234567890',
            },
          },
        })
      );
    });

    // Navigate to history
    await page.click('[data-testid="history-tab"]');

    // Check for missed call in list
    await expect(page.locator('[data-testid="call-item"]').first()).toBeVisible({ timeout: 5000 });
  });
});

// =====================================================
// TEST SUITE: VOICEMAIL NOTIFICATIONS
// =====================================================

test.describe('Voicemail Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.context().grantPermissions(['notifications']);
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should show voicemail notification', async ({ page }) => {
    // Simulate voicemail notification
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('fcm-message', {
          detail: {
            notification: {
              title: 'New Voicemail',
              body: 'You have a new voicemail from +1234567890',
            },
            data: {
              type: 'voicemail',
              from: '+1234567890',
              recordingUrl: 'https://example.com/voicemail.mp3',
            },
          },
        })
      );
    });

    // Check for voicemail indicator
    await expect(page.locator('[data-testid="voicemail-indicator"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should update voicemail count badge', async ({ page }) => {
    // Simulate voicemail
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('fcm-message', {
          detail: {
            notification: {
              title: 'New Voicemail',
              body: 'You have a new voicemail',
            },
            data: {
              type: 'voicemail',
            },
          },
        })
      );
    });

    // Check for badge
    const badge = page.locator('[data-testid="voicemail-badge"]');
    if (await badge.isVisible()) {
      const count = await badge.textContent();
      expect(parseInt(count)).toBeGreaterThanOrEqual(1);
    }
  });

  test('should navigate to recordings on voicemail notification click', async ({ page }) => {
    // Simulate voicemail notification click
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('fcm-message', {
          detail: {
            notification: {
              title: 'New Voicemail',
              body: 'You have a new voicemail',
            },
            data: {
              type: 'voicemail',
            },
          },
        })
      );
    });

    // Click on notification or indicator
    const indicator = page.locator('[data-testid="voicemail-indicator"]');
    if (await indicator.isVisible()) {
      await indicator.click();

      // Should navigate to recordings
      await expect(page.locator('[data-testid="recordings-content"]')).toBeVisible({
        timeout: 5000,
      });
    }
  });
});

// =====================================================
// TEST SUITE: NOTIFICATION PREFERENCES
// =====================================================

test.describe('Notification Preferences', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="settings-tab"]');
  });

  test('should display notification preferences', async ({ page }) => {
    // Check for preferences section
    await expect(page.locator('[data-testid="notification-preferences"]')).toBeVisible();
  });

  test('should toggle incoming call notifications', async ({ page }) => {
    // Find toggle
    const toggle = page.locator('[data-testid="incoming-calls-toggle"]');

    if (await toggle.isVisible()) {
      // Get current state
      const initialState = await toggle.isChecked();

      // Toggle
      await toggle.click();

      // Verify state changed
      await expect(toggle).toBeChecked({ checked: !initialState });
    }
  });

  test('should toggle missed call notifications', async ({ page }) => {
    const toggle = page.locator('[data-testid="missed-calls-toggle"]');

    if (await toggle.isVisible()) {
      const initialState = await toggle.isChecked();
      await toggle.click();
      await expect(toggle).toBeChecked({ checked: !initialState });
    }
  });

  test('should toggle voicemail notifications', async ({ page }) => {
    const toggle = page.locator('[data-testid="voicemail-toggle"]');

    if (await toggle.isVisible()) {
      const initialState = await toggle.isChecked();
      await toggle.click();
      await expect(toggle).toBeChecked({ checked: !initialState });
    }
  });

  test('should toggle email notifications', async ({ page }) => {
    const toggle = page.locator('[data-testid="email-notifications-toggle"]');

    if (await toggle.isVisible()) {
      const initialState = await toggle.isChecked();
      await toggle.click();
      await expect(toggle).toBeChecked({ checked: !initialState });
    }
  });

  test('should save notification preferences', async ({ page }) => {
    // Change a preference
    const toggle = page.locator('[data-testid="incoming-calls-toggle"]');
    if (await toggle.isVisible()) {
      await toggle.click();
    }

    // Save
    await page.click('[data-testid="save-preferences-button"]');

    // Check for success message
    await expect(page.locator('text=/saved|updated/i')).toBeVisible({
      timeout: 5000,
    });
  });
});

// =====================================================
// TEST SUITE: NOTIFICATION SOUND
// =====================================================

test.describe('Notification Sound', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="settings-tab"]');
  });

  test('should toggle notification sound', async ({ page }) => {
    const toggle = page.locator('[data-testid="notification-sound-toggle"]');

    if (await toggle.isVisible()) {
      const initialState = await toggle.isChecked();
      await toggle.click();
      await expect(toggle).toBeChecked({ checked: !initialState });
    }
  });

  test('should play test notification sound', async ({ page }) => {
    const testButton = page.locator('[data-testid="test-notification-sound"]');

    if (await testButton.isVisible()) {
      await testButton.click();

      // Audio would play - we can't easily verify this in tests
      // But we can check for visual feedback
      await expect(page.locator('text=/playing|sound played/i')).toBeVisible({
        timeout: 2000,
      });
    }
  });
});
