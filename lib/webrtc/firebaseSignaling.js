/**
 * Firebase Signaling Module
 *
 * Handles WebRTC signaling via Firebase Realtime Database.
 * Manages peer discovery, offer/answer exchange, and ICE candidates.
 *
 * Uses Firebase UID as the primary identifier for all Firebase paths and signaling.
 *
 * DATABASE PATHS:
 * - calls/{firebaseUid}/{callId} - Call signaling data (offers, answers, hangup)
 * - calls/{firebaseUid}/{callId}/candidates/{candidateId} - ICE candidates (sub-collection)
 *
 * SIGNAL TYPES:
 * - offer: Incoming call offer from remote peer
 * - answer: Answer to an outgoing call
 * - candidate: ICE candidate for connection establishment (stored in sub-collection)
 * - hangup: Call termination signal
 */

import { logger } from '@/lib/logger';
import { getAppInstance } from '@/lib/firebase';

// Module-level Firebase Database instance and functions
let database = null;
let firebaseFns = null;

/**
 * Initialize Firebase Database
 * Uses the existing Firebase app instance and initializes the Realtime Database.
 *
 * @returns {Promise<{database: Object, firebaseFns: Object}>} Firebase database and functions
 * @throws {Error} If Firebase app is not initialized or database URL is missing
 */
async function initializeFirebaseDatabase() {
  // Return cached instance if already initialized
  if (database && firebaseFns) {
    return { database, firebaseFns };
  }

  try {
    // Get the Firebase app instance (initialized by lib/firebase.js)
    const app = getAppInstance();
    if (!app) {
      throw new Error(
        'Firebase app not initialized. Ensure Firebase is initialized before WebRTC signaling.'
      );
    }

    // Verify database URL is configured
    const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    if (!databaseURL) {
      throw new Error(
        'NEXT_PUBLIC_FIREBASE_DATABASE_URL is not configured. Firebase Realtime Database is required for WebRTC signaling.'
      );
    }

    // Log the database URL being used for verification
    logger.info('FirebaseSignaling', `Database URL: ${databaseURL}`);
    logger.debug('FirebaseSignaling', `App options: ${JSON.stringify(app.options || {})}`);

    // Dynamic import for Firebase Database modular SDK
    const { getDatabase, ref, set, onValue, off, remove, push, serverTimestamp } =
      await import('firebase/database');

    // Initialize database with the app instance
    // The databaseURL is already configured in the Firebase app options
    database = getDatabase(app);

    // Store Firebase Database functions for use throughout the module
    firebaseFns = {
      ref, // Create database reference
      set, // Write data to path
      onValue, // Listen for changes
      off, // Remove listener
      remove, // Delete data
      push, // Generate unique key
      serverTimestamp, // Server-side timestamp
    };

    logger.success('FirebaseSignaling', 'Firebase Realtime Database initialized successfully');
    return { database, firebaseFns };
  } catch (error) {
    logger.error('FirebaseSignaling', `Failed to initialize Firebase Database: ${error.message}`);
    throw error;
  }
}

/**
 * Firebase Signaling Manager
 * Handles all signaling communication via Firebase Realtime Database
 */
export class FirebaseSignaling {
  constructor() {
    // User identification
    this.localFirebaseUid = null; // Primary identifier - Firebase UID

    // Call state
    this.currentCallId = null;

    // Track processed signals to prevent duplicates
    this._processedCandidates = new Set();
    this._processedOffers = new Set();
    this._processedAnswers = new Set();

    // Callbacks for signaling events
    this._offerCallback = null;
    this._answerCallback = null;
    this._candidateCallback = null;
    this._hangupCallback = null;
    this._errorCallback = null;

    // Listener state
    this._isListening = false;
    this._cleanupFunctions = [];
    this._initialized = false;
  }

  /**
   * Initialize the signaling manager
   * Must be called before any signaling operations.
   *
   * @param {string} _token - Auth token (unused, auth handled by Firebase Auth)
   * @param {string} localFirebaseUid - User's Firebase UID (primary identifier)
   * @throws {Error} If Firebase Database initialization fails
   */
  async initialize(_token, localFirebaseUid) {
    if (!localFirebaseUid) {
      throw new Error('Firebase UID is required for WebRTC signaling');
    }

    this.localFirebaseUid = localFirebaseUid;

    // Initialize Firebase Database
    await initializeFirebaseDatabase();

    this._initialized = true;
    logger.info('FirebaseSignaling', `Initialized for user: ${localFirebaseUid}`);
  }

