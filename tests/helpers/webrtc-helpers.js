/**
 * WebRTC Test Helper Utilities
 *
 * Provides utilities for testing WebRTC functionality including:
 * - State waiting helpers
 * - Mock ICE candidate generation
 * - SDP validation
 * - Audio activity detection
 * - Fake media stream creation
 *
 * @module tests/helpers/webrtc-helpers
 */

/**
 * Wait for peer connection to reach a specific state
 * @param {Object} manager - WebRTCManager or CallManager instance
 * @param {string} targetState - Target connection state
 * @param {number} timeout - Maximum wait time in milliseconds
 * @returns {Promise<boolean>} True if state reached, false on timeout
 */
async function waitForState(manager, targetState, timeout = 10000) {
  const startTime = Date.now();

  return new Promise((resolve) => {
    // Check current state immediately
    const currentState = manager._connectionState || manager.getState?.()?.connectionState;
    if (currentState === targetState) {
      resolve(true);
      return;
    }

    // Set up listener for state changes
    const stateHandler = (state) => {
      const newState = typeof state === 'string' ? state : state?.state;
      if (newState === targetState) {
        cleanup();
        resolve(true);
      }
    };

    // Cleanup function
    const cleanup = () => {
      clearTimeout(timeoutId);
      manager.off?.('onConnectionStateChange', stateHandler);
      manager.off?.('onStateChanged', stateHandler);
    };

    // Timeout handler
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeout);

    // Register listener
    manager.on?.('onConnectionStateChange', stateHandler);
    manager.on?.('onStateChanged', stateHandler);
  });
}

/**
 * Wait for ICE gathering to complete
 * @param {RTCPeerConnection} peerConnection - The peer connection
 * @param {number} timeout - Maximum wait time in milliseconds
 * @returns {Promise<boolean>} True if gathering complete, false on timeout
 */
async function waitForIceGathering(peerConnection, timeout = 5000) {
  if (peerConnection.iceGatheringState === 'complete') {
    return true;
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(false), timeout);

    const handler = () => {
      if (peerConnection.iceGatheringState === 'complete') {
        clearTimeout(timeoutId);
        peerConnection.removeEventListener('icegatheringstatechange', handler);
        resolve(true);
      }
    };

    peerConnection.addEventListener('icegatheringstatechange', handler);
  });
}

/**
 * Wait for connection to be established
 * @param {RTCPeerConnection} peerConnection - The peer connection
 * @param {number} timeout - Maximum wait time in milliseconds
 * @returns {Promise<boolean>} True if connected, false on timeout
 */
async function waitForConnection(peerConnection, timeout = 15000) {
  if (peerConnection.connectionState === 'connected') {
    return true;
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(false), timeout);

    const handler = () => {
      if (peerConnection.connectionState === 'connected') {
        clearTimeout(timeoutId);
        peerConnection.removeEventListener('connectionstatechange', handler);
        resolve(true);
      } else if (peerConnection.connectionState === 'failed') {
        clearTimeout(timeoutId);
        peerConnection.removeEventListener('connectionstatechange', handler);
        resolve(false);
      }
    };

    peerConnection.addEventListener('connectionstatechange', handler);
  });
}

/**
 * Generate a mock ICE candidate
 * @param {string} type - Candidate type: 'host', 'srflx', 'relay'
 * @param {Object} options - Additional options
 * @returns {RTCIceCandidateInit} Mock ICE candidate
 */
function createMockIceCandidate(type = 'host', options = {}) {
  const candidates = {
    host: {
      candidate: `candidate:1 1 udp 2113937151 192.168.1.${Math.floor(Math.random() * 255)} ${Math.floor(Math.random() * 60000) + 1000} typ host`,
      sdpMid: '0',
      sdpMLineIndex: 0,
    },
    srflx: {
      candidate: `candidate:2 1 udp 1677729535 ${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)} ${Math.floor(Math.random() * 60000) + 1000} typ srflx raddr 192.168.1.1 rport 54321`,
      sdpMid: '0',
      sdpMLineIndex: 0,
    },
    relay: {
      candidate: `candidate:3 1 udp 1677729535 ${options.relayIp || '54.202.20.2'} ${Math.floor(Math.random() * 60000) + 1000} typ relay raddr ${options.raddr || '192.168.1.1'} rport ${options.rport || 54321}`,
      sdpMid: '0',
      sdpMLineIndex: 0,
    },
  };

  return candidates[type] || candidates.host;
}

