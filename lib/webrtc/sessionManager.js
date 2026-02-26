/**
 * Session Manager Module
 *
 * Manages call session lifecycle, including initialization,
 * offer/answer exchange, and session termination.
 *
 * Uses Firebase UID as the primary identifier for all WebRTC operations.
 */

import { logger } from '@/lib/logger';

/**
 * Manages the call session lifecycle
 */
export class SessionManager {
  constructor() {
    this.sessionId = null;
    this.localFirebaseUid = null; // User's Firebase UID (primary identifier)
    this.remoteFirebaseUid = null; // Remote user's Firebase UID
    this.isInitiator = false;
    this.sessionStartTime = null;
    this._sessionEventCallbacks = [];
    this._stateChangeCallbacks = [];
    // Track processed SDP to prevent duplicate processing
    this._processedAnswer = null;
    this._processedOffer = null;
  }

  /**
   * Initialize a new session
   * @param {Object} options - Session options
   * @param {string} options.localFirebaseUid - Local user's Firebase UID
   * @param {string} options.remoteFirebaseUid - Remote user's Firebase UID
   * @param {boolean} options.isInitiator - Whether this side initiated the call
   */
  initialize(options = {}) {
    this.sessionId = options.sessionId || this._generateSessionId();
    this.localFirebaseUid = options.localFirebaseUid;
    this.remoteFirebaseUid = options.remoteFirebaseUid;
    this.isInitiator = !!options.isInitiator;
    this.sessionStartTime = Date.now();

    logger.info(
      'SessionManager',
      `Session initialized: ${this.sessionId}, local=${this.localFirebaseUid}, remote=${this.remoteFirebaseUid}, initiator=${this.isInitiator}`
    );

    this._emitEvent('initialized', {
      sessionId: this.sessionId,
      localFirebaseUid: this.localFirebaseUid,
      remoteFirebaseUid: this.remoteFirebaseUid,
      isInitiator: this.isInitiator,
    });

    return this.sessionId;
  }

