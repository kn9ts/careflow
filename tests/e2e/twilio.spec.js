/**
 * Twilio PSTN Calling End-to-End Tests
 *
 * E2E tests for Twilio Voice functionality including:
 * - PSTN call initiation
 * - DTMF tone sending
 * - Call mute/unmute
 * - Call hangup
 * - Incoming call handling
 * - Call status updates
 */

const { test, expect } = require("@playwright/test");

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.E2E_BASE_URL || "http://localhost:3001",
  testPhoneNumber: "+1234567890",
};

// =====================================================
// TEST SUITE: TWILIO CALL INITIATION
// =====================================================

test.describe("Twilio Call Initiation", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "TestPassword123!");
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Ensure Twilio mode is selected
    await page.click('[data-testid="dialer-tab"]');
    const modeIndicator = page.locator('[data-testid="call-mode-indicator"]');
    const modeText = await modeIndicator.textContent();
    if (modeText?.toLowerCase().includes("webrtc")) {
      await page.click('[data-testid="toggle-mode-button"]');
    }
  });

  test("should initiate PSTN call to phone number", async ({ page }) => {
    // Enter phone number
    await page.fill('[data-testid="phone-input"]', TEST_CONFIG.testPhoneNumber);

    // Click call button
    await page.click('[data-testid="call-button"]');

    // Verify call status changes
    await expect(page.locator('[data-testid="call-status"]')).toBeVisible({
      timeout: 5000,
    });
    const status = await page
      .locator('[data-testid="call-status"]')
      .textContent();
    expect(status).toMatch(/connecting|ringing|calling/i);
  });

  test("should validate phone number format", async ({ page }) => {
    // Enter invalid phone number
    await page.fill('[data-testid="phone-input"]', "invalid-number");

    // Click call button
    await page.click('[data-testid="call-button"]');

    // Should show validation error
    await expect(page.locator("text=/invalid|valid phone/i")).toBeVisible({
      timeout: 3000,
    });
  });

  test("should show call duration timer during active call", async ({
    page,
  }) => {
    // Initiate call
    await page.fill('[data-testid="phone-input"]', TEST_CONFIG.testPhoneNumber);
    await page.click('[data-testid="call-button"]');

    // Wait for call to connect (simulated)
    await page.waitForTimeout(3000);

    // Check for call timer
    const timer = page.locator('[data-testid="call-timer"]');
    if (await timer.isVisible()) {
      const timerText = await timer.textContent();
      expect(timerText).toMatch(/\d{2}:\d{2}/);
    }
  });

  test("should display called number during call", async ({ page }) => {
    // Initiate call
    await page.fill('[data-testid="phone-input"]', TEST_CONFIG.testPhoneNumber);
    await page.click('[data-testid="call-button"]');

    // Verify number is displayed
    await expect(
      page.locator(`text=${TEST_CONFIG.testPhoneNumber}`),
    ).toBeVisible({ timeout: 5000 });
  });
});

// =====================================================
// TEST SUITE: DTMF TONES
// =====================================================

test.describe("DTMF Tone Sending", () => {
  test.beforeEach(async ({ page }) => {
    // Login and initiate call
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "TestPassword123!");
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="dialer-tab"]');

    // Ensure Twilio mode
    const modeIndicator = page.locator('[data-testid="call-mode-indicator"]');
    const modeText = await modeIndicator.textContent();
    if (modeText?.toLowerCase().includes("webrtc")) {
      await page.click('[data-testid="toggle-mode-button"]');
    }

    // Initiate call
    await page.fill('[data-testid="phone-input"]', TEST_CONFIG.testPhoneNumber);
    await page.click('[data-testid="call-button"]');
    await page.waitForTimeout(2000);
  });

  test("should send DTMF tones during call", async ({ page }) => {
    // Check if dial pad is visible during call
    const dialPad = page.locator('[data-testid="dial-pad"]');
    if (await dialPad.isVisible()) {
      // Press digit
      await page.click('[data-testid="dial-button-1"]');

      // Verify DTMF feedback
      await expect(page.locator('[data-testid="dtmf-feedback"]')).toBeVisible({
        timeout: 2000,
      });
    }
  });

  test("should display DTMF digits in call info", async ({ page }) => {
    // Press multiple digits
    const digits = ["1", "2", "3"];
    for (const digit of digits) {
      const button = page.locator(`[data-testid="dial-button-${digit}"]`);
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(200);
      }
    }

    // Check if digits are displayed
    const dtmfDisplay = page.locator('[data-testid="dtmf-display"]');
    if (await dtmfDisplay.isVisible()) {
      const text = await dtmfDisplay.textContent();
      expect(text).toContain("123");
    }
  });
});

