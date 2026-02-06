/**
 * WebRTC Manager for Peer-to-Peer Calls
 *
 * Handles browser-to-browser calls using Firebase Realtime Database for signaling.
 * Used when Twilio credentials are not available.
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

// Initialize Firebase (client-side only)
let firebaseApp = null;
let database = null;

const initializeFirebase = () => {
  if (typeof window === "undefined") return null;

  if (!firebaseApp) {
    // Dynamic import for Firebase
    const { initializeApp, getApps, getDatabase } = require("firebase/app");
    const {
      getDatabase: getDb,
      ref,
      set,
      onValue,
      remove,
      serverTimestamp,
    } = require("firebase/database");

    const apps = getApps();
    if (apps.length === 0) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = apps[0];
    }
    database = getDb(firebaseApp);

    // Export functions for use
    return {
      app: firebaseApp,
      db: database,
      firebaseFns: { ref, set, onValue, remove, serverTimestamp },
    };
  }
  return {
    app: firebaseApp,
    db: database,
    firebaseFns: { ref, set, onValue, remove, serverTimestamp },
  };
};

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
    this.listeners = {
      onLocalStream: null,
      onRemoteStream: null,
      onConnectionStateChange: null,
      onIceCandidate: null,
      onCallEnded: null,
      onIncomingCall: null,
    };
  }

  /**
   * Initialize the WebRTC manager
   */
  async initialize(localCare4wId) {
    if (typeof window === "undefined") {
      throw new Error("WebRTC is only available in browser environment");
    }

    this.localCare4wId = localCare4wId;
    const firebase = initializeFirebase();

    if (!firebase) {
      throw new Error("Failed to initialize Firebase for WebRTC");
    }

    this.db = firebase.db;
    this.firebaseFns = firebase.firebaseFns;

    // Set up ICE servers (STUN/TURN)
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
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
   * Set event listeners
   */
  on(event, callback) {
    if (this.listeners.hasOwnProperty(event)) {
      this.listeners[event] = callback;
    }
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    return this.peerConnection?.connectionState || "closed";
  }

  /**
   * Check if WebRTC is supported
   */
  static isSupported() {
    if (typeof window === "undefined") return false;
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.RTCPeerConnection
    );
  }
}

// Export singleton instance creator
export const createWebRTCManager = () => new WebRTCManager();
export default WebRTCManager;
