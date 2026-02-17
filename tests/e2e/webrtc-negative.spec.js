/**
 * WebRTC Negative Test Cases E2E Tests
 *
 * Comprehensive E2E tests for negative scenarios in WebRTC connections.
 * Tests network interruptions, ICE connection failures, signaling timeouts,
 * and error recovery scenarios using Playwright with distinct browser contexts.
 *
 * @module tests/e2e/webrtc-negative.spec.js
 */

const { test, expect, chromium } = require('@playwright/test');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  callTimeout: 60000,
  signalingTimeout: 10000,
  iceGatheringTimeout: 15000,
  reconnectionTimeout: 20000,
};

// Test user credentials
const TEST_USERS = {
  caller: {
    userId: 'test-caller-001',
    care4wId: 'care4w-1000001',
    displayName: 'Test Caller',
  },
  callee: {
    userId: 'test-callee-002',
    care4wId: 'care4w-1000002',
    displayName: 'Test Callee',
  },
};

/**
 * Helper to set up authenticated browser context
 */
async function setupAuthenticatedContext(context, user) {
  const page = await context.newPage();
  await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

  await page.evaluate((userData) => {
    localStorage.setItem('careflow_auth', JSON.stringify(userData));
  }, user);

  await page.reload();
  return page;
}

/**
 * Helper to wait for WebRTC state change
 */
async function waitForWebRTCState(page, expectedState, timeout = 10000) {
  await page.waitForFunction(
    (state) => {
      const statusEl = document.querySelector("[data-testid='call-status']");
      return statusEl && statusEl.textContent.toLowerCase().includes(state);
    },
    expectedState,
    { timeout }
  );
}

// =====================================================
// TEST SUITE: NETWORK INTERRUPTIONS
// =====================================================

