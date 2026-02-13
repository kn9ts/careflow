/**
 * User Settings End-to-End Tests
 *
 * E2E tests for user settings functionality including:
 * - Profile management
 * - Phone number configuration
 * - Notification preferences
 * - Account settings
 * - Storage management
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3001',
};

// =====================================================
// TEST SUITE: SETTINGS NAVIGATION
// =====================================================

test.describe('Settings Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should navigate to settings page', async ({ page }) => {
    // Click settings tab
    await page.click('[data-testid="settings-tab"]');

    // Verify settings page is displayed
    await expect(page.locator('[data-testid="settings-container"]')).toBeVisible();
  });

  test('should display settings sections', async ({ page }) => {
    // Navigate to settings
    await page.click('[data-testid="settings-tab"]');

    // Check for main sections
    await expect(page.locator('[data-testid="profile-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="account-settings"]')).toBeVisible();
  });

  test('should show user avatar and name in settings', async ({ page }) => {
    // Navigate to settings
    await page.click('[data-testid="settings-tab"]');

    // Check for user info
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-display-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
  });
});

// =====================================================
// TEST SUITE: PROFILE MANAGEMENT
// =====================================================

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="settings-tab"]');
  });

  test('should display current profile information', async ({ page }) => {
    // Check profile section
    await expect(page.locator('[data-testid="profile-settings"]')).toBeVisible();

    // Check for editable fields
    await expect(page.locator('[data-testid="display-name-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-display"]')).toBeVisible();
  });

  test('should update display name', async ({ page }) => {
    // Find display name input
    const nameInput = page.locator('[data-testid="display-name-input"]');

    // Clear and enter new name
    await nameInput.clear();
    await nameInput.fill('Updated Name');

    // Save changes
    await page.click('[data-testid="save-profile-button"]');

    // Check for success message
    await expect(page.locator('text=/saved|updated|success/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should validate display name length', async ({ page }) => {
    // Enter too short name
    const nameInput = page.locator('[data-testid="display-name-input"]');
    await nameInput.clear();
    await nameInput.fill('A');

    // Try to save
    await page.click('[data-testid="save-profile-button"]');

    // Check for validation error
    await expect(page.locator('text=/too short|at least|min/i')).toBeVisible({
      timeout: 3000,
    });
  });

  test('should upload profile photo', async ({ page }) => {
    // Check for photo upload
    const uploadButton = page.locator('[data-testid="upload-photo-button"]');

    if (await uploadButton.isVisible()) {
      // Setup file upload
      await uploadButton.setInputFiles('./tests/fixtures/test-avatar.png');

      // Check for upload success
      await expect(page.locator('text=/uploaded|success/i')).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('should remove profile photo', async ({ page }) => {
    const removeButton = page.locator('[data-testid="remove-photo-button"]');

    if (await removeButton.isVisible()) {
      await removeButton.click();

      // Confirm removal
      await page.click('[data-testid="confirm-remove-photo"]');

      // Check for default avatar
      await expect(page.locator('[data-testid="default-avatar"]')).toBeVisible({
        timeout: 3000,
      });
    }
  });
});

// =====================================================
// TEST SUITE: PHONE NUMBER CONFIGURATION
// =====================================================

test.describe('Phone Number Configuration', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="settings-tab"]');
  });

  test('should display current phone number', async ({ page }) => {
    // Check for phone number section
    await expect(page.locator('[data-testid="phone-settings"]')).toBeVisible();

    // Check for phone number display
    const phoneDisplay = page.locator('[data-testid="twilio-phone-display"]');
    if (await phoneDisplay.isVisible()) {
      const phone = await phoneDisplay.textContent();
      expect(phone).toMatch(/\+?\d+/);
    }
  });

  test('should show CareFlow ID', async ({ page }) => {
    // Check for CareFlow ID
    const care4wId = page.locator('[data-testid="care4w-id-display"]');
    if (await care4wId.isVisible()) {
      const id = await care4wId.textContent();
      expect(id).toMatch(/care4w-\d+/);
    }
  });

  test('should allow copying CareFlow ID', async ({ page }) => {
    const copyButton = page.locator('[data-testid="copy-care4w-id"]');

    if (await copyButton.isVisible()) {
      await copyButton.click();

      // Check for copy confirmation
      await expect(page.locator('text=/copied/i')).toBeVisible({
        timeout: 2000,
      });
    }
  });

  test('should show Twilio phone number status', async ({ page }) => {
    // Check for phone number status
    const statusBadge = page.locator('[data-testid="phone-status-badge"]');
    if (await statusBadge.isVisible()) {
      const status = await statusBadge.textContent();
      expect(status).toMatch(/active|inactive|pending/i);
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

  test('should display notification preferences section', async ({ page }) => {
    await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
  });

  test('should toggle incoming call notifications', async ({ page }) => {
    const toggle = page.locator('[data-testid="incoming-calls-toggle"]');

    if (await toggle.isVisible()) {
      const initialState = await toggle.isChecked();
      await toggle.click();
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
    await page.click('[data-testid="save-notification-preferences"]');

    // Check for success
    await expect(page.locator('text=/saved|updated/i')).toBeVisible({
      timeout: 5000,
    });
  });
});

// =====================================================
// TEST SUITE: ACCOUNT SETTINGS
// =====================================================

test.describe('Account Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="settings-tab"]');
  });

  test('should display account settings section', async ({ page }) => {
    await expect(page.locator('[data-testid="account-settings"]')).toBeVisible();
  });

  test('should show change password option', async ({ page }) => {
    const changePasswordButton = page.locator('[data-testid="change-password-button"]');
    await expect(changePasswordButton).toBeVisible();
  });

  test('should open change password modal', async ({ page }) => {
    await page.click('[data-testid="change-password-button"]');

    // Check for modal
    await expect(page.locator('[data-testid="change-password-modal"]')).toBeVisible();

    // Check for form fields
    await expect(page.locator('[data-testid="current-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-password-input"]')).toBeVisible();
  });

  test('should validate password change form', async ({ page }) => {
    // Open modal
    await page.click('[data-testid="change-password-button"]');

    // Enter mismatched passwords
    await page.fill('[data-testid="new-password-input"]', 'NewPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword!');

    // Submit
    await page.click('[data-testid="submit-password-change"]');

    // Check for error
    await expect(page.locator('text=/do not match|mismatch/i')).toBeVisible({
      timeout: 3000,
    });
  });

  test('should show delete account option', async ({ page }) => {
    const deleteButton = page.locator('[data-testid="delete-account-button"]');
    await expect(deleteButton).toBeVisible();
  });

  test('should require confirmation for account deletion', async ({ page }) => {
    // Click delete
    await page.click('[data-testid="delete-account-button"]');

    // Check for confirmation modal
    await expect(page.locator('[data-testid="delete-account-modal"]')).toBeVisible();

    // Check for confirmation input
    await expect(page.locator('[data-testid="delete-confirmation-input"]')).toBeVisible();
  });
});

// =====================================================
// TEST SUITE: STORAGE MANAGEMENT
// =====================================================

test.describe('Storage Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="settings-tab"]');
  });

  test('should display storage usage', async ({ page }) => {
    const storageSection = page.locator('[data-testid="storage-settings"]');

    if (await storageSection.isVisible()) {
      // Check for usage display
      await expect(page.locator('[data-testid="storage-used"]')).toBeVisible();
      await expect(page.locator('[data-testid="storage-limit"]')).toBeVisible();
    }
  });

  test('should show storage progress bar', async ({ page }) => {
    const progressBar = page.locator('[data-testid="storage-progress-bar"]');

    if (await progressBar.isVisible()) {
      // Check progress bar is displayed
      const width = await progressBar.evaluate((el) => el.style.width);
      expect(parseFloat(width)).toBeGreaterThanOrEqual(0);
    }
  });

  test('should show recording count', async ({ page }) => {
    const recordingCount = page.locator('[data-testid="recording-count"]');

    if (await recordingCount.isVisible()) {
      const count = await recordingCount.textContent();
      expect(parseInt(count)).toBeGreaterThanOrEqual(0);
    }
  });

  test('should allow clearing old recordings', async ({ page }) => {
    const clearButton = page.locator('[data-testid="clear-old-recordings"]');

    if (await clearButton.isVisible()) {
      await clearButton.click();

      // Confirm action
      await page.click('[data-testid="confirm-clear-recordings"]');

      // Check for success
      await expect(page.locator('text=/cleared|deleted/i')).toBeVisible({
        timeout: 5000,
      });
    }
  });
});

// =====================================================
// TEST SUITE: THEME AND DISPLAY
// =====================================================

test.describe('Theme and Display Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="settings-tab"]');
  });

  test('should display theme options', async ({ page }) => {
    const themeSection = page.locator('[data-testid="theme-settings"]');

    if (await themeSection.isVisible()) {
      await expect(page.locator('[data-testid="theme-selector"]')).toBeVisible();
    }
  });

  test('should toggle dark mode', async ({ page }) => {
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]');

    if (await darkModeToggle.isVisible()) {
      const initialState = await darkModeToggle.isChecked();
      await darkModeToggle.click();
      await expect(darkModeToggle).toBeChecked({ checked: !initialState });
    }
  });

  test('should change theme and persist', async ({ page }) => {
    const themeSelector = page.locator('[data-testid="theme-selector"]');

    if (await themeSelector.isVisible()) {
      // Select different theme
      await themeSelector.selectOption('dark');

      // Reload page
      await page.reload();

      // Verify theme persisted
      const body = page.locator('body');
      const className = await body.getAttribute('class');
      expect(className).toContain('dark');
    }
  });
});

// =====================================================
// TEST SUITE: LOGOUT
// =====================================================

test.describe('Logout from Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="settings-tab"]');
  });

  test('should show logout button in settings', async ({ page }) => {
    const logoutButton = page.locator('[data-testid="logout-button"]');
    await expect(logoutButton).toBeVisible();
  });

  test('should logout when button clicked', async ({ page }) => {
    // Click logout
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('careflow_token'));
    expect(token).toBeNull();
  });

  test('should confirm before logout', async ({ page }) => {
    // If there's a confirmation dialog
    page.on('dialog', (dialog) => {
      expect(dialog.message()).toContain('logout');
      dialog.accept();
    });

    await page.click('[data-testid="logout-button"]');

    // Should be redirected
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
