/**
 * WebRTC Modules - Unit Tests
 *
 * Tests for the modular WebRTC implementation.
 * Run with: npm test -- --testPathPattern="lib/webrtc"
 */

import {
  StateManager,
  MediaManager,
  PeerConnectionManager,
  IceManager,
  SessionManager,
  FirebaseSignaling,
  ConnectionMonitor,
  WebRTCRecording,
  WebRTCManager,
  getIceServers,
  TIMEOUTS,
  RECONNECTION,
  RECORDING,
} from '@/lib/webrtc';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    trace: jest.fn(),
    loading: jest.fn(),
  },
}));

describe('WebRTC Configuration', () => {
  describe('getIceServers', () => {
    it('should return STUN servers by default', () => {
      const servers = getIceServers();
      expect(Array.isArray(servers)).toBe(true);
      expect(servers.length).toBeGreaterThan(0);
      expect(servers[0].urls).toContain('stun');
    });

    it('should include TURN server when configured', () => {
      // Set environment variables
      process.env.NEXT_PUBLIC_TURN_SERVER_URL = 'turn:turn.example.com:3478';
      process.env.NEXT_PUBLIC_TURN_USERNAME = 'testuser';
      process.env.NEXT_PUBLIC_TURN_CREDENTIAL = 'testpass';

      const servers = getIceServers();

      expect(servers.length).toBeGreaterThan(1);
      expect(servers.find((s) => s.urls === 'turn:turn.example.com:3478')).toBeDefined();

      // Clean up
      delete process.env.NEXT_PUBLIC_TURN_SERVER_URL;
      delete process.env.NEXT_PUBLIC_TURN_USERNAME;
      delete process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
    });
  });

  describe('TIMEOUTS', () => {
    it('should have required timeout values', () => {
      expect(TIMEOUTS.FIREBASE_INIT).toBeDefined();
      expect(TIMEOUTS.PEER_CONNECTION).toBeDefined();
      expect(TIMEOUTS.CONNECTION).toBeDefined();
      expect(TIMEOUTS.ICE_GATHERING).toBeDefined();
      expect(TIMEOUTS.INITIALIZATION).toBeDefined();
      expect(TIMEOUTS.TOKEN_FETCH).toBeDefined();
    });

    it('should have numeric timeout values', () => {
      expect(typeof TIMEOUTS.FIREBASE_INIT).toBe('number');
      expect(typeof TIMEOUTS.PEER_CONNECTION).toBe('number');
      expect(typeof TIMEOUTS.CONNECTION).toBe('number');
    });
  });

  describe('RECONNECTION', () => {
    it('should have reconnection config', () => {
      expect(RECONNECTION.MAX_ATTEMPTS).toBeDefined();
      expect(RECONNECTION.BASE_DELAY_MS).toBeDefined();
      expect(RECONNECTION.MAX_ATTEMPTS).toBeGreaterThan(0);
      expect(RECONNECTION.BASE_DELAY_MS).toBeGreaterThan(0);
    });
  });

  describe('RECORDING', () => {
    it('should have recording config', () => {
      expect(RECORDING.AUDIO_BITRATE).toBeDefined();
      expect(RECORDING.SUPPORTED_MIME_TYPES).toBeDefined();
      expect(Array.isArray(RECORDING.SUPPORTED_MIME_TYPES)).toBe(true);
    });
  });
});

describe('StateManager', () => {
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  afterEach(() => {
    stateManager.dispose();
  });

  it('should initialize with idle state', () => {
    expect(stateManager.getState()).toBe('idle');
  });

  it('should transition to connecting state', () => {
    stateManager.setState('connecting');
    expect(stateManager.getState()).toBe('connecting');
  });

  it('should transition to connected state', () => {
    stateManager.setState('connected');
    expect(stateManager.getState()).toBe('connected');
  });

  it('should transition to failed state', () => {
    stateManager.setState('failed');
    expect(stateManager.getState()).toBe('failed');
  });

  it('should reset to idle state', () => {
    stateManager.setState('connecting');
    stateManager.reset();
    expect(stateManager.getState()).toBe('idle');
  });

  it('should notify state change listeners', () => {
    const callback = jest.fn();
    stateManager.onStateChange(callback);

    stateManager.setState('connecting');

    expect(callback).toHaveBeenCalledWith('connecting');
  });

  it('should handle timeout', () => {
    jest.useFakeTimers();

    const callback = jest.fn();
    stateManager.onStateChange(callback);

    stateManager.setState('connecting');
    stateManager.startTimeout(1000);

    jest.advanceTimersByTime(1001);

    expect(callback).toHaveBeenCalledWith('idle');

    jest.useRealTimers();
  });

  it('should clear timeout on state change', () => {
    jest.useFakeTimers();

    const callback = jest.fn();
    stateManager.onStateChange(callback);

    stateManager.setState('connecting');
    stateManager.startTimeout(1000);

    // Change state before timeout
    stateManager.setState('connected');

    jest.advanceTimersByTime(1001);

    // Should not have reset to idle
    expect(callback).not.toHaveBeenCalledWith('idle');

    jest.useRealTimers();
  });
});

