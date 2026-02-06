/**
 * CareFlow E2E Tests - Dashboard and Recording Features
 */

import { test, expect } from "@playwright/test";

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for dashboard tests
    await page.addInitScript(() => {
      window.localStorage.setItem("careflow_token", "mock_token");
      window.localStorage.setItem(
        "careflow_user",
        JSON.stringify({
          uid: "test-user-id",
          email: "test@example.com",
          displayName: "Test User",
          care4wId: "care4w-1000001",
        }),
      );
    });
    await page.goto("/dashboard");
  });

  test("should display dashboard layout", async ({ page }) => {
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("should show navigation tabs", async ({ page }) => {
    await expect(page.locator("text=Dialer")).toBeVisible();
    await expect(page.locator("text=History")).toBeVisible();
    await expect(page.locator("text=Recordings")).toBeVisible();
  });

  test("should navigate between tabs", async ({ page }) => {
    await page.click("text=History");
    await expect(page.locator("text=Call History")).toBeVisible();

    await page.click("text=Recordings");
    await expect(
      page.locator("text=Manage your WebRTC call recordings"),
    ).toBeVisible();
  });
});

test.describe("Call Controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("careflow_token", "mock_token");
      window.localStorage.setItem(
        "careflow_user",
        JSON.stringify({
          uid: "test-user-id",
          email: "test@example.com",
          displayName: "Test User",
          care4wId: "care4w-1000001",
        }),
      );
    });
    await page.goto("/dashboard");
  });

  test("should display dial pad", async ({ page }) => {
    await expect(page.locator('button:has-text("1")')).toBeVisible();
    await expect(page.locator('button:has-text("2")')).toBeVisible();
    await expect(page.locator('button:has-text("3")')).toBeVisible();
  });

  test("should accept phone number input", async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill("1234567890");
    await expect(phoneInput).toHaveValue("1234567890");
  });

  test("should display call button", async ({ page }) => {
    await expect(page.locator('button:has-text("Call")')).toBeVisible();
  });
});

test.describe("Recordings Manager", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("careflow_token", "mock_token");
      window.localStorage.setItem(
        "careflow_user",
        JSON.stringify({
          uid: "test-user-id",
          email: "test@example.com",
          displayName: "Test User",
          care4wId: "care4w-1000001",
        }),
      );
    });
    await page.goto("/dashboard");
    await page.click("text=Recordings");
  });

  test("should display recordings manager", async ({ page }) => {
    await expect(page.locator("text=Recordings")).toBeVisible();
    await expect(
      page.locator("text=Manage your WebRTC call recordings"),
    ).toBeVisible();
  });

  test("should display filter options", async ({ page }) => {
    await expect(page.locator("select")).toHaveCount(3); // type, direction, status
  });

  test("should display refresh button", async ({ page }) => {
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });
});

test.describe("Accessibility", () => {
  test("should have proper ARIA labels on login page", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute("aria-label", /email/i);
  });

  test("should be keyboard navigable", async ({ page }) => {
    await page.goto("/login");
    await page.keyboard.press("Tab");
    await expect(page.locator('input[type="email"]')).toBeFocused();
  });
});
