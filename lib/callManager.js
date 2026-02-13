/**
 * Unified Call Manager
 *
 * Provides a unified interface for both Twilio Voice and WebRTC calls.
 * Automatically switches between modes based on available credentials.
 * Includes call recording functionality.
 *
 * IMPROVEMENTS:
 * - Added timeout handling for initialization
 * - Added proper error recovery
 * - Added connection state tracking
 * - Added fallback logic for initialization failures
 */

import { Device } from '@twilio/voice-sdk';
import { createWebRTCManager } from './webrtc';
import { isValidCare4wId } from './careFlowIdValidator';
import { recordingManager, recordingUploader } from './recordingManager';
import { logger } from './logger';

// Initialization timeout in milliseconds
const INIT_TIMEOUT = 30000; // 30 seconds
const TOKEN_FETCH_TIMEOUT = 15000; // 15 seconds

/**
 * Create a promise that rejects after a timeout
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Error message
 * @returns {Promise} - Promise that rejects after timeout
 */
const timeout = (ms, message) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));

/**
 * Wrap a promise with a timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Error message
 * @returns {Promise} - Promise that rejects after timeout
 */
const withTimeout = (promise, ms, message) => Promise.race([promise, timeout(ms, message)]);

class CallManager {
  constructor() {
    this.mode = null; // 'twilio' | 'webrtc'
    this.care4wId = null;
    this.twilioDevice = null;
    this.twilioConnection = null;
    this.webrtcManager = null;
    this.token = null;
    this.isRecordingEnabled = false;
    this.currentCallMetadata = null;

    // Initialization state
    this._initialized = false;
    this._initializationPromise = null;
    this._initializationError = null;
    this._lastInitializationAttempt = null;

    // Connection state tracking
    this._connectionState = 'idle'; // idle, initializing, ready, connecting, connected, failed, disconnected
    this._statusMessage = 'Not initialized';

    // Rate limiting
    this._lastCallTime = 0;
    this._callCount = 0;
    this._callCountResetTime = Date.now();

    // Event listeners
    this.listeners = {
      onStatusChange: null,
      onCallStateChange: null,
      onIncomingCall: null,
      onCallEnded: null,
      onError: null,
      onLocalStream: null,
      onRemoteStream: null,
      onRecordingStarted: null,
      onRecordingStopped: null,
      onRecordingError: null,
      onRecordingUploaded: null,
      onConnectionStateChange: null,
      onInitializationChange: null,
    };

    logger.init('CallManager');
  }

  /**
   * Get current connection state
   * @returns {Object} Connection state info
   */
  getConnectionState() {
    return {
      state: this._connectionState,
      statusMessage: this._statusMessage,
      initialized: this._initialized,
      mode: this.mode,
      error: this._initializationError,
    };
  }