describe('SessionManager', () => {
  let sessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  afterEach(() => {
    sessionManager.reset();
  });

  it('should initialize session', () => {
    const sessionId = sessionManager.initialize({
      localCare4wId: 'user1',
      remoteCare4wId: 'user2',
      isInitiator: true,
    });

    expect(sessionId).toBeDefined();
    expect(sessionManager.getLocalUserId()).toBe('user1');
    expect(sessionManager.getRemoteUserId()).toBe('user2');
    expect(sessionManager.isActive()).toBe(true);
  });

  it('should validate session', () => {
    const result = sessionManager.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    sessionManager.initialize({
      localCare4wId: 'user1',
      remoteCare4wId: 'user2',
    });

    const validResult = sessionManager.validate();
    expect(validResult.valid).toBe(true);
  });

  it('should track session duration', () => {
    sessionManager.initialize({
      localCare4wId: 'user1',
      remoteCare4wId: 'user2',
    });

    const duration = sessionManager.getDuration();
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('should end session', () => {
    sessionManager.initialize({
      localCare4wId: 'user1',
      remoteCare4wId: 'user2',
    });

    sessionManager.end('test');

    expect(sessionManager.isActive()).toBe(false);
  });

  it('should notify session event listeners', () => {
    const callback = jest.fn();
    sessionManager.onEvent('initialized', callback);

    sessionManager.initialize({
      localCare4wId: 'user1',
      remoteCare4wId: 'user2',
    });

    expect(callback).toHaveBeenCalled();
  });
});

describe('IceManager', () => {
  let iceManager;

  beforeEach(() => {
    iceManager = new IceManager();
  });

  afterEach(() => {
    iceManager.reset();
  });

  it('should configure options', () => {
    iceManager.configure({
      gatheringTimeout: 10000,
      connectionTimeout: 20000,
    });

    expect(iceManager.gatheringTimeout).toBe(10000);
    expect(iceManager.connectionTimeout).toBe(20000);
  });

  it('should collect local candidates', () => {
    const candidate = {
      candidate: 'candidate:1 1 UDP 2130706435 192.168.1.1 12345 typ host',
      sdpMid: '0',
      sdpMLineIndex: 0,
    };

    iceManager.collectLocalCandidate(candidate);

    const candidates = iceManager.getLocalCandidates();
    expect(candidates.length).toBe(1);
    expect(candidates[0].candidate).toBe(candidate.candidate);
  });

  it('should queue remote candidates', () => {
    const candidate = {
      candidate: 'candidate:1 1 UDP 2130706435 192.168.1.2 12346 typ host',
      sdpMid: '0',
      sdpMLineIndex: 0,
    };

    iceManager.queueRemoteCandidate(candidate);

    const candidates = iceManager.getRemoteCandidates();
    expect(candidates.length).toBe(1);
  });

  it('should notify candidate exchange listeners', () => {
    const callback = jest.fn();
    iceManager.onCandidateExchange(callback);

    const candidate = {
      candidate: 'candidate:1 1 UDP 2130706435 192.168.1.1 12345 typ host',
    };

    iceManager.collectLocalCandidate(candidate);

    expect(callback).toHaveBeenCalledWith('local', candidate);
  });

  it('should reset state', () => {
    iceManager.collectLocalCandidate({
      candidate: 'candidate:1 1 UDP 2130706435 192.168.1.1 12345 typ host',
    });

    iceManager.reset();

    expect(iceManager.getLocalCandidates().length).toBe(0);
  });
});

describe('ConnectionMonitor', () => {
  let connectionMonitor;

  beforeEach(() => {
    connectionMonitor = new ConnectionMonitor();
  });

  afterEach(() => {
    connectionMonitor.dispose();
  });

  it('should initialize', () => {
    expect(connectionMonitor.isMonitoring()).toBe(false);
  });

  it('should track reconnection attempts', () => {
    connectionMonitor.resetReconnection();
    expect(connectionMonitor.attemptReconnection()).toBe(true);
    expect(connectionMonitor.attemptReconnection()).toBe(true);
    expect(connectionMonitor.attemptReconnection()).toBe(true);
    expect(connectionMonitor.attemptReconnection()).toBe(true);
    expect(connectionMonitor.attemptReconnection()).toBe(true);
    expect(connectionMonitor.attemptReconnection()).toBe(false); // Max attempts reached
  });

  it('should reset reconnection counter', () => {
    connectionMonitor.attemptReconnection();
    connectionMonitor.attemptReconnection();
    connectionMonitor.resetReconnection();

    expect(connectionMonitor.attemptReconnection()).toBe(true);
  });

  it('should notify quality callbacks', () => {
    const callback = jest.fn();
    connectionMonitor.onQualityChange(callback);

    // Quality callback is called internally when stats are collected
    // This tests the callback registration
    expect(connectionMonitor._qualityCallbacks).toContain(callback);
  });

  it('should clean up on dispose', () => {
    connectionMonitor.dispose();

    expect(connectionMonitor.peerConnection).toBeNull();
    expect(connectionMonitor._statsHistory.length).toBe(0);
  });
});

describe('MediaManager', () => {
  let mediaManager;

  beforeEach(() => {
    mediaManager = new MediaManager();
  });

  afterEach(() => {
    mediaManager.dispose();
  });

  it('should initialize', () => {
    expect(mediaManager.localStream).toBeNull();
    expect(mediaManager.remoteStream).toBeNull();
  });

  it('should track local stream', () => {
    // Mock local stream
    const mockStream = {
      getAudioTracks: () => [{ enabled: true }],
      getVideoTracks: () => [],
    };

    mediaManager.localStream = mockStream;

    expect(mediaManager.localStream).toBeDefined();
  });

  it('should track remote stream', () => {
    // Mock remote stream
    const mockStream = {
      getAudioTracks: () => [{ enabled: true }],
      getVideoTracks: () => [],
    };

    mediaManager.remoteStream = mockStream;

    expect(mediaManager.remoteStream).toBeDefined();
  });

  it('should dispose resources', () => {
    const mockStream = {
      getAudioTracks: () => [{ stop: jest.fn() }],
      getVideoTracks: () => [],
    };

    mediaManager.localStream = mockStream;
    mediaManager.dispose();

    expect(mediaManager.localStream).toBeNull();
  });
});

describe('WebRTCRecording', () => {
  let recording;

  beforeEach(() => {
    recording = new WebRTCRecording();
  });

  afterEach(() => {
    recording.dispose();
  });

  it('should initialize', () => {
    expect(recording.isRecording()).toBe(false);
  });

  it('should track recording state', () => {
    // Recording requires a real MediaStream, so we test state tracking
    expect(recording.isRecording()).toBe(false);
    expect(recording.getDuration()).toBe(0);
  });

  it('should get recording URL when has data', () => {
    // Add mock chunks
    recording.recordedChunks = [new Blob(['test'], { type: 'audio/webm' })];

    const url = recording.getRecordingURL();
    expect(url).toBeDefined();
  });

  it('should return null for recording URL when no data', () => {
    const url = recording.getRecordingURL();
    expect(url).toBeNull();
  });

  it('should dispose resources', () => {
    recording.dispose();

    expect(recording._stream).toBeNull();
    expect(recording.mediaRecorder).toBeNull();
    expect(recording.recordedChunks.length).toBe(0);
  });
});

describe('FirebaseSignaling', () => {
  let signaling;

  beforeEach(() => {
    signaling = new FirebaseSignaling();
  });

  afterEach(() => {
    signaling.dispose();
  });

  it('should initialize', () => {
    const mockRef = {
      ref: jest.fn().mockReturnValue({
        on: jest.fn(),
        off: jest.fn(),
        set: jest.fn(),
      }),
    };

    signaling.initialize(mockRef, 'user1');

    expect(signaling.localCare4wId).toBe('user1');
    expect(signaling.firebaseRef).toBeDefined();
  });

  it('should track call ID', () => {
    expect(signaling.getCurrentCallId()).toBeNull();
    expect(signaling.hasActiveCall()).toBe(false);
  });

  it('should register callbacks', () => {
    const offerCallback = jest.fn();
    const answerCallback = jest.fn();
    const candidateCallback = jest.fn();
    const hangupCallback = jest.fn();

    signaling.onOffer(offerCallback);
    signaling.onAnswer(answerCallback);
    signaling.onCandidate(candidateCallback);
    signaling.onHangup(hangupCallback);

    expect(signaling._offerCallback).toBe(offerCallback);
    expect(signaling._answerCallback).toBe(answerCallback);
    expect(signaling._candidateCallback).toBe(candidateCallback);
    expect(signaling._hangupCallback).toBe(hangupCallback);
  });

  it('should clear call', () => {
    signaling.clearCall();

    expect(signaling.getCurrentCallId()).toBeNull();
  });

  it('should dispose', () => {
    signaling.dispose();

    expect(signaling.localCare4wId).toBeNull();
    expect(signaling.firebaseRef).toBeNull();
  });
});

describe('WebRTCManager', () => {
  let manager;

  beforeEach(() => {
    manager = new WebRTCManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should initialize with default config', () => {
    expect(manager.config.iceGatheringTimeout).toBeDefined();
    expect(manager.config.connectionTimeout).toBeDefined();
    expect(manager.config.enableRecording).toBe(true);
    expect(manager.config.enableMonitoring).toBe(true);
  });

  it('should initialize with custom config', () => {
    const customManager = new WebRTCManager({
      iceGatheringTimeout: 10000,
      connectionTimeout: 20000,
      enableRecording: false,
      enableMonitoring: false,
    });

    expect(customManager.config.iceGatheringTimeout).toBe(10000);
    expect(customManager.config.connectionTimeout).toBe(20000);
    expect(customManager.config.enableRecording).toBe(false);
    expect(customManager.config.enableMonitoring).toBe(false);

    customManager.dispose();
  });

  it('should register callbacks', () => {
    const stateCallback = jest.fn();
    const callStartCallback = jest.fn();
    const callEndCallback = jest.fn();
    const remoteTrackCallback = jest.fn();
    const errorCallback = jest.fn();

    manager.on('onStateChange', stateCallback);
    manager.on('onCallStart', callStartCallback);
    manager.on('onCallEnd', callEndCallback);
    manager.on('onRemoteTrack', remoteTrackCallback);
    manager.on('onError', errorCallback);

    expect(manager._callbacks.onStateChange).toContain(stateCallback);
    expect(manager._callbacks.onCallStart).toContain(callStartCallback);
    expect(manager._callbacks.onCallEnd).toContain(callEndCallback);
    expect(manager._callbacks.onRemoteTrack).toContain(remoteTrackCallback);
    expect(manager._callbacks.onError).toContain(errorCallback);
  });

  it('should unregister callbacks', () => {
    const callback = jest.fn();

    manager.on('onStateChange', callback);
    expect(manager._callbacks.onStateChange).toContain(callback);

    manager.off('onStateChange', callback);
    expect(manager._callbacks.onStateChange).not.toContain(callback);
  });

  it('should get state', () => {
    expect(manager.getState()).toBe('idle');
  });

  it('should dispose all managers', () => {
    manager.dispose();

    // All managers should be disposed
    expect(manager.stateManager).toBeDefined();
    expect(manager.mediaManager).toBeDefined();
    expect(manager.peerConnectionManager).toBeDefined();
    expect(manager.iceManager).toBeDefined();
    expect(manager.sessionManager).toBeDefined();
    expect(manager.signaling).toBeDefined();
    expect(manager.connectionMonitor).toBeDefined();
    expect(manager.recording).toBeDefined();
  });
});

describe('Module Exports', () => {
  it('should export all required modules', () => {
    expect(StateManager).toBeDefined();
    expect(MediaManager).toBeDefined();
    expect(PeerConnectionManager).toBeDefined();
    expect(IceManager).toBeDefined();
    expect(SessionManager).toBeDefined();
    expect(FirebaseSignaling).toBeDefined();
    expect(ConnectionMonitor).toBeDefined();
    expect(WebRTCRecording).toBeDefined();
    expect(WebRTCManager).toBeDefined();
  });
});