  /**
   * Start listening for incoming calls
   * Sets up a listener on the user's call path in Firebase RTDB.
   *
   * Database path: calls/{localFirebaseUid}
   */
  startListening() {
    if (this._isListening) {
      logger.warn('FirebaseSignaling', 'Already listening for calls');
      return;
    }

    if (!this._initialized || !this.localFirebaseUid) {
      logger.error('FirebaseSignaling', 'Cannot start listening: not initialized');
      throw new Error('FirebaseSignaling not initialized');
    }

    if (!database || !firebaseFns) {
      logger.error('FirebaseSignaling', 'Firebase Database not initialized');
      throw new Error('Firebase Database not initialized');
    }

    const listenPath = `calls/${this.localFirebaseUid}`;
    logger.debug('FirebaseSignaling', `Starting to listen for calls on: ${listenPath}`);

    // Create database reference for incoming calls
    const callsRef = firebaseFns.ref(database, listenPath);

    // Set up real-time listener for incoming signals
    const unsubscribe = firebaseFns.onValue(
      callsRef,
      (snapshot) => {
        this._handleIncomingSignal(snapshot);
      },
      (error) => {
        logger.error('FirebaseSignaling', `Listener error: ${error.message}`);
        if (this._errorCallback) {
          this._errorCallback(error);
        }
      }
    );

    // Store cleanup function
    this._cleanupFunctions.push(() => {
      firebaseFns.off(callsRef);
      unsubscribe();
    });

    this._isListening = true;
    logger.success('FirebaseSignaling', 'Now listening for incoming calls');
  }