  /**
   * Generate unique session ID
   */
  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create offer (initiator side)
   */
  async createOffer(peerConnectionManager) {
    if (!this.isInitiator) {
      throw new Error('Only initiator can create offer');
    }

    logger.debug('SessionManager', 'Creating offer as initiator...');

    try {
      const offer = await peerConnectionManager.createOffer();
      logger.success('SessionManager', 'Offer created');
      return offer;
    } catch (error) {
      logger.error('SessionManager', `Failed to create offer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create answer (receiver side)
   */
  async createAnswer(peerConnectionManager) {
    if (this.isInitiator) {
      throw new Error('Initiator should not create answer');
    }

    logger.debug('SessionManager', 'Creating answer as receiver...');

    try {
      const answer = await peerConnectionManager.createAnswer();
      logger.success('SessionManager', 'Answer created');
      return answer;
    } catch (error) {
      logger.error('SessionManager', `Failed to create answer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set remote offer
   */
  async handleOffer(offer, peerConnectionManager) {
    // Check if this offer was already processed
    const offerKey = offer?.sdp?.substring(0, 100);
    if (this._processedOffer && this._processedOffer === offerKey) {
      logger.debug('SessionManager', 'Skipping duplicate offer');
      return;
    }

    // Check peer connection signaling state
    const pc = peerConnectionManager.peerConnection;
    if (pc && (pc.signalingState === 'stable' || pc.signalingState === 'have-local-pranswer')) {
      logger.debug(
        'SessionManager',
        `Handling remote offer (current state: ${pc.signalingState})...`
      );

      try {
        await peerConnectionManager.setRemoteDescription(offer);
        this._processedOffer = offerKey;
        logger.success('SessionManager', 'Remote offer set');
      } catch (error) {
        logger.error('SessionManager', `Failed to handle offer: ${error.message}`);
        throw error;
      }
    } else if (pc && pc.signalingState === 'stable') {
      logger.debug('SessionManager', 'Offer already processed (signaling state is stable)');
      this._processedOffer = offerKey;
    } else {
      logger.warn('SessionManager', `Cannot handle offer in state: ${pc?.signalingState}`);
    }
  }

  /**
   * Set remote answer
   */
  async handleAnswer(answer, peerConnectionManager) {
    // Check if this answer was already processed
    const answerKey = answer?.sdp?.substring(0, 100);
    if (this._processedAnswer && this._processedAnswer === answerKey) {
      logger.debug('SessionManager', 'Skipping duplicate answer');
      return;
    }

    // Check peer connection signaling state
    const pc = peerConnectionManager.peerConnection;
    if (pc && pc.signalingState === 'have-local-offer') {
      // DEBUG: Log at info level for troubleshooting
      logger.info('SessionManager', 'Handling remote answer...');
      logger.debug('SessionManager', `Answer type: ${answer?.type}, has sdp: ${!!answer?.sdp}`);

      try {
        await peerConnectionManager.setRemoteDescription(answer);
        this._processedAnswer = answerKey;
        logger.success('SessionManager', 'Remote answer set successfully');
      } catch (error) {
        logger.error('SessionManager', `Failed to handle answer: ${error.message}`);
        throw error;
      }
    } else if (pc && pc.signalingState === 'stable') {
      logger.debug('SessionManager', 'Answer already processed (signaling state is stable)');
      this._processedAnswer = answerKey;
    } else {
      logger.warn(
        'SessionManager',
        `Cannot handle answer in state: ${pc?.signalingState}, expected have-local-offer`
      );
    }
  }

  /**
   * Handle remote ICE candidate
   */
  async handleRemoteCandidate(candidate, iceManager, peerConnectionManager) {
    // ICE candidates have: candidate, sdpMid, sdpMLineIndex, usernameFragment
    // Not 'type' - that's for SDP (offer/answer)
    const candidateInfo = candidate?.candidate?.substring(0, 50) || 'unknown';
    logger.debug('SessionManager', `Handling remote ICE candidate: ${candidateInfo}...`);

    try {
      iceManager.queueRemoteCandidate(candidate);
      // Use peerConnection property directly (not getConnection() method)
      await iceManager.addQueuedCandidates(peerConnectionManager.peerConnection);
      logger.debug('SessionManager', 'Remote ICE candidate processed');
    } catch (error) {
      logger.error('SessionManager', `Failed to handle remote candidate: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get session duration
   */
  getDuration() {
    if (!this.sessionStartTime) {
      return 0;
    }
    return Date.now() - this.sessionStartTime;
  }

  /**
   * Get session info
   */
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      localFirebaseUid: this.localFirebaseUid,
      remoteFirebaseUid: this.remoteFirebaseUid,
      isInitiator: this.isInitiator,
      duration: this.getDuration(),
      startTime: this.sessionStartTime,
    };
  }

  /**
   * End the session
   */
  end(reason = 'normal') {
    const duration = this.getDuration();

    logger.info(
      'SessionManager',
      `Session ending: ${this.sessionId}, reason=${reason}, duration=${Math.floor(duration / 1000)}s`
    );

    this._emitEvent('ended', {
      sessionId: this.sessionId,
      reason,
      duration,
    });

    // Reset session state
    this.sessionId = null;
    this.localFirebaseUid = null;
    this.remoteFirebaseUid = null;
    this.isInitiator = false;
    this.sessionStartTime = null;
    this._processedAnswer = null;
    this._processedOffer = null;
  }

  /**
   * Register session event listener
   */
  onEvent(event, callback) {
    this._sessionEventCallbacks.push({ event, callback });
  }

  /**
   * Emit session event
   */
  _emitEvent(event, data) {
    logger.trace('SessionManager', `Event: ${event}`);

    this._sessionEventCallbacks
      .filter((cb) => cb.event === event)
      .forEach((cb) => {
        try {
          cb.callback(data);
        } catch (error) {
          logger.error('SessionManager', `Event callback error: ${error.message}`);
        }
      });

    // Also call state change listeners
    this._stateChangeCallbacks.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        logger.error('SessionManager', `State change callback error: ${error.message}`);
      }
    });
  }

  /**
   * Register state change listener
   */
  onStateChange(callback) {
    this._stateChangeCallbacks.push(callback);
  }

  /**
   * Check if session is active
   */
  isActive() {
    return !!this.sessionId && !!this.sessionStartTime;
  }

  /**
   * Validate session
   */
  validate() {
    const errors = [];

    if (!this.sessionId) {
      errors.push('No session ID');
    }
    if (!this.localFirebaseUid) {
      errors.push('No local Firebase UID');
    }
    if (!this.remoteFirebaseUid) {
      errors.push('No remote Firebase UID');
    }

    if (errors.length > 0) {
      logger.warn('SessionManager', `Session validation failed: ${errors.join(', ')}`);
      return { valid: false, errors };
    }

    logger.debug('SessionManager', 'Session validation passed');
    return { valid: true, errors: [] };
  }

  /**
   * Get remote user Firebase UID
   */
  getRemoteUserId() {
    return this.remoteFirebaseUid;
  }

  /**
   * Get local user Firebase UID
   */
  getLocalUserId() {
    return this.localFirebaseUid;
  }

  /**
   * Reset manager
   */
  reset() {
    this.end('reset');
    this._sessionEventCallbacks = [];
    this._stateChangeCallbacks = [];
    logger.debug('SessionManager', 'Manager reset');
  }
}

export default SessionManager;
