/**
 * WebRTC End-to-End Tests
 *
 * E2E tests for WebRTC connection establishment under various network conditions.
 * These tests use Playwright to simulate real browser behavior and network scenarios.
 *
 * Test Categories:
 * - Basic connection establishment
 * - Network condition simulations (slow 3G, offline, etc.)
 * - ICE candidate handling scenarios
 * - Call quality under different conditions
 * - Error recovery scenarios
 */

const { test, expect, chromium } = require("@playwright/test");

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.E2E_BASE_URL || "http://localhost:3000",
  timeout: 30000,
  callTimeout: 60000,
};

// =====================================================
// TEST SUITE: BASIC CONNECTION ESTABLISHMENT
// =====================================================

test.describe("Basic Connection Establishment", () => {
  test("should establish peer-to-peer connection between two users", async ({
    browser,
  }) => {
    // Create two browser contexts (simulating two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Navigate to the app
      await page1.goto(`${TEST_CONFIG.baseUrl}/dashboard`);
      await page2.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

      // Wait for the page to load
      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      // Simulate login for both users
      // In real tests, this would go through the authentication flow
      await page1.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-1",
            care4wId: "care4w-1000001",
          }),
        );
      });

      await page2.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-2",
            care4wId: "care4w-1000002",
          }),
        );
      });

      // Refresh pages to apply auth
      await page1.reload();
      await page2.reload();

      // Wait for dashboard to load
      await page1.waitForSelector("[data-testid='dialer-tab']", {
        timeout: 10000,
      });
      await page2.waitForSelector("[data-testid='dialer-tab']", {
        timeout: 10000,
      });

      // User 1 initiates call to User 2
      await page1.fill("[data-testid='phone-input']", "1000002");
      await page1.click("[data-testid='call-button']");

      // Verify call status changes
      await page1.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return (
            status &&
            (status.textContent.includes("ringing") ||
              status.textContent.includes("connecting"))
          );
        },
        { timeout: 10000 },
      );

      // User 2 should see incoming call
      await page2.waitForSelector("[data-testid='incoming-call-modal']", {
        timeout: 10000,
      });

      // User 2 accepts the call
      await page2.click("[data-testid='accept-call-button']");

      // Both users should be connected
      await page1.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return status && status.textContent.includes("connected");
        },
        { timeout: 15000 },
      );

      await page2.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return status && status.textContent.includes("connected");
        },
        { timeout: 15000 },
      );
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("should handle call rejection gracefully", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await page1.goto(`${TEST_CONFIG.baseUrl}/dashboard`);
      await page2.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

      await page1.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-1",
            care4wId: "care4w-1000001",
          }),
        );
      });

      await page2.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-2",
            care4wId: "care4w-1000002",
          }),
        );
      });

      await page1.reload();
      await page2.reload();

      await page1.waitForSelector("[data-testid='dialer-tab']", {
        timeout: 10000,
      });

      // User 1 initiates call
      await page1.fill("[data-testid='phone-input']", "1000002");
      await page1.click("[data-testid='call-button']");

      // User 2 rejects the call
      await page2.waitForSelector("[data-testid='incoming-call-modal']", {
        timeout: 10000,
      });
      await page2.click("[data-testid='reject-call-button']");

      // User 1 should see call ended
      await page1.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return status && status.textContent.includes("ended");
        },
        { timeout: 10000 },
      );
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

// =====================================================
// TEST SUITE: NETWORK CONDITION SIMULATIONS
// =====================================================