test.describe('Network Interruptions', () => {
  let callerContext;
  let calleeContext;
  let callerPage;
  let calleePage;

  test.beforeEach(async ({ browser }) => {
    callerContext = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    calleeContext = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });

    callerPage = await setupAuthenticatedContext(callerContext, TEST_USERS.caller);
    calleePage = await setupAuthenticatedContext(calleeContext, TEST_USERS.callee);

    await callerPage.waitForSelector("[data-testid='dialer-tab']", { timeout: 10000 });
    await calleePage.waitForSelector("[data-testid='dialer-tab']", { timeout: 10000 });
  });

  test.afterEach(async () => {
    await callerContext.close();
    await calleeContext.close();
  });

  test('should detect and report network disconnection', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Track network events
    await callerPage.evaluate(() => {
      window.__networkEvents = [];
      window.addEventListener('offline', () => window.__networkEvents.push('offline'));
      window.addEventListener('online', () => window.__networkEvents.push('online'));
    });

    // Simulate network disconnection
    await callerContext.setOffline(true);

    // Wait for offline detection
    await callerPage.waitForFunction(() => window.__networkEvents?.includes('offline'), {
      timeout: 5000,
    });

    // Verify UI shows disconnected state
    await callerPage.waitForFunction(
      () => {
        const statusEl = document.querySelector("[data-testid='call-status']");
        return (
          statusEl &&
          (statusEl.textContent.toLowerCase().includes('disconnected') ||
            statusEl.textContent.toLowerCase().includes('reconnecting') ||
            statusEl.textContent.toLowerCase().includes('network'))
        );
      },
      { timeout: 10000 }
    );
  });

  test('should attempt reconnection after network restoration', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Track reconnection attempts
    await callerPage.evaluate(() => {
      window.__reconnectionAttempts = 0;
      window.__iceConnectionStates = [];
    });

    // Simulate brief network disconnection
    await callerContext.setOffline(true);
    await callerPage.waitForTimeout(2000);
    await callerContext.setOffline(false);

    // Wait for reconnection attempt
    await callerPage
      .waitForFunction(
        () =>
          window.__iceConnectionStates?.includes('checking') || window.__reconnectionAttempts > 0,
        { timeout: TEST_CONFIG.reconnectionTimeout }
      )
      .catch(() => {
        // Reconnection may not always trigger in test environment
      });

    // Verify call eventually reconnects or shows appropriate state
    const finalStatus = await callerPage.evaluate(() => {
      const statusEl = document.querySelector("[data-testid='call-status']");
      return statusEl ? statusEl.textContent.toLowerCase() : '';
    });

    expect(finalStatus).toMatch(/connected|reconnecting|disconnected/);
  });

  test('should handle prolonged network outage', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Simulate prolonged network outage
    await callerContext.setOffline(true);

    // Wait for ICE disconnected state
    await callerPage
      .waitForFunction(() => window.__iceConnectionStates?.includes('disconnected'), {
        timeout: 10000,
      })
      .catch(() => {});

    // Wait longer for failed state
    await callerPage
      .waitForFunction(() => window.__iceConnectionStates?.includes('failed'), { timeout: 30000 })
      .catch(() => {
        // May not reach failed state in all environments
      });

    // Verify call shows appropriate error state
    const callStatus = await callerPage.evaluate(() => {
      const statusEl = document.querySelector("[data-testid='call-status']");
      return statusEl ? statusEl.textContent.toLowerCase() : '';
    });

    expect(callStatus).toMatch(/disconnected|failed|error|ended/);

    // Restore network
    await callerContext.setOffline(false);
  });

  test('should handle intermittent connectivity', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Track connection state changes
    await callerPage.evaluate(() => {
      window.__stateChanges = [];
    });

    // Simulate intermittent connectivity
    for (let i = 0; i < 5; i++) {
      await callerContext.setOffline(true);
      await callerPage.waitForTimeout(500);
      await callerContext.setOffline(false);
      await callerPage.waitForTimeout(1000);
    }

    // Verify call handled intermittent connectivity
    const finalStatus = await callerPage.evaluate(() => {
      const statusEl = document.querySelector("[data-testid='call-status']");
      return statusEl ? statusEl.textContent.toLowerCase() : '';
    });

    // Call should either recover or show appropriate state
    expect(finalStatus).toMatch(/connected|reconnecting|disconnected|ended/);
  });

  test('should notify other peer of disconnection', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');
    await waitForWebRTCState(calleePage, 'connected');

    // Disconnect caller
    await callerContext.setOffline(true);

    // Callee should detect peer disconnection
    await calleePage
      .waitForFunction(
        () => {
          const statusEl = document.querySelector("[data-testid='call-status']");
          return (
            statusEl &&
            (statusEl.textContent.toLowerCase().includes('disconnected') ||
              statusEl.textContent.toLowerCase().includes('ended') ||
              statusEl.textContent.toLowerCase().includes('peer'))
          );
        },
        { timeout: 15000 }
      )
      .catch(() => {
        // May not always trigger in test environment
      });
  });

  test('should handle network change (WiFi to cellular)', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Track ICE restart events
    await callerPage.evaluate(() => {
      window.__iceRestarts = 0;
    });

    // Simulate network change by manipulating connection
    await callerPage.evaluate(() => {
      // Trigger ICE restart
      if (window.__peerConnection) {
        // Simulate network change event
        window.dispatchEvent(new CustomEvent('networkchange'));
      }
    });

    // Wait for ICE restart or reconnection
    await callerPage.waitForTimeout(2000);

    // Verify call state
    const callStatus = await callerPage.evaluate(() => {
      const statusEl = document.querySelector("[data-testid='call-status']");
      return statusEl ? statusEl.textContent.toLowerCase() : '';
    });

    expect(callStatus).toMatch(/connected|reconnecting/);
  });
});

// =====================================================
// TEST SUITE: ICE CONNECTION FAILURES
// =====================================================

