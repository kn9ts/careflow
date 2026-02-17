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
 * - Integrated with InitializationStateManager for robust lifecycle management
 * - Singleton promise pattern with locking mechanism
 */

import { Device } from '@twilio/voice-sdk';
import { createWebRTCManager } from './webrtc';
import { isValidCare4wId } from './careFlowIdValidator';
import { recordingManager, recordingUploader } from './recordingManager';
import { logger } from './logger';
import {
  getInitializationStateManager,
  InitState,
  InitStage,
  InitErrorCode,
  ServiceState,
} from './initializationStateManager';

// Initialization timeout in milliseconds
const INIT_TIMEOUT = 45000; // 45 seconds
const TOKEN_FETCH_TIMEOUT = 30000; // 30 seconds

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

    // Initialization state manager integration
    this._initStateManager = getInitializationStateManager();

    // Legacy initialization state (kept for backward compatibility)
    this._initialized = false;
    this._initializationPromise = null;
    this._initializationError = null;
    this._lastInitializationAttempt = null;

    // RC-101: Mode lock to prevent mode changes during initialization
    this._modeLocked = false;

    // RC-102: Token fetch deduplication
    this._tokenFetchPromise = null;

    // RC-110: Mode-specific state tracking
    this._twilioState = { connectionState: 'idle', message: 'Not initialized' };
    this._webrtcState = { connectionState: 'idle', message: 'Not initialized' };

    // Connection state tracking (legacy, kept for backward compatibility)
    this._connectionState = 'idle'; // idle, initializing, ready, connecting, connected, failed, disconnected
    this._statusMessage = 'Not initialized';

    // RC-112: State transition queue for atomic updates
    this._stateTransitionQueue = [];
    this._isProcessingStateQueue = false;

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
    // RC-110: Return mode-specific state if mode is set
    const modeState =
      this.mode === 'twilio'
        ? this._twilioState
        : this.mode === 'webrtc'
          ? this._webrtcState
          : { connectionState: this._connectionState, message: this._statusMessage };

    return {
      state: modeState.connectionState,
      statusMessage: modeState.message,
      initialized: this._initialized,
      mode: this.mode,
      error: this._initializationError,
    };
  }

  /**
   * RC-112: Process state transition queue atomically
   * @private
   */
  async _processStateQueue() {
    if (this._isProcessingStateQueue || this._stateTransitionQueue.length === 0) {
      return;
    }

    this._isProcessingStateQueue = true;

    while (this._stateTransitionQueue.length > 0) {
      const transition = this._stateTransitionQueue.shift();
      this._applyStateTransition(transition);
    }

    this._isProcessingStateQueue = false;
  }

  /**
   * Apply a state transition
   * @private
   * @param {Object} transition - State transition object
   */
  _applyStateTransition(transition) {
    const { state, message, mode } = transition;
    const previousState = this._connectionState;

    // Update legacy state
    this._connectionState = state;
    this._statusMessage = message;

    // RC-110: Update mode-specific state
    if (mode === 'twilio' || this.mode === 'twilio') {
      this._twilioState = { connectionState: state, message };
    } else if (mode === 'webrtc' || this.mode === 'webrtc') {
      this._webrtcState = { connectionState: state, message };
    }

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
   * Update connection state and notify listeners
   * @param {string} state - New connection state
   * @param {string} message - Status message
   */
  _updateConnectionState(state, message) {
    // RC-112: Queue state transition for atomic processing
    this._stateTransitionQueue.push({ state, message, mode: this.mode });

    // Process immediately if not already processing
    if (!this._isProcessingStateQueue) {
      this._processStateQueue();
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
   * Get the initialization state manager
   * @returns {InitializationStateManager} The state manager instance
   */
  getInitializationStateManager() {
    return this._initStateManager;
  }

  /**
   * Initialize the call manager with user token
   * Implements singleton promise pattern with locking mechanism.
   * @param {string} token - Authentication token
   * @param {string} care4wId - User's CareFlow ID
   * @returns {Promise<{mode: string, care4wId: string}>}
   */
  async initialize(token, care4wId) {
    // Validate inputs
    if (!token) {
      const error = new Error('Authentication token is required');
      this._initStateManager.failInitialization(error, InitErrorCode.INVALID_TOKEN);
      this._initializationError = error;
      this._updateConnectionState('failed', 'Missing authentication token');
      throw error;
    }

    // If already initialized via state manager, return immediately
    if (this._initStateManager.isInitialized) {
      logger.debug('CallManager', 'Already initialized');
      return { mode: this.mode, care4wId: this.care4wId };
    }

    // If initializing, return existing promise (singleton pattern)
    if (this._initStateManager.isInitializing) {
      logger.debug('CallManager', 'Returning existing initialization promise');
      return this._initStateManager._initializationPromise;
    }

    // Start initialization via state manager
    const initPromise = this._initStateManager.startInitialization();
    this._initializationPromise = initPromise;
    this._lastInitializationAttempt = new Date().toISOString();
    this._initializationError = null;

    try {
      // Perform actual initialization
      const result = await this._doInitializeWithStateManager(token, care4wId);

      // Mark as complete in state manager
      this._initStateManager.completeInitialization(result);
      this._initialized = true;
      this._updateConnectionState('ready', `Ready - ${result.mode} mode`);

      if (this.listeners.onInitializationChange) {
        this.listeners.onInitializationChange({
          initialized: true,
          mode: result.mode,
          care4wId: result.care4wId,
        });
      }

      logger.ready(
        'CallManager',
        `Initialization complete - mode: ${result.mode}, care4wId: ${result.care4wId}`
      );
      return result;
    } catch (error) {
      const errorMessage = error?.message || error || 'Unknown initialization error';

      // Determine error code based on error type
      let errorCode = InitErrorCode.UNKNOWN;
      if (errorMessage.includes('token')) {
        errorCode = InitErrorCode.TOKEN_FETCH_FAILED;
      } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        errorCode = InitErrorCode.NETWORK_ERROR;
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorCode = InitErrorCode.TIMEOUT;
      } else if (errorMessage.includes('Twilio')) {
        errorCode = InitErrorCode.TWILIO_INIT_FAILED;
      } else if (errorMessage.includes('WebRTC')) {
        errorCode = InitErrorCode.WEBRTC_INIT_FAILED;
      } else if (errorMessage.includes('mode')) {
        errorCode = InitErrorCode.MODE_DETERMINATION_FAILED;
      }

      // Mark as failed in state manager
      this._initStateManager.failInitialization(error, errorCode);

      this._initialized = false;
      this._initializationPromise = null;
      this._initializationError = error;
      this._updateConnectionState('failed', errorMessage);

      if (this.listeners.onInitializationChange) {
        this.listeners.onInitializationChange({
          initialized: false,
          error: errorMessage,
          errorCode,
        });
      }

      logger.error('CallManager', `Initialization failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Perform initialization with state manager integration
   * @param {string} token - Authentication token
   * @param {string} care4wId - User's CareFlow ID
   * @returns {Promise<{mode: string, care4wId: string}>}
   */
  async _doInitializeWithStateManager(token, care4wId) {
    return withTimeout(
      this._doInitializeInternal(token, care4wId),
      INIT_TIMEOUT,
      `Initialization timed out after ${INIT_TIMEOUT / 1000} seconds`
    );
  }

  /**
   * Internal initialization logic with stage updates
   * Implements resilient dual-mode initialization:
   * 1. Always initialize WebRTC first (independent of Twilio)
   * 2. Attempt Twilio initialization in parallel
   * 3. Complete with whatever services are available
   * @param {string} token - Authentication token
   * @param {string} care4wId - User's CareFlow ID
   * @returns {Promise<{mode: string, care4wId: string, activeModes: string[]}>}
   */
  async _doInitializeInternal(token, care4wId) {
    // Validate input stage
    this._initStateManager.updateStage(InitStage.VALIDATING_INPUT);

    if (this._modeLocked) {
      logger.warn('CallManager', 'Mode is locked during initialization');
      throw new Error('Initialization already in progress with mode lock');
    }
    this._modeLocked = true;

    try {
      logger.trace('CallManager', 'Setting token and care4wId');
      this.token = token;
      this.care4wId = care4wId;

      // Fetch token info stage
      this._initStateManager.updateStage(InitStage.FETCHING_TOKEN);
      logger.loading('CallManager', 'Fetching token info from API...');
      this._updateConnectionState('initializing', 'Fetching token info...');

      let tokenInfo;
      try {
        tokenInfo = await this._fetchTokenInfoDeduplicated();
        logger.success(
          'CallManager',
          `Token info received - Twilio available: ${!!tokenInfo.token}`
        );
      } catch (error) {
        const errorMsg = error?.message || error || 'Unknown token fetch error';
        this._initStateManager.failInitialization(error, InitErrorCode.TOKEN_FETCH_FAILED);
        this._updateConnectionState('failed', `Token fetch failed: ${errorMsg}`);
        throw new Error(`Failed to determine call mode: ${errorMsg}`);
      }

      // Determine mode stage
      this._initStateManager.updateStage(InitStage.DETERMINING_MODE);

      // RESILIENT INITIALIZATION: Always initialize WebRTC first
      // WebRTC is the fallback that should always work
      this._initStateManager.updateStage(InitStage.INITIALIZING_WEBRTC);
      this._initStateManager.updateWebRTCState(ServiceState.INITIALIZING);
      logger.loading('CallManager', 'Initializing WebRTC (primary)...');
      this._updateConnectionState('initializing', 'Initializing WebRTC...');

      const webrtcInitPromise = this._initializeWebRTCResilient();

      // If Twilio token is available, try to initialize Twilio in parallel
      let twilioInitPromise = null;
      if (tokenInfo.token) {
        this._initStateManager.updateTwilioState(ServiceState.INITIALIZING);
        logger.loading('CallManager', 'Attempting Twilio initialization...');
        twilioInitPromise = this._initializeTwilioResilient(tokenInfo.token);
      } else {
        // Mark Twilio as disabled if no token
        this._initStateManager.updateTwilioState(ServiceState.DISABLED);
        logger.info('CallManager', 'Twilio not available - no token provided');
      }

      // Wait for WebRTC to complete (it's required)
      try {
        await webrtcInitPromise;
        this._initStateManager.updateWebRTCState(ServiceState.READY);
        logger.success('CallManager', 'WebRTC initialized successfully');
      } catch (webrtcError) {
        this._initStateManager.updateWebRTCState(ServiceState.FAILED, webrtcError);
        logger.error('CallManager', `WebRTC initialization failed: ${webrtcError.message}`);
        // This is a critical failure - WebRTC is required
        throw new Error(`WebRTC initialization failed: ${webrtcError.message}`);
      }

      // Wait for Twilio if it was attempted (non-blocking failure)
      if (twilioInitPromise) {
        this._initStateManager.updateStage(InitStage.INITIALIZING_TWILIO);
        try {
          await twilioInitPromise;
          this._initStateManager.updateTwilioState(ServiceState.READY);
          logger.success('CallManager', 'Twilio initialized successfully');
        } catch (twilioError) {
          // Twilio failure is NOT fatal - log and continue
          this._initStateManager.updateTwilioState(ServiceState.FAILED, twilioError);
          logger.warn(
            'CallManager',
            `Twilio initialization failed (non-fatal): ${twilioError.message}. Continuing with WebRTC.`
          );
          // Log the error for monitoring but don't throw
          if (this.listeners.onError) {
            this.listeners.onError({
              service: 'twilio',
              error: twilioError,
              nonFatal: true,
              message: 'Twilio unavailable. WebRTC calls are still available.',
            });
          }
        }
      }

      // Register handlers stage
      this._initStateManager.updateStage(InitStage.REGISTERING_HANDLERS);

      // Determine the primary mode based on what's available
      const snapshot = this._initStateManager.getSnapshot();
      this.mode = snapshot.mode || 'webrtc'; // Default to webrtc

      if (this.listeners.onStatusChange) {
        this.listeners.onStatusChange({
          mode: this.mode,
          care4wId,
          activeModes: snapshot.activeModes,
          webrtcReady: snapshot.webrtcReady,
          twilioReady: snapshot.twilioReady,
        });
      }

      // Completing stage
      this._initStateManager.updateStage(InitStage.COMPLETING);
      logger.complete('CallManager');

      return {
        mode: this.mode,
        care4wId,
        activeModes: snapshot.activeModes,
        webrtcReady: snapshot.webrtcReady,
        twilioReady: snapshot.twilioReady,
      };
    } finally {
      this._modeLocked = false;
    }
  }

  /**
   * Resilient WebRTC initialization (always succeeds or throws)
   * @returns {Promise<void>}
   * @private
   */
  async _initializeWebRTCResilient() {
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
      logger.error(
        'WebRTCManager',
        `Initialization failed: ${error?.message || error || 'Unknown error'}`
      );
      this._updateConnectionState(
        'failed',
        `WebRTC init failed: ${error?.message || error || 'Unknown error'}`
      );
      throw new Error(`Failed to initialize WebRTC: ${error?.message || error || 'Unknown error'}`);
    }
  }

  /**
   * Resilient Twilio initialization (may fail without blocking)
   * @param {string} twilioToken - Twilio access token
   * @returns {Promise<void>}
   * @private
   */
  async _initializeTwilioResilient(twilioToken) {
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
    } catch (error) {
      logger.error(
        'TwilioDevice',
        `Initialization failed: ${error?.message || error || 'Unknown error'}`
      );
      this._updateConnectionState(
        'failed',
        `Twilio init failed: ${error?.message || error || 'Unknown error'}`
      );
      throw new Error(`Failed to initialize Twilio: ${error?.message || error || 'Unknown error'}`);
    }
  }

  /**
   * RC-102: Deduplicated token fetch to prevent multiple concurrent requests
   * @returns {Promise<Object>} Token info object
   */
  async _fetchTokenInfoDeduplicated() {
    if (!this._tokenFetchPromise) {
      this._tokenFetchPromise = this._doFetchTokenInfo();
    }
    try {
      return await withTimeout(
        this._tokenFetchPromise,
        TOKEN_FETCH_TIMEOUT,
        `Token fetch timed out after ${TOKEN_FETCH_TIMEOUT / 1000} seconds`
      );
    } finally {
      this._tokenFetchPromise = null;
    }
  }

  /**
   * Internal token fetch implementation
   * @returns {Promise<Object>} Token info object
   */
  async _doFetchTokenInfo() {
    return this.fetchTokenInfo();
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

    // Extract data from success response wrapper
    const data = tokenInfo.data || tokenInfo;

    // Validate token info structure
    if (!data.mode) {
      throw new Error('Invalid token response: missing mode');
    }

    logger.success('CallManager', 'Token info fetched successfully');
    return data;
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
      logger.error(
        'TwilioDevice',
        `Initialization failed: ${error?.message || error || 'Unknown error'}`
      );
      this._updateConnectionState(
        'failed',
        `Twilio init failed: ${error?.message || error || 'Unknown error'}`
      );
      throw new Error(`Failed to initialize Twilio: ${error?.message || error || 'Unknown error'}`);
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
        logger.error('TwilioConnection', error?.message || error || 'Unknown error');
        this._updateConnectionState(
          'failed',
          `Call error: ${error?.message || error || 'Unknown error'}`
        );
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
      logger.error('TwilioDevice', error?.message || error || 'Unknown error');

      // Don't treat token expiration as a fatal error during initialization
      if (error.code === 20101) {
        // Token expired
        this._updateConnectionState('failed', 'Token expired. Please refresh.');
      } else {
        this._updateConnectionState(
          'failed',
          `Device error: ${error?.message || error || 'Unknown error'}`
        );
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
      logger.error(
        'WebRTCManager',
        `Initialization failed: ${error?.message || error || 'Unknown error'}`
      );
      this._updateConnectionState(
        'failed',
        `WebRTC init failed: ${error?.message || error || 'Unknown error'}`
      );
      throw new Error(`Failed to initialize WebRTC: ${error?.message || error || 'Unknown error'}`);
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
      logger.error('WebRTCManager', error?.message || error || 'Unknown error');
      this._updateConnectionState('failed', error?.message || error || 'Unknown error');
      if (this.listeners.onError) {
        this.listeners.onError(error);
      }
    });
  }

  /**
   * Make a call to a phone number or CareFlow ID
   * Supports dual-mode: automatically selects the best available mode
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
    if (!this._initialized) {
      throw new Error('Call system not initialized. Please wait a moment and try again.');
    }

    // Determine which mode to use for this call
    const callMode = this._determineCallMode(number);

    // Update rate limit counters
    this._updateRateLimit();

    logger.callStart(callMode, number);
    this._updateConnectionState('connecting', `Calling ${number}...`);

    try {
      if (callMode === 'twilio') {
        return this.makeTwilioCall(number);
      }
      return await this.makeWebRTCCall(number);
    } catch (error) {
      this._updateConnectionState(
        'failed',
        `Call failed: ${error?.message || error || 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Determine the best call mode for a given destination
   * @param {string} destination - Phone number or CareFlow ID
   * @returns {string} - 'twilio' or 'webrtc'
   * @private
   */
  _determineCallMode(destination) {
    const snapshot = this._initStateManager.getSnapshot();

    // Check if destination is a CareFlow ID
    const isCareFlowId = isValidCare4wId(destination);

    if (isCareFlowId) {
      // For CareFlow IDs, prefer WebRTC (free peer-to-peer)
      if (snapshot.webrtcReady) {
        logger.debug('CallManager', 'Using WebRTC for CareFlow ID call (free P2P)');
        return 'webrtc';
      }
      // Fall back to Twilio if WebRTC not available
      if (snapshot.twilioReady) {
        logger.debug('CallManager', 'Using Twilio for CareFlow ID call (WebRTC unavailable)');
        return 'twilio';
      }
    } else {
      // For phone numbers, must use Twilio
      if (snapshot.twilioReady) {
        logger.debug('CallManager', 'Using Twilio for phone number call');
        return 'twilio';
      }
      // Cannot call phone numbers with WebRTC
      throw new Error(
        'Phone calls require Twilio. Twilio is not available. Use a CareFlow ID for free WebRTC calls.'
      );
    }

    // No mode available
    throw new Error('No calling mode available. Please check your connection and try again.');
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
      this._updateConnectionState(
        'failed',
        `Failed to accept: ${error?.message || error || 'Unknown error'}`
      );
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

  // ==================== RECORDING METHODS ====================

  /**
   * Start recording the current call
   * @returns {Promise<boolean>} True if recording started successfully
   */
  async startRecording() {
    if (this._connectionState !== 'connected') {
      logger.warn('CallManager', 'Cannot start recording - no active call');
      return false;
    }

    if (recordingManager.isRecording) {
      logger.warn('CallManager', 'Recording already in progress');
      return false;
    }

    try {
      // Initialize recording manager with call metadata
      const callId = this.currentCallMetadata?.callId || `call-${Date.now()}`;
      await recordingManager.initialize(callId);

      // Get audio streams based on mode
      let localStream = null;
      let remoteStream = null;

      if (this.mode === 'webrtc' && this.webrtcManager) {
        // Get streams from WebRTC manager
        localStream = this.webrtcManager.getLocalStream?.() || null;
        remoteStream = this.webrtcManager.getRemoteStream?.() || null;
      }
      // Note: Twilio mode would require different stream handling
      // For now, recording is primarily supported in WebRTC mode

      if (!localStream) {
        logger.warn('CallManager', 'No local stream available for recording');
        // Still try to record - recordingManager will handle the error
      }

      // Set up recording event listeners
      recordingManager.on('onRecordingStarted', (data) => {
        this.isRecordingEnabled = true;
        if (this.listeners.onRecordingStarted) {
          this.listeners.onRecordingStarted(data);
        }
      });

      recordingManager.on('onRecordingStopped', (data) => {
        this.isRecordingEnabled = false;
        if (this.listeners.onRecordingStopped) {
          this.listeners.onRecordingStopped(data);
        }
      });

      recordingManager.on('onRecordingError', (data) => {
        this.isRecordingEnabled = false;
        if (this.listeners.onRecordingError) {
          this.listeners.onRecordingError(data);
        }
      });

      // Start recording
      const success = await recordingManager.startRecording(localStream, remoteStream);

      if (success) {
        logger.success('CallManager', 'Recording started');
        this.isRecordingEnabled = true;
      }

      return success;
    } catch (error) {
      logger.error(
        'CallManager',
        `Failed to start recording: ${error?.message || error || 'Unknown error'}`
      );
      if (this.listeners.onRecordingError) {
        this.listeners.onRecordingError({
          message: 'Failed to start recording',
          error,
        });
      }
      return false;
    }
  }

  /**
   * Stop recording the current call
   * @returns {Promise<Object|null>} Recording data or null if not recording
   */
  async stopRecording() {
    if (!recordingManager.isRecording) {
      logger.warn('CallManager', 'No recording in progress');
      return null;
    }

    try {
      const recording = await recordingManager.stopRecording();
      logger.success('CallManager', `Recording stopped: ${recording.duration}s`);
      this.isRecordingEnabled = false;
      return recording;
    } catch (error) {
      logger.error(
        'CallManager',
        `Failed to stop recording: ${error?.message || error || 'Unknown error'}`
      );
      if (this.listeners.onRecordingError) {
        this.listeners.onRecordingError({
          message: 'Failed to stop recording',
          error,
        });
      }
      return null;
    }
  }

  /**
   * Upload recording to storage
   * @param {Blob} recordingBlob - The recorded audio blob
   * @param {Object} metadata - Recording metadata
   * @returns {Promise<Object>} Upload result
   */
  async uploadRecording(recordingBlob, metadata = {}) {
    if (!this.token) {
      throw new Error('Authentication required for upload');
    }

    const uploadMetadata = {
      callId: metadata.callId || this.currentCallMetadata?.callId || `call-${Date.now()}`,
      duration: metadata.duration || 0,
      from: metadata.from || this.care4wId,
      to: metadata.to || this.currentCallMetadata?.to || 'unknown',
      direction: metadata.direction || this.currentCallMetadata?.direction || 'outbound',
    };

    try {
      logger.loading('CallManager', 'Uploading recording...');

      // Set up upload event listeners
      recordingUploader.on('onProgress', (progress) => {
        logger.debug('CallManager', `Upload progress: ${progress}%`);
      });

      recordingUploader.on('onComplete', (result) => {
        logger.success('CallManager', 'Recording uploaded successfully');
        if (this.listeners.onRecordingUploaded) {
          this.listeners.onRecordingUploaded(result);
        }
      });

      recordingUploader.on('onError', (data) => {
        logger.error('CallManager', `Upload failed: ${data.message}`);
        if (this.listeners.onRecordingError) {
          this.listeners.onRecordingError(data);
        }
      });

      const result = await recordingUploader.upload(recordingBlob, uploadMetadata, this.token);
      return result;
    } catch (error) {
      logger.error(
        'CallManager',
        `Failed to upload recording: ${error?.message || error || 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Get current recording state
   * @returns {Object} Recording state info
   */
  getRecordingState() {
    return recordingManager.getRecordingState();
  }

  /**
   * Check if recording is currently active
   * @returns {boolean} True if recording
   */
  isRecording() {
    return recordingManager.isRecording;
  }

  /**
   * Set call metadata for recording purposes
   * @param {Object} metadata - Call metadata
   */
  setCallMetadata(metadata) {
    this.currentCallMetadata = metadata;
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

    // RC-110: Reset mode-specific states
    this._twilioState = { connectionState: 'idle', message: 'Disconnected' };
    this._webrtcState = { connectionState: 'idle', message: 'Disconnected' };

    // RC-101: Release mode lock
    this._modeLocked = false;

    logger.complete('CallManager');
  }

  /**
   * RC-103: Explicit reset for re-initialization
   * Clears all state and allows fresh initialization
   */
  reset() {
    logger.loading('CallManager', 'Resetting CallManager...');

    this.disconnect();

    this.mode = null;
    this.care4wId = null;
    this.token = null;
    this._tokenFetchPromise = null;

    logger.complete('CallManager');
  }
}

// RC-105: Singleton instance with tracking
let callManagerInstance = null;

/**
 * Get the singleton CallManager instance
 * @returns {CallManager} The singleton instance
 */
function getCallManager() {
  if (!callManagerInstance) {
    callManagerInstance = new CallManager();
    logger.init('CallManagerSingleton');
  }
  return callManagerInstance;
}

// For backward compatibility
const callManager = getCallManager();

export { callManager, getCallManager };
export default callManager;