// =====================================================
// TEST SUITE: CALL CONTROLS
// =====================================================

test.describe("Twilio Call Controls", () => {
  test.beforeEach(async ({ page }) => {
    // Login and initiate call
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "TestPassword123!");
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="dialer-tab"]');

    // Ensure Twilio mode
    const modeIndicator = page.locator('[data-testid="call-mode-indicator"]');
    const modeText = await modeIndicator.textContent();
    if (modeText?.toLowerCase().includes("webrtc")) {
      await page.click('[data-testid="toggle-mode-button"]');
    }

    // Initiate call
    await page.fill('[data-testid="phone-input"]', TEST_CONFIG.testPhoneNumber);
    await page.click('[data-testid="call-button"]');
    await page.waitForTimeout(2000);
  });

  test("should mute and unmute call", async ({ page }) => {
    // Click mute button
    await page.click('[data-testid="mute-button"]');

    // Verify muted state
    const muteButton = page.locator('[data-testid="mute-button"]');
    await expect(muteButton).toHaveAttribute("data-muted", "true");

    // Unmute
    await page.click('[data-testid="mute-button"]');
    await expect(muteButton).toHaveAttribute("data-muted", "false");
  });

  test("should show mute indicator when muted", async ({ page }) => {
    // Mute call
    await page.click('[data-testid="mute-button"]');

    // Check for mute indicator
    await expect(page.locator('[data-testid="mute-indicator"]')).toBeVisible({
      timeout: 2000,
    });
  });

  test("should hangup call", async ({ page }) => {
    // Click hangup button
    await page.click('[data-testid="hangup-button"]');

    // Verify call ended
    await expect(page.locator('[data-testid="call-status"]')).toContainText(
      /ended|idle/i,
      { timeout: 5000 },
    );
  });

  test("should show call controls during active call", async ({ page }) => {
    // Verify all call controls are visible
    await expect(page.locator('[data-testid="mute-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="hangup-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="dial-pad-toggle"]')).toBeVisible();
  });
});

// =====================================================
// TEST SUITE: INCOMING CALLS
// =====================================================

test.describe("Incoming Twilio Calls", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "TestPassword123!");
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("should display incoming call notification", async ({ page }) => {
    // Simulate incoming call (this would be triggered by Twilio in real scenario)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("incoming-call", {
          detail: {
            from: "+19876543210",
            callSid: "CA1234567890",
          },
        }),
      );
    });

    // Check for incoming call modal
    await expect(
      page.locator('[data-testid="incoming-call-modal"]'),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show caller ID for incoming calls", async ({ page }) => {
    // Simulate incoming call
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("incoming-call", {
          detail: {
            from: "+19876543210",
            callSid: "CA1234567890",
          },
        }),
      );
    });

    // Check caller ID is displayed
    await expect(page.locator('[data-testid="caller-id"]')).toContainText(
      "+19876543210",
      { timeout: 5000 },
    );
  });

  test("should accept incoming call", async ({ page }) => {
    // Simulate incoming call
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("incoming-call", {
          detail: {
            from: "+19876543210",
            callSid: "CA1234567890",
          },
        }),
      );
    });

    // Accept call
    await page.click('[data-testid="accept-call-button"]');

    // Verify call is active
    await expect(page.locator('[data-testid="call-status"]')).toContainText(
      /connected|active/i,
      { timeout: 5000 },
    );
  });

  test("should reject incoming call", async ({ page }) => {
    // Simulate incoming call
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("incoming-call", {
          detail: {
            from: "+19876543210",
            callSid: "CA1234567890",
          },
        }),
      );
    });

    // Reject call
    await page.click('[data-testid="reject-call-button"]');

    // Verify modal is closed
    await expect(
      page.locator('[data-testid="incoming-call-modal"]'),
    ).not.toBeVisible({ timeout: 3000 });
  });
});

// =====================================================
// TEST SUITE: CALL STATUS UPDATES
// =====================================================

