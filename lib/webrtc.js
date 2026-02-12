/**
 * WebRTC Manager for Peer-to-Peer Calls
 *
 * Handles browser-to-browser calls using Firebase Realtime Database for signaling.
 * Used when Twilio credentials are not available.
 *
 * SECURITY NOTES:
 * - All Firebase operations require authentication
 * - Use Firebase Security Rules for access control
 * - Validate CareFlow IDs server-side when possible
 */

import { logger } from "@/lib/logger";

// Firebase configuration from environment
const firebaseConfig = {
  apiKey:
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY
      : undefined,
  authDomain:
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
      : undefined,
  projectId:
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      : undefined,
  storageBucket:
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      : undefined,
  messagingSenderId:
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
      : undefined,
  appId:
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      : undefined,
  databaseURL:
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
      : undefined,
};

// Validate configuration
const validateConfig = () => {
  if (typeof window === "undefined") return false;
  const required = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  ];
  return required.every((key) => process.env[key]);
};

// Initialize Firebase (client-side only) - lazy loaded
let firebaseApp = null;
let database = null;
let authToken = null;

// Store auth token from CallManager
let setAuthToken = (token) => {
  authToken = token;
};

let firebaseInitPromise = null;
let firebaseInitResult = null;

const initializeFirebase = () => {
  if (typeof window === "undefined") return null;

  // Return cached result if already initialized
  if (firebaseInitResult) {
    logger.success("Firebase", "Using cached Firebase instance");
    return firebaseInitResult;
  }

  // Return ongoing promise if initialization in progress
  if (firebaseInitPromise) {
    logger.debug("Firebase", "Waiting for Firebase initialization...");
    return firebaseInitPromise;
  }

  logger.loading("Firebase", "Initializing Firebase...");

  firebaseInitPromise = (async () => {
    if (!firebaseApp) {
      // Dynamic import for Firebase - only load when needed
      const { initializeApp, getApps, getDatabase } =
        await import("firebase/app");
      const {
        getDatabase: getDb,
        ref,
        set,
        onValue,
        remove,
        serverTimestamp,
        push,
      } = await import("firebase/database");

      const apps = getApps();
      if (apps.length === 0) {
        if (!validateConfig()) {
          throw new Error("Firebase configuration is incomplete");
        }
        firebaseApp = initializeApp(firebaseConfig);
        logger.success("Firebase", "Firebase app initialized");
      } else {
        firebaseApp = apps[0];
        logger.debug("Firebase", "Using existing Firebase app");
      }
      database = getDb(firebaseApp);
      logger.success("Firebase", "Database connected");

      // Export functions for use with authenticated calls
      firebaseInitResult = {
        app: firebaseApp,
        db: database,
        firebaseFns: { ref, set, onValue, remove, serverTimestamp, push },
        setAuthToken,
      };
    }
    return firebaseInitResult;
  })();

  return firebaseInitPromise;
};

// ICE servers configuration - STUN + TURN for NAT traversal
const ICE_SERVERS = [
  // Public STUN servers (free)
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

/**
 * Get ICE servers configuration with TURN support
 * Falls back gracefully if TURN credentials not configured
 */
function getIceServers() {
  const turnUrl = process.env.NEXT_PUBLIC_TURN_SERVER_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    logger.info(
      "WebRTCManager",
      "TURN server configured - enabling relay mode",
    );
    return [
      ...ICE_SERVERS,
      {
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      },
    ];
  }

  logger.warn("WebRTCManager", "No TURN server configured - P2P only");
  return ICE_SERVERS;
}

class WebRTCManager {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentRoomId = null;
    this.targetCare4wId = null;
    this.localCare4wId = null;
    this.db = null;
    this.firebaseFns = null;
    // Recording state
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordingStartTime = null;
    // Reconnection state
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.unsubscribers = [];
    this.listeners = {
      onLocalStream: null,
      onRemoteStream: null,
      onConnectionStateChange: null,
      onIceCandidate: null,
      onCallEnded: null,
      onIncomingCall: null,
      onRecordingStarted: null,
      onRecordingStopped: null,
      onRecordingError: null,
      onReconnecting: null,
      onReconnected: null,
    };

