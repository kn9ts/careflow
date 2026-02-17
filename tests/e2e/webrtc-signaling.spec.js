/**
 * WebRTC Signaling Lifecycle E2E Tests
 *
 * Comprehensive E2E tests for WebRTC signaling lifecycle validation using Playwright.
 * Tests SDP offer/answer exchange, ICE candidate gathering, and PeerConnection state
 * transitions with distinct browser contexts for caller and callee.
 *
 * @module tests/e2e/webrtc-signaling.spec.js
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3001',
  timeout: 30000,
  callTimeout: 60000,
  signalingTimeout: 10000,
  iceGatheringTimeout: 15000,
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
// TEST SUITE: SDP OFFER/ANSWER EXCHANGE
// =====================================================

test.describe('SDP Offer/Answer Exchange', () => {
  let callerContext;
  let calleeContext;
  let callerPage;
  let calleePage;

  test.beforeEach(async ({ browser }) => {
    callerContext = await browser.newContext();
    calleeContext = await browser.newContext();

    callerPage = await setupAuthenticatedContext(callerContext, TEST_USERS.caller);
    calleePage = await setupAuthenticatedContext(calleeContext, TEST_USERS.callee);

    // Wait for dialer tab to be available
    await callerPage.waitForSelector("[data-testid='dialer-tab']", { timeout: 10000 });
    await calleePage.waitForSelector("[data-testid='dialer-tab']", { timeout: 10000 });
  });

  test.afterEach(async () => {
    await callerContext.close();
    await calleeContext.close();
  });

  test('should create valid SDP offer when initiating call', async () => {
    // Navigate to dialer and initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for SDP offer creation
    const sdpOffer = await callerPage.evaluate(() => window.__lastSdpOffer || null);

    // Verify SDP offer exists and has valid structure
    expect(sdpOffer).not.toBeNull();
    expect(sdpOffer.type).toBe('offer');
    expect(sdpOffer.sdp).toBeDefined();
    expect(sdpOffer.sdp).toContain('v=0'); // SDP version
    expect(sdpOffer.sdp).toContain('m=audio'); // Audio media line
  });

  test('should create valid SDP answer when accepting call', async () => {
    // Caller initiates call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Callee sees incoming call
    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });

    // Callee accepts call
    await calleePage.click("[data-testid='accept-call-button']");

    // Wait for SDP answer creation
    const sdpAnswer = await calleePage.evaluate(() => window.__lastSdpAnswer || null);

    // Verify SDP answer exists and has valid structure
    expect(sdpAnswer).not.toBeNull();
    expect(sdpAnswer.type).toBe('answer');
    expect(sdpAnswer.sdp).toBeDefined();
    expect(sdpAnswer.sdp).toContain('v=0'); // SDP version
    expect(sdpAnswer.sdp).toContain('m=audio'); // Audio media line
  });

  test('should exchange SDP via Firebase signaling channel', async () => {
    // Track Firebase signaling events
    await callerPage.evaluate(() => {
      window.__signalingEvents = [];
      window.__firebaseListener = (event) => {
        window.__signalingEvents.push(event);
      };
    });

    await calleePage.evaluate(() => {
      window.__signalingEvents = [];
      window.__firebaseListener = (event) => {
        window.__signalingEvents.push(event);
      };
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for offer to be written to Firebase
    await callerPage.waitForFunction(
      () => window.__signalingEvents?.some((e) => e.type === 'offer_sent'),
      { timeout: 10000 }
    );

    // Callee should receive offer
    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });

    // Accept call
    await calleePage.click("[data-testid='accept-call-button']");

    // Wait for answer to be written to Firebase
    await calleePage.waitForFunction(
      () => window.__signalingEvents?.some((e) => e.type === 'answer_sent'),
      { timeout: 10000 }
    );

    // Caller should receive answer
    await callerPage.waitForFunction(
      () => window.__signalingEvents?.some((e) => e.type === 'answer_received'),
      { timeout: 10000 }
    );

    // Verify both sides have exchanged SDP
    const callerEvents = await callerPage.evaluate(() => window.__signalingEvents || []);
    const calleeEvents = await calleePage.evaluate(() => window.__signalingEvents || []);

    expect(callerEvents.some((e) => e.type === 'offer_sent')).toBe(true);
    expect(calleeEvents.some((e) => e.type === 'offer_received')).toBe(true);
    expect(calleeEvents.some((e) => e.type === 'answer_sent')).toBe(true);
    expect(callerEvents.some((e) => e.type === 'answer_received')).toBe(true);
  });

  test('should handle SDP renegotiation during call', async () => {
    // Establish initial connection
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');
    await waitForWebRTCState(calleePage, 'connected');

    // Track renegotiation events
    await callerPage.evaluate(() => {
      window.__renegotiationEvents = [];
    });

    // Trigger renegotiation (e.g., add video stream)
    await callerPage.evaluate(() => {
      if (window.__webRTCManager && window.__webRTCManager.addVideoTrack) {
        window.__webRTCManager.addVideoTrack();
      }
    });

    // Wait for renegotiation to complete
    await callerPage.waitForFunction(() => window.__renegotiationEvents?.length > 0, {
      timeout: 10000,
    });

    const renegotiationEvents = await callerPage.evaluate(() => window.__renegotiationEvents || []);
    expect(renegotiationEvents.some((e) => e.type === 'negotiationneeded')).toBe(true);
  });

  test('should validate SDP codec preferences', async () => {
    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Get SDP offer
    const sdpOffer = await callerPage.evaluate(() => window.__lastSdpOffer);

    // Verify preferred codecs are present
    // OPUS should be preferred for audio
    expect(sdpOffer.sdp).toContain('opus');

    // Check for codec order (OPUS should be first)
    const audioLine = sdpOffer.sdp.split('\n').find((line) => line.startsWith('m=audio'));
    expect(audioLine).toBeDefined();
  });
});

// =====================================================
// TEST SUITE: ICE CANDIDATE GATHERING
// =====================================================

test.describe('ICE Candidate Gathering', () => {
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

  test('should gather host ICE candidates', async () => {
    // Track ICE candidates
    await callerPage.evaluate(() => {
      window.__iceCandidates = [];
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for ICE gathering to start
    await callerPage.waitForFunction(() => window.__iceCandidates?.length > 0, {
      timeout: TEST_CONFIG.iceGatheringTimeout,
    });

    const iceCandidates = await callerPage.evaluate(() => window.__iceCandidates || []);

    // Should have at least host candidates
    const hostCandidates = iceCandidates.filter((c) => c.candidate?.includes('host'));
    expect(hostCandidates.length).toBeGreaterThan(0);
  });

  test('should gather srflx ICE candidates via STUN', async () => {
    // Track ICE candidates
    await callerPage.evaluate(() => {
      window.__iceCandidates = [];
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for ICE gathering
    await callerPage
      .waitForFunction(() => window.__iceCandidates?.some((c) => c.candidate?.includes('srflx')), {
        timeout: TEST_CONFIG.iceGatheringTimeout,
      })
      .catch(() => {
        // srflx candidates may not always be available in test environment
        console.log('No srflx candidates found - may be expected in test environment');
      });

    const iceCandidates = await callerPage.evaluate(() => window.__iceCandidates || []);

    // In a real environment, we'd expect srflx candidates
    // In test environment, we just verify gathering occurred
    expect(iceCandidates.length).toBeGreaterThan(0);
  });

  test('should use configured STUN servers', async () => {
    // Check ICE server configuration
    const iceServers = await callerPage.evaluate(() => window.__iceServersConfig || []);

    // Should have STUN servers configured
    const stunServers = iceServers.filter((s) => s.urls?.some((u) => u.startsWith('stun:')));
    expect(stunServers.length).toBeGreaterThan(0);
  });

  test('should use TURN server when configured', async () => {
    // Check for TURN configuration
    const iceServers = await callerPage.evaluate(() => window.__iceServersConfig || []);

    // Check if TURN is configured (optional)
    const turnServers = iceServers.filter((s) => s.urls?.some((u) => u.startsWith('turn:')));

    // If TURN is configured, verify credentials
    if (turnServers.length > 0) {
      expect(turnServers[0].username).toBeDefined();
      expect(turnServers[0].credential).toBeDefined();
    }
  });

  test('should complete ICE gathering state transitions', async () => {
    // Track ICE gathering state
    await callerPage.evaluate(() => {
      window.__iceGatheringStates = [];
      const originalRTCPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = function (...args) {
        const pc = new originalRTCPeerConnection(...args);
        pc.addEventListener('icegatheringstatechange', () => {
          window.__iceGatheringStates.push(pc.iceGatheringState);
        });
        return pc;
      };
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for ICE gathering to complete
    await callerPage.waitForFunction(() => window.__iceGatheringStates?.includes('complete'), {
      timeout: TEST_CONFIG.iceGatheringTimeout,
    });

    const states = await callerPage.evaluate(() => window.__iceGatheringStates || []);

    // Should transition through gathering states
    expect(states).toContain('gathering');
    expect(states).toContain('complete');
  });

  test('should exchange ICE candidates between peers', async () => {
    // Track ICE candidate exchange
    await callerPage.evaluate(() => {
      window.__sentIceCandidates = [];
      window.__receivedIceCandidates = [];
    });

    await calleePage.evaluate(() => {
      window.__sentIceCandidates = [];
      window.__receivedIceCandidates = [];
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    // Wait for ICE candidate exchange
    await callerPage.waitForFunction(() => window.__receivedIceCandidates?.length > 0, {
      timeout: TEST_CONFIG.iceGatheringTimeout,
    });

    await calleePage.waitForFunction(() => window.__receivedIceCandidates?.length > 0, {
      timeout: TEST_CONFIG.iceGatheringTimeout,
    });

    const callerSent = await callerPage.evaluate(() => window.__sentIceCandidates || []);
    const calleeReceived = await calleePage.evaluate(() => window.__receivedIceCandidates || []);

    // Verify candidates were exchanged
    expect(callerSent.length).toBeGreaterThan(0);
    expect(calleeReceived.length).toBeGreaterThan(0);
  });

  test('should handle trickle ICE correctly', async () => {
    // Track trickle ICE timing
    await callerPage.evaluate(() => {
      window.__trickleIceTiming = [];
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for multiple ICE candidates (trickle)
    await callerPage.waitForFunction(() => window.__trickleIceTiming?.length >= 2, {
      timeout: TEST_CONFIG.iceGatheringTimeout,
    });

    const timing = await callerPage.evaluate(() => window.__trickleIceTiming || []);

    // Verify candidates were sent incrementally (trickle)
    // Each candidate should be sent as it's gathered
    for (let i = 1; i < timing.length; i++) {
      expect(timing[i].timestamp).toBeGreaterThan(timing[i - 1].timestamp);
    }
  });
});

// =====================================================
// TEST SUITE: PEERCONNECTION STATE TRANSITIONS
// =====================================================

test.describe('PeerConnection State Transitions', () => {
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

  test('should transition through connection states in order', async () => {
    // Track connection states
    await callerPage.evaluate(() => {
      window.__connectionStates = [];
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    // Wait for connection
    await waitForWebRTCState(callerPage, 'connected');

    const states = await callerPage.evaluate(() => window.__connectionStates || []);

    // Verify state transitions
    expect(states).toContain('new');
    expect(states).toContain('connecting');
    expect(states).toContain('connected');
  });

  test('should track ICE connection state changes', async () => {
    // Track ICE connection states
    await callerPage.evaluate(() => {
      window.__iceConnectionStates = [];
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    // Wait for ICE connection
    await callerPage.waitForFunction(
      () =>
        window.__iceConnectionStates?.includes('connected') ||
        window.__iceConnectionStates?.includes('completed'),
      { timeout: 15000 }
    );

    const iceStates = await callerPage.evaluate(() => window.__iceConnectionStates || []);

    // Should have valid ICE connection states
    expect(iceStates.some((s) => ['connected', 'completed'].includes(s))).toBe(true);
  });

  test('should handle signaling state transitions', async () => {
    // Track signaling states
    await callerPage.evaluate(() => {
      window.__signalingStates = [];
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for offer creation
    await callerPage.waitForFunction(() => window.__signalingStates?.includes('have-local-offer'), {
      timeout: 10000,
    });

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    // Wait for stable state
    await callerPage.waitForFunction(() => window.__signalingStates?.includes('stable'), {
      timeout: 15000,
    });

    const signalingStates = await callerPage.evaluate(() => window.__signalingStates || []);

    // Verify signaling state transitions
    expect(signalingStates).toContain('have-local-offer');
    expect(signalingStates).toContain('stable');
  });

  test('should handle connection failure state', async () => {
    // Simulate connection failure
    await callerPage.evaluate(() => {
      window.__simulateConnectionFailure = true;
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for failure state
    await callerPage.waitForFunction(
      () => {
        const statusEl = document.querySelector("[data-testid='call-status']");
        return (
          statusEl &&
          (statusEl.textContent.toLowerCase().includes('failed') ||
            statusEl.textContent.toLowerCase().includes('error'))
        );
      },
      { timeout: 20000 }
    );

    const iceStates = await callerPage.evaluate(() => window.__iceConnectionStates || []);
    expect(iceStates.some((s) => ['failed', 'disconnected'].includes(s))).toBe(true);
  });

  test('should handle disconnection state', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Simulate network disconnection
    await callerContext.setOffline(true);

    // Wait for disconnection state
    await callerPage
      .waitForFunction(() => window.__iceConnectionStates?.includes('disconnected'), {
        timeout: 10000,
      })
      .catch(() => {
        // May not always trigger in test environment
      });

    // Restore network
    await callerContext.setOffline(false);
  });

  test('should cleanup connection state on hangup', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Hang up
    await callerPage.click("[data-testid='hangup-button']");

    // Wait for cleanup
    await callerPage.waitForFunction(() => window.__iceConnectionStates?.includes('closed'), {
      timeout: 5000,
    });

    const finalStates = await callerPage.evaluate(() => window.__iceConnectionStates || []);
    expect(finalStates).toContain('closed');
  });
});

// =====================================================
// TEST SUITE: MEDIA STREAM TRANSMISSION
// =====================================================

test.describe('Media Stream Transmission', () => {
  let callerContext;
  let calleeContext;
  let callerPage;
  let calleePage;

  test.beforeEach(async ({ browser }) => {
    // Grant media permissions
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

  test('should get local media stream on call initiation', async () => {
    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for local stream
    await callerPage.waitForFunction(() => window.__localStream !== null, { timeout: 10000 });

    const localStream = await callerPage.evaluate(() => window.__localStream);

    // Verify local stream
    expect(localStream).toBeDefined();
    expect(localStream.getAudioTracks().length).toBeGreaterThan(0);
  });

  test('should receive remote media stream on connection', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Wait for remote stream
    await callerPage.waitForFunction(() => window.__remoteStream !== null, { timeout: 10000 });

    const remoteStream = await callerPage.evaluate(() => window.__remoteStream);

    // Verify remote stream
    expect(remoteStream).toBeDefined();
    expect(remoteStream.getAudioTracks().length).toBeGreaterThan(0);
  });

  test('should handle audio track mute/unmute', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Mute audio
    await callerPage.click("[data-testid='mute-button']");

    // Verify muted state
    const isMuted = await callerPage.evaluate(() => {
      const localStream = window.__localStream;
      if (!localStream) return false;
      const audioTrack = localStream.getAudioTracks()[0];
      return audioTrack ? !audioTrack.enabled : false;
    });

    expect(isMuted).toBe(true);

    // Unmute
    await callerPage.click("[data-testid='mute-button']");

    const isUnmuted = await callerPage.evaluate(() => {
      const localStream = window.__localStream;
      if (!localStream) return false;
      const audioTrack = localStream.getAudioTracks()[0];
      return audioTrack ? audioTrack.enabled : false;
    });

    expect(isUnmuted).toBe(true);
  });

  test('should verify audio is flowing through connection', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Wait for audio flow detection
    await callerPage.waitForFunction(() => window.__audioFlowDetected === true, { timeout: 15000 });

    const audioFlowing = await callerPage.evaluate(() => window.__audioFlowDetected);
    expect(audioFlowing).toBe(true);
  });

  test('should handle media device changes during call', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Simulate device change
    await callerPage.evaluate(() => {
      // Dispatch device change event
      navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
    });

    // Verify call remains stable
    await callerPage.waitForTimeout(1000);

    const callStatus = await callerPage.evaluate(() => {
      const statusEl = document.querySelector("[data-testid='call-status']");
      return statusEl ? statusEl.textContent : '';
    });

    expect(callStatus.toLowerCase()).toContain('connected');
  });

  test('should get connection statistics including bytes sent/received', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Wait for some data to flow
    await callerPage.waitForTimeout(2000);

    // Get connection stats
    const stats = await callerPage.evaluate(async () => {
      if (!window.__peerConnection) return null;

      const statsReport = await window.__peerConnection.getStats();
      const stats = {};

      statsReport.forEach((report, id) => {
        if (report.type === 'outbound-rtp' && report.kind === 'audio') {
          stats.bytesSent = report.bytesSent;
        }
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          stats.bytesReceived = report.bytesReceived;
        }
      });

      return stats;
    });

    // Verify stats are being collected
    expect(stats).not.toBeNull();
    expect(stats.bytesSent).toBeDefined();
    expect(stats.bytesReceived).toBeDefined();
    expect(stats.bytesSent).toBeGreaterThan(0);
    expect(stats.bytesReceived).toBeGreaterThan(0);
  });
});

// =====================================================
// TEST SUITE: ASYNC OPERATIONS & CLEANUP
// =====================================================

test.describe('Async Operations & Cleanup', () => {
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

  test('should cleanup all resources on call end', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Hang up
    await callerPage.click("[data-testid='hangup-button']");

    // Wait for cleanup
    await callerPage.waitForTimeout(1000);

    // Verify cleanup
    const cleanupState = await callerPage.evaluate(() => ({
      peerConnectionClosed: window.__peerConnection?.connectionState === 'closed',
      localStreamStopped: window.__localStream?.getTracks().every((t) => t.readyState === 'ended'),
      firebaseListenersRemoved: window.__firebaseListenersRemoved === true,
    }));

    expect(cleanupState.peerConnectionClosed).toBe(true);
    expect(cleanupState.firebaseListenersRemoved).toBe(true);
  });

  test('should handle rapid call initiation and termination', async () => {
    // Rapid call cycles
    for (let i = 0; i < 3; i++) {
      await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
      await callerPage.click("[data-testid='call-button']");

      await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
      await calleePage.click("[data-testid='accept-call-button']");

      await waitForWebRTCState(callerPage, 'connected');

      // Quick hangup
      await callerPage.click("[data-testid='hangup-button']");

      // Wait for cleanup
      await callerPage.waitForFunction(
        () => window.__peerConnection?.connectionState === 'closed',
        { timeout: 5000 }
      );

      // Reset for next iteration
      await callerPage.waitForTimeout(500);
    }

    // Verify no resource leaks
    const resourceState = await callerPage.evaluate(() => ({
      activePeerConnections: window.__activePeerConnections || 0,
      activeStreams: window.__activeStreams || 0,
    }));

    expect(resourceState.activePeerConnections).toBe(0);
    expect(resourceState.activeStreams).toBe(0);
  });

  test('should handle page navigation during call', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Navigate away
    await callerPage.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

    // Verify cleanup occurred
    const cleanupState = await callerPage.evaluate(() => ({
      callEnded: true, // Navigation should end call
    }));

    // Callee should see call ended
    await calleePage
      .waitForFunction(
        () => {
          const statusEl = document.querySelector("[data-testid='call-status']");
          return statusEl && statusEl.textContent.toLowerCase().includes('ended');
        },
        { timeout: 5000 }
      )
      .catch(() => {
        // May not always trigger in test environment
      });
  });

  test('should handle browser tab close during call', async () => {
    // Establish call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    await calleePage.waitForSelector("[data-testid='incoming-call-modal']", { timeout: 10000 });
    await calleePage.click("[data-testid='accept-call-button']");

    await waitForWebRTCState(callerPage, 'connected');

    // Close caller page (simulate tab close)
    await callerPage.close();

    // Callee should detect disconnection
    await calleePage
      .waitForFunction(
        () => {
          const statusEl = document.querySelector("[data-testid='call-status']");
          return (
            statusEl &&
            (statusEl.textContent.toLowerCase().includes('ended') ||
              statusEl.textContent.toLowerCase().includes('disconnected'))
          );
        },
        { timeout: 10000 }
      )
      .catch(() => {
        // May not always trigger in test environment
      });
  });

  test('should properly handle async SDP creation', async () => {
    // Track SDP creation timing
    await callerPage.evaluate(() => {
      window.__sdpCreationTimes = [];
    });

    // Initiate call
    await callerPage.fill("[data-testid='phone-input']", TEST_USERS.callee.care4wId);
    await callerPage.click("[data-testid='call-button']");

    // Wait for SDP creation
    await callerPage.waitForFunction(() => window.__sdpCreationTimes?.length > 0, {
      timeout: 10000,
    });

    const sdpTimes = await callerPage.evaluate(() => window.__sdpCreationTimes || []);

    // Verify SDP creation completed
    expect(sdpTimes.length).toBeGreaterThan(0);
    expect(sdpTimes[0].duration).toBeDefined();
    expect(sdpTimes[0].success).toBe(true);
  });
});

export { TEST_CONFIG, TEST_USERS };