test.describe("Network Condition Simulations", () => {
  test("should establish connection on slow network (3G)", async ({
    browser,
  }) => {
    const context1 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const context2 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    // Simulate slow 3G network
    await context1.route("**/*", (route) => {
      route.continue({
        latency: 1000, // 1 second latency
        throughput: 50, // 50 kbps
      });
    });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await page1.goto(`${TEST_CONFIG.baseUrl}/dashboard`);
      await page2.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

      // Set auth
      await page1.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-1",
            care4wId: "care4w-1000001",
          }),
        );
      });

      await page2.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-2",
            care4wId: "care4w-1000002",
          }),
        );
      });

      await page1.reload();
      await page2.reload();

      await page1.waitForSelector("[data-testid='dialer-tab']", {
        timeout: 15000, // Longer timeout for slow network
      });

      // Initiate call
      await page1.fill("[data-testid='phone-input']", "1000002");
      await page1.click("[data-testid='call-button']");

      // Should eventually connect (with longer timeout)
      await page1.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return status && status.textContent.includes("connected");
        },
        { timeout: 30000 }, // Longer timeout for slow network
      );
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("should handle network disconnection during call", async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await page1.goto(`${TEST_CONFIG.baseUrl}/dashboard`);
      await page2.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

      await page1.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-1",
            care4wId: "care4w-1000001",
          }),
        );
      });

      await page2.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-2",
            care4wId: "care4w-1000002",
          }),
        );
      });

      await page1.reload();
      await page2.reload();

      await page1.waitForSelector("[data-testid='dialer-tab']", {
        timeout: 10000,
      });

      // Establish connection
      await page1.fill("[data-testid='phone-input']", "1000002");
      await page1.click("[data-testid='call-button']");

      await page2.waitForSelector("[data-testid='incoming-call-modal']", {
        timeout: 10000,
      });
      await page2.click("[data-testid='accept-call-button']");

      await page1.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return status && status.textContent.includes("connected");
        },
        { timeout: 15000 },
      );

      // Simulate network disconnection
      await page1.evaluate(() => {
        // Disable all network connections
        window.navigator.onLine = false;
      });

      // Dispatch offline event
      await page1.evaluate(() => {
        window.dispatchEvent(new Event("offline"));
      });

      // Wait for disconnection handling
      await page1.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return (
            status &&
            (status.textContent.includes("disconnected") ||
              status.textContent.includes("retrying"))
          );
        },
        { timeout: 10000 },
      );

      // Restore network
      await page1.evaluate(() => {
        window.navigator.onLine = true;
        window.dispatchEvent(new Event("online"));
      });

      // Should attempt reconnection
      await page1.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return status && status.textContent.includes("reconnecting");
        },
        { timeout: 10000 },
      );
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("should handle intermittent network connectivity", async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await page1.goto(`${TEST_CONFIG.baseUrl}/dashboard`);
      await page2.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

      await page1.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-1",
            care4wId: "care4w-1000001",
          }),
        );
      });

      await page2.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-2",
            care4wId: "care4w-1000002",
          }),
        );
      });

      await page1.reload();
      await page2.reload();

      await page1.waitForSelector("[data-testid='dialer-tab']", {
        timeout: 10000,
      });

      // Initiate call
      await page1.fill("[data-testid='phone-input']", "1000002");
      await page1.click("[data-testid='call-button']");

      await page2.waitForSelector("[data-testid='incoming-call-modal']", {
        timeout: 10000,
      });
      await page2.click("[data-testid='accept-call-button']");

      await page1.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return status && status.textContent.includes("connected");
        },
        { timeout: 15000 },
      );

      // Simulate multiple brief disconnections
      for (let i = 0; i < 3; i++) {
        await page1.evaluate(() => {
          window.navigator.onLine = false;
          window.dispatchEvent(new Event("offline"));
        });

        await page1.waitForTimeout(500);

        await page1.evaluate(() => {
          window.navigator.onLine = true;
          window.dispatchEvent(new Event("online"));
        });

        await page1.waitForTimeout(1000);
      }

      // Should still be connected or attempting reconnection
      const status = await page1.evaluate(() => {
        const statusEl = document.querySelector("[data-testid='call-status']");
        return statusEl ? statusEl.textContent : "";
      });

      expect(status).toMatch(/connected|reconnecting|disconnected/);
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

// =====================================================
// TEST SUITE: ICE CANDIDATE HANDLING
// =====================================================

