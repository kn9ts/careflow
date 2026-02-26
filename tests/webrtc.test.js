/**
 * WebRTC Manager Unit Tests
 *
 * Comprehensive tests for WebRTC peer-to-peer calling functionality
 * using mocked WebRTC and Firebase APIs.
 */

// Mock the logger module first
jest.mock('@/lib/logger', () => ({
  logger: {
    init: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
    trace: jest.fn(),
    incomingCall: jest.fn(),
    recordingStart: jest.fn(),
    recordingStop: jest.fn(),
    complete: jest.fn(),
  },
}));

// Mock Firebase modules
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({
    name: '[DEFAULT]',
    options: {},
  })),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/database', () => {
  const off = jest.fn();
  return {
    getDatabase: jest.fn(() => ({
      ref: jest.fn(),
    })),
    ref: jest.fn(() => ({
      on: jest.fn(),
      off,
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    })),
    onValue: jest.fn((ref, callback) => {
      callback({ val: () => null });
      return jest.fn(); // unsubscribe function
    }),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    serverTimestamp: jest.fn(() => Date.now()),
    push: jest.fn(() => ({ key: 'mock-push-key' })),
    off,
  };
});

// Test utilities
const waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =====================================================
// WEBRTC MANAGER TESTS
// =====================================================