/**
 * Validate SDP structure
 * @param {RTCSessionDescriptionInit} sdp - SDP to validate
 * @param {string} expectedType - Expected type: 'offer' or 'answer'
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateSdp(sdp, expectedType) {
  const errors = [];

  if (!sdp) {
    errors.push('SDP is null or undefined');
    return { valid: false, errors };
  }

  if (sdp.type !== expectedType) {
    errors.push(`Expected type '${expectedType}', got '${sdp.type}'`);
  }

  if (!sdp.sdp) {
    errors.push('SDP string is missing');
    return { valid: false, errors };
  }

  const sdpStr = sdp.sdp;

  // Check for required SDP lines
  if (!sdpStr.includes('v=0')) {
    errors.push('Missing version line (v=0)');
  }

  if (!sdpStr.includes('o=')) {
    errors.push('Missing origin line (o=)');
  }

  if (!sdpStr.includes('s=')) {
    errors.push('Missing session name line (s=)');
  }

  // Check for audio media line
  if (!sdpStr.includes('m=audio')) {
    errors.push('Missing audio media line (m=audio)');
  }

  // Check for ICE credentials
  if (!sdpStr.includes('a=ice-ufrag')) {
    errors.push('Missing ICE ufrag');
  }

  if (!sdpStr.includes('a=ice-pwd')) {
    errors.push('Missing ICE password');
  }

  // Check for fingerprint (DTLS)
  if (!sdpStr.includes('a=fingerprint')) {
    errors.push('Missing DTLS fingerprint');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract codec from SDP
 * @param {string} sdp - SDP string
 * @returns {string|null} Primary audio codec name
 */
function extractCodec(sdp) {
  const lines = sdp.split('\r\n');

  // Find audio media line
  const audioLine = lines.find((l) => l.startsWith('m=audio'));
  if (!audioLine) return null;

  // Get payload types from audio line
  const payloadTypes = audioLine.split(' ').slice(3);

  // Find rtpmap for first payload type
  for (const pt of payloadTypes) {
    const rtpmapLine = lines.find((l) => l.includes(`a=rtpmap:${pt}`));
    if (rtpmapLine) {
      const match = rtpmapLine.match(/a=rtpmap:\d+\s+(\w+)/);
      if (match) return match[1];
    }
  }

  return null;
}

/**
 * Check if SDP contains specific codec
 * @param {string} sdp - SDP string
 * @param {string} codec - Codec name to check (e.g., 'opus', 'PCMU')
 * @returns {boolean} True if codec is present
 */
function hasCodec(sdp, codec) {
  return sdp.toLowerCase().includes(codec.toLowerCase());
}

/**
 * Create a fake MediaStream for testing
 * @param {boolean} audioEnabled - Whether to include audio track
 * @param {boolean} videoEnabled - Whether to include video track
 * @returns {MediaStream} Fake media stream
 */
function createFakeMediaStream(audioEnabled = true, videoEnabled = false) {
  // This is a placeholder - in actual tests with Playwright,
  // the browser will provide fake streams via permissions
  const stream = new MediaStream();

  if (audioEnabled) {
    // In a real browser environment, this would create an actual track
    // For Node.js testing, we need to mock this
    const audioTrack = {
      kind: 'audio',
      id: `audio-track-${Date.now()}`,
      enabled: true,
      muted: false,
      readyState: 'live',
      label: 'Fake Audio Track',
      stop: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    stream.addTrack?.(audioTrack);
  }

  if (videoEnabled) {
    const videoTrack = {
      kind: 'video',
      id: `video-track-${Date.now()}`,
      enabled: true,
      muted: false,
      readyState: 'live',
      label: 'Fake Video Track',
      stop: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    stream.addTrack?.(videoTrack);
  }

  return stream;
}

/**
 * Wait for remote stream to be received
 * @param {Object} manager - WebRTCManager instance
 * @param {number} timeout - Maximum wait time in milliseconds
 * @returns {Promise<MediaStream|null>} Remote stream or null on timeout
 */
async function waitForRemoteStream(manager, timeout = 10000) {
  if (manager.remoteStream) {
    return manager.remoteStream;
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      manager.off?.('onRemoteStream', handler);
      resolve(null);
    }, timeout);

    const handler = (stream) => {
      clearTimeout(timeoutId);
      manager.off?.('onRemoteStream', handler);
      resolve(stream);
    };

    manager.on?.('onRemoteStream', handler);
  });
}