  /**
   * Update connection state and notify listeners
   * @param {string} state - New connection state
   * @param {string} message - Status message
   */
  _updateConnectionState(state, message) {
    const previousState = this._connectionState;
    this._connectionState = state;
    this._statusMessage = message;

    logger.debug('CallManager', `State: ${previousState} -> ${state} (${message})`);

    if (this.listeners.onConnectionStateChange) {
      this.listeners.onConnectionStateChange({
        previousState,
        state,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Check rate limits before making a call
   * @returns {{allowed: boolean, message: string}}
   */
  _checkRateLimit() {
    const now = Date.now();
    const oneMinute = 60 * 1000;

    // Reset counter every minute
    if (now - this._callCountResetTime > oneMinute) {
      this._callCount = 0;
      this._callCountResetTime = now;
    }

    // Max 10 calls per minute
    if (this._callCount >= 10) {
      logger.warn('CallManager', 'Rate limit exceeded - too many calls');
      return {
        allowed: false,
        message: 'Too many calls. Please wait a moment.',
      };
    }

    // Min 5 seconds between calls
    if (now - this._lastCallTime < 5000) {
      logger.warn('CallManager', 'Rate limit - call too soon');
      return {
        allowed: false,
        message: 'Please wait before making another call.',
      };
    }

    logger.debug('CallManager', 'Rate limit check passed');
    return { allowed: true, message: 'OK' };
  }

  /**
   * Update rate limit counters
   */
  _updateRateLimit() {
    this._lastCallTime = Date.now();
    this._callCount++;
    logger.debug('CallManager', `Rate limit updated - count: ${this._callCount}`);
  }

  /**
   * Check if initialization is needed
   * @returns {boolean} True if initialization is needed
   */
  needsInitialization() {
    return !this._initialized && !this._initializationPromise;
  }

  /**
   * Initialize the call manager with user token
   * @param {string} token - Authentication token
   * @param {string} care4wId - User's CareFlow ID
   * @returns {Promise<{mode: string, care4wId: string}>}
   */
  async initialize(token, care4wId) {
    // Validate inputs
    if (!token) {
      const error = new Error('Authentication token is required');
      this._initializationError = error;
      this._updateConnectionState('failed', 'Missing authentication token');
      throw error;
    }

    // If already initialized, return immediately
    if (this._initialized) {
      logger.debug('CallManager', 'Already initialized');
      return { mode: this.mode, care4wId: this.care4wId };
    }

    // If initialization is in progress, return existing promise
    if (this._initializationPromise) {
      logger.debug('CallManager', 'Returning existing initialization promise');
      return this._initializationPromise;
    }

    // Start initialization
    this._updateConnectionState('initializing', 'Starting initialization...');
    this._lastInitializationAttempt = new Date().toISOString();
    this._initializationError = null;

    // Create initialization promise with timeout
    this._initializationPromise = this._doInitializeWithTimeout(token, care4wId);

    try {
      const result = await this._initializationPromise;
      this._initialized = true;
      this._initializationPromise = null;
      this._updateConnectionState('ready', `Ready - ${result.mode} mode`);

      if (this.listeners.onInitializationChange) {
        this.listeners.onInitializationChange({
          initialized: true,
          mode: result.mode,
        });
      }

      logger.ready('CallManager', `Initialization complete - mode: ${result.mode}`);
      return result;
    } catch (error) {
      this._initialized = false;
      this._initializationPromise = null;
      this._initializationError = error;
      this._updateConnectionState('failed', error.message);

      if (this.listeners.onInitializationChange) {
        this.listeners.onInitializationChange({
          initialized: false,
          error: error.message,
        });
      }

      logger.error('CallManager', `Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform initialization with timeout
   * @param {string} token - Authentication token
   * @param {string} care4wId - User's CareFlow ID
   * @returns {Promise<{mode: string, care4wId: string}>}
   */
  async _doInitializeWithTimeout(token, care4wId) {
    try {
      return await withTimeout(
        this._doInitialize(token, care4wId),
        INIT_TIMEOUT,
        `Initialization timed out after ${INIT_TIMEOUT / 1000} seconds`
      );
    } catch (error) {
      // Handle timeout specifically
      if (error.message.includes('timed out')) {
        logger.error('CallManager', 'Initialization timeout - check network connectivity');
        this._updateConnectionState('failed', 'Initialization timeout');
      }
      throw error;
    }
  }

  async _doInitialize(token, care4wId) {
    logger.trace('CallManager', 'Setting token and care4wId');
    this.token = token;
    this.care4wId = care4wId;

    // Fetch token info to determine mode with timeout
    logger.loading('CallManager', 'Fetching token info from API...');
    this._updateConnectionState('initializing', 'Fetching token info...');

    let tokenInfo;
    try {
      tokenInfo = await withTimeout(
        this.fetchTokenInfo(),
        TOKEN_FETCH_TIMEOUT,
        `Token fetch timed out after ${TOKEN_FETCH_TIMEOUT / 1000} seconds`
      );
      this.mode = tokenInfo.mode;
      logger.success('CallManager', `Determined mode: ${this.mode}`);
    } catch (error) {
      this._updateConnectionState('failed', `Token fetch failed: ${error.message}`);
      throw new Error(`Failed to determine call mode: ${error.message}`);
    }

    logger.loading('CallManager', `Initializing ${this.mode} mode...`);
    this._updateConnectionState('initializing', `Initializing ${this.mode} mode...`);

    if (this.mode === 'twilio') {
      await this.initializeTwilio(tokenInfo.token);
    } else {
      await this.initializeWebRTC();
    }

    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange({ mode: this.mode, care4wId });
    }

    logger.complete('CallManager');
    return { mode: this.mode, care4wId };
  }

  /**
   * Fetch token info from API with improved error handling
   */
  async fetchTokenInfo() {
    logger.trace('CallManager', 'Fetching token info from /api/token');

    let response;
    try {
      response = await fetch('/api/token', {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
    } catch (networkError) {
      logger.error('CallManager', `Network error: ${networkError.message}`);
      throw new Error(`Network error: Unable to reach server. Please check your connection.`);
    }

    // Handle HTTP errors
    if (!response.ok) {
      let errorMessage = 'Failed to fetch token info';

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Response body not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      // Specific error handling
      if (response.status === 401) {
        errorMessage = 'Authentication expired. Please log in again.';
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Please check your permissions.';
      } else if (response.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      logger.error('CallManager', `Token fetch failed: ${errorMessage}`);
      throw error;
    }

    const tokenInfo = await response.json();

    // Validate token info structure
    if (!tokenInfo.mode) {
      throw new Error('Invalid token response: missing mode');
    }

    logger.success('CallManager', 'Token info fetched successfully');
    return tokenInfo;
  }

  /**
   * Initialize Twilio Device with proper async handling
   */
  async initializeTwilio(twilioToken) {
    if (!twilioToken) {
      throw new Error('Twilio token is required for Twilio mode');
    }

    logger.init('TwilioDevice');
    this._updateConnectionState('initializing', 'Setting up Twilio device...');

    try {
      this.twilioDevice = new Device(twilioToken, {
        codecPreferences: ['opus', 'pcmu'],
        enableImprovedSignalingErrorIndicator: true,
      });

      // Set up device event handlers before registering
      this._setupTwilioDeviceHandlers();

      // Register the device (connect to Twilio)
      logger.loading('TwilioDevice', 'Registering with Twilio...');
      await this.twilioDevice.register();

      logger.success('TwilioDevice', 'Device registered and listening for calls');
      this._updateConnectionState('ready', 'Twilio device ready');
      this.notifyStatusChange('ready');
    } catch (error) {
      logger.error('TwilioDevice', `Initialization failed: ${error.message}`);
      this._updateConnectionState('failed', `Twilio init failed: ${error.message}`);
      throw new Error(`Failed to initialize Twilio: ${error.message}`);
    }
  }

  /**
   * Set up Twilio device event handlers
   */
  _setupTwilioDeviceHandlers() {
    if (!this.twilioDevice) return;

    // Handle incoming calls
    this.twilioDevice.on('incoming', (conn) => {
      logger.incomingCall('TwilioDevice', conn.parameters.From);
      this.twilioConnection = conn;
      this._updateConnectionState('connecting', 'Incoming call...');
      this.notifyStatusChange('incoming');

      if (this.listeners.onIncomingCall) {
        this.listeners.onIncomingCall({
          from: conn.parameters.From,
          to: conn.parameters.To,
        });
      }

      conn.on('accept', () => {
        logger.callConnect('TwilioDevice');
        this._updateConnectionState('connected', 'Call connected');
        this.notifyStatusChange('connected');
        this.startCallTimer();
      });

      conn.on('disconnect', () => {
        logger.callEnd('TwilioDevice');
        this._updateConnectionState('idle', 'Call ended');
        this.notifyStatusChange('idle');
        this.stopCallTimer();
        this.twilioConnection = null;
        if (this.listeners.onCallEnded) {
          this.listeners.onCallEnded();
        }
      });

      conn.on('reject', () => {
        logger.debug('TwilioDevice', 'Call rejected');
        this._updateConnectionState('idle', 'Call rejected');
        this.notifyStatusChange('idle');
        this.twilioConnection = null;
      });

      conn.on('cancel', () => {
        logger.debug('TwilioDevice', 'Call cancelled');
        this._updateConnectionState('idle', 'Call cancelled');
        this.notifyStatusChange('idle');
        this.twilioConnection = null;
      });

      conn.on('error', (error) => {
        logger.error('TwilioConnection', error.message);
        this._updateConnectionState('failed', `Call error: ${error.message}`);
        this.notifyStatusChange('idle');
        if (this.listeners.onError) {
          this.listeners.onError(error);
        }
      });
    });

    this.twilioDevice.on('registered', () => {
      logger.success('TwilioDevice', 'Device registered with Twilio');
    });

    this.twilioDevice.on('unregistered', () => {
      logger.warn('TwilioDevice', 'Device unregistered from Twilio');
      this._updateConnectionState('disconnected', 'Device unregistered');
    });

    this.twilioDevice.on('error', (error) => {
      logger.error('TwilioDevice', error.message);

      // Don't treat token expiration as a fatal error during initialization
      if (error.code === 20101) {
        // Token expired
        this._updateConnectionState('failed', 'Token expired. Please refresh.');
      } else {
        this._updateConnectionState('failed', `Device error: ${error.message}`);
      }

      if (this.listeners.onError) {
        this.listeners.onError(error);
      }
    });

    this.twilioDevice.on('tokenWillExpire', () => {
      logger.warn('TwilioDevice', 'Token will expire soon');
      // Could trigger token refresh here
    });
  }

  /**
   * Initialize WebRTC Manager with proper error handling
   */
  async initializeWebRTC() {
    logger.init('WebRTCManager');
    this._updateConnectionState('initializing', 'Setting up WebRTC...');

    try {
      this.webrtcManager = createWebRTCManager();

      logger.loading('WebRTCManager', 'Initializing Firebase connection...');

      // Pass the auth token for secure Firebase operations
      await this.webrtcManager.initialize(this.care4wId, this.token);

      this._setupWebRTCHandlers();

      logger.success('WebRTCManager', 'Manager initialized and listening for calls');
      this._updateConnectionState('ready', 'WebRTC ready');
      this.notifyStatusChange('ready');
    } catch (error) {
      logger.error('WebRTCManager', `Initialization failed: ${error.message}`);
      this._updateConnectionState('failed', `WebRTC init failed: ${error.message}`);
      throw new Error(`Failed to initialize WebRTC: ${error.message}`);
    }
  }

  /**
   * Set up WebRTC event handlers
   */
  _setupWebRTCHandlers() {
    if (!this.webrtcManager) return;

    this.webrtcManager.on('onConnectionStateChange', (state) => {
      logger.trace('WebRTCManager', `Connection state: ${state}`);

      const stateMessages = {
        new: 'New connection',
        connecting: 'Connecting...',
        connected: 'Connected',
        disconnected: 'Disconnected',
        failed: 'Connection failed',
        closed: 'Connection closed',
      };

      this._updateConnectionState(state, stateMessages[state] || state);
      this.notifyStatusChange(state);

      if (state === 'connected') {
        this.startCallTimer();
      } else if (state === 'disconnected' || state === 'failed') {
        this.stopCallTimer();
        this.notifyStatusChange('disconnected');
      }
    });

    this.webrtcManager.on('onLocalStream', (stream) => {
      logger.debug('WebRTCManager', 'Local stream acquired');
      if (this.listeners.onLocalStream) {
        this.listeners.onLocalStream(stream);
      }
    });

    this.webrtcManager.on('onRemoteStream', (stream) => {
      logger.success('WebRTCManager', 'Remote stream received');
      if (this.listeners.onRemoteStream) {
        this.listeners.onRemoteStream(stream);
      }
    });

    this.webrtcManager.on('onCallEnded', () => {
      logger.callEnd('WebRTCManager');
      this._updateConnectionState('idle', 'Call ended');
      this.notifyStatusChange('idle');
      if (this.listeners.onCallEnded) {
        this.listeners.onCallEnded();
      }
    });

    this.webrtcManager.on('onIncomingCall', (callData) => {
      logger.incomingCall('WebRTCManager', callData.from);
      this._updateConnectionState('connecting', `Incoming call from ${callData.from}`);
      this.notifyStatusChange('incoming');
      if (this.listeners.onIncomingCall) {
        this.listeners.onIncomingCall({
          ...callData,
          mode: 'webrtc',
        });
      }
    });

    this.webrtcManager.on('onError', (error) => {
      logger.error('WebRTCManager', error.message);
      this._updateConnectionState('failed', error.message);
      if (this.listeners.onError) {
        this.listeners.onError(error);
      }
    });
  }

  /**
   * Make a call to a phone number or CareFlow ID
   */
  async makeCall(number) {
    if (!number) {
      throw new Error('Phone number or CareFlow ID is required');
    }

    // Check rate limit
    const rateLimit = this._checkRateLimit();
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.message);
    }

    // Wait for initialization if in progress
    if (this._initializationPromise) {
      try {
        await this._initializationPromise;
      } catch (initError) {
        throw new Error(`Cannot make call: ${initError.message}`);
      }
    }

    // Check if initialized
    if (!this._initialized || !this.mode) {
      throw new Error('Call system not initialized. Please wait a moment and try again.');
    }

    // Update rate limit counters
    this._updateRateLimit();

    logger.callStart(this.mode, number);
    this._updateConnectionState('connecting', `Calling ${number}...`);

    try {
      if (this.mode === 'twilio') {
        return this.makeTwilioCall(number);
      }
      return await this.makeWebRTCCall(number);
    } catch (error) {
      this._updateConnectionState('failed', `Call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Make a Twilio call
   */
  makeTwilioCall(number) {
    if (!this.twilioDevice) {
      throw new Error('Twilio not initialized');
    }

    const conn = this.twilioDevice.connect({
      To: number,
    });

    logger.loading('TwilioCall', `Connecting to ${number}...`);
    this._updateConnectionState('connecting', `Calling ${number}...`);
    this.notifyStatusChange('connecting');
    return conn;
  }

  /**
   * Make a WebRTC call
   */
  async makeWebRTCCall(care4wId) {
    // Validate CareFlow ID format
    if (!isValidCare4wId(care4wId)) {
      throw new Error('Invalid CareFlow User ID. Format: care4w-XXXXXXX (e.g., care4w-1000001)');
    }

    // Prevent calling yourself
    if (care4wId === this.care4wId) {
      throw new Error('Cannot call your own CareFlow ID');
    }

    if (!this.webrtcManager) {
      throw new Error('WebRTC not initialized. Please wait and try again.');
    }

    // Check WebRTC support
    if (!this.webrtcManager.constructor.isSupported()) {
      throw new Error('WebRTC is not supported in this browser');
    }

    logger.loading('WebRTCCall', `Getting local audio stream...`);

    // Get local audio stream
    await this.webrtcManager.getLocalStream({ audio: true, video: false });

    logger.loading('WebRTCCall', 'Creating and sending offer...');

    // Create and send offer
    await this.webrtcManager.createOffer(care4wId);

    logger.loading('WebRTCCall', 'Waiting for answer...');
    this._updateConnectionState('connecting', 'Waiting for answer...');
    this.notifyStatusChange('connecting');
  }

  /**
   * Accept an incoming call
   */
  async acceptCall() {
    if (this.mode === 'twilio') {
      if (this.twilioConnection) {
        logger.success('TwilioCall', 'Accepting incoming call');
        this.twilioConnection.accept();
        this._updateConnectionState('connected', 'Call connected');
        this.notifyStatusChange('connected');
        this.startCallTimer();
      }
    } else {
      // WebRTC - handled by accepting the offer
      // This is typically called when responding to onIncomingCall
    }
  }

  /**
   * Accept a WebRTC call with specific room data
   */
  async acceptWebRTCCall(roomId, offer) {
    if (!this.webrtcManager) {
      throw new Error('WebRTC not initialized');
    }

    logger.loading('WebRTCCall', 'Accepting call...');
    this._updateConnectionState('connecting', 'Accepting call...');

    try {
      await this.webrtcManager.acceptCall(roomId, offer);
      logger.callConnect('WebRTCCall');
      this._updateConnectionState('connected', 'Call connected');
      this.notifyStatusChange('connected');
      this.startCallTimer();
    } catch (error) {
      this._updateConnectionState('failed', `Failed to accept: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reject an incoming call
   */
  async rejectCall() {
    if (this.mode === 'twilio') {
      if (this.twilioConnection) {
        logger.warn('TwilioCall', 'Rejecting call');
        this.twilioConnection.reject();
        this.twilioConnection = null;
        this._updateConnectionState('idle', 'Call rejected');
        this.notifyStatusChange('idle');
      }
    } else {
      // WebRTC rejection
      logger.warn('WebRTCCall', 'Rejecting call');
      this._updateConnectionState('idle', 'Call rejected');
      this.notifyStatusChange('idle');
    }
  }

  /**
   * End the current call
   */
  async endCall() {
    logger.loading('CallManager', 'Ending call...');

    if (this.mode === 'twilio') {
      if (this.twilioConnection) {
        logger.callEnd('TwilioCall');
        this.twilioConnection.disconnect();
        this.twilioConnection = null;
      }
    } else if (this.webrtcManager) {
      await this.webrtcManager.endCall();
    }

    this._updateConnectionState('idle', 'Call ended');
    this.notifyStatusChange('idle');
    this.stopCallTimer();
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (this.mode === 'twilio') {
      if (this.twilioConnection) {
        const isMuted = this.twilioConnection.isMuted();
        this.twilioConnection.mute(!isMuted);
        logger.debug('TwilioCall', `Mute: ${!isMuted}`);
        return !isMuted;
      }
    } else if (this.webrtcManager) {
      const muted = this.webrtcManager.toggleMute();
      logger.debug('WebRTCCall', `Mute: ${muted}`);
      return muted;
    }
    return false;
  }

  /**
   * Send DTMF tones
   */
  sendDtmf(digits) {
    if (this.mode === 'twilio') {
      if (this.twilioConnection) {
        logger.debug('TwilioCall', `Sending DTMF: ${digits}`);
        this.twilioConnection.sendDigits(digits);
      }
    } else {
      // WebRTC DTMF
      logger.debug('WebRTCCall', `DTMF via WebRTC: ${digits}`);
    }
  }

  /**
   * Hold call
   */
  async holdCall() {
    if (this.mode === 'twilio') {
      if (this.twilioConnection) {
        logger.debug('TwilioCall', 'Placing call on hold');
        this.twilioConnection.transfer({
          to: 'client:hold',
        });
      }
    } else {
      // WebRTC hold
      logger.debug('WebRTCCall', 'WebRTC hold not yet implemented');
    }
  }

  /**
   * Get call status
   */
  getStatus() {
    const baseStatus = {
      initialized: this._initialized,
      mode: this.mode,
      connectionState: this._connectionState,
      statusMessage: this._statusMessage,
      error: this._initializationError,
    };

    if (this.mode === 'twilio') {
      if (this.twilioConnection) {
        return {
          ...baseStatus,
          status: this.twilioConnection.status(),
          isMuted: this.twilioConnection.isMuted(),
          isOnHold: false,
        };
      }
    }

    return {
      ...baseStatus,
      status: this._connectionState,
      isMuted: false,
      isOnHold: false,
    };
  }

  /**
   * Get current mode info
   */
  getModeInfo() {
    return {
      mode: this.mode,
      capabilities: {
        outboundCalls: true,
        inboundCalls: true,
        recording: true,
        sms: false,
        hold: this.mode === 'twilio',
        mute: true,
        transfer: false,
      },
    };
  }

  /**
   * Set up event listeners
   */
  on(event, callback) {
    if (this.listeners.hasOwnProperty(event)) {
      logger.debug('CallManager', `Registered listener for: ${event}`);
      this.listeners[event] = callback;
    }
  }

  /**
   * Remove event listeners
   */
  off(event) {
    if (this.listeners.hasOwnProperty(event)) {
      logger.debug('CallManager', `Removed listener for: ${event}`);
      this.listeners[event] = null;
    }
  }

  /**
   * Notify status change
   */
  notifyStatusChange(status) {
    logger.trace('CallManager', `Status changed: ${status}`);
    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange(status);
    }
    if (this.listeners.onCallStateChange) {
      this.listeners.onCallStateChange(status);
    }
  }

  /**
   * Start call timer
   */
  startCallTimer() {
    logger.debug('CallManager', 'Call timer started');
  }

  /**
   * Stop call timer
   */
  stopCallTimer() {
    logger.debug('CallManager', 'Call timer stopped');
  }

  /**
   * Retry initialization after failure
   */
  async retryInitialization() {
    if (this._initialized) {
      logger.debug('CallManager', 'Already initialized, no retry needed');
      return { mode: this.mode, care4wId: this.care4wId };
    }

    if (!this.token) {
      throw new Error('Cannot retry: no token available. Call initialize() with a token.');
    }

    logger.loading('CallManager', 'Retrying initialization...');
    this._initializationError = null;
    this._initializationPromise = null;

    return this.initialize(this.token, this.care4wId);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    logger.loading('CallManager', 'Disconnecting and cleaning up...');

    if (this.twilioDevice) {
      this.twilioDevice.destroy();
      this.twilioDevice = null;
    }
    if (this.webrtcManager) {
      this.webrtcManager.endCall();
      this.webrtcManager = null;
    }

    this._initialized = false;
    this._initializationPromise = null;
    this._initializationError = null;
    this._connectionState = 'idle';
    this._statusMessage = 'Disconnected';

    logger.complete('CallManager');
  }
}

// Singleton instance
const callManager = new CallManager();

export { callManager };
export default callManager;
