/**
 * WebRTC Manager - Main Integration Module
 *
 * Integrates all WebRTC modules into a unified interface.
 * Provides backward compatibility with the existing WebRTC implementation.
 */

import { logger } from '@/lib/logger';
import { ICE_GATHERING_TIMEOUT, ICE_CONNECTION_TIMEOUT } from './config';

// Import all managers
import { StateManager } from './stateManager';
import { MediaManager } from './mediaManager';
import { PeerConnectionManager } from './peerConnection';
import { IceManager } from './iceManager';
import { SessionManager } from './sessionManager';
import { FirebaseSignaling } from './firebaseSignaling';
import { ConnectionMonitor } from './connectionMonitor';
import { WebRTCRecording } from './webrtcRecording';

/**
 * Main WebRTC Manager
 * Integrates all modules into a unified interface
 */
export class WebRTCManager {
  constructor(options = {}) {
    // Initialize all managers
    this.stateManager = new StateManager();
    this.mediaManager = new MediaManager();
    this.peerConnectionManager = new PeerConnectionManager();
    this.iceManager = new IceManager();
    this.sessionManager = new SessionManager();
    this.signaling = new FirebaseSignaling();
    this.connectionMonitor = new ConnectionMonitor();
    this.recording = new WebRTCRecording();

    // User identity - using Firebase UID as primary identifier
    this.localFirebaseUid = null;
    this.firebaseRef = null;

    // Configuration
    this.config = {
      iceGatheringTimeout: options.iceGatheringTimeout || ICE_GATHERING_TIMEOUT,
      connectionTimeout: options.connectionTimeout || ICE_CONNECTION_TIMEOUT,
      enableRecording: options.enableRecording !== false,
      enableMonitoring: options.enableMonitoring !== false,
    };

    // Callbacks
    this._callbacks = {
      onStateChange: [],
      onCallStart: [],
      onCallEnd: [],
      onRemoteTrack: [],
      onError: [],
      onConnectionQuality: [],
      onIncomingCall: [],
      onRecordingStarted: [],
      onRecordingStopped: [],
      onRecordingError: [],
    };

    // Bind methods
    this._bindMethods();

    logger.info('WebRTCManager', 'WebRTC Manager initialized');
  }

  /**
   * Bind methods to preserve context
   */
  _bindMethods() {
    this.handleOffer = this.handleOffer.bind(this);
    this.handleAnswer = this.handleAnswer.bind(this);
    this.handleCandidate = this.handleCandidate.bind(this);
    this.handleHangup = this.handleHangup.bind(this);
    this._onConnectionStateChange = this._onConnectionStateChange.bind(this);
    this._onTrack = this._onTrack.bind(this);
    this._onIceCandidate = this._onIceCandidate.bind(this);
  }

  /**
   * Initialize the manager with user credentials
   * @param {string} localFirebaseUid - User's Firebase UID (primary identifier)
   * @param {string} token - Auth token for Firebase
   */
  async initialize(localFirebaseUid, token) {
    this.localFirebaseUid = localFirebaseUid;
    this.firebaseRef = token;

    logger.info('WebRTCManager', `Initializing for user: ${localFirebaseUid}`);

    // Initialize signaling (now async)
    await this.signaling.initialize(token, localFirebaseUid);

    // Set up signaling callbacks
    this.signaling.onOffer(this.handleOffer);
    this.signaling.onAnswer(this.handleAnswer);
    this.signaling.onCandidate(this.handleCandidate);
    this.signaling.onHangup(this.handleHangup);

    // Start listening for calls
    this.signaling.startListening();

    // Configure ICE manager
    this.iceManager.configure({
      gatheringTimeout: this.config.iceGatheringTimeout,
      connectionTimeout: this.config.connectionTimeout,
    });

    logger.success('WebRTCManager', 'Initialization complete');
  }

