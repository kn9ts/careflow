/**
 * WebRTC Integration Tests - Signaling Workflows
 *
 * Integration tests for the complete signaling flow between caller and callee.
 */

// Mock the logger module first
jest.mock("@/lib/logger", () => ({
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
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({
    name: "[DEFAULT]",
    options: {},
  })),
  getApps: jest.fn(() => []),
}));

jest.mock("firebase/database", () => {
  const off = jest.fn();
  return {
    getDatabase: jest.fn(() => ({
      ref: jest.fn(),
    })),
    ref: jest.fn(() => ({
      on: jest.fn(),
      off: off,
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
    push: jest.fn(() => ({ key: "mock-push-key" })),
    off: off,
  };
});

// =====================================================
// SIGNALING WORKFLOW INTEGRATION TESTS
// =====================================================

describe("Signaling Workflow Integration", () => {
  let WebRTCManager;
  let createWebRTCManager;
  let originalEnv;
  let mockMediaDevices;

  beforeAll(async () => {
    // Set up global mocks
    global.window = {};

    // Mock RTCSessionDescription
    global.RTCSessionDescription = class RTCSessionDescription {
      constructor(description) {
        this.type = description.type;
        this.sdp = description.sdp;
      }
    };

    // Mock RTCIceCandidate
    global.RTCIceCandidate = class RTCIceCandidate {
      constructor(candidate) {
        this.candidate = candidate.candidate;
        this.sdpMid = candidate.sdpMid;
        this.sdpMLineIndex = candidate.sdpMLineIndex;
      }
    };

    // Mock RTCPeerConnection
    global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
      onicecandidate: null,
      onconnectionstatechange: null,
      ontrack: null,
      onsignalingstatechange: null,
      connectionState: "new",
      signalingState: "stable",
      localDescription: null,
      remoteDescription: null,
      iceGatheringState: "complete",
      createOffer: jest.fn().mockResolvedValue({
        type: "offer",
        sdp: "v=0\r\no=- 123456789 0 IN IP4 0.0.0.0\r\ns=-\r\n",
      }),
      createAnswer: jest.fn().mockResolvedValue({
        type: "answer",
        sdp: "v=0\r\no=- 123456789 0 IN IP4 0.0.0.0\r\ns=-\r\n",
      }),
      setLocalDescription: jest.fn().mockResolvedValue(undefined),
      setRemoteDescription: jest.fn().mockResolvedValue(undefined),
      addIceCandidate: jest.fn().mockResolvedValue(undefined),
      addTrack: jest.fn(),
      getStats: jest.fn().mockResolvedValue(
        new Map([
          [
            "inbound-rtp",
            { type: "inbound-rtp", bytesReceived: 1024, packetsLost: 0 },
          ],
          ["outbound-rtp", { type: "outbound-rtp", bytesSent: 2048 }],
          [
            "candidate-pair",
            { type: "candidate-pair", currentRoundTripTime: 0.05 },
          ],
        ]),
      ),
      close: jest.fn(),
    }));

    // Mock MediaRecorder
    global.MediaRecorder = class MediaRecorder {
      constructor(stream, options) {
        this.stream = stream;
        this.options = options;
        this.state = "inactive";
        this.ondataavailable = null;
        this.onstop = null;
      }

      start(interval) {
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
        if (this.onstop) {
          this.onstop();
        }
      }

      static isTypeSupported(mimeType) {
        const supported = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
        ];
        return supported.includes(mimeType);
      }
    };

    // Mock navigator.mediaDevices
    const mockAudioTrack = { kind: "audio", enabled: true, stop: jest.fn() };
    mockMediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue({
        id: "mock-stream-id",
        getTracks: () => [mockAudioTrack],
        getAudioTracks: () => [mockAudioTrack],
      }),
    };

    global.navigator = {
      mediaDevices: mockMediaDevices,
    };

    // Import the module after mocks are set up
    const module = await import("@/lib/webrtc.js");
    WebRTCManager = module.default;
    createWebRTCManager = module.createWebRTCManager;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };

    // Set required environment variables
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "test.appspot.com";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123456789";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123456789:web:abc123";
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL =
      "https://test.firebaseio.com";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Call Establishment Workflow", () => {
    it("should initialize caller and callee managers", async () => {
      const caller = createWebRTCManager();
      const callee = createWebRTCManager();

      await caller.initialize("caller-user-123");
      await callee.initialize("callee-user-456");

      expect(caller.localCare4wId).toBe("caller-user-123");
      expect(callee.localCare4wId).toBe("callee-user-456");
    });

    it("should create offer on caller side", async () => {
      const caller = createWebRTCManager();
      await caller.initialize("caller-user-123");
      await caller.getLocalStream();

      const offer = await caller.createOffer("callee-user-456");

      expect(offer).toBeDefined();
      expect(offer.type).toBe("offer");
      expect(caller.targetCare4wId).toBe("callee-user-456");
    });

    it("should accept call on callee side", async () => {
      const callee = createWebRTCManager();
      await callee.initialize("callee-user-456");
      await callee.getLocalStream();

      const offer = { type: "offer", sdp: "v=0\r\no=test\r\n" };
      const answer = await callee.acceptCall("room-id-123", offer);

      expect(answer).toBeDefined();
      expect(answer.type).toBe("answer");
    });
  });

  describe("Call Cleanup Workflow", () => {
    it("should clean up resources on endCall", async () => {
      const manager = createWebRTCManager();
      await manager.initialize("test-user-123");
      await manager.getLocalStream();

      await manager.endCall();

      expect(manager.peerConnection).toBeNull();
      expect(manager.localStream).toBeNull();
    });

    it("should stop all media tracks on endCall", async () => {
      const stopMock = jest.fn();
      mockMediaDevices.getUserMedia.mockResolvedValueOnce({
        id: "mock-stream-id",
        getTracks: () => [{ kind: "audio", enabled: true, stop: stopMock }],
        getAudioTracks: () => [
          { kind: "audio", enabled: true, stop: stopMock },
        ],
      });

      const manager = createWebRTCManager();
      await manager.initialize("test-user-123");
      await manager.getLocalStream();

      await manager.endCall();

      expect(stopMock).toHaveBeenCalled();
    });
  });

  describe("Remote Stream Handling", () => {
    it("should handle remote stream event", async () => {
      const manager = createWebRTCManager();
      await manager.initialize("test-user-123");

      const remoteStreams = [];
      manager.on("onRemoteStream", (stream) => {
        remoteStreams.push(stream);
      });

      // Simulate remote stream event
      const mockRemoteStream = { id: "remote-stream" };
      if (manager.listeners.onRemoteStream) {
        manager.listeners.onRemoteStream(mockRemoteStream);
      }

      expect(remoteStreams.length).toBe(1);
      expect(remoteStreams[0]).toBe(mockRemoteStream);
    });
  });

  describe("Recording Integration", () => {
    it("should start and stop recording during call", async () => {
      const manager = createWebRTCManager();
      await manager.initialize("test-user-123");
      await manager.getLocalStream();

      // Start recording
      const startResult = await manager.startRecording();
      expect(startResult).toBe(true);
      expect(manager.isRecording).toBe(true);

      // Stop recording
      const recording = await manager.stopRecording();
      expect(manager.isRecording).toBe(false);
      expect(recording).toBeDefined();
      expect(recording.duration).toBeDefined();
    });

    it("should handle recording without local stream", async () => {
      const manager = createWebRTCManager();
      await manager.initialize("test-user-123");

      const result = await manager.startRecording();
      expect(result).toBe(false);
    });
  });

  describe("Connection State Management", () => {
    it("should track connection state changes", async () => {
      const manager = createWebRTCManager();
      await manager.initialize("test-user-123");

      const states = [];
      manager.on("onConnectionStateChange", (state) => {
        states.push(state);
      });

      // Simulate state change
      if (manager.listeners.onConnectionStateChange) {
        manager.listeners.onConnectionStateChange("connected");
      }

      expect(states.length).toBe(1);
      expect(states[0]).toBe("connected");
    });
  });

  describe("Incoming Call Handling", () => {
    it("should register incoming call listener", async () => {
      const manager = createWebRTCManager();
      await manager.initialize("test-user-123");

      const incomingCalls = [];
      manager.on("onIncomingCall", (callInfo) => {
        incomingCalls.push(callInfo);
      });

      // Simulate incoming call
      const mockCallInfo = { from: "caller-user", roomId: "room-123" };
      if (manager.listeners.onIncomingCall) {
        manager.listeners.onIncomingCall(mockCallInfo);
      }

      expect(incomingCalls.length).toBe(1);
      expect(incomingCalls[0]).toBe(mockCallInfo);
    });
  });

  describe("Mute Functionality", () => {
    it("should toggle mute state during call", async () => {
      const manager = createWebRTCManager();
      await manager.initialize("test-user-123");
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

      const isMutedAgain = manager.toggleMute();
      expect(isMutedAgain).toBe(false); // Returns false when unmuted
      expect(audioTrack.enabled).toBe(true);
    });
  });

  describe("Connection Statistics", () => {
    it("should retrieve connection stats", async () => {
      const manager = createWebRTCManager();
      await manager.initialize("test-user-123");

      const stats = await manager.getConnectionStats();

      expect(stats).toBeDefined();
      expect(stats.state).toBe("new");
      expect(stats.bytesReceived).toBe(1024);
      expect(stats.bytesSent).toBe(2048);
    });
  });

  describe("Error Handling", () => {
    it("should handle getUserMedia permission denial", async () => {
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(
        new Error("Permission denied"),
      );

      const manager = createWebRTCManager();
      await manager.initialize("test-user-123");

      await expect(manager.getLocalStream()).rejects.toThrow(
        "Permission denied",
      );
    });

    it("should handle operations before initialization", async () => {
      const manager = new WebRTCManager();

      await expect(manager.createOffer("target")).rejects.toThrow();
      await expect(manager.acceptCall("room", {})).rejects.toThrow();
    });
  });

  describe("Factory Function", () => {
    it("should create independent manager instances", () => {
      const manager1 = createWebRTCManager();
      const manager2 = createWebRTCManager();

      expect(manager1).not.toBe(manager2);
    });
  });
});