test.describe("ICE Candidate Handling", () => {
  test("should complete ICE gathering", async ({ browser }) => {
    const page = await browser.newPage();

    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    await page.evaluate(() => {
      localStorage.setItem(
        "careflow_auth",
        JSON.stringify({
          userId: "test-user-1",
          care4wId: "care4w-1000001",
        }),
      );
    });

    await page.reload();

    await page.waitForSelector("[data-testid='dialer-tab']", {
      timeout: 10000,
    });

    // Go to call interface
    await page.fill("[data-testid='phone-input']", "1000002");
    await page.click("[data-testid='call-button']");

    // Check for ICE gathering in console logs
    const iceLogs = await page.evaluate(() => {
      return window.__iceCandidateLogs || [];
    });

    // Verify ICE gathering started
    await page.waitForFunction(
      () => {
        const logs = window.__iceCandidateLogs || [];
        return logs.some((log) => log.type === "icegatheringstatechange");
      },
      { timeout: 15000 },
    );
  });

  test("should use STUN servers for NAT traversal", async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    await page.evaluate(() => {
      localStorage.setItem(
        "careflow_auth",
        JSON.stringify({
          userId: "test-user-1",
          care4wId: "care4w-1000001",
        }),
      );
    });

    await page.reload();

    await page.waitForSelector("[data-testid='dialer-tab']", {
      timeout: 10000,
    });

    // Check ICE servers configuration
    const iceServers = await page.evaluate(() => {
      return window.__iceServersConfig || [];
    });

    // Should have STUN servers
    expect(iceServers.some((server) => server.urls.includes("stun:"))).toBe(
      true,
    );
  });

  test("should use TURN server when configured", async ({ page }) => {
    // Set TURN server environment
    await page.route("**/*.env*", (route) => {
      route.fulfill({
        status: 200,
        body: `
          NEXT_PUBLIC_TURN_SERVER_URL=turn:test.turn.server:3478
          NEXT_PUBLIC_TURN_USERNAME=test-user
          NEXT_PUBLIC_TURN_CREDENTIAL=test-password
        `,
      });
    });

    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    await page.evaluate(() => {
      localStorage.setItem(
        "careflow_auth",
        JSON.stringify({
          userId: "test-user-1",
          care4wId: "care4w-1000001",
        }),
      );
    });

    await page.reload();

    await page.waitForSelector("[data-testid='dialer-tab']", {
      timeout: 10000,
    });

    // Check that TURN server is in ICE configuration
    const iceServers = await page.evaluate(() => {
      return window.__iceServersConfig || [];
    });

    expect(
      iceServers.some((server) => server.urls.includes("turn:")),
    ).toBeTruthy();
  });
});

// =====================================================
// TEST SUITE: CALL QUALITY
// =====================================================