/**
 * Get connection statistics
 * @param {RTCPeerConnection} peerConnection - The peer connection
 * @returns {Promise<Object>} Connection statistics
 */
async function getConnectionStats(peerConnection) {
  const stats = await peerConnection.getStats();

  const result = {
    audio: {
      inbound: { bytesReceived: 0, packetsReceived: 0, packetsLost: 0, jitter: 0 },
      outbound: { bytesSent: 0, packetsSent: 0 },
    },
    video: {
      inbound: { bytesReceived: 0, packetsReceived: 0, packetsLost: 0 },
      outbound: { bytesSent: 0, packetsSent: 0 },
    },
    connection: {
      state: peerConnection.connectionState,
      iceState: peerConnection.iceConnectionState,
      signalingState: peerConnection.signalingState,
    },
    candidates: {
      local: [],
      remote: [],
    },
    codec: null,
  };

  stats.forEach((report) => {
    if (report.type === 'inbound-rtp') {
      const mediaType = report.kind || 'audio';
      if (result[mediaType]) {
        result[mediaType].inbound.bytesReceived = report.bytesReceived || 0;
        result[mediaType].inbound.packetsReceived = report.packetsReceived || 0;
        result[mediaType].inbound.packetsLost = report.packetsLost || 0;
        if (report.kind === 'audio') {
          result[mediaType].inbound.jitter = report.jitter || 0;
        }
      }
    }

    if (report.type === 'outbound-rtp') {
      const mediaType = report.kind || 'audio';
      if (result[mediaType]) {
        result[mediaType].outbound.bytesSent = report.bytesSent || 0;
        result[mediaType].outbound.packetsSent = report.packetsSent || 0;
      }
    }

    if (report.type === 'local-candidate') {
      result.candidates.local.push({
        type: report.candidateType,
        protocol: report.protocol,
        ip: report.ip,
        port: report.port,
      });
    }

    if (report.type === 'remote-candidate') {
      result.candidates.remote.push({
        type: report.candidateType,
        protocol: report.protocol,
        ip: report.ip,
        port: report.port,
      });
    }

    if (report.type === 'codec' && report.mimeType?.includes('audio')) {
      result.codec = report.mimeType;
    }
  });

  return result;
}

/**
 * Wait for audio bytes to flow through connection
 * @param {RTCPeerConnection} peerConnection - The peer connection
 * @param {number} minBytes - Minimum bytes to consider successful
 * @param {number} timeout - Maximum wait time in milliseconds
 * @returns {Promise<boolean>} True if audio bytes received
 */