    logger.init("WebRTCManager");
  }

  /**
   * Initialize the WebRTC manager
   * @param {string} localCare4wId - User's CareFlow ID
   * @param {string} token - Firebase auth token for secure signaling
   */
  async initialize(localCare4wId, token = null) {
    if (typeof window === "undefined") {
      throw new Error("WebRTC is only available in browser environment");
    }

    this.localCare4wId = localCare4wId;

    // Store auth token if provided
    if (token) {
      authToken = token;
      logger.debug("WebRTCManager", "Auth token stored");
    }

    logger.loading("WebRTCManager", "Initializing Firebase connection...");

    const firebase = await initializeFirebase();

    if (!firebase) {
      throw new Error("Failed to initialize Firebase for WebRTC");
    }

    this.db = firebase.db;
    this.firebaseFns = firebase.firebaseFns;
    logger.success("WebRTCManager", "Firebase initialized");

    // Set up ICE servers (STUN/TURN) with graceful fallback
    logger.loading("WebRTCManager", "Creating peer connection...");
    this.peerConnection = new RTCPeerConnection({
      iceServers: getIceServers(),
    });
    logger.success("WebRTCManager", "Peer connection created");

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendIceCandidate(event.candidate);
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      logger.trace("WebRTCManager", `Connection state: ${state}`);
      if (this.listeners.onConnectionStateChange) {
        this.listeners.onConnectionStateChange(state);
      }
      if (state === "disconnected" || state === "failed") {
        logger.warn("WebRTCManager", "Connection failed or disconnected");
        this.endCall();
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      logger.success("WebRTCManager", "Remote track received");
      this.remoteStream = event.streams[0];
      if (this.listeners.onRemoteStream) {
        this.listeners.onRemoteStream(this.remoteStream);
      }
    };

    // Listen for incoming calls
    logger.loading("WebRTCManager", "Setting up incoming call listener...");
    this.listenForIncomingCalls();

    // Set up reconnection handler for Firebase
    this.setupReconnectionHandler();

    logger.success("WebRTCManager", "Ready to receive calls!");
  }

  /**
   * Get user media (microphone)
   */
  async getLocalStream(constraints = { audio: true, video: false }) {
    try {
      logger.loading("WebRTCManager", "Getting local audio stream...");
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      logger.success("WebRTCManager", "Local stream acquired");

      // Add tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        logger.debug(
          "WebRTCManager",
          `Adding ${track.kind} track to peer connection`,
        );
        this.peerConnection.addTrack(track, this.localStream);
      });

      if (this.listeners.onLocalStream) {
        this.listeners.onLocalStream(this.localStream);
      }

      return this.localStream;
    } catch (error) {
      logger.error(
        "WebRTCManager",
        `Failed to get local stream: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Create an offer for a new call
   */
  async createOffer(targetCare4wId) {
    if (!this.peerConnection) {
      throw new Error("WebRTC not initialized");
    }

    this.targetCare4wId = targetCare4wId;
    this.currentRoomId = `${this.localCare4wId}-${targetCare4wId}-${Date.now()}`;

    logger.loading("WebRTCManager", `Creating offer to ${targetCare4wId}...`);

    // Create offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    logger.debug("WebRTCManager", "Local description set");

    const { ref, set, serverTimestamp } = this.firebaseFns;

    // Store offer in Firebase
    const offerRef = ref(this.db, `calls/${this.currentRoomId}/offer`);
    await set(offerRef, {
      sdp: offer.sdp,
      type: offer.type,
      from: this.localCare4wId,
      to: targetCare4wId,
      timestamp: serverTimestamp(),
    });

    logger.success("WebRTCManager", "Offer sent, waiting for answer...");

    // Listen for answer
    this.listenForAnswer(this.currentRoomId);

    return offer;
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(roomId, offerSdp) {
    if (!this.peerConnection) {
      throw new Error("WebRTC not initialized");
    }

    this.currentRoomId = roomId;
    logger.loading("WebRTCManager", `Accepting call in room ${roomId}...`);

    // Set remote description (offer)
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offerSdp),
    );
    logger.debug("WebRTCManager", "Remote description set");

    // Create answer
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    logger.debug("WebRTCManager", "Answer created");

    const { ref, set, serverTimestamp } = this.firebaseFns;

    // Store answer in Firebase
    const answerRef = ref(this.db, `calls/${roomId}/answer`);
    await set(answerRef, {
      sdp: answer.sdp,
      type: answer.type,
      from: this.localCare4wId,
      timestamp: serverTimestamp(),
    });

    logger.success("WebRTCManager", "Answer sent");

    // Listen for ICE candidates
    this.listenForIceCandidates(roomId);

    return answer;
  }

  /**
   * Send ICE candidate to remote peer
   */
  async sendIceCandidate(candidate) {
    if (!this.currentRoomId || !this.firebaseFns) return;

    const { ref, set, serverTimestamp } = this.firebaseFns;
    const iceRef = ref(
      this.db,
      `calls/${this.currentRoomId}/ice/${Date.now()}`,
    );
    await set(iceRef, {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      from: this.localCare4wId,
      timestamp: serverTimestamp(),
    });
  }

  /**
   * Listen for incoming calls
   */
  listenForIncomingCalls() {
    if (!this.db || !this.localCare4wId || !this.firebaseFns) return;

    const { ref, onValue } = this.firebaseFns;
    const incomingCallsRef = ref(this.db, `calls`);

    onValue(incomingCallsRef, (snapshot) => {
      const calls = snapshot.val();
      if (!calls) return;

      // Look for calls where this user is the target
      Object.entries(calls).forEach(([roomId, callData]) => {
        if (
          callData.offer &&
          callData.offer.to === this.localCare4wId &&
          !callData.answer // Not yet answered
        ) {
          if (this.listeners.onIncomingCall) {
            logger.incomingCall("WebRTCManager", callData.offer.from);
            this.listeners.onIncomingCall({
              roomId,
              from: callData.offer.from,
              offer: callData.offer,
            });
          }
        }
      });
    });
  }

  /**
   * Listen for answer to our offer
   */
  listenForAnswer(roomId) {
    if (!this.db || !this.firebaseFns) return;

    const { ref, onValue } = this.firebaseFns;
    const answerRef = ref(this.db, `calls/${roomId}/answer`);

    onValue(answerRef, async (snapshot) => {
      const answer = snapshot.val();
      if (answer && answer.sdp) {
        logger.success("WebRTCManager", "Answer received!");
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription({
            sdp: answer.sdp,
            type: answer.type,
          }),
        );

        // Start listening for ICE candidates
        this.listenForIceCandidates(roomId);
      }
    });
  }

  /**
   * Listen for ICE candidates from remote peer
   */
  listenForIceCandidates(roomId) {
    if (!this.db || !this.firebaseFns) return;

    const { ref, onValue } = this.firebaseFns;
    const iceRef = ref(this.db, `calls/${roomId}/ice`);

    onValue(iceRef, async (snapshot) => {
      const candidates = snapshot.val();
      if (!candidates) return;

      Object.entries(candidates).forEach(async ([key, candidateData]) => {
        if (
          candidateData.candidate &&
          candidateData.from !== this.localCare4wId
        ) {
          try {
            await this.peerConnection.addIceCandidate(
              new RTCIceCandidate({
                candidate: candidateData.candidate,
                sdpMid: candidateData.sdpMid,
                sdpMLineIndex: candidateData.sdpMLineIndex,
              }),
            );
            logger.debug("WebRTCManager", "ICE candidate added");
          } catch (error) {
            logger.error(
              "WebRTCManager",
              `Failed to add ICE candidate: ${error.message}`,
            );
          }
        }
      });
    });
  }

  /**
   * End the current call
   */
  async endCall() {
    logger.loading("WebRTCManager", "Ending call...");

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        logger.debug("WebRTCManager", `Stopping ${track.kind} track`);
        track.stop();
      });
      this.localStream = null;
    }

    if (this.peerConnection) {
      logger.debug("WebRTCManager", "Closing peer connection");
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clean up Firebase room
    if (this.db && this.currentRoomId && this.firebaseFns) {
      const { ref, remove } = this.firebaseFns;
      const roomRef = ref(this.db, `calls/${this.currentRoomId}`);
      await remove(roomRef);
      logger.debug("WebRTCManager", "Firebase room cleaned up");
      this.currentRoomId = null;
    }

    if (this.listeners.onCallEnded) {
      this.listeners.onCallEnded();
    }

    // Clean up reconnection state
    this.isReconnecting = false;
    this.reconnectAttempts = 0;

    logger.complete("WebRTCManager");
  }

  /**
   * Set up Firebase connection monitoring for reconnection
   */
  setupReconnectionHandler() {
    if (!this.db || !this.firebaseFns) return;

    const { ref, onValue, off } = this.firebaseFns;

    // Monitor connection state
    const connectedRef = ref(this.db, ".info/connected");

    const handleConnectionChange = (snapshot) => {
      const isConnected = snapshot.val();

      if (isConnected === false) {
        logger.warn(
          "WebRTCManager",
          "Firebase disconnected - may lose signaling",
        );
      } else if (isConnected === true && this.isReconnecting) {
        logger.success("WebRTCManager", "Firebase reconnected");
        this.handleFirebaseReconnect();
      }
    };

    onValue(connectedRef, handleConnectionChange);

    // Store unsubscriber for cleanup
    this.unsubscribers.push(() => off(connectedRef));

    logger.debug("WebRTCManager", "Reconnection handler set up");
  }

  /**
   * Handle Firebase reconnection
   */
  async handleFirebaseReconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts = 0;

    if (this.listeners.onReconnecting) {
      this.listeners.onReconnecting();
    }

    await this.attemptReconnection();
  }

  /**
   * Attempt to restore signaling connection
   */
  async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("WebRTCManager", "Max reconnection attempts reached");
      this.isReconnecting = false;
      this.endCall();
      return;
    }

    this.reconnectAttempts++;
    logger.loading(
      "WebRTCManager",
      `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
    );

    // If we have an active call, try to resubscribe
    if (this.currentRoomId) {
      try {
        // Clean up old listeners
        this.cleanupListeners();

        // Re-listen for the current call
        if (
          this.peerConnection &&
          this.peerConnection.connectionState === "connected"
        ) {
          // ICE restart if connection is stale
          await this.restartIce();
        }

        // Re-subscribe to Firebase listeners
        this.listenForIncomingCalls();

        logger.success("WebRTCManager", "Signaling reconnected");
        this.isReconnecting = false;
        this.reconnectAttempts = 0;

        if (this.listeners.onReconnected) {
          this.listeners.onReconnected();
        }
      } catch (error) {
        logger.error(
          "WebRTCManager",
          `Reconnection attempt failed: ${error.message}`,
        );

        // Retry with exponential backoff
        setTimeout(
          () => {
            this.attemptReconnection();
          },
          Math.pow(2, this.reconnectAttempts) * 1000,
        );
      }
    } else {
      // No active call, just re-listen for incoming calls
      this.listenForIncomingCalls();
      this.isReconnecting = false;
    }
  }

  /**
   * Restart ICE to handle network changes
   */
  async restartIce() {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized");
    }

    logger.loading("WebRTCManager", "Restarting ICE...");

    try {
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);

      // Resend offer to peer via Firebase
      if (this.currentRoomId && this.targetCare4wId) {
        const { ref, set, serverTimestamp } = this.firebaseFns;
        const offerRef = ref(this.db, `calls/${this.currentRoomId}/offer`);
        await set(offerRef, {
          sdp: offer.sdp,
          type: offer.type,
          from: this.localCare4wId,
          to: this.targetCare4wId,
          timestamp: serverTimestamp(),
          iceRestart: true,
        });

        logger.success("WebRTCManager", "ICE restart offer sent");
      }
    } catch (error) {
      logger.error("WebRTCManager", `ICE restart failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up Firebase listeners
   */
  cleanupListeners() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }

  /**
   * Get current connection statistics
   */
  async getConnectionStats() {
    if (!this.peerConnection) {
      return null;
    }

    const stats = await this.peerConnection.getStats();
    const report = {
      bytesReceived: 0,
      bytesSent: 0,
      packetsLost: 0,
      roundTripTime: 0,
      state: this.peerConnection.connectionState,
    };

    stats.forEach((stat) => {
      if (stat.type === "inbound-rtp") {
        report.bytesReceived += stat.bytesReceived || 0;
        report.packetsLost += stat.packetsLost || 0;
      }
      if (stat.type === "outbound-rtp") {
        report.bytesSent += stat.bytesSent || 0;
      }
      if (stat.type === "candidate-pair" && stat.currentRoundTripTime) {
        report.roundTripTime = stat.currentRoundTripTime;
      }
    });

    return report;
  }

  /**
   * Get supported MIME type for recording
   */
  getSupportedMimeType() {
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        logger.debug("WebRTCManager", `Using MIME type: ${mimeType}`);
        return mimeType;
      }
    }

    return "audio/webm";
  }

  /**
   * Start recording the call
   */
  async startRecording() {
    if (this.isRecording) {
      logger.warn("WebRTCManager", "Recording already in progress");
      return false;
    }

    if (!this.localStream) {
      logger.error("WebRTCManager", "No local stream for recording");
      this.handleRecordingError("No local stream available");
      return false;
    }

    try {
      this.recordedChunks = [];
      this.recordingStartTime = new Date();

      const mimeType = this.getSupportedMimeType();
      logger.recordingStart("WebRTCManager");

      // Create MediaRecorder with optimal settings for speech
      this.mediaRecorder = new MediaRecorder(this.localStream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps for good quality speech
      });

      // Handle data available events
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };

      // Start recording
      this.mediaRecorder.start(1000);

      this.isRecording = true;

      if (this.listeners.onRecordingStarted) {
        this.listeners.onRecordingStarted({
          recordingId: this.recordingStartTime.toISOString(),
        });
      }

      return true;
    } catch (error) {
      logger.error("WebRTCManager", `Recording failed: ${error.message}`);
      this.handleRecordingError(error.message);
      return false;
    }
  }

  /**
   * Stop recording the call
   */
  async stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      return null;
    }

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = async () => {
        const recording = await this.processRecording();
        this.isRecording = false;
        logger.recordingStop("WebRTCManager");
        resolve(recording);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Process the recorded audio
   */
  async processRecording() {
    const blob = new Blob(this.recordedChunks, {
      type: this.getSupportedMimeType(),
    });

    const recording = {
      id: `rec_${Date.now()}`,
      blob: blob,
      duration: Math.round((Date.now() - this.recordingStartTime) / 1000),
      size: blob.size,
      mimeType: blob.type,
      createdAt: new Date().toISOString(),
    };

    this.recordedChunks = [];

    if (this.listeners.onRecordingStopped) {
      this.listeners.onRecordingStopped(recording);
    }

    logger.success(
      "WebRTCManager",
      `Recording processed: ${recording.duration}s`,
    );
    return recording;
  }

  /**
   * Handle recording errors
   */
  handleRecordingError(error) {
    logger.error("WebRTCManager", `Recording error: ${error}`);
    this.isRecording = false;

    if (this.listeners.onRecordingError) {
      this.listeners.onRecordingError(error);
    }
  }

  /**
   * Set an event listener
   */
  on(event, callback) {
    if (this.listeners.hasOwnProperty(event)) {
      logger.debug("WebRTCManager", `Listener registered: ${event}`);
      this.listeners[event] = callback;
    }
  }

  /**
   * Remove an event listener
   */
  off(event) {
    if (this.listeners.hasOwnProperty(event)) {
      logger.debug("WebRTCManager", `Listener removed: ${event}`);
      this.listeners[event] = null;
    }
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        logger.debug("WebRTCManager", `Mute: ${!audioTrack.enabled}`);
        return !audioTrack.enabled;
      }
    }
    return false;
  }
}

// Factory function for creating WebRTC manager
export function createWebRTCManager() {
  logger.debug("WebRTCManager", "Creating new manager instance");
  return new WebRTCManager();
}

export default WebRTCManager;