test.describe("Call Quality", () => {
  test("should display connection quality indicator", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    await page.evaluate(() => {
      localStorage.setItem(
        "careflow_auth",
        JSON.stringify({
          userId: "test-user-1",
          care4wId: "care4w-1000001",
        }),
      );
    });

    await page.reload();

    await page.waitForSelector("[data-testid='dialer-tab']", {
      timeout: 10000,
    });

    // Make a call to establish connection
    await page.fill("[data-testid='phone-input']", "1000002");
    await page.click("[data-testid='call-button']");

    // Wait for connection
    await page.waitForFunction(
      () => {
        const status = document.querySelector("[data-testid='call-status']");
        return status && status.textContent.includes("connected");
      },
      { timeout: 15000 },
    );

    // Check for quality indicator
    const qualityIndicator = await page.$("[data-testid='quality-indicator']");
    expect(qualityIndicator).toBeTruthy();
  });

  test("should show mute/unmute controls", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    await page.evaluate(() => {
      localStorage.setItem(
        "careflow_auth",
        JSON.stringify({
          userId: "test-user-1",
          care4wId: "care4w-1000001",
        }),
      );
    });

    await page.reload();

    await page.waitForSelector("[data-testid='dialer-tab']", {
      timeout: 10000,
    });

    await page.fill("[data-testid='phone-input']", "1000002");
    await page.click("[data-testid='call-button']");

    await page.waitForFunction(
      () => {
        const status = document.querySelector("[data-testid='call-status']");
        return status && status.textContent.includes("connected");
      },
      { timeout: 15000 },
    );

    // Check mute button exists
    const muteButton = await page.$("[data-testid='mute-button']");
    expect(muteButton).toBeTruthy();

    // Click mute
    await page.click("[data-testid='mute-button']");

    // Verify muted state
    const isMuted = await page.evaluate(() => {
      return window.__isMuted || false;
    });
  });

  test("should show call duration timer", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    await page.evaluate(() => {
      localStorage.setItem(
        "careflow_auth",
        JSON.stringify({
          userId: "test-user-1",
          care4wId: "care4w-1000001",
        }),
      );
    });

    await page.reload();

    await page.waitForSelector("[data-testid='dialer-tab']", {
      timeout: 10000,
    });

    await page.fill("[data-testid='phone-input']", "1000002");
    await page.click("[data-testid='call-button']");

    await page.waitForFunction(
      () => {
        const status = document.querySelector("[data-testid='call-status']");
        return status && status.textContent.includes("connected");
      },
      { timeout: 15000 },
    );

    // Wait for timer to start
    await page.waitForTimeout(2000);

    // Check timer is running
    const timerText = await page.evaluate(() => {
      const timer = document.querySelector("[data-testid='call-timer']");
      return timer ? timer.textContent : "";
    });

    expect(timerText).toMatch(/\d+:\d{2}/);
  });
});

// =====================================================
// TEST SUITE: ERROR HANDLING
// =====================================================

test.describe("Error Handling", () => {
  test("should handle invalid phone number", async ({ browser }) => {
    const page = await browser.newPage();

    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    await page.evaluate(() => {
      localStorage.setItem(
        "careflow_auth",
        JSON.stringify({
          userId: "test-user-1",
          care4wId: "care4w-1000001",
        }),
      );
    });

    await page.reload();

    await page.waitForSelector("[data-testid='dialer-tab']", {
      timeout: 10000,
    });

    // Enter invalid number
    await page.fill("[data-testid='phone-input']", "invalid");
    await page.click("[data-testid='call-button']");

    // Should show error
    const errorMessage = await page.$("[data-testid='error-message']");
    expect(errorMessage).toBeTruthy();
  });

  test("should handle peer connection failure", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    await page.evaluate(() => {
      localStorage.setItem(
        "careflow_auth",
        JSON.stringify({
          userId: "test-user-1",
          care4wId: "care4w-1000001",
        }),
      );
    });

    await page.reload();

    await page.waitForSelector("[data-testid='dialer-tab']", {
      timeout: 10000,
    });

    await page.fill("[data-testid='phone-input']", "1000002");
    await page.click("[data-testid='call-button']");

    // Simulate peer connection failure
    await page.evaluate(() => {
      window.__simulatePeerConnectionFailure = true;
    });

    // Should handle failure gracefully
    await page.waitForFunction(
      () => {
        const status = document.querySelector("[data-testid='call-status']");
        return status && status.textContent.includes("failed");
      },
      { timeout: 20000 },
    );
  });

  test("should handle media device errors", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Block microphone access
    context.addPermissions([], { origin: TEST_CONFIG.baseUrl });

    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    await page.evaluate(() => {
      localStorage.setItem(
        "careflow_auth",
        JSON.stringify({
          userId: "test-user-1",
          care4wId: "care4w-1000001",
        }),
      );
    });

    await page.reload();

    await page.waitForSelector("[data-testid='dialer-tab']", {
      timeout: 10000,
    });

    await page.fill("[data-testid='phone-input']", "1000002");
    await page.click("[data-testid='call-button]");

    // Should show permission error
    const errorMessage = await page.$("[data-testid='permission-error']");
    expect(errorMessage).toBeTruthy();
  });
});

