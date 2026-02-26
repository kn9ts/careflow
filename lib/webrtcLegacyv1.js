/**
 * WebRTC Manager for Peer-to-Peer Calls
 *
 * Handles browser-to-browser calls using Firebase Realtime Database for signaling.
 * Used when Twilio credentials are not available.
 *
 * IMPROVEMENTS:
 * - Added timeout handling for initialization
 * - Added proper error recovery and state tracking
 * - Added connection state management
 * - Added fallback logic for initialization failures
 * - Fixed race conditions in Firebase initialization
 *
 * SECURITY NOTES:
 * - All Firebase operations require authentication
 * - Use Firebase Security Rules for access control
 * - Validate CareFlow IDs server-side when possible
 */

import { logger } from '@/lib/logger';

// Timeout constants
const FIREBASE_INIT_TIMEOUT = 20000; // 20 seconds
const PEER_CONNECTION_TIMEOUT = 15000; // 15 seconds

/**
 * Create a promise that rejects after a timeout
 */
const timeout = (ms, message) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));

/**
 * Wrap a promise with a timeout
 */
const withTimeout = (promise, ms, message) => Promise.race([promise, timeout(ms, message)]);

// Firebase configuration from environment
const getFirebaseConfig = () => {
  if (typeof window === 'undefined') return null;

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  };
};

// Validate configuration
// NOTE: In Next.js, env vars must be accessed directly (not via dynamic key)
// because they are statically replaced at build time
const validateConfig = () => {
  if (typeof window === 'undefined') return false;

  // Access env vars directly for Next.js static replacement
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  const missing = [];
  if (!apiKey) missing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!databaseURL) missing.push('NEXT_PUBLIC_FIREBASE_DATABASE_URL');

  if (missing.length > 0) {
    logger.warn('Firebase', `Missing required config: ${missing.join(', ')}`);
    return false;
  }
  return true;
};

// Firebase state management (module-level singletons)
let firebaseApp = null;
let database = null;
let authToken = null;
let firebaseInitPromise = null;
let firebaseInitResult = null;
let firebaseInitError = null;
let firebaseAuthenticated = false;

/**
 * Store auth token from CallManager
 */
const setAuthToken = (token) => {
  authToken = token;
};

/**
 * Ensure Firebase is authenticated - call this when a token becomes available
 * @returns {Promise<boolean>} True if authenticated or not needed
 */
const ensureAuthenticated = async () => {
  if (firebaseAuthenticated || !firebaseApp) {
    return firebaseAuthenticated;
  }

  try {
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');
    const auth = getAuth(firebaseApp);

    if (auth.currentUser) {
      firebaseAuthenticated = true;
      return true;
    }

    // Wait briefly for auth state
    await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
      });
      setTimeout(resolve, 3000);
    });

    firebaseAuthenticated = !!auth.currentUser;
    return firebaseAuthenticated;
  } catch (error) {
    logger.warn('Firebase', `Auth check failed: ${error.message}`);
    return false;
  }
};

/**
 * Reset Firebase initialization state (for retry)
 */
const resetFirebaseInit = () => {
  firebaseInitPromise = null;
  firebaseInitError = null;
  firebaseAuthenticated = false;
  // Don't reset firebaseInitResult as the app may still be valid
};

/**
 * Initialize Firebase with timeout and error handling
 */
