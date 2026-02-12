/**
 * Authentication End-to-End Tests
 *
 * E2E tests for user authentication flows including:
 * - User registration
 * - Login
 * - Password reset
 * - Session management
 * - Logout
 */

const { test, expect } = require("@playwright/test");

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.E2E_BASE_URL || "http://localhost:3001",
  testEmail: `test-${Date.now()}@example.com`,
  testPassword: "TestPassword123!",
};

// =====================================================
// TEST SUITE: REGISTRATION
// =====================================================

test.describe("User Registration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/signup`);
  });

  test("should display registration form", async ({ page }) => {
    // Check for form elements
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="signup-button"]')).toBeVisible();
  });

  test("should show validation errors for invalid inputs", async ({ page }) => {
    // Submit empty form
    await page.click('[data-testid="signup-button"]');

    // Check for validation messages
    await expect(page.locator("text=/email is required/i")).toBeVisible();
  });

  test("should register new user successfully", async ({ page }) => {
    // Fill registration form
    await page.fill('[data-testid="email-input"]', TEST_CONFIG.testEmail);
    await page.fill('[data-testid="password-input"]', TEST_CONFIG.testPassword);
    await page.fill('[data-testid="display-name-input"]', "Test User");

    // Submit form
    await page.click('[data-testid="signup-button"]');

    // Should redirect to dashboard or show success
    await expect(page).toHaveURL(/\/dashboard|\/login/, { timeout: 10000 });
  });

  test("should show error for existing email", async ({ page }) => {
    // Try to register with existing email
    await page.fill('[data-testid="email-input"]', "existing@example.com");
    await page.fill('[data-testid="password-input"]', TEST_CONFIG.testPassword);

    await page.click('[data-testid="signup-button"]');

    // Should show error message
    await expect(page.locator("text=/already exists|in use/i")).toBeVisible({
      timeout: 5000,
    });
  });
});

// =====================================================
// TEST SUITE: LOGIN
// =====================================================

test.describe("User Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
  });

  test("should display login form", async ({ page }) => {
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    // Fill login form (use test account)
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "TestPassword123!");

    // Submit form
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("should show error for invalid credentials", async ({ page }) => {
    // Fill with wrong credentials
    await page.fill('[data-testid="email-input"]', "wrong@example.com");
    await page.fill('[data-testid="password-input"]', "WrongPassword123!");

    await page.click('[data-testid="login-button"]');

    // Should show error message
    await expect(page.locator("text=/invalid|incorrect|failed/i")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should redirect to dashboard if already authenticated", async ({
    page,
  }) => {
    // Mock authenticated state
    await page.evaluate(() => {
      localStorage.setItem(
        "careflow_token",
        JSON.stringify("valid-test-token"),
      );
    });

    await page.goto(`${TEST_CONFIG.baseUrl}/login`);

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });
});

// =====================================================
// TEST SUITE: PASSWORD RESET
// =====================================================

test.describe("Password Reset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/forgot-password`);
  });

  test("should display password reset form", async ({ page }) => {
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="reset-button"]')).toBeVisible();
  });

  test("should send password reset email", async ({ page }) => {
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.click('[data-testid="reset-button"]');

    // Should show success message
    await expect(
      page.locator("text=/email sent|check your email/i"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show error for invalid email format", async ({ page }) => {
    await page.fill('[data-testid="email-input"]', "invalid-email");
    await page.click('[data-testid="reset-button"]');

    // Should show validation error
    await expect(page.locator("text=/valid email/i")).toBeVisible();
  });
});

// =====================================================
// TEST SUITE: SESSION MANAGEMENT
// =====================================================

test.describe("Session Management", () => {
  test("should persist session across page reloads", async ({ page }) => {
    // Login first
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "TestPassword123!");
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Reload page
    await page.reload();

    // Should still be on dashboard (authenticated)
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should redirect to login when session expires", async ({ page }) => {
    // Mock expired session
    await page.evaluate(() => {
      localStorage.setItem("careflow_token", JSON.stringify("expired-token"));
    });

    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

// =====================================================
// TEST SUITE: LOGOUT
// =====================================================

test.describe("User Logout", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "TestPassword123!");
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("should logout successfully", async ({ page }) => {
    // Click logout button
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Token should be cleared
    const token = await page.evaluate(() => {
      return localStorage.getItem("careflow_token");
    });
    expect(token).toBeNull();
  });

  test("should clear all session data on logout", async ({ page }) => {
    await page.click('[data-testid="logout-button"]');

    // Check localStorage is cleared
    const localStorageKeys = await page.evaluate(() => {
      return Object.keys(localStorage);
    });

    expect(localStorageKeys.length).toBe(0);
  });
});

// =====================================================
// TEST SUITE: PROTECTED ROUTES
// =====================================================

test.describe("Protected Routes", () => {
  test("should redirect unauthenticated users to login", async ({ page }) => {
    // Try to access protected route
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("should allow authenticated users to access protected routes", async ({
    page,
  }) => {
    // Login first
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "TestPassword123!");
    await page.click('[data-testid="login-button"]');

    // Should be on dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});