  /**
   * Start an outgoing call
   * @param {string} remoteFirebaseUid - Recipient's Firebase UID (primary identifier)
   */
  async startCall(remoteFirebaseUid) {
    if (!this.localFirebaseUid) {
      throw new Error('Not initialized');
    }

    logger.info('WebRTCManager', `Starting call to: ${remoteFirebaseUid}`);

    try {
      // Update state
      this.stateManager.setState('connecting');

      // Initialize session
      this.sessionManager.initialize({
        localFirebaseUid: this.localFirebaseUid,
        remoteFirebaseUid,
        isInitiator: true,
      });

      // Get local media
      const stream = await this.mediaManager.getUserMedia();
      logger.debug('WebRTCManager', 'Local media acquired');

      // Create peer connection
      await this.peerConnectionManager.createConnection();

      // Add local tracks
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        this.peerConnectionManager.addTrack(audioTrack, stream);
      }

      // Set up event handlers
      this._setupPeerConnectionHandlers();

      // Create offer
      const offer = await this.sessionManager.createOffer(this.peerConnectionManager);

      // Wait for ICE gathering to complete
      await this.iceManager.waitForGatheringComplete(this.peerConnectionManager.peerConnection);

      // Get local candidates
      const localCandidates = this.iceManager.getLocalCandidates();

      // Send offer via signaling
      const callId = await this.signaling.sendOffer(remoteFirebaseUid, offer);

      // Send local ICE candidates
      for (const candidate of localCandidates) {
        await this.signaling.sendCandidate(remoteFirebaseUid, callId, candidate);
      }

      // Start connection monitoring
      if (this.config.enableMonitoring) {
        this.connectionMonitor.startMonitoring(this.peerConnectionManager.peerConnection, {
          localFirebaseUid: this.localFirebaseUid,
          remoteFirebaseUid,
        });
      }

      logger.success('WebRTCManager', `Call initiated: ${callId}`);
      return callId;
    } catch (error) {
      logger.error('WebRTCManager', `Failed to start call: ${error.message}`);
      this.stateManager.setState('failed');
      throw error;
    }
  }

  /**
   * Handle incoming offer
   * @param {Object} params - Offer parameters including callId, offer, from (Firebase UID)
   */
  async handleOffer({ callId, offer, from }) {
    logger.info('WebRTCManager', `Handling incoming offer from: ${from}`);

    // Set up auto-hangup timer for 45 seconds
    const hangupTimer = setTimeout(() => {
      logger.warn('WebRTCManager', `Auto-hanging up call after 45 seconds of no answer`);
      this.endCall('missed');
    }, 45000);

    // Notify incoming call callbacks BEFORE processing
    // This allows the UI to show an incoming call notification and wait for user to accept
    this._callbacks.onIncomingCall.forEach((callback) => {
      try {
        callback({
          callId,
          from,
          offer,
          hangupTimer, // Pass timer reference for possible cancellation
        });
      } catch (error) {
        logger.error('WebRTCManager', `Incoming call callback error: ${error.message}`);
      }
    });

    // Do NOT automatically process the offer here
    // Wait for user to explicitly accept the call using acceptCall method
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer({ answer, from }) {
    // DEBUG: Log at info level for troubleshooting
    logger.info('WebRTCManager', `Handling answer from: ${from}`);
    logger.debug('WebRTCManager', `Answer SDP type: ${answer?.type}, has sdp: ${!!answer?.sdp}`);

    try {
      await this.sessionManager.handleAnswer(answer, this.peerConnectionManager);
      logger.success('WebRTCManager', 'Answer processed successfully');
    } catch (error) {
      logger.error('WebRTCManager', `Failed to handle answer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleCandidate({ candidate, from }) {
    logger.debug('WebRTCManager', `Handling ICE candidate from: ${from}`);

    try {
      await this.sessionManager.handleRemoteCandidate(
        candidate,
        this.iceManager,
        this.peerConnectionManager
      );
    } catch (error) {
      logger.error('WebRTCManager', `Failed to handle candidate: ${error.message}`);
    }
  }

  /**
   * Handle hangup
   */
  handleHangup({ from, reason }) {
    logger.info('WebRTCManager', `Received hangup from: ${from}, reason: ${reason}`);
    this.endCall('remote hangup');
  }

  /**
   * End the current call
   */
  async endCall(reason = 'user ended call') {
    logger.info('WebRTCManager', `Ending call: ${reason}`);

    try {
      // Send hangup via signaling
      const remoteFirebaseUid = this.sessionManager.getRemoteUserId();
      const callId = this.signaling.getCurrentCallId();

      if (remoteFirebaseUid && callId) {
        await this.signaling.sendHangup(remoteFirebaseUid, callId, reason);
      }
    } catch (error) {
      logger.warn('WebRTCManager', `Failed to send hangup: ${error.message}`);
    }

    // Clean up resources
    this._cleanup();

    // Update state
    this.stateManager.setState('idle');

    // Notify callbacks
    this._callbacks.onCallEnd.forEach((callback) => {
      try {
        callback({ reason });
      } catch (error) {
        logger.error('WebRTCManager', `End call callback error: ${error.message}`);
      }
    });
  }

  /**
   * Set up peer connection event handlers
   */
  _setupPeerConnectionHandlers() {
    this.peerConnectionManager.onConnectionStateChange(this._onConnectionStateChange);
    this.peerConnectionManager.onTrack(this._onTrack);
    this.peerConnectionManager.onIceCandidate(this._onIceCandidate);
  }

  /**
   * Handle connection state change
   */
  _onConnectionStateChange(state) {
    logger.debug('WebRTCManager', `Connection state: ${state}`);

    // Update our state manager
    if (state === 'connected') {
      this.stateManager.setState('connected');
    } else if (state === 'disconnected' || state === 'failed') {
      this.stateManager.setState('disconnected');
    }

    // Notify callbacks
    this._callbacks.onStateChange.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        logger.error('WebRTCManager', `State change callback error: ${error.message}`);
      }
    });
  }

  /**
   * Handle remote track
   */
  _onTrack(event) {
    const track = event.track;
    const streams = event.streams;

    logger.debug('WebRTCManager', `Remote track: kind=${track?.kind}`);

    // Notify callbacks
    this._callbacks.onRemoteTrack.forEach((callback) => {
      try {
        callback({ track, streams });
      } catch (error) {
        logger.error('WebRTCManager', `Track callback error: ${error.message}`);
      }
    });
  }

  /**
   * Handle ICE candidate
   */
  _onIceCandidate(candidate) {
    // Collect candidate
    this.iceManager.collectLocalCandidate(candidate);

    // Send to remote peer
    const remoteFirebaseUid = this.sessionManager.getRemoteUserId();
    const callId = this.signaling.getCurrentCallId();

    if (remoteFirebaseUid && callId) {
      this.signaling.sendCandidate(remoteFirebaseUid, callId, candidate).catch((error) => {
        logger.error('WebRTCManager', `Failed to send candidate: ${error.message}`);
      });
    }
  }

  /**
   * Clean up resources
   */
  _cleanup() {
    logger.debug('WebRTCManager', 'Cleaning up resources');

    // Stop monitoring
    this.connectionMonitor.stopMonitoring();
    this.connectionMonitor.dispose();

    // Stop recording
    if (this.recording.isRecording()) {
      this.recording.stop();
    }
    this.recording.dispose();

    // Close peer connection
    this.peerConnectionManager.close();

    // Stop local media
    this.mediaManager.stopLocalStream();

    // Reset managers
    this.iceManager.reset();
    this.sessionManager.reset();
    this.signaling.clearCall();

    // Update state
    this.stateManager.setState('idle');
  }

  /**
   * Get current call state
   */
  getState() {
    return this.stateManager.getState();
  }

  /**
   * Get local stream
   */
  getLocalStream() {
    return this.mediaManager.localStream;
  }

  /**
   * Get remote stream
   */
  getRemoteStream() {
    return this.mediaManager.remoteStream;
  }

  /**
   * Mute local audio
   */
  muteAudio() {
    this.mediaManager.muteAudio();
    logger.debug('WebRTCManager', 'Audio muted');
  }

  /**
   * Unmute local audio
   */
  unmuteAudio() {
    this.mediaManager.unmuteAudio();
    logger.debug('WebRTCManager', 'Audio unmuted');
  }

  /**
   * Toggle mute state
   * @returns {boolean} Current mute state (true = muted)
   */
  toggleMute() {
    const isMuted = this.mediaManager.isMuted();
    if (isMuted) {
      this.mediaManager.unmuteAudio();
    } else {
      this.mediaManager.muteAudio();
    }
    logger.debug('WebRTCManager', `Mute toggled: ${!isMuted}`);
    return !isMuted;
  }

  /**
   * Accept an incoming call
   * @param {string} roomId - Room/Call ID
   * @param {Object} offer - SDP offer from caller
   * @returns {Promise<void>}
   */
  async acceptCall(roomId, offer) {
    if (!this.localFirebaseUid) {
      throw new Error('Not initialized');
    }

    logger.info('WebRTCManager', `Accepting call: ${roomId}`);

    try {
      // Update state
      this.stateManager.setState('connecting');

      // Get local media
      const stream = await this.mediaManager.getUserMedia();

      // Create peer connection
      await this.peerConnectionManager.createConnection();

      // Add local tracks
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        this.peerConnectionManager.addTrack(audioTrack, stream);
      }

      // Set up event handlers
      this._setupPeerConnectionHandlers();

      // Handle remote offer
      await this.sessionManager.handleOffer(offer, this.peerConnectionManager);

      // Wait for ICE gathering
      await this.iceManager.waitForGatheringComplete(this.peerConnectionManager.peerConnection);

      // Get local candidates
      const localCandidates = this.iceManager.getLocalCandidates();

      // Create answer
      const answer = await this.sessionManager.createAnswer(this.peerConnectionManager);

      // Send answer
      const from = this.sessionManager.getRemoteUserId();
      await this.signaling.sendAnswer(from, roomId, answer);

      // Send local candidates
      for (const candidate of localCandidates) {
        await this.signaling.sendCandidate(from, roomId, candidate);
      }

      logger.success('WebRTCManager', 'Incoming call accepted');
    } catch (error) {
      logger.error('WebRTCManager', `Failed to accept call: ${error.message}`);
      this.stateManager.setState('failed');
      throw error;
    }
  }

  /**
   * Check if WebRTC is supported in the browser
   * @returns {boolean} True if WebRTC is supported
   */
  static isSupported() {
    if (typeof window === 'undefined') return false;
    return !!(
      window.RTCPeerConnection &&
      window.RTCSessionDescription &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * Start recording
   */
  startRecording() {
    if (!this.config.enableRecording) {
      logger.warn('WebRTCManager', 'Recording not enabled');
      return;
    }

    const stream = this.mediaManager.remoteStream;
    if (!stream) {
      logger.error('WebRTCManager', 'No remote stream to record');
      return;
    }

    this.recording.initialize(stream);
    // Wire up recording callbacks
    this.recording.onStop((recording) => {
      this._callbacks.onRecordingStopped.forEach((callback) => {
        try {
          callback(recording);
        } catch (error) {
          logger.error('WebRTCManager', `Recording stopped callback error: ${error.message}`);
        }
      });
    });
    this.recording.onError((error) => {
      this._callbacks.onRecordingError.forEach((callback) => {
        try {
          callback(error);
        } catch (callbackError) {
          logger.error('WebRTCManager', `Recording error callback error: ${callbackError.message}`);
        }
      });
    });
    this.recording.start();

    logger.info('WebRTCManager', 'Recording started');
    // Notify recording started callbacks
    this._callbacks.onRecordingStarted.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        logger.error('WebRTCManager', `Recording started callback error: ${error.message}`);
      }
    });
  }

  /**
   * Stop recording
   */
  stopRecording() {
    this.recording.stop();
    logger.info('WebRTCManager', 'Recording stopped');
  }

  /**
   * Get recording
   */
  getRecording() {
    return this.recording.getRecording();
  }

  /**
   * Register callback
   */
  on(event, callback) {
    if (this._callbacks[event]) {
      this._callbacks[event].push(callback);
    }
  }

  /**
   * Unregister callback
   */
  off(event, callback) {
    if (this._callbacks[event]) {
      this._callbacks[event] = this._callbacks[event].filter((cb) => cb !== callback);
    }
  }

  /**
   * Dispose of the manager
   */
  dispose() {
    logger.info('WebRTCManager', 'Disposing WebRTC Manager');

    this._cleanup();
    this.signaling.dispose();
    this.connectionMonitor.dispose();
    this.recording.dispose();

    this.localFirebaseUid = null;
    this.firebaseRef = null;

    logger.debug('WebRTCManager', 'Disposed');
  }
}

export default WebRTCManager;