async function waitForAudioFlow(peerConnection, minBytes = 100, timeout = 5000) {
  const startTime = Date.now();
  let lastBytes = 0;

  while (Date.now() - startTime < timeout) {
    const stats = await getConnectionStats(peerConnection);
    const currentBytes = stats.audio.inbound.bytesReceived;

    if (currentBytes >= minBytes) {
      return true;
    }

    if (currentBytes > lastBytes) {
      lastBytes = currentBytes;
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  return false;
}

/**
 * Generate a unique room ID for testing
 * @param {string} callerId - Caller's CareFlow ID
 * @param {string} calleeId - Callee's CareFlow ID
 * @returns {string} Unique room ID
 */
function generateTestRoomId(callerId, calleeId) {
  return `${callerId}-${calleeId}-${Date.now()}`;
}

/**
 * Create a test offer SDP
 * @param {Object} options - Offer options
 * @returns {RTCSessionDescriptionInit} Test offer
 */
function createTestOffer(options = {}) {
  const {
    iceUfrag = 'testUfrag',
    icePwd = 'testPassword123456789012',
    fingerprint = '00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF',
  } = options;

  return {
    type: 'offer',
    sdp: `v=0
o=- ${Date.now()} 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0
m=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:${iceUfrag}
a=ice-pwd:${icePwd}
a=fingerprint:sha-256 ${fingerprint}
a=setup:actpass
a=mid:0
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=sendrecv
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10;useinbandfec=1
a=rtpmap:103 ISAC/16000
a=rtpmap:104 ISAC/32000
a=rtpmap:9 G722/8000
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=ssrc:${Math.floor(Math.random() * 1000000)} cname:testcname`,
  };
}

/**
 * Create a test answer SDP
 * @param {RTCSessionDescriptionInit} offer - The offer to answer
 * @returns {RTCSessionDescriptionInit} Test answer
 */
function createTestAnswer(offer) {
  return {
    type: 'answer',
    sdp: offer.sdp.replace('setup:actpass', 'setup:active'),
  };
}

/**
 * Sleep for specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an operation until success or max attempts
 * @param {Function} operation - Async operation to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} delay - Delay between attempts in ms
 * @returns {Promise<any>} Operation result
 */
async function retry(operation, maxAttempts = 3, delay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Create a mock CallManager for testing
 * @param {Object} options - Mock options
 * @returns {Object} Mock CallManager
 */
function createMockCallManager(options = {}) {
  const {
    mode = 'webrtc',
    care4wId = 'care4w-1000001',
    initialized = true,
    connectionState = 'ready',
  } = options;

  const listeners = new Map();

  return {
    mode,
    care4wId,
    _initialized: initialized,
    _connectionState: connectionState,
    _initializationPromise: null,

    on: jest.fn((event, callback) => {
      listeners.set(event, callback);
    }),

    off: jest.fn((event) => {
      listeners.delete(event);
    }),

    emit: (event, data) => {
      const callback = listeners.get(event);
      if (callback) callback(data);
    },

    initialize: jest.fn(async () => ({ mode, care4wId })),

    makeCall: jest.fn(async () => {}),

    endCall: jest.fn(async () => {
      listeners.clear();
    }),

    getConnectionState: jest.fn(() => ({
      state: connectionState,
      initialized,
      mode,
    })),

    getModeInfo: jest.fn(() => ({
      mode,
      isWebRTC: mode === 'webrtc',
      isTwilio: mode === 'twilio',
    })),
  };
}

/**
 * Create a mock WebRTCManager for testing
 * @param {Object} options - Mock options
 * @returns {Object} Mock WebRTCManager
 */
function createMockWebRTCManager(options = {}) {
  const {
    localCare4wId = 'care4w-1000001',
    initialized = true,
    connectionState = 'ready',
  } = options;

  const listeners = new Map();
  let peerConnection = null;

  return {
    localCare4wId,
    _initialized: initialized,
    _connectionState: connectionState,
    peerConnection: null,
    localStream: null,
    remoteStream: null,
    currentRoomId: null,

    on: jest.fn((event, callback) => {
      listeners.set(event, callback);
    }),

    off: jest.fn((event) => {
      listeners.delete(event);
    }),

    emit: (event, data) => {
      const callback = listeners.get(event);
      if (callback) callback(data);
    },

    initialize: jest.fn(async () => {
      peerConnection = {
        connectionState: 'new',
        iceConnectionState: 'new',
        signalingState: 'stable',
        localDescription: null,
        remoteDescription: null,
        createOffer: jest.fn(async () => createTestOffer()),
        createAnswer: jest.fn(async () => createTestAnswer({})),
        setLocalDescription: jest.fn(async () => {}),
        setRemoteDescription: jest.fn(async () => {}),
        addIceCandidate: jest.fn(async () => {}),
        close: jest.fn(() => {}),
        getStats: jest.fn(async () => new Map()),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      return peerConnection;
    }),

    getLocalStream: jest.fn(async () => createFakeMediaStream()),

    createOffer: jest.fn(async (targetId) => {
      return createTestOffer();
    }),

    acceptCall: jest.fn(async (roomId, offer) => {
      return createTestAnswer(offer);
    }),

    endCall: jest.fn(async () => {
      listeners.clear();
      peerConnection = null;
    }),

    getState: jest.fn(() => ({
      initialized,
      connectionState,
      hasLocalStream: false,
      hasRemoteStream: false,
      currentRoomId: null,
    })),

    toggleMute: jest.fn(() => false),

    startRecording: jest.fn(async () => {}),

    stopRecording: jest.fn(async () => ({
      blob: new Blob(),
      duration: 0,
    })),

    static: {
      isSupported: jest.fn(() => true),
    },
  };
}

module.exports = {
  waitForState,
  waitForIceGathering,
  waitForConnection,
  waitForRemoteStream,
  waitForAudioFlow,
  createMockIceCandidate,
  validateSdp,
  extractCodec,
  hasCodec,
  createFakeMediaStream,
  getConnectionStats,
  generateTestRoomId,
  createTestOffer,
  createTestAnswer,
  sleep,
  retry,
  createMockCallManager,
  createMockWebRTCManager,
};