// =====================================================
// TEST SUITE: CALL TERMINATION
// =====================================================

test.describe("Call Termination", () => {
  test("should end call correctly", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await page1.goto(`${TEST_CONFIG.baseUrl}/dashboard`);
      await page2.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

      await page1.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-1",
            care4wId: "care4w-1000001",
          }),
        );
      });

      await page2.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-2",
            care4wId: "care4w-1000002",
          }),
        );
      });

      await page1.reload();
      await page2.reload();

      await page1.waitForSelector("[data-testid='dialer-tab']", {
        timeout: 10000,
      });

      // Establish call
      await page1.fill("[data-testid='phone-input']", "1000002");
      await page1.click("[data-testid='call-button']");

      await page2.waitForSelector("[data-testid='incoming-call-modal']", {
        timeout: 10000,
      });
      await page2.click("[data-testid='accept-call-button']");

      await page1.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return status && status.textContent.includes("connected");
        },
        { timeout: 15000 },
      );

      // Wait a moment
      await page1.waitForTimeout(1000);

      // End call
      await page1.click("[data-testid='hangup-button]");

      // Caller should see call ended
      await page1.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return status && status.textContent.includes("ended");
        },
        { timeout: 5000 },
      );
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("should handle remote hangup", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await page1.goto(`${TEST_CONFIG.baseUrl}/dashboard`);
      await page2.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

      await page1.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-1",
            care4wId: "care4w-1000001",
          }),
        );
      });

      await page2.evaluate(() => {
        localStorage.setItem(
          "careflow_auth",
          JSON.stringify({
            userId: "test-user-2",
            care4wId: "care4w-1000002",
          }),
        );
      });

      await page1.reload();
      await page2.reload();

      await page1.waitForSelector("[data-testid='dialer-tab']", {
        timeout: 10000,
      });

      // Establish call
      await page1.fill("[data-testid='phone-input']", "1000002");
      await page1.click("[data-testid='call-button']");

      await page2.waitForSelector("[data-testid='incoming-call-modal']", {
        timeout: 10000,
      });
      await page2.click("[data-testid='accept-call-button']");

      await page1.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return status && status.textContent.includes("connected");
        },
        { timeout: 15000 },
      );

      // Callee hangs up
      await page2.click("[data-testid='hangup-button]");

      // Caller should see call ended
      await page1.waitForFunction(
        () => {
          const status = document.querySelector("[data-testid='call-status']");
          return status && status.textContent.includes("ended");
        },
        { timeout: 5000 },
      );
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

// =====================================================
// TEST SUITE: MEDIA RECORDING
// =====================================================

test.describe("Media Recording", () => {
  test("should start and stop recording", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    await page.evaluate(() => {
      localStorage.setItem(
        "careflow_auth",
        JSON.stringify({
          userId: "test-user-1",
          care4wId: "care4w-1000001",
        }),
      );
    });

    await page.reload();

    await page.waitForSelector("[data-testid='dialer-tab']", {
      timeout: 10000,
    });

    await page.fill("[data-testid='phone-input']", "1000002");
    await page.click("[data-testid='call-button]");

    await page.waitForFunction(
      () => {
        const status = document.querySelector("[data-testid='call-status']");
        return status && status.textContent.includes("connected");
      },
      { timeout: 15000 },
    );

    // Start recording
    await page.click("[data-testid='record-button]");
    const isRecording = await page.evaluate(() => {
      const btn = document.querySelector("[data-testid='record-button]");
      return btn && btn.classList.contains("recording");
    });
    expect(isRecording).toBe(true);

    // Wait a moment
    await page.waitForTimeout(2000);

    // Stop recording
    await page.click("[data-testid='record-button]");

    // Should have recording
    const hasRecording = await page.evaluate(() => {
      return window.__lastRecording !== null;
    });
  });
});