describe('WebRTCManager', () => {
  let WebRTCManager;
  let createWebRTCManager;
  let mockMediaDevices;
  let mockPeerConnection;
  let originalEnv;

  beforeAll(async () => {
    // Set up global mocks before importing
    global.window = {};

    // Mock RTCPeerConnection
    global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
      onicecandidate: null,
      onconnectionstatechange: null,
      ontrack: null,
      onsignalingstatechange: null,
      connectionState: 'new',
      signalingState: 'stable',
      localDescription: null,
      remoteDescription: null,
      iceGatheringState: 'complete',
      createOffer: jest.fn().mockResolvedValue({
        type: 'offer',
        sdp: 'v=0\r\no=- 123456789 0 IN IP4 0.0.0.0\r\ns=-\r\n',
      }),
      createAnswer: jest.fn().mockResolvedValue({
        type: 'answer',
        sdp: 'v=0\r\no=- 123456789 0 IN IP4 0.0.0.0\r\ns=-\r\n',
      }),
      setLocalDescription: jest.fn().mockResolvedValue(undefined),
      setRemoteDescription: jest.fn().mockResolvedValue(undefined),
      addIceCandidate: jest.fn().mockResolvedValue(undefined),
      addTrack: jest.fn(),
      getStats: jest.fn().mockResolvedValue(
        new Map([
          ['inbound-rtp', { type: 'inbound-rtp', bytesReceived: 1000, packetsLost: 0 }],
          ['outbound-rtp', { type: 'outbound-rtp', bytesSent: 2000 }],
          ['candidate-pair', { type: 'candidate-pair', currentRoundTripTime: 0.05 }],
        ])
      ),
      close: jest.fn(),
    }));

    // Also set on window for isWebRTCSupported check
    global.window.RTCPeerConnection = global.RTCPeerConnection;

    // Mock RTCSessionDescription
    global.RTCSessionDescription = class RTCSessionDescription {
      constructor(description) {
        this.type = description.type;
        this.sdp = description.sdp;
      }
    };
    global.window.RTCSessionDescription = global.RTCSessionDescription;

    // Mock RTCIceCandidate
    global.RTCIceCandidate = class RTCIceCandidate {
      constructor(candidate) {
        this.candidate = candidate.candidate;
        this.sdpMid = candidate.sdpMid;
        this.sdpMLineIndex = candidate.sdpMLineIndex;
      }
    };

    // Mock MediaRecorder
    global.MediaRecorder = class MediaRecorder {
      constructor(stream, options) {
        this.stream = stream;
        this.options = options;
        this.state = 'inactive';
        this.ondataavailable = null;
        this.onstop = null;
      }

      start(interval) {
        this.state = 'recording';
      }

      stop() {
        this.state = 'inactive';
        if (this.onstop) {
          this.onstop();
        }
      }

      static isTypeSupported(mimeType) {
        const supported = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
        ];
        return supported.includes(mimeType);
      }
    };

    // Mock navigator.mediaDevices
    const mockAudioTrack = { kind: 'audio', enabled: true, stop: jest.fn() };
    mockMediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue({
        id: 'local-stream-id',
        getTracks: () => [mockAudioTrack],
        getAudioTracks: () => [mockAudioTrack],
      }),
    };

    global.navigator = {
      mediaDevices: mockMediaDevices,
    };

    // Import the module after mocks are set up
    const module = await import('@/lib/webrtcLegacyv1.js');
    WebRTCManager = module.default;
    createWebRTCManager = module.createWebRTCManager;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };

    // Set required env variables
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abc123';
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL = 'https://test.firebaseio.com';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Initialization', () => {
    it('should throw error when initialized in non-browser environment', async () => {
      const manager = new WebRTCManager();
      const originalWindow = global.window;
      const originalNavigator = global.navigator;
      delete global.window;
      delete global.navigator;

      await expect(manager.initialize('test-user')).rejects.toThrow(
        'WebRTC is not supported in this browser'
      );

      global.window = originalWindow;
      global.navigator = originalNavigator;
    });

    it('should create peer connection with ICE servers', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');

      expect(global.RTCPeerConnection).toHaveBeenCalledWith({
        iceServers: expect.arrayContaining([
          expect.objectContaining({ urls: expect.stringContaining('stun:') }),
        ]),
      });
    });

    it('should use TURN server when configured', async () => {
      process.env.NEXT_PUBLIC_TURN_SERVER_URL = 'turn:test.turn.com:3478';
      process.env.NEXT_PUBLIC_TURN_USERNAME = 'test-user';
      process.env.NEXT_PUBLIC_TURN_CREDENTIAL = 'test-password';

      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');

      expect(global.RTCPeerConnection).toHaveBeenCalledWith({
        iceServers: expect.arrayContaining([
          expect.objectContaining({
            urls: 'turn:test.turn.com:3478',
            username: 'test-user',
            credential: 'test-password',
          }),
        ]),
      });
    });

    it('should set local careflow ID', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');

      expect(manager.localCare4wId).toBe('test-user-123');
    });

    it('should initialize with default state', () => {
      const manager = new WebRTCManager();

      expect(manager.peerConnection).toBeNull();
      expect(manager.localStream).toBeNull();
      expect(manager.remoteStream).toBeNull();
      expect(manager.currentRoomId).toBeNull();
      expect(manager.isRecording).toBe(false);
      expect(manager.isReconnecting).toBe(false);
      expect(manager.reconnectAttempts).toBe(0);
      expect(manager.maxReconnectAttempts).toBe(5);
    });
  });

  describe('Local Stream', () => {
    it('should get local audio stream', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');

      const stream = await manager.getLocalStream({
        audio: true,
        video: false,
      });

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
        video: false,
      });
      expect(stream).toBeDefined();
    });

    it('should handle getUserMedia errors', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');

      await expect(manager.getLocalStream()).rejects.toThrow('Permission denied');
    });
  });

  describe('Call Initiation', () => {
    it('should throw error if not initialized', async () => {
      const manager = new WebRTCManager();

      await expect(manager.createOffer('target-user')).rejects.toThrow('WebRTC not initialized');
    });

    it('should create offer successfully', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');
      await manager.getLocalStream();

      const offer = await manager.createOffer('target-user-456');

      expect(offer.type).toBe('offer');
      expect(offer.sdp).toBeDefined();
    });

    it('should set target careflow ID', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');
      await manager.getLocalStream();

      await manager.createOffer('target-user-456');

      expect(manager.targetCare4wId).toBe('target-user-456');
    });

    it('should generate room ID', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');
      await manager.getLocalStream();

      await manager.createOffer('target-user-456');

      expect(manager.currentRoomId).toMatch(/^test-user-123-target-user-456-\d+$/);
    });
  });

  describe('Call Acceptance', () => {
    it('should throw error if not initialized', async () => {
      const manager = new WebRTCManager();

      await expect(manager.acceptCall('room-id', { type: 'offer', sdp: 'test' })).rejects.toThrow(
        'WebRTC not initialized'
      );
    });

    it('should create answer', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');
      await manager.getLocalStream();

      const offer = { type: 'offer', sdp: 'v=0\r\no=test\r\n' };
      const answer = await manager.acceptCall('room-id-123', offer);

      expect(answer.type).toBe('answer');
    });
  });

  describe('Call Termination', () => {
    it('should close peer connection', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');

      await manager.endCall();

      expect(manager.peerConnection).toBeNull();
    });

    it('should call onCallEnded listener', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');

      const onCallEnded = jest.fn();
      manager.on('onCallEnded', onCallEnded);

      await manager.endCall();

      expect(onCallEnded).toHaveBeenCalled();
    });
  });

  describe('Recording', () => {
    it('should return supported MIME type', () => {
      const manager = new WebRTCManager();

      const mimeType = manager.getSupportedMimeType();

      expect(mimeType).toBeDefined();
      expect([
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ]).toContain(mimeType);
    });

    it('should start recording', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');
      await manager.getLocalStream();

      const result = await manager.startRecording();

      expect(result).toBe(true);
      expect(manager.isRecording).toBe(true);
    });

    it('should not start recording if already recording', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');
      await manager.getLocalStream();

      await manager.startRecording();
      const result = await manager.startRecording();

      expect(result).toBe(false);
    });

    it('should not start recording without local stream', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');

      const result = await manager.startRecording();

      expect(result).toBe(false);
    });

    it('should stop recording', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');
      await manager.getLocalStream();

      await manager.startRecording();
      const recording = await manager.stopRecording();

      expect(manager.isRecording).toBe(false);
      expect(recording).toBeDefined();
      expect(recording.duration).toBeDefined();
    });
  });

  describe('Event Listeners', () => {
    it('should register localStream listener', () => {
      const manager = new WebRTCManager();
      const callback = jest.fn();

      manager.on('onLocalStream', callback);

      expect(manager.listeners.onLocalStream).toBe(callback);
    });

    it('should register remoteStream listener', () => {
      const manager = new WebRTCManager();
      const callback = jest.fn();

      manager.on('onRemoteStream', callback);

      expect(manager.listeners.onRemoteStream).toBe(callback);
    });

    it('should register connectionStateChange listener', () => {
      const manager = new WebRTCManager();
      const callback = jest.fn();

      manager.on('onConnectionStateChange', callback);

      expect(manager.listeners.onConnectionStateChange).toBe(callback);
    });

    it('should register callEnded listener', () => {
      const manager = new WebRTCManager();
      const callback = jest.fn();

      manager.on('onCallEnded', callback);

      expect(manager.listeners.onCallEnded).toBe(callback);
    });

    it('should register incomingCall listener', () => {
      const manager = new WebRTCManager();
      const callback = jest.fn();

      manager.on('onIncomingCall', callback);

      expect(manager.listeners.onIncomingCall).toBe(callback);
    });

    it('should unregister listener', () => {
      const manager = new WebRTCManager();
      const callback = jest.fn();

      manager.on('onLocalStream', callback);
      manager.off('onLocalStream');

      expect(manager.listeners.onLocalStream).toBeNull();
    });

    it('should ignore invalid event names', () => {
      const manager = new WebRTCManager();
      const callback = jest.fn();

      manager.on('invalidEvent', callback);

      expect(manager.listeners.invalidEvent).toBeUndefined();
    });
  });

  describe('Mute Toggle', () => {
    it('should toggle mute state', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');
      await manager.getLocalStream();

      // Get the actual track reference from the manager's stream
      const tracks = manager.localStream.getAudioTracks();
      expect(tracks.length).toBeGreaterThan(0);

      const audioTrack = tracks[0];
      expect(audioTrack.enabled).toBe(true);

      // toggleMute toggles the enabled state and returns !enabled (true when muted)
      const isMuted = manager.toggleMute();

      expect(isMuted).toBe(true); // Returns true when muted
      expect(audioTrack.enabled).toBe(false);
    });

    it('should return false if no local stream', () => {
      const manager = new WebRTCManager();

      const result = manager.toggleMute();

      expect(result).toBe(false);
    });
  });

  describe('Connection Statistics', () => {
    it('should return null if no peer connection', async () => {
      const manager = new WebRTCManager();

      const stats = await manager.getConnectionStats();

      expect(stats).toBeNull();
    });

    it('should return connection statistics', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');

      const stats = await manager.getConnectionStats();

      expect(stats).toBeDefined();
      expect(stats.state).toBeDefined();
      expect(stats.bytesReceived).toBeDefined();
      expect(stats.bytesSent).toBeDefined();
      expect(stats.packetsLost).toBeDefined();
      expect(stats.roundTripTime).toBeDefined();
    });
  });

  describe('Reconnection Handling', () => {
    it('should have reconnection state initialized', async () => {
      const manager = new WebRTCManager();
      await manager.initialize('test-user-123');

      expect(manager.isReconnecting).toBe(false);
      expect(manager.reconnectAttempts).toBe(0);
      expect(manager.maxReconnectAttempts).toBe(5);
    });
  });

  describe('ICE Restart', () => {
    it('should throw error if not initialized', async () => {
      const manager = new WebRTCManager();

      await expect(manager.restartIce()).rejects.toThrow('Peer connection not initialized');
    });
  });

  describe('Cleanup', () => {
    it('should have unsubscribers array', () => {
      const manager = new WebRTCManager();
      expect(manager.unsubscribers).toEqual([]);
    });

    it('should clear unsubscribers on cleanupListeners', async () => {
      const manager = new WebRTCManager();
      // Add a mock unsubscriber
      manager.unsubscribers.push(jest.fn());
      manager.unsubscribers.push(jest.fn());

      expect(manager.unsubscribers.length).toBe(2);

      manager.cleanupListeners();

      expect(manager.unsubscribers.length).toBe(0);
    });
  });

  describe('Factory Function', () => {
    it('should create new manager instance', () => {
      const manager = createWebRTCManager();

      expect(manager).toBeInstanceOf(WebRTCManager);
    });
  });
});