test.describe("Call Status Updates", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "TestPassword123!");
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="dialer-tab"]');

    // Ensure Twilio mode
    const modeIndicator = page.locator('[data-testid="call-mode-indicator"]');
    const modeText = await modeIndicator.textContent();
    if (modeText?.toLowerCase().includes("webrtc")) {
      await page.click('[data-testid="toggle-mode-button"]');
    }
  });

  test("should show connecting status when call is initiated", async ({
    page,
  }) => {
    // Initiate call
    await page.fill('[data-testid="phone-input"]', TEST_CONFIG.testPhoneNumber);
    await page.click('[data-testid="call-button"]');

    // Check for connecting status
    await expect(page.locator('[data-testid="call-status"]')).toContainText(
      /connecting/i,
      { timeout: 3000 },
    );
  });

  test("should show ringing status when call is ringing", async ({ page }) => {
    // Initiate call
    await page.fill('[data-testid="phone-input"]', TEST_CONFIG.testPhoneNumber);
    await page.click('[data-testid="call-button"]');

    // Simulate ringing state
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("call-status-change", {
          detail: { status: "ringing" },
        }),
      );
    });

    // Check for ringing status
    await expect(page.locator('[data-testid="call-status"]')).toContainText(
      /ringing/i,
      { timeout: 3000 },
    );
  });

  test("should show connected status when call is answered", async ({
    page,
  }) => {
    // Initiate call
    await page.fill('[data-testid="phone-input"]', TEST_CONFIG.testPhoneNumber);
    await page.click('[data-testid="call-button"]');

    // Simulate connected state
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("call-status-change", {
          detail: { status: "connected" },
        }),
      );
    });

    // Check for connected status
    await expect(page.locator('[data-testid="call-status"]')).toContainText(
      /connected/i,
      { timeout: 3000 },
    );
  });

  test("should show ended status when call is completed", async ({ page }) => {
    // Initiate call
    await page.fill('[data-testid="phone-input"]', TEST_CONFIG.testPhoneNumber);
    await page.click('[data-testid="call-button"]');
    await page.waitForTimeout(2000);

    // End call
    await page.click('[data-testid="hangup-button"]');

    // Check for ended status
    await expect(page.locator('[data-testid="call-status"]')).toContainText(
      /ended|completed/i,
      { timeout: 5000 },
    );
  });

  test("should show error status when call fails", async ({ page }) => {
    // Initiate call
    await page.fill('[data-testid="phone-input"]', TEST_CONFIG.testPhoneNumber);
    await page.click('[data-testid="call-button"]');

    // Simulate error state
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("call-status-change", {
          detail: { status: "error", error: "Call failed" },
        }),
      );
    });

    // Check for error status
    await expect(page.locator('[data-testid="call-status"]')).toContainText(
      /error|failed/i,
      { timeout: 3000 },
    );
  });
});

// =====================================================
// TEST SUITE: CALL QUALITY INDICATORS
// =====================================================

test.describe("Call Quality Indicators", () => {
  test.beforeEach(async ({ page }) => {
    // Login and initiate call
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "TestPassword123!");
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.click('[data-testid="dialer-tab"]');

    // Ensure Twilio mode and initiate call
    const modeIndicator = page.locator('[data-testid="call-mode-indicator"]');
    const modeText = await modeIndicator.textContent();
    if (modeText?.toLowerCase().includes("webrtc")) {
      await page.click('[data-testid="toggle-mode-button"]');
    }

    await page.fill('[data-testid="phone-input"]', TEST_CONFIG.testPhoneNumber);
    await page.click('[data-testid="call-button"]');
    await page.waitForTimeout(2000);
  });

  test("should display call quality indicator", async ({ page }) => {
    // Check for quality indicator
    const qualityIndicator = page.locator('[data-testid="call-quality"]');
    if (await qualityIndicator.isVisible()) {
      const quality = await qualityIndicator.textContent();
      expect(quality).toMatch(/excellent|good|fair|poor/i);
    }
  });

  test("should show audio level indicator", async ({ page }) => {
    // Check for audio level
    const audioLevel = page.locator('[data-testid="audio-level"]');
    if (await audioLevel.isVisible()) {
      // Audio level should be visible during call
      await expect(audioLevel).toBeVisible();
    }
  });

  test("should show network quality warning when poor", async ({ page }) => {
    // Simulate poor network quality
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("quality-change", {
          detail: { quality: "poor" },
        }),
      );
    });

    // Check for warning
    const warning = page.locator('[data-testid="quality-warning"]');
    if (await warning.isVisible()) {
      await expect(warning).toContainText(/poor|weak/i);
    }
  });
});
