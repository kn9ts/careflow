/**
 * Test Helpers Index
 *
 * Exports all test helper utilities for WebRTC integration testing.
 *
 * @module tests/helpers
 */

const webrtcHelpers = require('./webrtc-helpers');
const firebaseHelpers = require('./firebase-helpers');
const MockCallManager = require('./callManager-mock');

module.exports = {
  // WebRTC Helpers
  ...webrtcHelpers,

  // Firebase Helpers
  ...firebaseHelpers,

  // Mocks
  MockCallManager,
  createMockCallManager: webrtcHelpers.createMockCallManager,
  createMockWebRTCManager: webrtcHelpers.createMockWebRTCManager,
};