  /**
   * Stop listening for calls
   * Cleans up all Firebase listeners.
   */
  stopListening() {
    if (!this._isListening) {
      return;
    }

    logger.debug('FirebaseSignaling', 'Stopping call listener');

    // Execute all cleanup functions
    this._cleanupFunctions.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        logger.error('FirebaseSignaling', `Cleanup error: ${error.message}`);
      }
    });

    this._cleanupFunctions = [];
    this._isListening = false;
    logger.debug('FirebaseSignaling', 'Stopped listening for calls');
  }

  /**
   * Handle incoming signal from Firebase
   * Processes all signal types: offer, answer, candidate, hangup
   *
   * Candidates are stored in a sub-collection: calls/{uid}/{callId}/candidates/{id}
   *
   * @param {DataSnapshot} snapshot - Firebase data snapshot
   */
  _handleIncomingSignal(snapshot) {
    const callsData = snapshot.val();

    if (!callsData) {
      return;
    }

    // Iterate through all calls in the snapshot
    Object.entries(callsData).forEach(([callId, data]) => {
      if (!data) return;

      logger.debug(
        'FirebaseSignaling',
        `Processing call: callId=${callId}, type=${data.type}, from=${data.from}`
      );

      // Skip our own signals (shouldn't happen but safety check)
      if (data.from === this.localFirebaseUid) {
        logger.trace('FirebaseSignaling', 'Ignoring our own signal');
        return;
      }

      // Handle different signal types (offer, answer, hangup at call level)
      switch (data.type) {
        case 'offer':
          this._handleOffer(callId, data);
          // Start listening for candidates for this call
          this._startCandidateListener(callId, data.from);
          break;

        case 'answer':
          this._handleAnswer(callId, data);
          // Start listening for candidates for this call
          this._startCandidateListener(callId, data.from);
          break;

        case 'hangup':
          this._handleHangup(callId, data);
          break;

        default:
          logger.warn('FirebaseSignaling', `Unknown signal type: ${data.type}`);
      }

      // Handle candidates stored in sub-collection
      // These are stored at calls/{uid}/{callId}/candidates/{candidateId}
      if (data.candidates) {
        logger.debug(
          'FirebaseSignaling',
          `Found ${Object.keys(data.candidates).length} candidates in sub-collection for call ${callId}`
        );

        Object.entries(data.candidates).forEach(([_candidateId, candidateData]) => {
          if (candidateData && candidateData.type === 'candidate') {
            this._handleCandidate(callId, candidateData);
          }
        });
      }
    });
  }

  /**
   * Start listening for ICE candidates for a specific call
   * Sets up a listener on the candidates sub-collection
   *
   * @param {string} callId - Call identifier
   * @param {string} _from - Remote user's Firebase UID (unused, for logging purposes)
   */
  _startCandidateListener(callId, _from) {
    if (!database || !firebaseFns) {
      logger.warn('FirebaseSignaling', 'Cannot start candidate listener: database not initialized');
      return;
    }

    const candidatesPath = `calls/${this.localFirebaseUid}/${callId}/candidates`;
    logger.debug('FirebaseSignaling', `Starting candidate listener on: ${candidatesPath}`);

    const candidatesRef = firebaseFns.ref(database, candidatesPath);

    const unsubscribe = firebaseFns.onValue(
      candidatesRef,
      (snapshot) => {
        const candidatesData = snapshot.val();
        if (!candidatesData) return;

        Object.entries(candidatesData).forEach(([_candidateId, candidateData]) => {
          if (candidateData && candidateData.type === 'candidate') {
            // Skip if already processed (we could track this, but for now just process all)
            this._handleCandidate(callId, candidateData);
          }
        });
      },
      (error) => {
        logger.error('FirebaseSignaling', `Candidate listener error: ${error.message}`);
      }
    );

    // Store cleanup function
    this._cleanupFunctions.push(() => {
      firebaseFns.off(candidatesRef);
      unsubscribe();
    });
  }

  /**
   * Handle incoming call offer
   * @param {string} callId - Call identifier
   * @param {Object} data - Offer data
   */
  _handleOffer(callId, data) {
    // Create a unique key for this offer to prevent duplicate processing
    const offerKey = `${callId}:${data.from}`;

    if (this._processedOffers.has(offerKey)) {
      logger.trace('FirebaseSignaling', 'Skipping duplicate offer');
      return;
    }

    this._processedOffers.add(offerKey);

    logger.info('FirebaseSignaling', `Incoming call from: ${data.from}, callId: ${callId}`);
    this.currentCallId = callId;

    if (this._offerCallback) {
      this._offerCallback({
        callId,
        offer: data.sdp,
        from: data.from,
        timestamp: data.timestamp,
      });
    }
  }

  /**
   * Handle call answer
   * @param {string} callId - Call identifier
   * @param {Object} data - Answer data
   */
  _handleAnswer(callId, data) {
    // Create a unique key for this answer to prevent duplicate processing
    const answerKey = `${callId}:${data.from}`;

    if (this._processedAnswers.has(answerKey)) {
      logger.trace('FirebaseSignaling', 'Skipping duplicate answer');
      return;
    }

    this._processedAnswers.add(answerKey);

    // DEBUG: Log at info level for troubleshooting
    logger.info('FirebaseSignaling', `Received answer from: ${data.from}, callId: ${callId}`);
    logger.debug(
      'FirebaseSignaling',
      `Answer SDP type: ${data.sdp?.type}, has sdp: ${!!data.sdp?.sdp}`
    );

    if (this._answerCallback) {
      this._answerCallback({
        callId,
        answer: data.sdp,
        from: data.from,
        timestamp: data.timestamp,
      });
    } else {
      logger.warn('FirebaseSignaling', 'No answer callback registered!');
    }
  }

  /**
   * Handle ICE candidate
   * @param {string} callId - Call identifier
   * @param {Object} data - Candidate data
   */
  _handleCandidate(callId, data) {
    // Create a unique key for this candidate to prevent duplicate processing
    const candidateKey = `${callId}:${data.candidate?.candidate || JSON.stringify(data.candidate)}`;

    if (this._processedCandidates.has(candidateKey)) {
      logger.trace('FirebaseSignaling', 'Skipping duplicate candidate');
      return;
    }

    this._processedCandidates.add(candidateKey);

    // DEBUG: Log the full candidate data structure
    logger.info('FirebaseSignaling', `Received ICE candidate from: ${data.from}`);
    logger.debug(
      'FirebaseSignaling',
      `Full candidate data: ${JSON.stringify(data.candidate)?.substring(0, 200)}`
    );

    if (this._candidateCallback) {
      this._candidateCallback({
        callId,
        candidate: data.candidate,
        from: data.from,
        timestamp: data.timestamp,
      });
    } else {
      logger.warn('FirebaseSignaling', 'No candidate callback registered!');
    }
  }

  /**
   * Handle hangup signal
   * @param {string} callId - Call identifier
   * @param {Object} data - Hangup data
   */
  _handleHangup(callId, data) {
    logger.info('FirebaseSignaling', `Received hangup from: ${data.from}, reason: ${data.reason}`);

    if (this._hangupCallback) {
      this._hangupCallback({
        callId,
        from: data.from,
        reason: data.reason,
        timestamp: data.timestamp,
      });
    }
  }

  /**
   * Send offer to remote peer
   * Writes offer data to Firebase RTDB at: calls/{remoteFirebaseUid}/{callId}
   *
   * @param {string} remoteFirebaseUid - Remote user's Firebase UID
   * @param {Object} sdp - Session description protocol (offer)
   * @returns {Promise<string>} The generated call ID
   */
  async sendOffer(remoteFirebaseUid, sdp) {
    const callId = this._generateCallId();

    logger.info('FirebaseSignaling', `Sending offer to: ${remoteFirebaseUid}`);

    const signalData = {
      type: 'offer',
      from: this.localFirebaseUid,
      sdp,
      timestamp: firebaseFns.serverTimestamp(),
      status: 'calling',
    };

    await this._sendSignal(remoteFirebaseUid, callId, signalData);

    this.currentCallId = callId;
    logger.debug('FirebaseSignaling', `Offer sent, callId: ${callId}`);

    return callId;
  }

  /**
   * Send answer to remote peer
   * Writes answer data to Firebase RTDB at: calls/{remoteFirebaseUid}/{callId}
   *
   * @param {string} remoteFirebaseUid - Remote user's Firebase UID
   * @param {string} callId - Call identifier
   * @param {Object} sdp - Session description protocol (answer)
   */
  async sendAnswer(remoteFirebaseUid, callId, sdp) {
    logger.info('FirebaseSignaling', `Sending answer to: ${remoteFirebaseUid}`);

    const signalData = {
      type: 'answer',
      from: this.localFirebaseUid,
      sdp,
      timestamp: firebaseFns.serverTimestamp(),
    };

    await this._sendSignal(remoteFirebaseUid, callId, signalData);

    logger.debug('FirebaseSignaling', 'Answer sent');
  }

  /**
   * Send ICE candidate to remote peer
   * Writes candidate data to Firebase RTDB at:
   * calls/{remoteFirebaseUid}/{callId}/candidates/{autoId}
   * Uses push() to create a unique key for each candidate, preventing overwrites.
   *
   * @param {string} remoteFirebaseUid - Remote user's Firebase UID
   * @param {string} callId - Call identifier
   * @param {Object} candidate - ICE candidate (RTCIceCandidate or plain object)
   */
  async sendCandidate(remoteFirebaseUid, callId, candidate) {
    if (!database || !firebaseFns) {
      throw new Error('Firebase Database not initialized. Call initialize() first.');
    }

    // Store candidates in a sub-collection to prevent overwriting other signals
    const candidatesPath = `calls/${remoteFirebaseUid}/${callId}/candidates`;

    // Convert RTCIceCandidate to plain object for Firebase serialization
    // RTCIceCandidate objects don't serialize properly to JSON
    // IMPORTANT: Firebase doesn't accept undefined values, must use null
    const candidatePlain = {
      candidate: candidate.candidate ?? '',
      sdpMid: candidate.sdpMid ?? null,
      sdpMLineIndex: candidate.sdpMLineIndex ?? null,
      usernameFragment: candidate.usernameFragment ?? null,
    };

    const candidateData = {
      type: 'candidate',
      from: this.localFirebaseUid,
      candidate: candidatePlain,
      timestamp: firebaseFns.serverTimestamp(),
    };

    try {
      // Use push() to create a unique key for each candidate
      const candidatesRef = firebaseFns.ref(database, candidatesPath);
      await firebaseFns.push(candidatesRef, candidateData);

      logger.trace('FirebaseSignaling', `ICE candidate sent to ${candidatesPath}`);
    } catch (error) {
      logger.error(
        'FirebaseSignaling',
        `Failed to send candidate to ${candidatesPath}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Send hangup signal
   * Writes hangup data to Firebase RTDB at: calls/{remoteFirebaseUid}/{callId}
   *
   * @param {string} remoteFirebaseUid - Remote user's Firebase UID
   * @param {string} callId - Call identifier
   * @param {string} reason - Hangup reason
   */
  async sendHangup(remoteFirebaseUid, callId, reason = 'user hung up') {
    if (!this.currentCallId && !callId) {
      logger.debug('FirebaseSignaling', 'No active call to hang up');
      return;
    }

    const targetCallId = callId || this.currentCallId;

    logger.info('FirebaseSignaling', `Sending hangup to: ${remoteFirebaseUid}`);

    const signalData = {
      type: 'hangup',
      from: this.localFirebaseUid,
      reason,
      timestamp: firebaseFns.serverTimestamp(),
      status: 'ended',
    };

    await this._sendSignal(remoteFirebaseUid, targetCallId, signalData);

    this.currentCallId = null;
    logger.debug('FirebaseSignaling', 'Hangup sent');
  }

  /**
   * Send signal to Firebase Realtime Database
   *
   * @param {string} remoteFirebaseUid - Remote user's Firebase UID
   * @param {string} callId - Call identifier
   * @param {Object} signalData - Signal data to write
   * @throws {Error} If Firebase is not initialized or write fails
   */
  async _sendSignal(remoteFirebaseUid, callId, signalData) {
    if (!database || !firebaseFns) {
      throw new Error('Firebase Database not initialized. Call initialize() first.');
    }

    const signalPath = `calls/${remoteFirebaseUid}/${callId}`;

    try {
      // Create reference to the signal path
      const signalRef = firebaseFns.ref(database, signalPath);

      // Write signal data to Firebase RTDB
      await firebaseFns.set(signalRef, signalData);

      logger.trace('FirebaseSignaling', `Signal sent to ${signalPath}`);
    } catch (error) {
      logger.error('FirebaseSignaling', `Failed to send signal to ${signalPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a unique call ID
   * Format: call_{timestamp}_{random}
   *
   * @returns {string} Unique call identifier
   */
  _generateCallId() {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Register callback for incoming offers
   * @param {Function} callback - Callback function
   */
  onOffer(callback) {
    this._offerCallback = callback;
  }

  /**
   * Register callback for answers
   * @param {Function} callback - Callback function
   */
  onAnswer(callback) {
    this._answerCallback = callback;
  }

  /**
   * Register callback for ICE candidates
   * @param {Function} callback - Callback function
   */
  onCandidate(callback) {
    this._candidateCallback = callback;
  }

  /**
   * Register callback for hangup signals
   * @param {Function} callback - Callback function
   */
  onHangup(callback) {
    this._hangupCallback = callback;
  }

  /**
   * Register callback for errors
   * @param {Function} callback - Callback function
   */
  onError(callback) {
    this._errorCallback = callback;
  }

  /**
   * Get current call ID
   * @returns {string|null} Current call ID or null
   */
  getCurrentCallId() {
    return this.currentCallId;
  }

  /**
   * Check if there's an active call
   * @returns {boolean} True if there's an active call
   */
  hasActiveCall() {
    return !!this.currentCallId;
  }

  /**
   * Clear current call state
   */
  clearCall() {
    this.currentCallId = null;
  }

  /**
   * Clean up all resources
   * Stops listeners and clears all state.
   */
  dispose() {
    this.stopListening();
    this._offerCallback = null;
    this._answerCallback = null;
    this._candidateCallback = null;
    this._hangupCallback = null;
    this._errorCallback = null;
    this.localFirebaseUid = null;
    this._initialized = false;
    this._processedCandidates.clear();
    this._processedOffers.clear();
    this._processedAnswers.clear();

    logger.debug('FirebaseSignaling', 'Disposed');
  }
}

export default FirebaseSignaling;