const initializeFirebase = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Firebase cannot be initialized on the server');
  }

  // Return cached result if already initialized
  if (firebaseInitResult) {
    // If we weren't authenticated before, try to authenticate now
    if (!firebaseAuthenticated) {
      await ensureAuthenticated();
    }
    logger.success('Firebase', 'Using cached Firebase instance');
    return firebaseInitResult;
  }

  // Return ongoing promise if initialization in progress
  if (firebaseInitPromise) {
    logger.debug('Firebase', 'Waiting for existing initialization...');
    return firebaseInitPromise;
  }

  // Start initialization with timeout
  firebaseInitPromise = (async () => {
    try {
      logger.loading('Firebase', 'Initializing Firebase...');

      // Validate config before proceeding
      if (!validateConfig()) {
        throw new Error(
          'Firebase configuration is incomplete. Check NEXT_PUBLIC_FIREBASE_* environment variables.'
        );
      }

      // Dynamic import for Firebase - only load when needed
      const { initializeApp, getApps } = await import('firebase/app');
      const {
        getDatabase: getDb,
        ref,
        set,
        onValue,
        off,
        remove,
        serverTimestamp,
        push,
      } = await import('firebase/database');

      const apps = getApps();
      if (apps.length === 0) {
        const config = getFirebaseConfig();
        firebaseApp = initializeApp(config);
        logger.success('Firebase', 'Firebase app initialized');
      } else {
        firebaseApp = apps[0];
        logger.debug('Firebase', 'Using existing Firebase app');
      }

      database = getDb(firebaseApp);
      logger.success('Firebase', 'Database connected');

      // Sign in to Firebase Auth - use client-side auth if available
      // This leverages the existing Firebase Auth session from user login
      if (firebaseApp) {
        try {
          const { getAuth, onAuthStateChanged } = await import('firebase/auth');
          const auth = getAuth(firebaseApp);

          // Wait for auth state to be ready (in case user just logged in)
          await new Promise((resolve) => {
            if (auth.currentUser) {
              logger.debug('Firebase', 'Already authenticated via client-side auth');
              resolve();
            } else {
              // Listen for auth state change
              const unsubscribe = onAuthStateChanged(auth, () => {
                unsubscribe();
                resolve();
              });
              // Timeout after 5 seconds if no auth state
              setTimeout(resolve, 5000);
            }
          });

          if (auth.currentUser) {
            logger.success('Firebase', 'Using existing Firebase Auth session');
            firebaseAuthenticated = true;
          } else {
            logger.warn(
              'Firebase',
              'No authenticated user found - will use unauthenticated access'
            );
          }
        } catch (authError) {
          logger.warn(
            'Firebase',
            `Firebase auth check failed: ${authError.message}. Continuing without auth.`
          );
          // Continue anyway - some Firebase rules may allow unauthenticated access
        }
      } else {
        logger.debug('Firebase', 'No Firebase app available, skipping auth');
      }

      // Export functions for use with authenticated calls
      firebaseInitResult = {
        app: firebaseApp,
        db: database,
        firebaseFns: { ref, set, onValue, off, remove, serverTimestamp, push },
        setAuthToken,
        ensureAuthenticated,
      };

      firebaseInitError = null;
      return firebaseInitResult;
    } catch (error) {
      firebaseInitError = error;
      firebaseInitPromise = null; // Allow retry
      logger.error(
        'Firebase',
        `Initialization failed: ${error?.message || error || 'Unknown error'}`
      );
      throw error;
    }
  })();

  // Wrap with timeout
  try {
    return await withTimeout(
      firebaseInitPromise,
      FIREBASE_INIT_TIMEOUT,
      `Firebase initialization timed out after ${FIREBASE_INIT_TIMEOUT / 1000} seconds`
    );
  } catch (error) {
    firebaseInitPromise = null;
    throw error;
  }
};

/**
 * Get Firebase initialization status
 */
const getFirebaseStatus = () => ({
  initialized: !!firebaseInitResult,
  initializing: !!firebaseInitPromise,
  error: firebaseInitError?.message || null,
});

// ICE servers configuration - STUN + TURN for NAT traversal
const ICE_SERVERS = [
  // Public STUN servers (free)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
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
    logger.info('WebRTCManager', 'TURN server configured - enabling relay mode');
    return [
      ...ICE_SERVERS,
      {
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      },
    ];
  }

  logger.debug('WebRTCManager', 'Using STUN servers only (no TURN configured)');
  return ICE_SERVERS;
}

/**
 * Check if WebRTC is supported in the current environment
 */