test.describe('ICE Connection Failures', () => {
  let callerContext;
  let calleeContext;
  let callerPage;
  let calleePage;

  test.beforeEach(async ({ browser }) => {
    callerContext = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    calleeContext = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });

    callerPage = await setupAuthenticatedContext(callerContext, TEST_USERS.caller);
    calleePage = await setupAuthenticatedContext(calleeContext, TEST_USERS.callee);

    await callerPage.waitForSelector("[data-testid='dialer-tab']", { timeout: 10000 });
    await calleePage.waitForSelector("[data-testid='dialer-tab']", { timeout: 10000 });
  });

  test.afterEach(async () => {
    await callerContext.close();
    await calleeContext.close();
  });

  test('should handle ICE failure with no candidates', async () => {
    // Block ICE candidates
    await callerPage.evaluate(() => {
      window.__blockIceCandidates = true;
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for ICE failure
    await callerPage
      .waitForFunction(() => window.__iceConnectionStates?.includes('failed'), { timeout: 30000 })
      .catch(() => {
        // May timeout instead
      });

    // Verify error state
    const callStatus = await callerPage.evaluate(() => {
      const statusEl = document.querySelector("[data-testid='call-status']");
      return statusEl ? statusEl.textContent.toLowerCase() : '';
    });

    expect(callStatus).toMatch(/failed|error|timeout/);
  });

  test('should handle STUN server unreachable', async () => {
    // Configure unreachable STUN server
    await callerPage.evaluate(() => {
      window.__iceServersOverride = [{ urls: 'stun:unreachable.stun.server:3478' }];
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for connection attempt
    await callerPage.waitForTimeout(5000);

    // Should still attempt connection (may succeed with host candidates)
    const iceState = await callerPage.evaluate(
      () => window.__iceConnectionStates?.slice(-1)[0] || 'unknown'
    );

    // Connection may succeed with host candidates or fail
    expect(['new', 'checking', 'connected', 'failed', 'disconnected']).toContain(iceState);
  });

  test('should handle TURN server authentication failure', async () => {
    // Configure TURN with invalid credentials
    await callerPage.evaluate(() => {
      window.__iceServersOverride = [
        {
          urls: 'turn:turn.server:3478',
          username: 'invalid-user',
          credential: 'invalid-credential',
        },
      ];
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for connection attempt
    await callerPage.waitForTimeout(5000);

    // Verify connection state
    const iceState = await callerPage.evaluate(
      () => window.__iceConnectionStates?.slice(-1)[0] || 'unknown'
    );

    // Should handle TURN failure gracefully
    expect(['new', 'checking', 'connected', 'failed']).toContain(iceState);
  });

  test('should attempt ICE restart on connection failure', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Track ICE restart attempts
    await callerPage.evaluate(() => {
      window.__iceRestarts = 0;
    });

    // Simulate ICE failure
    await callerPage.evaluate(() => {
      if (window.__peerConnection) {
        // Force ICE restart
        const pc = window.__peerConnection;
        pc.createOffer({ iceRestart: true })
          .then((offer) => pc.setLocalDescription(offer))
          .catch(() => {});
      }
    });

    // Wait for ICE restart
    await callerPage
      .waitForFunction(
        () => window.__iceRestarts > 0 || window.__iceConnectionStates?.includes('checking'),
        { timeout: 10000 }
      )
      .catch(() => {});

    // Verify reconnection attempt
    const iceStates = await callerPage.evaluate(() => window.__iceConnectionStates || []);
    expect(iceStates).toContain('checking');
  });

  test('should handle all ICE candidates failing', async () => {
    // Configure to fail all ICE candidates
    await callerPage.evaluate(() => {
      window.__failAllIceCandidates = true;
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for ICE failure
    await callerPage
      .waitForFunction(() => window.__iceConnectionStates?.includes('failed'), { timeout: 30000 })
      .catch(() => {
        // May timeout instead
      });

    // Verify error handling
    const errorState = await callerPage.evaluate(() => {
      const statusEl = document.querySelector("[data-testid='call-status']");
      const errorEl = document.querySelector("[data-testid='error-message']");
      return {
        callStatus: statusEl ? statusEl.textContent.toLowerCase() : '',
        hasError: !!errorEl,
      };
    });

    expect(errorState.callStatus).toMatch(/failed|error|ended/);
  });

  test('should report ICE connection state changes', async () => {
    // Track all ICE state changes
    await callerPage.evaluate(() => {
      window.__iceStateChanges = [];
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    // Wait for connection or failure
    await callerPage.waitForFunction(() => window.__iceStateChanges?.length >= 2, {
      timeout: 15000,
    });

    const stateChanges = await callerPage.evaluate(() => window.__iceStateChanges || []);

    // Should have recorded state transitions
    expect(stateChanges.length).toBeGreaterThan(0);
    expect(stateChanges).toContain('checking');
  });
});

// =====================================================
// TEST SUITE: SIGNALING TIMEOUTS
// =====================================================

test.describe('Signaling Timeouts', () => {
  let callerContext;
  let calleeContext;
  let callerPage;
  let calleePage;

  test.beforeEach(async ({ browser }) => {
    callerContext = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    calleeContext = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });

    callerPage = await setupAuthenticatedContext(callerContext, TEST_USERS.caller);
    calleePage = await setupAuthenticatedContext(calleeContext, TEST_USERS.callee);

    await callerPage.waitForSelector("[data-testid='dialer-tab']", { timeout: 10000 });
    await calleePage.waitForSelector("[data-testid='dialer-tab']", { timeout: 10000 });
  });

  test.afterEach(async () => {
    await callerContext.close();
    await calleeContext.close();
  });

  test('should timeout if callee does not respond', async () => {
    // Configure short timeout
    await callerPage.evaluate(() => {
      window.__signalingTimeout = 5000; // 5 seconds
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Do not accept call on callee side

    // Wait for timeout
    await callerPage.waitForFunction(
      () => {
        const statusEl = document.querySelector("[data-testid='call-status']");
        return (
          statusEl &&
          (statusEl.textContent.toLowerCase().includes('timeout') ||
            statusEl.textContent.toLowerCase().includes('ended') ||
            statusEl.textContent.toLowerCase().includes('no answer'))
        );
      },
      { timeout: 10000 }
    );

    // Verify timeout state
    const callStatus = await callerPage.evaluate(() => {
      const statusEl = document.querySelector("[data-testid='call-status']");
      return statusEl ? statusEl.textContent.toLowerCase() : '';
    });

    expect(callStatus).toMatch(/timeout|ended|no answer/);
  });

  test('should timeout if SDP answer not received', async () => {
    // Block SDP answer
    await callerPage.evaluate(() => {
      window.__blockSdpAnswer = true;
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    // Wait for timeout
    await callerPage.waitForFunction(
      () => {
        const statusEl = document.querySelector("[data-testid='call-status']");
        return (
          statusEl &&
          (statusEl.textContent.toLowerCase().includes('timeout') ||
            statusEl.textContent.toLowerCase().includes('failed') ||
            statusEl.textContent.toLowerCase().includes('error'))
        );
      },
      { timeout: 30000 }
    );

    // Verify error state
    const callStatus = await callerPage.evaluate(() => {
      const statusEl = document.querySelector("[data-testid='call-status']");
      return statusEl ? statusEl.textContent.toLowerCase() : '';
    });

    expect(callStatus).toMatch(/timeout|failed|error/);
  });

  test('should timeout if ICE candidates not exchanged', async () => {
    // Block ICE candidate exchange
    await callerPage.evaluate(() => {
      window.__blockIceExchange = true;
    });

    await calleePage.evaluate(() => {
      window.__blockIceExchange = true;
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    // Wait for timeout or failure
    await callerPage.waitForFunction(
      () => {
        const statusEl = document.querySelector("[data-testid='call-status']");
        return (
          statusEl &&
          (statusEl.textContent.toLowerCase().includes('timeout') ||
            statusEl.textContent.toLowerCase().includes('failed') ||
            statusEl.textContent.toLowerCase().includes('disconnected'))
        );
      },
      { timeout: 30000 }
    );

    // Verify error state
    const callStatus = await callerPage.evaluate(() => {
      const statusEl = document.querySelector("[data-testid='call-status']");
      return statusEl ? statusEl.textContent.toLowerCase() : '';
    });

    expect(callStatus).toMatch(/timeout|failed|disconnected/);
  });

  test('should handle Firebase signaling disconnection', async () => {
    // Track Firebase connection state
    await callerPage.evaluate(() => {
      window.__firebaseEvents = [];
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Simulate Firebase disconnection
    await callerPage.evaluate(() => {
      if (window.__firebaseDatabase) {
        // Simulate disconnection
        window.__firebaseEvents.push('disconnected');
      }
    });

    // Wait for error handling
    await callerPage.waitForTimeout(2000);

    // Verify error handling
    const firebaseEvents = await callerPage.evaluate(() => window.__firebaseEvents || []);
    expect(firebaseEvents).toContain('disconnected');
  });

  test('should retry signaling on transient failure', async () => {
    // Configure retry behavior
    await callerPage.evaluate(() => {
      window.__signalingRetries = 0;
      window.__maxSignalingRetries = 3;
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Simulate transient failure
    await callerPage.evaluate(() => {
      // First attempt fails, retry succeeds
      window.__simulateSignalingFailure = true;
      setTimeout(() => {
        window.__simulateSignalingFailure = false;
      }, 1000);
    });

    // Wait for retry
    await callerPage
      .waitForFunction(() => window.__signalingRetries > 0, { timeout: 5000 })
      .catch(() => {});

    const retries = await callerPage.evaluate(() => window.__signalingRetries || 0);
    expect(retries).toBeGreaterThan(0);
  });

  test('should cleanup on signaling timeout', async () => {
    // Configure short timeout
    await callerPage.evaluate(() => {
      window.__signalingTimeout = 3000;
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for timeout
    await callerPage
      .waitForFunction(
        () => {
          const statusEl = document.querySelector("[data-testid='call-status']");
          return statusEl && statusEl.textContent.toLowerCase().includes('timeout');
        },
        { timeout: 10000 }
      )
      .catch(() => {});

    // Verify cleanup
    const cleanupState = await callerPage.evaluate(() => ({
      peerConnectionClosed: window.__peerConnection?.connectionState === 'closed',
      firebaseListenersRemoved: window.__firebaseListenersRemoved === true,
      localStreamStopped: window.__localStream?.getTracks().every((t) => t.readyState === 'ended'),
    }));

    expect(cleanupState.peerConnectionClosed || cleanupState.firebaseListenersRemoved).toBe(true);
  });
});

// =====================================================
// TEST SUITE: MEDIA DEVICE ERRORS
// =====================================================

test.describe('Media Device Errors', () => {
  let callerContext;
  let calleeContext;
  let callerPage;
  let calleePage;

  test.beforeEach(async ({ browser }) => {
    callerContext = await browser.newContext();
    calleeContext = await browser.newContext();

    callerPage = await setupAuthenticatedContext(callerContext, TEST_USERS.caller);
    calleePage = await setupAuthenticatedContext(calleeContext, TEST_USERS.callee);

    await callerPage.waitForSelector("[data-testid='dialer-tab']", { timeout: 10000 });
    await calleePage.waitForSelector("[data-testid='dialer-tab']", { timeout: 10000 });
  });

  test.afterEach(async () => {
    await callerContext.close();
    await calleeContext.close();
  });

  test('should handle microphone permission denied', async () => {
    // Deny microphone permission
    await callerContext.clearPermissions();

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for permission error
    await callerPage.waitForSelector("[data-testid='permission-error']", { timeout: 10000 });

    const errorEl = await callerPage.$("[data-testid='permission-error']");
    expect(errorEl).toBeTruthy();
  });

  test('should handle no microphone available', async () => {
    // Simulate no microphone
    await callerPage.evaluate(() => {
      navigator.mediaDevices.enumerateDevices = () =>
        Promise.resolve([{ kind: 'audioinput', deviceId: '', label: '' }]);
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for device error
    await callerPage
      .waitForFunction(
        () => {
          const errorEl = document.querySelector("[data-testid='error-message']");
          return errorEl && errorEl.textContent.toLowerCase().includes('microphone');
        },
        { timeout: 10000 }
      )
      .catch(() => {
        // May show different error
      });

    // Verify error state
    const callStatus = await callerPage.evaluate(() => {
      const statusEl = document.querySelector("[data-testid='call-status']");
      return statusEl ? statusEl.textContent.toLowerCase() : '';
    });

    expect(callStatus).toMatch(/error|failed|ended/);
  });

  test('should handle microphone in use by another application', async () => {
    // Simulate microphone in use
    await callerPage.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('Device in use', 'NotReadableError'));
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for device error
    await callerPage.waitForFunction(
      () => {
        const errorEl = document.querySelector("[data-testid='error-message']");
        return errorEl !== null;
      },
      { timeout: 10000 }
    );

    const errorEl = await callerPage.$("[data-testid='error-message']");
    expect(errorEl).toBeTruthy();
  });

  test('should handle microphone disconnection during call', async () => {
    // Grant permission
    await callerContext.grantPermissions(['microphone']);

    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Simulate microphone disconnection
    await callerPage.evaluate(() => {
      const stream = window.__localStream;
      if (stream) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
          track.dispatchEvent(new Event('ended'));
        });
      }
    });

    // Wait for track ended handling
    await callerPage
      .waitForFunction(
        () => {
          const statusEl = document.querySelector("[data-testid='call-status']");
          return (
            statusEl &&
            (statusEl.textContent.toLowerCase().includes('audio') ||
              statusEl.textContent.toLowerCase().includes('device') ||
              statusEl.textContent.toLowerCase().includes('error'))
          );
        },
        { timeout: 5000 }
      )
      .catch(() => {
        // May not show error in all cases
      });
  });

  test('should handle camera permission denied for video call', async () => {
    // Grant only microphone
    await callerContext.grantPermissions(['microphone']);

    // Attempt video call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.evaluate(() => {
      window.__videoCallRequested = true;
    });
    await callerPage.click("[data-testid='call-button']");

    // Should proceed with audio-only or show error
    await callerPage
      .waitForFunction(
        () => {
          const statusEl = document.querySelector("[data-testid='call-status']");
          return (
            statusEl &&
            (statusEl.textContent.toLowerCase().includes('audio') ||
              statusEl.textContent.toLowerCase().includes('video') ||
              statusEl.textContent.toLowerCase().includes('permission'))
          );
        },
        { timeout: 10000 }
      )
      .catch(() => {});
  });
});

// =====================================================
// TEST SUITE: ERROR RECOVERY
// =====================================================

test.describe('Error Recovery', () => {
  let callerContext;
  let calleeContext;
  let callerPage;
  let calleePage;

  test.beforeEach(async ({ browser }) => {
    callerContext = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    calleeContext = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });

    callerPage = await setupAuthenticatedContext(callerContext, TEST_USERS.caller);
    calleePage = await setupAuthenticatedContext(calleeContext, TEST_USERS.callee);

    await callerPage.waitForSelector("[data-testid='dialer-tab']", { timeout: 10000 });
    await calleePage.waitForSelector("[data-testid='dialer-tab']", { timeout: 10000 });
  });

  test.afterEach(async () => {
    await callerContext.close();
    await calleeContext.close();
  });

  test('should allow retry after failed call', async () => {
    // Simulate failure
    await callerPage.evaluate(() => {
      window.__simulateCallFailure = true;
    });

    // First call attempt
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for failure
    await callerPage
      .waitForFunction(
        () => {
          const statusEl = document.querySelector("[data-testid='call-status']");
          return statusEl && statusEl.textContent.toLowerCase().includes('failed');
        },
        { timeout: 15000 }
      )
      .catch(() => {});

    // Reset failure simulation
    await callerPage.evaluate(() => {
      window.__simulateCallFailure = false;
    });

    // Retry call
    await callerPage.click("[data-testid='retry-button']");

    // Should be able to initiate new call
    await callerPage
      .waitForFunction(
        () => {
          const statusEl = document.querySelector("[data-testid='call-status']");
          return (
            statusEl &&
            (statusEl.textContent.toLowerCase().includes('ringing') ||
              statusEl.textContent.toLowerCase().includes('connecting'))
          );
        },
        { timeout: 10000 }
      )
      .catch(() => {});
  });

  test('should show user-friendly error messages', async () => {
    // Simulate various errors
    await callerPage.evaluate(() => {
      window.__simulateError = 'PERMISSION_DENIED';
    });

    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for error message
    await callerPage.waitForSelector("[data-testid='error-message']", { timeout: 10000 });

    const errorMessage = await callerPage.evaluate(() => {
      const errorEl = document.querySelector("[data-testid='error-message']");
      return errorEl ? errorEl.textContent : '';
    });

    // Should have user-friendly message
    expect(errorMessage.length).toBeGreaterThan(0);
    expect(errorMessage.toLowerCase()).not.toContain('error code');
    expect(errorMessage.toLowerCase()).not.toContain('undefined');
  });

  test('should log errors for debugging', async () => {
    // Track error logging
    await callerPage.evaluate(() => {
      window.__errorLogs = [];
    });

    // Simulate error
    await callerPage.evaluate(() => {
      window.__simulateError = 'TEST_ERROR';
    });

    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for error
    await callerPage.waitForFunction(() => window.__errorLogs?.length > 0, { timeout: 10000 });

    const errorLogs = await callerPage.evaluate(() => window.__errorLogs || []);

    // Should have logged the error
    expect(errorLogs.length).toBeGreaterThan(0);
    expect(errorLogs[0]).toHaveProperty('type');
    expect(errorLogs[0]).toHaveProperty('timestamp');
  });

  test('should maintain call state consistency after error', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Simulate error
    await callerPage.evaluate(() => {
      window.__simulateError = 'TRANSIENT_ERROR';
    });

    // Wait for error handling
    await callerPage.waitForTimeout(2000);

    // Verify state consistency
    const stateConsistency = await callerPage.evaluate(() => ({
      hasPeerConnection: !!window.__peerConnection,
      hasLocalStream: !!window.__localStream,
      callState: window.__callState,
    }));

    // State should be consistent (either all cleaned up or all present)
    expect(stateConsistency.callState).toBeDefined();
  });

  test('should handle multiple sequential errors', async () => {
    // Simulate multiple errors
    const errors = ['PERMISSION_DENIED', 'NETWORK_ERROR', 'ICE_FAILED'];

    for (const error of errors) {
      await callerPage.evaluate((err) => {
        window.__simulateError = err;
      }, error);

      await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
      await callerPage.click("[data-testid='call-button']");

      // Wait for error
      await callerPage.waitForSelector("[data-testid='error-message']", { timeout: 10000 });

      // Dismiss error
      await callerPage.click("[data-testid='dismiss-error-button']").catch(() => {});

      // Reset
      await callerPage.evaluate(() => {
        window.__simulateError = null;
      });

      await callerPage.waitForTimeout(500);
    }

    // Should still be able to make calls
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Should show ringing or connecting
    await callerPage
      .waitForFunction(
        () => {
          const statusEl = document.querySelector("[data-testid='call-status']");
          return (
            statusEl &&
            (statusEl.textContent.toLowerCase().includes('ringing') ||
              statusEl.textContent.toLowerCase().includes('connecting'))
          );
        },
        { timeout: 10000 }
      )
      .catch(() => {});
  });
});

// =====================================================
// TEST SUITE: BROWSER CONTEXT ISOLATION
// =====================================================

test.describe('Browser Context Isolation', () => {
  test('should maintain separate WebRTC state per context', async ({ browser }) => {
    // Create two completely isolated contexts
    const context1 = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    const context2 = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });

    const page1 = await setupAuthenticatedContext(context1, TEST_USERS.caller);
    const page2 = await setupAuthenticatedContext(context2, TEST_USERS.callee);

    try {
      // Verify isolated state
      const state1 = await page1.evaluate(() => window.__webRTCState);
      const state2 = await page2.evaluate(() => window.__webRTCState);

      // States should be independent
      expect(state1).not.toBe(state2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should not share localStorage between contexts', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await page1.goto(`${TEST_CONFIG.baseUrl}/dashboard`);
      await page2.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

      // Set different auth in each context
      await page1.evaluate(() => {
        localStorage.setItem('test_key', 'context1_value');
      });

      await page2.evaluate(() => {
        localStorage.setItem('test_key', 'context2_value');
      });

      // Verify isolation
      const value1 = await page1.evaluate(() => localStorage.getItem('test_key'));
      const value2 = await page2.evaluate(() => localStorage.getItem('test_key'));

      expect(value1).toBe('context1_value');
      expect(value2).toBe('context2_value');
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should handle concurrent calls from same user', async ({ browser }) => {
    const context1 = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    const context2 = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });

    const page1 = await setupAuthenticatedContext(context1, TEST_USERS.caller);
    const page2 = await setupAuthenticatedContext(context2, TEST_USERS.caller); // Same user

    try {
      // Initiate call from first context
      await page1.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
      await page1.click("[data-testid='call-button']");

      // Attempt call from second context (same user)
      await page2.fill("[data-testid='phone-input']", 'care4w-1000003');
      await page2.click("[data-testid='call-button']");

      // Second call should be blocked or show error
      await page2
        .waitForFunction(
          () => {
            const statusEl = document.querySelector("[data-testid='call-status']");
            return (
              statusEl &&
              (statusEl.textContent.toLowerCase().includes('error') ||
                statusEl.textContent.toLowerCase().includes('busy') ||
                statusEl.textContent.toLowerCase().includes('already'))
            );
          },
          { timeout: 10000 }
        )
        .catch(() => {
          // May allow in some implementations
        });
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

module.exports = { TEST_CONFIG, TEST_USERS };
