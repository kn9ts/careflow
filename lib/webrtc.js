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
    return firebaseInitResult;
  }

  // Return ongoing promise if initialization in progress
  if (firebaseInitPromise) {
    return firebaseInitPromise;
  }

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
      } else {
        firebaseApp = apps[0];
      }
      database = getDb(firebaseApp);

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

// STUN servers for ICE configuration - static array
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

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
    };
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
    }

    const firebase = await initializeFirebase();

    if (!firebase) {
      throw new Error("Failed to initialize Firebase for WebRTC");
    }

    this.db = firebase.db;
    this.firebaseFns = firebase.firebaseFns;

    // Set up ICE servers (STUN/TURN)
    // Using static configuration to avoid recreation
    this.peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendIceCandidate(event.candidate);
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log("Connection state:", state);
      if (this.listeners.onConnectionStateChange) {
        this.listeners.onConnectionStateChange(state);
      }
      if (state === "disconnected" || state === "failed") {
        this.endCall();
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log("Remote track received");
      this.remoteStream = event.streams[0];
      if (this.listeners.onRemoteStream) {
        this.listeners.onRemoteStream(this.remoteStream);
      }
    };

    // Listen for incoming calls
    this.listenForIncomingCalls();
  }

  /**
   * Get user media (microphone)
   */
  async getLocalStream(constraints = { audio: true, video: false }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Add tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      if (this.listeners.onLocalStream) {
        this.listeners.onLocalStream(this.localStream);
      }

      return this.localStream;
    } catch (error) {
      console.error("Error getting local stream:", error);
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

    // Create offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

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

    // Set remote description (offer)
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offerSdp),
    );

    // Create answer
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    const { ref, set, serverTimestamp } = this.firebaseFns;

    // Store answer in Firebase
    const answerRef = ref(this.db, `calls/${roomId}/answer`);
    await set(answerRef, {
      sdp: answer.sdp,
      type: answer.type,
      from: this.localCare4wId,
      timestamp: serverTimestamp(),
    });

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
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
      });
    });
  }

  /**
   * End the current call
   */
  async endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clean up Firebase room
    if (this.db && this.currentRoomId && this.firebaseFns) {
      const { ref, remove } = this.firebaseFns;
      const roomRef = ref(this.db, `calls/${this.currentRoomId}`);
      await remove(roomRef);
      this.currentRoomId = null;
    }

    if (this.listeners.onCallEnded) {
      this.listeners.onCallEnded();
    }
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
      console.warn("Recording already in progress");
      return false;
    }

    if (!this.localStream) {
      console.error("No local stream available for recording");
      this.handleRecordingError("No local stream available");
      return false;
    }

    try {
      this.recordedChunks = [];
      this.recordingStartTime = new Date();

      const mimeType = this.getSupportedMimeType();
      console.log("Using MIME type for recording:", mimeType);

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
      console.error("Failed to start recording:", error);
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

    console.log("Recording processed:", recording);
    return recording;
  }

  /**
   * Handle recording errors
   */
  handleRecordingError(error) {
    console.error("Recording error:", error);
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
      this.listeners[event] = callback;
    }
  }

  /**
   * Remove an event listener
   */
  off(event) {
    if (this.listeners.hasOwnProperty(event)) {
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
        return !audioTrack.enabled;
      }
    }
    return false;
  }
}

// Factory function for creating WebRTC manager
export function createWebRTCManager() {
  return new WebRTCManager();
}

export default WebRTCManager;