function isWebRTCSupported() {
  if (typeof window === 'undefined') return false;
  return !!(
    window.RTCPeerConnection &&
    window.RTCSessionDescription &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
}

class WebRTCManager {
  constructor() {
    // Connection state
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentRoomId = null;
    this.targetCare4wId = null;
    this.localCare4wId = null;
    this.db = null;
    this.firebaseFns = null;

    // Initialization state
    this._initialized = false;
    this._initializing = false;
    this._initError = null;
    this._connectionState = 'idle'; // idle, initializing, ready, connecting, connected, failed, disconnected

    // RC-100: Initialization promise for race condition prevention
    this._initializationPromise = null;

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

    // RC-130: Resource tracking for cleanup
    this._activeTracks = new Set();
    this._activeConnections = new Set();

    // RC-120: Signaling path isolation
    this._signalingPath = null;

    // Call tracking
    this._callStartTime = null;

    // Connection timeout for stuck calls
    this._connectionTimeout = null;
    const CONNECTION_TIMEOUT_MS = 30000; // 30 seconds

    // Event listeners
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
      onError: null,
      onStateChanged: null,
    };

    logger.init('WebRTCManager');
  }

  /**
   * Get current state
   */
  getState() {
    return {
      initialized: this._initialized,
      connectionState: this._connectionState,
      error: this._initError,
      hasLocalStream: !!this.localStream,
      hasRemoteStream: !!this.remoteStream,
      currentRoomId: this.currentRoomId,
      firebaseStatus: getFirebaseStatus(),
    };
  }

  /**
   * Update connection state and notify listeners
   */
  _updateState(state, message = '') {
    const previousState = this._connectionState;
    this._connectionState = state;

    logger.debug(
      'WebRTCManager',
      `State: ${previousState} -> ${state}${message ? ` (${message})` : ''}`
    );

    if (this.listeners.onStateChanged) {
      this.listeners.onStateChanged({ previousState, state, message });
    }

    if (this.listeners.onConnectionStateChange) {
      this.listeners.onConnectionStateChange(state);
    }

    // Clear connection timeout when state changes to connected
    if (state === 'connected') {
      this._clearConnectionTimeout();
    }
  }

  /**
   * Set up connection timeout to detect stuck calls
   * @private
   */
  _setupConnectionTimeout() {
    // Clear any existing timeout
    this._clearConnectionTimeout();

    const TIMEOUT_MS = 30000; // 30 seconds

    logger.debug('WebRTCManager', `Setting up connection timeout: ${TIMEOUT_MS}ms`);

    this._connectionTimeout = setTimeout(() => {
      if (this._connectionState === 'connecting') {
        logger.error('WebRTCManager', 'Connection timeout - call stuck in connecting state');
        this._updateState('failed', 'Connection timeout - call could not complete');
        this.endCall();
      }
    }, TIMEOUT_MS);
  }

  /**
   * Clear connection timeout
   * @private
   */
  _clearConnectionTimeout() {
    if (this._connectionTimeout) {
      clearTimeout(this._connectionTimeout);
      this._connectionTimeout = null;
      logger.debug('WebRTCManager', 'Connection timeout cleared');
    }
  }

  /**
   * Check if WebRTC is supported
   */
  static isSupported() {
    return isWebRTCSupported();
  }

  /**
   * Initialize the WebRTC manager
   * @param {string} localCare4wId - User's CareFlow ID
   * @param {string} token - Firebase auth token for secure signaling
   */
  async initialize(localCare4wId, token = null) {
    // Check browser support first
    if (!isWebRTCSupported()) {
      const error = new Error('WebRTC is not supported in this browser');
      this._initError = error;
      this._updateState('failed', 'WebRTC not supported');
      throw error;
    }

    if (typeof window === 'undefined') {
      const error = new Error('WebRTC is only available in browser environment');
      this._initError = error;
      throw error;
    }

    // Prevent double initialization
    if (this._initialized) {
      logger.debug('WebRTCManager', 'Already initialized');
      return;
    }

    // RC-100: Use initialization promise to prevent race conditions
    if (this._initializationPromise) {
      logger.debug('WebRTCManager', 'Returning existing initialization promise');
      return this._initializationPromise;
    }

    // Create initialization promise immediately
    this._initializationPromise = this._doInitialize(localCare4wId, token);

    try {
      await this._initializationPromise;
    } catch (error) {
      // Clear promise on failure to allow retry
      this._initializationPromise = null;
      throw error;
    }
  }

  /**
   * Internal initialization implementation
   * @private
   */
  async _doInitialize(localCare4wId, token) {
    this._initializing = true;
    this._initError = null;
    this._updateState('initializing', 'Starting initialization...');

    try {
      this.localCare4wId = localCare4wId;

      // RC-120: Set signaling path for this instance
      this._signalingPath = `users/${localCare4wId}/calls`;

      // Store auth token if provided
      if (token) {
        authToken = token;
        logger.debug('WebRTCManager', 'Auth token stored');
      }

      logger.loading('WebRTCManager', 'Initializing Firebase connection...');

      // Initialize Firebase with timeout
      const firebase = await initializeFirebase();

      if (!firebase) {
        throw new Error('Failed to initialize Firebase for WebRTC');
      }

      this.db = firebase.db;
      this.firebaseFns = firebase.firebaseFns;
      logger.success('WebRTCManager', 'Firebase initialized');

      // Set up ICE servers (STUN/TURN) with graceful fallback
      logger.loading('WebRTCManager', 'Creating peer connection...');
      await this._createPeerConnection();

      // Listen for incoming calls
      logger.loading('WebRTCManager', 'Setting up incoming call listener...');
      this.listenForIncomingCalls();

      // Set up reconnection handler for Firebase
      this.setupReconnectionHandler();

      this._initialized = true;
      this._initializing = false;
      this._updateState('ready', 'WebRTC ready');
      logger.success('WebRTCManager', 'Ready to receive calls!');
    } catch (error) {
      this._initialized = false;
      this._initializing = false;
      this._initError = error;
      this._updateState('failed', error?.message || error || 'Unknown error');

      logger.error(
        'WebRTCManager',
        `Initialization failed: ${error?.message || error || 'Unknown error'}`
      );

      if (this.listeners.onError) {
        this.listeners.onError(error);
      }

      throw error;
    }
  }

  /**
   * Create peer connection with timeout
   */
  async _createPeerConnection() {
    return withTimeout(
      new Promise((resolve, reject) => {
        try {
          this.peerConnection = new RTCPeerConnection({
            iceServers: getIceServers(),
          });

          // Handle ICE candidates
          this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              logger.debug(
                'WebRTCManager',
                `Local ICE candidate generated: ${event.candidate.candidate?.substring(0, 50)}...`
              );
              this.sendIceCandidate(event.candidate);
            } else {
              logger.debug(
                'WebRTCManager',
                'All local ICE candidates have been generated (gathering complete)'
              );
            }
          };

          // Handle connection state changes
          this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            logger.trace('WebRTCManager', `Connection state changed: ${state}`);

            this._updateState(state);

            const stateMessages = {
              new: 'New peer connection created',
              connecting: 'Establishing connection...',
              connected: 'Peer connection established',
              disconnected: 'Peer disconnected',
              failed: 'Connection failed',
              closed: 'Connection closed',
            };

            if (state === 'connected') {
              logger.success('WebRTCManager', 'Call connected!');
            } else if (state === 'disconnected') {
              logger.warn('WebRTCManager', 'Connection disconnected - may attempt reconnection');
              // Don't end call immediately, might reconnect
            } else if (state === 'failed') {
              logger.error('WebRTCManager', 'Connection failed - ending call');
              this.endCall();
            } else if (state === 'closed') {
              logger.debug('WebRTCManager', 'Connection closed');
            } else {
              logger.debug('WebRTCManager', `Connection state: ${stateMessages[state] || state}`);
            }
          };

          // Handle ICE connection state changes
          this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            logger.trace('WebRTCManager', `ICE connection state: ${state}`);

            const iceStateMessages = {
              new: 'ICE checking',
              checking: 'Checking ICE candidates...',
              connected: 'ICE connection established',
              completed: 'ICE negotiation complete',
              disconnected: 'ICE disconnected',
              failed: 'ICE connection failed',
              closed: 'ICE closed',
            };

            if (state === 'failed') {
              logger.error('WebRTCManager', `ICE connection failed: ${iceStateMessages[state]}`);
              // Try ICE restart
              if (this.currentRoomId) {
                logger.loading('WebRTCManager', 'Attempting ICE restart...');
                this.restartIce().catch((e) => {
                  logger.error('WebRTCManager', `ICE restart failed: ${e.message}`);
                  this.endCall();
                });
              }
            } else if (state === 'connected' || state === 'completed') {
              logger.success(
                'WebRTCManager',
                `ICE connection established: ${iceStateMessages[state]}`
              );
            } else if (state === 'disconnected') {
              logger.warn('WebRTCManager', 'ICE disconnected - may reconnect');
            } else {
              logger.debug('WebRTCManager', `ICE state: ${iceStateMessages[state] || state}`);
            }
          };

          // Handle remote stream
          this.peerConnection.ontrack = (event) => {
            logger.success(
              'WebRTCManager',
              `Remote track received: kind=${event.track?.kind}, id=${event.track?.id}`
            );
            this.remoteStream = event.streams[0];
            logger.debug(
              'WebRTCManager',
              `Remote stream ID: ${this.remoteStream?.id}, tracks: ${this.remoteStream?.getTracks()?.length || 0}`
            );

            if (this.listeners.onRemoteStream) {
              this.listeners.onRemoteStream(this.remoteStream);
            }
          };

          logger.success('WebRTCManager', 'Peer connection created');
          resolve();
        } catch (error) {
          logger.error(
            'WebRTCManager',
            `Failed to create peer connection: ${error?.message || error || 'Unknown error'}`
          );
          reject(error);
        }
      }),
      PEER_CONNECTION_TIMEOUT,
      `Peer connection setup timed out after ${PEER_CONNECTION_TIMEOUT / 1000} seconds`
    );
  }

  /**
   * Get user media (microphone)
   */
  async getLocalStream(constraints = { audio: true, video: false }) {
    try {
      logger.loading('WebRTCManager', 'Requesting local audio stream...');
      logger.debug('WebRTCManager', `Media constraints: ${JSON.stringify(constraints)}`);

      // Check if we already have a stream
      if (this.localStream) {
        logger.debug('WebRTCManager', 'Using existing local stream');
        return this.localStream;
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      const audioTrack = this.localStream.getAudioTracks()[0];
      logger.success('WebRTCManager', `Local stream acquired: ${this.localStream.id}`);
      logger.debug(
        'WebRTCManager',
        `Audio track: ${audioTrack?.id}, enabled: ${audioTrack?.enabled}, muted: ${audioTrack?.muted}`
      );

      // RC-130: Track active tracks for resource management
      this.localStream.getTracks().forEach((track) => {
        this._activeTracks.add(track.id);
        logger.debug(
          'WebRTCManager',
          `Tracking ${track.kind} track: ${track.id}, label: ${track.label}`
        );
      });

      // Add tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        logger.debug('WebRTCManager', `Adding ${track.kind} track to peer connection: ${track.id}`);
        this.peerConnection.addTrack(track, this.localStream);
      });

      if (this.listeners.onLocalStream) {
        this.listeners.onLocalStream(this.localStream);
      }

      return this.localStream;
    } catch (error) {
      logger.error(
        'WebRTCManager',
        `Failed to get local stream: ${error?.message || error || 'Unknown error'}`
      );

      // Provide helpful error message
      if (error.name === 'NotAllowedError') {
        logger.error('WebRTCManager', 'Microphone access denied by user');
        throw new Error('Microphone access denied. Please allow microphone access and try again.');
      } else if (error.name === 'NotFoundError') {
        logger.error('WebRTCManager', 'No microphone found on device');
        throw new Error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        logger.error('WebRTCManager', 'Microphone already in use');
        throw new Error('Microphone is already in use by another application.');
      }

      throw error;
    }
  }

  /**
   * Create an offer for a new call
   */
  async createOffer(targetCare4wId) {
    if (!this.peerConnection) {
      throw new Error('WebRTC not initialized');
    }

    if (!this.localCare4wId) {
      throw new Error('Local CareFlow ID not set - cannot create offer');
    }

    this.targetCare4wId = targetCare4wId;
    this.currentRoomId = `${this.localCare4wId}-${targetCare4wId}-${Date.now()}`;

    logger.callStart('WebRTCManager', targetCare4wId);
    logger.debug(
      'WebRTCManager',
      `Creating room: ${this.currentRoomId} (from: ${this.localCare4wId}, to: ${targetCare4wId})`
    );
    this._updateState('connecting', 'Creating offer...');

    // Track call start time
    this._callStartTime = Date.now();
    logger.debug('WebRTCManager', `Call start time recorded: ${this._callStartTime}`);

    try {
      // Start listening for ICE candidates BEFORE creating offer to catch any that come immediately
      logger.debug('WebRTCManager', 'Setting up ICE candidate listener before creating offer...');
      this.listenForIceCandidates(this.currentRoomId);

      // Create offer
      logger.debug('WebRTCManager', 'Creating SDP offer...');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      logger.debug(
        'WebRTCManager',
        `Local SDP set: type=${offer.type}, sdp length=${offer.sdp?.length || 0}`
      );

      const { ref, set, serverTimestamp } = this.firebaseFns;

      // Store offer in Firebase
      logger.debug('WebRTCManager', `Storing offer in Firebase for target: ${targetCare4wId}`);
      const offerRef = ref(this.db, `calls/${this.currentRoomId}/offer`);
      await set(offerRef, {
        sdp: offer.sdp,
        type: offer.type,
        from: this.localCare4wId,
        to: targetCare4wId,
        timestamp: serverTimestamp(),
      });

      logger.success('WebRTCManager', 'Offer sent, waiting for answer...');
      this._updateState('connecting', 'Waiting for answer...');

      // Set up connection timeout to detect stuck calls
      this._setupConnectionTimeout();

      // Listen for answer
      this.listenForAnswer(this.currentRoomId);

      return offer;
    } catch (error) {
      logger.error(
        'WebRTCManager',
        `Failed to create offer: ${error?.message || error || 'Unknown error'}`
      );
      this._updateState('failed', `Offer failed: ${error?.message || error || 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(roomId, offerSdp) {
    if (!this.peerConnection) {
      throw new Error('WebRTC not initialized');
    }

    this.currentRoomId = roomId;
    logger.loading('WebRTCManager', `Accepting call in room ${roomId}...`);
    this._updateState('connecting', 'Accepting call...');

    // Track call start time
    this._callStartTime = Date.now();
    logger.debug('WebRTCManager', `Call start time recorded: ${this._callStartTime}`);

    try {
      // Set remote description (offer)
      logger.debug(
        'WebRTCManager',
        `Setting remote description: type=${offerSdp.type}, sdp length=${offerSdp.sdp?.length || 0}`
      );
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));
      logger.success('WebRTCManager', 'Remote description set');

      // CRITICAL FIX: Start listening for ICE candidates BEFORE creating answer
      // This prevents race condition where caller sends ICE candidates before we're listening
      logger.debug('WebRTCManager', 'Starting ICE candidate listener before creating answer...');
      this.listenForIceCandidates(roomId);

      // Get local stream before creating answer
      if (!this.localStream) {
        await this.getLocalStream({ audio: true, video: false });
      }

      // Create answer
      logger.debug('WebRTCManager', 'Creating SDP answer...');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      logger.debug(
        'WebRTCManager',
        `Local answer created: type=${answer.type}, sdp length=${answer.sdp?.length || 0}`
      );

      const { ref, set, serverTimestamp } = this.firebaseFns;

      // Store answer in Firebase
      logger.debug('WebRTCManager', 'Storing answer in Firebase...');
      const answerRef = ref(this.db, `calls/${roomId}/answer`);
      await set(answerRef, {
        sdp: answer.sdp,
        type: answer.type,
        from: this.localCare4wId,
        timestamp: serverTimestamp(),
      });

      logger.success('WebRTCManager', 'Answer sent');
      this._updateState('connecting', 'Answer sent, connecting...');

      // Set up connection timeout to detect stuck calls
      this._setupConnectionTimeout();

      return answer;
    } catch (error) {
      logger.error(
        'WebRTCManager',
        `Failed to accept call: ${error?.message || error || 'Unknown error'}`
      );
      this._updateState('failed', `Accept failed: ${error?.message || error || 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Send ICE candidate to remote peer
   */
  async sendIceCandidate(candidate) {
    if (!this.currentRoomId || !this.firebaseFns) {
      logger.warn('WebRTCManager', 'Cannot send ICE candidate - room ID or Firebase not available');
      return;
    }

    try {
      logger.debug(
        'WebRTCManager',
        `Sending ICE candidate: ${candidate.candidate?.substring(0, 50)}..., sdpMid: ${candidate.sdpMid}, sdpMLineIndex: ${candidate.sdpMLineIndex}`
      );

      const { ref, set, serverTimestamp } = this.firebaseFns;
      const iceRef = ref(this.db, `calls/${this.currentRoomId}/ice/${Date.now()}`);
      await set(iceRef, {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
        from: this.localCare4wId,
        timestamp: serverTimestamp(),
      });

      logger.trace('WebRTCManager', 'ICE candidate sent successfully');
    } catch (error) {
      logger.error(
        'WebRTCManager',
        `Failed to send ICE candidate: ${error?.message || error || 'Unknown error'}`
      );
    }
  }

  /**
   * Listen for incoming calls
   */
  listenForIncomingCalls() {
    if (!this.db || !this.localCare4wId || !this.firebaseFns) {
      logger.warn('WebRTCManager', 'Cannot listen for calls - not fully initialized');
      return;
    }

    logger.debug(
      'WebRTCManager',
      `Starting incoming call listener for user: ${this.localCare4wId}`
    );

    const { ref, onValue } = this.firebaseFns;
    const incomingCallsRef = ref(this.db, `calls`);

    const unsubscribe = onValue(incomingCallsRef, (snapshot) => {
      const calls = snapshot.val();
      if (!calls) {
        logger.trace('WebRTCManager', 'No calls in Firebase');
        return;
      }

      logger.debug(
        'WebRTCManager',
        `Checking ${Object.keys(calls).length} rooms for incoming calls (listening for: ${this.localCare4wId})`
      );

      // Look for calls where this user is the target
      Object.entries(calls).forEach(([roomId, callData]) => {
        const offerTo = callData.offer?.to;
        const offerFrom = callData.offer?.from;
        const hasAnswer = !!callData.answer;

        logger.debug(
          'WebRTCManager',
          `Room ${roomId}: offer.to=${offerTo}, offer.from=${offerFrom}, hasAnswer=${hasAnswer}`
        );

        if (
          callData.offer &&
          callData.offer.to === this.localCare4wId &&
          !callData.answer // Not yet answered
        ) {
          logger.incomingCall('WebRTCManager', callData.offer.from);
          this._updateState('connecting', `Incoming call from ${callData.offer.from}`);

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

    // Store unsubscribe function for cleanup
    this.unsubscribers.push(unsubscribe);
    logger.debug('WebRTCManager', 'Incoming call listener registered');
  }

  /**
   * Listen for answer to our offer
   */
  listenForAnswer(roomId) {
    if (!this.db || !this.firebaseFns) {
      logger.warn('WebRTCManager', 'Cannot listen for answer - Firebase not available');
      return;
    }

    logger.debug('WebRTCManager', `Starting answer listener for room: ${roomId}`);

    const { ref, onValue } = this.firebaseFns;
    const answerRef = ref(this.db, `calls/${roomId}/answer`);

    const unsubscribe = onValue(answerRef, async (snapshot) => {
      const answer = snapshot.val();
      if (answer && answer.sdp) {
        logger.success('WebRTCManager', `Answer received from: ${answer.from}`);

        try {
          logger.debug(
            'WebRTCManager',
            `Setting remote answer: type=${answer.type}, sdp length=${answer.sdp?.length || 0}`
          );
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription({
              sdp: answer.sdp,
              type: answer.type,
            })
          );
          logger.success('WebRTCManager', 'Remote answer description set');

          // Start listening for ICE candidates
          this.listenForIceCandidates(roomId);
        } catch (error) {
          logger.error(
            'WebRTCManager',
            `Failed to set remote description: ${error?.message || error || 'Unknown error'}`
          );
          this._updateState('failed', error?.message || error || 'Unknown error');
        }
      }
    });

    // Store unsubscribe function for cleanup
    this.unsubscribers.push(unsubscribe);
    logger.debug('WebRTCManager', 'Answer listener registered');
  }

  /**
   * Listen for ICE candidates from remote peer
   */
  listenForIceCandidates(roomId) {
    if (!this.db || !this.firebaseFns) return;

    logger.debug('WebRTCManager', `Starting ICE candidate listener for room: ${roomId}`);

    const { ref, onValue } = this.firebaseFns;
    const iceRef = ref(this.db, `calls/${roomId}/ice`);

    const unsubscribe = onValue(iceRef, async (snapshot) => {
      const candidates = snapshot.val();
      if (!candidates) return;

      logger.trace(
        'WebRTCManager',
        `Received ICE candidates update, processing ${Object.keys(candidates).length} candidates`
      );

      for (const [key, candidateData] of Object.entries(candidates)) {
        if (candidateData.candidate && candidateData.from !== this.localCare4wId) {
          logger.debug(
            'WebRTCManager',
            `Processing ICE candidate from ${candidateData.from}, sdpMid: ${candidateData.sdpMid}, sdpMLineIndex: ${candidateData.sdpMLineIndex}`
          );
          try {
            await this.peerConnection.addIceCandidate(
              new RTCIceCandidate({
                candidate: candidateData.candidate,
                sdpMid: candidateData.sdpMid,
                sdpMLineIndex: candidateData.sdpMLineIndex,
              })
            );
            logger.success('WebRTCManager', `ICE candidate added successfully (candidate: ${key})`);
          } catch (error) {
            // Ignore errors for duplicate candidates
            if (!error?.message || error?.message?.includes('duplicate')) {
              logger.error(
                'WebRTCManager',
                `Failed to add ICE candidate: ${error?.message || error || 'Unknown error'}`
              );
            } else {
              logger.debug(
                'WebRTCManager',
                `Ignored duplicate ICE candidate error: ${error.message}`
              );
            }
          }
        }
      }
    });

    // Store unsubscribe function for cleanup
    this.unsubscribers.push(unsubscribe);
    logger.debug('WebRTCManager', 'ICE candidate listener registered');
  }

  /**
   * End the current call
   */
  async endCall() {
    logger.loading('WebRTCManager', 'Ending call...');

    // Clear connection timeout
    this._clearConnectionTimeout();

    const callStartTime = this._callStartTime;
    const callDuration = callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : 0;

    // RC-130: Track cleanup for resource management
    const cleanupStats = {
      tracksStopped: 0,
      connectionsClosed: 0,
      listenersRemoved: 0,
    };

    // Stop local stream with tracking
    if (this.localStream) {
      logger.debug('WebRTCManager', `Stopping local stream: ${this.localStream.id}`);
      this.localStream.getTracks().forEach((track) => {
        logger.debug('WebRTCManager', `Stopping ${track.kind} track: ${track.id}`);
        track.stop();
        this._activeTracks.delete(track.id);
        cleanupStats.tracksStopped++;
      });
      this.localStream = null;
      logger.debug('WebRTCManager', 'Local stream stopped and cleared');
    }

    // Close peer connection with tracking
    if (this.peerConnection) {
      logger.debug(
        'WebRTCManager',
        `Closing peer connection, state: ${this.peerConnection.connectionState}`
      );
      this._activeConnections.delete(this.peerConnection);
      this.peerConnection.close();
      this.peerConnection = null;
      cleanupStats.connectionsClosed++;
      logger.debug('WebRTCManager', 'Peer connection closed');
    }

    // Clean up Firebase room
    if (this.db && this.currentRoomId && this.firebaseFns) {
      try {
        const roomId = this.currentRoomId;
        logger.debug('WebRTCManager', `Cleaning up Firebase room: ${roomId}`);
        const { ref, remove } = this.firebaseFns;
        const roomRef = ref(this.db, `calls/${roomId}`);
        await remove(roomRef);
        logger.debug('WebRTCManager', 'Firebase room cleaned up');
      } catch (error) {
        logger.warn(
          'WebRTCManager',
          `Failed to cleanup room: ${error?.message || error || 'Unknown error'}`
        );
      }
      this.currentRoomId = null;
    }

    // Clean up listeners
    cleanupStats.listenersRemoved = this.unsubscribers.length;
    this.cleanupListeners();
    logger.debug('WebRTCManager', `${cleanupStats.listenersRemoved} listeners cleaned up`);

    // Reset state
    this.remoteStream = null;
    this.targetCare4wId = null;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;

    // Clear call start time (duration already calculated above)
    this._callStartTime = null;

    // RC-120: Clear signaling path
    this._signalingPath = null;

    this._updateState('idle', 'Call ended');

    if (this.listeners.onCallEnded) {
      logger.debug('WebRTCManager', 'Notifying listeners of call end');
      this.listeners.onCallEnded();
    }

    logger.debug('WebRTCManager', `Cleanup stats: ${JSON.stringify(cleanupStats)}`);
    logger.callEnd('WebRTCManager');
    if (callDuration > 0) {
      logger.info('WebRTCManager', `Call duration: ${callDuration}s`);
    }
  }

  /**
   * Set up Firebase connection monitoring for reconnection
   */
  setupReconnectionHandler() {
    if (!this.db || !this.firebaseFns) return;

    const { ref, onValue, off } = this.firebaseFns;

    // Monitor connection state
    const connectedRef = ref(this.db, '.info/connected');

    const handleConnectionChange = (snapshot) => {
      const isConnected = snapshot.val();

      if (isConnected === false) {
        logger.warn('WebRTCManager', 'Firebase disconnected - may lose signaling');
      } else if (isConnected === true && this.isReconnecting) {
        logger.success('WebRTCManager', 'Firebase reconnected');
        this.handleFirebaseReconnect();
      }
    };

    onValue(connectedRef, handleConnectionChange);

    // Store unsubscriber for cleanup
    this.unsubscribers.push(() => off(connectedRef));

    logger.debug('WebRTCManager', 'Reconnection handler set up');
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
      logger.error('WebRTCManager', 'Max reconnection attempts reached');
      this.isReconnecting = false;
      this.endCall();
      return;
    }

    this.reconnectAttempts++;
    logger.loading(
      'WebRTCManager',
      `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
    );

    // If we have an active call, try to resubscribe
    if (this.currentRoomId) {
      try {
        // Clean up old listeners
        this.cleanupListeners();

        // Re-listen for the current call
        if (this.peerConnection && this.peerConnection.connectionState === 'connected') {
          // ICE restart if connection is stale
          await this.restartIce();
        }

        // Re-subscribe to Firebase listeners
        this.listenForIncomingCalls();

        logger.success('WebRTCManager', 'Signaling reconnected');
        this.isReconnecting = false;
        this.reconnectAttempts = 0;

        if (this.listeners.onReconnected) {
          this.listeners.onReconnected();
        }
      } catch (error) {
        logger.error(
          'WebRTCManager',
          `Reconnection attempt failed: ${error?.message || error || 'Unknown error'}`
        );

        // Retry with exponential backoff
        setTimeout(
          () => {
            this.attemptReconnection();
          },
          2 ** this.reconnectAttempts * 1000
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
      throw new Error('Peer connection not initialized');
    }

    logger.loading('WebRTCManager', 'Restarting ICE...');

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

        logger.success('WebRTCManager', 'ICE restart offer sent');
      }
    } catch (error) {
      logger.error(
        'WebRTCManager',
        `ICE restart failed: ${error?.message || error || 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Clean up Firebase listeners
   */
  cleanupListeners() {
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    this.unsubscribers = [];
  }

  /**
   * Get current connection statistics
   */
  async getConnectionStats() {
    if (!this.peerConnection) {
      return null;
    }

    try {
      const stats = await this.peerConnection.getStats();
      const report = {
        bytesReceived: 0,
        bytesSent: 0,
        packetsLost: 0,
        roundTripTime: 0,
        state: this.peerConnection.connectionState,
      };

      stats.forEach((stat) => {
        if (stat.type === 'inbound-rtp') {
          report.bytesReceived += stat.bytesReceived || 0;
          report.packetsLost += stat.packetsLost || 0;
        }
        if (stat.type === 'outbound-rtp') {
          report.bytesSent += stat.bytesSent || 0;
        }
        if (stat.type === 'candidate-pair' && stat.currentRoundTripTime) {
          report.roundTripTime = stat.currentRoundTripTime;
        }
      });

      return report;
    } catch (error) {
      logger.error(
        'WebRTCManager',
        `Failed to get stats: ${error?.message || error || 'Unknown error'}`
      );
      return null;
    }
  }

  /**
   * Get supported MIME type for recording
   */
  getSupportedMimeType() {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        logger.debug('WebRTCManager', `Using MIME type: ${mimeType}`);
        return mimeType;
      }
    }

    return 'audio/webm';
  }

  /**
   * Start recording the call
   */
  async startRecording() {
    if (this.isRecording) {
      logger.warn('WebRTCManager', 'Recording already in progress');
      return false;
    }

    if (!this.localStream) {
      logger.error('WebRTCManager', 'No local stream for recording');
      this.handleRecordingError('No local stream available');
      return false;
    }

    try {
      this.recordedChunks = [];
      this.recordingStartTime = new Date();

      const mimeType = this.getSupportedMimeType();
      logger.recordingStart('WebRTCManager');

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
      logger.error(
        'WebRTCManager',
        `Recording failed: ${error?.message || error || 'Unknown error'}`
      );
      this.handleRecordingError(error?.message || error || 'Unknown error');
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
        logger.recordingStop('WebRTCManager');
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
      blob,
      duration: Math.round((Date.now() - this.recordingStartTime) / 1000),
      size: blob.size,
      mimeType: blob.type,
      createdAt: new Date().toISOString(),
    };

    this.recordedChunks = [];

    if (this.listeners.onRecordingStopped) {
      this.listeners.onRecordingStopped(recording);
    }

    logger.success('WebRTCManager', `Recording processed: ${recording.duration}s`);
    return recording;
  }

  /**
   * Handle recording errors
   */
  handleRecordingError(error) {
    logger.error('WebRTCManager', `Recording error: ${error}`);
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
      logger.debug('WebRTCManager', `Listener registered: ${event}`);
      this.listeners[event] = callback;
    }
  }

  /**
   * Remove an event listener
   */
  off(event) {
    if (this.listeners.hasOwnProperty(event)) {
      logger.debug('WebRTCManager', `Listener removed: ${event}`);
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
        logger.debug('WebRTCManager', `Mute: ${!audioTrack.enabled}`);
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  /**
   * Retry initialization after failure
   */
  async retryInitialization() {
    if (this._initialized) {
      logger.debug('WebRTCManager', 'Already initialized, no retry needed');
      return;
    }

    logger.loading('WebRTCManager', 'Retrying initialization...');

    // Reset Firebase init state to allow retry
    resetFirebaseInit();

    this._initError = null;
    this._initializing = false;

    return this.initialize(this.localCare4wId, authToken);
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    logger.loading('WebRTCManager', 'Disconnecting...');

    await this.endCall();

    this._initialized = false;
    this._initializing = false;
    this._initError = null;
    this._connectionState = 'idle';

    logger.complete('WebRTCManager');
  }
}

// Factory function for creating WebRTC manager
export function createWebRTCManager() {
  logger.debug('WebRTCManager', 'Creating new manager instance');
  return new WebRTCManager();
}

// Export for testing
export { isWebRTCSupported, getFirebaseStatus, resetFirebaseInit };

export default WebRTCManager;
