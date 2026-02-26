/**
 * Unified Call Manager
 *
 * Provides a unified interface for both Twilio Voice and WebRTC calls.
 * Automatically switches between modes based on available credentials.
 * Includes call recording functionality.
 *
 * ARCHITECTURE:
 * - Modular design with separated concerns
 * - Dependency injection for testability
 * - Uses extracted modules for:
 *   - RateLimiter: Call rate limiting
 *   - TokenService: Token fetching and management
 *   - PhoneLookupService: Phone number lookup
 *   - CallModeResolver: Call mode determination
 *   - EventEmitter: Event handling
 *
 * IMPROVEMENTS:
 * - Added timeout handling for initialization
 * - Added proper error recovery
 * - Added connection state tracking
 * - Added fallback logic for initialization failures
 * - Integrated with InitializationStateManager for robust lifecycle management
 * - Singleton promise pattern with locking mechanism
 * - Added phone number lookup for WebRTC calls (fallback when Twilio unavailable)
 */

import { Device } from '@twilio/voice-sdk';
import { createWebRTCManager } from '../webrtc/index';
import { logger } from '../logger';
import { sendIncomingCallNotification } from '../notifications';
import {
  getInitializationStateManager,
  InitStage,
  InitErrorCode,
  ServiceState,
} from '../initializationStateManager';

// Import extracted modules
import { RateLimiter, getRateLimiter } from './rateLimiter';
import { TokenService } from './tokenService';
import { PhoneLookupService } from './phoneLookupService';
import { CallModeResolver, CallMode } from './callModeResolver';
import { createEventEmitter, CallManagerEvents } from './eventEmitter';

// Import recording manager (existing module)
import { recordingManager, recordingUploader } from '../recordingManager';

// Initialization timeout in milliseconds
const INIT_TIMEOUT = 45000; // 45 seconds

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

/**
 * CallManager class with modular architecture
 */
class CallManager {
  /**
   * Create a new CallManager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Core state
    this.mode = null; // 'twilio' | 'webrtc'
    this.care4wId = null;
    this.firebaseUid = null; // User's Firebase UID (primary identifier for WebRTC)
    this.twilioDevice = null;
    this.twilioConnection = null;
    this.webrtcManager = null;
    this.token = null;
    this.isRecordingEnabled = false;
    this.currentCallMetadata = null;

    // Resolved destination for WebRTC calls (from phone lookup)
    this._resolvedCare4wId = null;

    // Initialization state management
    this._initStateManager = options.initStateManager || getInitializationStateManager();

    // Connection state tracking
    this._twilioState = { connectionState: 'idle', message: 'Not initialized' };
    this._webrtcState = { connectionState: 'idle', message: 'Not initialized' };
    
    // RC-112: State transition queue for atomic updates
    this._stateTransitionQueue = [];
    this._isProcessingStateQueue = false;

    // RC-101: Mode lock to prevent mode changes during initialization
    this._modeLocked = false;

    // Initialize modular services (dependency injection)
    this._initializeServices(options);

    // Event emitter for handling events
    this._events = createEventEmitter('CallManager');

    // Rate limiter instance
    this._rateLimiter = options.rateLimiter || getRateLimiter();

    logger.init('CallManager');
  }

  /**
   * Initialize modular services with dependency injection
   * @param {Object} options - Configuration options
   * @private
   */
  _initializeServices(options) {
    // Token Service
    this._tokenService =
      options.tokenService ||
      new TokenService({
        apiEndpoint: options.tokenApiEndpoint,
        timeout: options.tokenFetchTimeout,
      });

    // Phone Lookup Service
    this._phoneLookupService =
      options.phoneLookupService ||
      new PhoneLookupService({
        apiEndpoint: options.phoneLookupApiEndpoint,
        cacheTimeout: options.phoneLookupCacheTimeout,
      });

    // Call Mode Resolver
    this._callModeResolver =
      options.callModeResolver ||
      new CallModeResolver({
        phoneLookupFn: this._phoneLookup.bind(this),
        isWebRTCSupportedFn: this._isWebRTCSupportedInBrowser.bind(this),
      });
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

    // Emit event
    this._events.emit('connectionStateChange', {
      previousState,
      state,
      message,
      timestamp: new Date().toISOString(),
    });

    // Legacy listener support
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
    // Use startInitialization() which returns existing promise if already initializing
    if (this._initStateManager.isInitializing) {
      logger.debug('CallManager', 'Returning existing initialization promise');
      return this._initStateManager.startInitialization();
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

      // Emit initialization change event
      this._events.emit('initializationChange', {
        initialized: true,
        mode: result.mode,
        care4wId: result.care4wId,
      });

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
      let errorCode = TokenService.mapErrorToCode(error);

      // Mark as failed in state manager
      this._initStateManager.failInitialization(error, errorCode);

      this._initialized = false;
      this._initializationPromise = null;
      this._initializationError = error;
      this._updateConnectionState('failed', errorMessage);

      // Emit initialization change event
      this._events.emit('initializationChange', {
        initialized: false,
        error: errorMessage,
        errorCode,
      });

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

    // Set token for services
    this.token = token;
    this.care4wId = care4wId;
    this._tokenService.setToken(token);
    this._phoneLookupService.setToken(token);

    try {
      logger.trace('CallManager', 'Setting token and care4wId');

      // Fetch token info stage
      this._initStateManager.updateStage(InitStage.FETCHING_TOKEN);
      logger.loading('CallManager', 'Fetching token info from API...');
      this._updateConnectionState('initializing', 'Fetching token info...');

      let tokenInfo;
      try {
        tokenInfo = await this._tokenService.fetchTokenInfoDeduplicated();
        logger.success(
          'CallManager',
          `Token info received - Twilio available: ${!!tokenInfo.token}`
        );

        // Use care4wId from API response if available (this is the authoritative source)
        if (tokenInfo.care4wId) {
          this.care4wId = tokenInfo.care4wId;
          logger.debug('CallManager', `Using care4wId from API: ${this.care4wId}`);
        } else if (!this.care4wId) {
          logger.warn('CallManager', 'No care4wId available from API or initial parameter');
        }

        // Store Firebase UID for WebRTC operations
        if (tokenInfo.firebaseUid) {
          this.firebaseUid = tokenInfo.firebaseUid;
          logger.debug('CallManager', `Using firebaseUid from API: ${this.firebaseUid}`);
        }
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
          this._emitError({
            service: 'twilio',
            error: twilioError,
            nonFatal: true,
            message: 'Twilio unavailable. WebRTC calls are still available.',
          });
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
          care4wId: this.care4wId,
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
        care4wId: this.care4wId,
        activeModes: snapshot.activeModes,
        webrtcReady: snapshot.webrtcReady,
        twilioReady: snapshot.twilioReady,
      };
    } finally {
      this._modeLocked = false;
    }
  }

  /**
   * Emit error event
   * @private
   */
  _emitError(errorData) {
    this._events.emit('error', errorData);
    if (this.listeners.onError) {
      this.listeners.onError(errorData);
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
      // Use firebaseUid as the primary identifier for WebRTC operations
      await this.webrtcManager.initialize(this.firebaseUid, this.token);

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
      // Enhanced error logging for Twilio token issues
      const errorCode = error?.code || error?.status || 'UNKNOWN';
      const errorMessage = error?.message || String(error);

      logger.error('TwilioDevice', `Initialization failed: ${errorMessage} (code: ${errorCode})`);

      // Log specific error details for debugging
      if (errorCode === 20101 || errorMessage.includes('AccessToken')) {
        logger.error(
          'TwilioDevice',
          'Token validation failed - check Twilio credentials and API key/secret pairing'
        );
        logger.debug('TwilioDevice', {
          error: errorMessage,
          code: errorCode,
          tokenPrefix: twilioToken?.substring(0, 20) + '...',
          suggestion: 'Verify TWILIO_API_KEY and TWILIO_API_SECRET are a matching pair',
        });
      }

      // Clean up failed device
      if (this.twilioDevice) {
        try {
          this.twilioDevice.destroy();
        } catch (destroyError) {
          logger.warn('TwilioDevice', `Failed to destroy device: ${destroyError.message}`);
        }
        this.twilioDevice = null;
      }

      this._updateConnectionState('failed', `Twilio init failed: ${errorMessage}`);
      throw new Error(`Failed to initialize Twilio: ${errorMessage}`);
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
        this._emitError(error);
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
      const errorCode = error?.code;
      const errorMessage = error?.message || String(error);

      logger.error('TwilioDevice', `Error occurred: ${errorMessage} (code: ${errorCode})`);

      // Handle specific Twilio error codes
      if (errorCode === 20101) {
        // Access Token Invalid - this is a credential/configuration issue, not just expiration
        logger.error(
          'TwilioDevice',
          'Access Token invalid (20101) - check Twilio credentials and API key/secret pairing'
        );
        this._updateConnectionState('failed', 'Twilio authentication failed. Using WebRTC mode.');
        // Downgrade to WebRTC mode instead of failing completely
        this._initStateManager?.updateTwilioState(ServiceState.FAILED, error);
      } else if (errorCode === 21601) {
        // Token expired - can be refreshed
        logger.warn('TwilioDevice', 'Token expired - refresh needed');
        this._updateConnectionState('failed', 'Token expired. Please refresh.');
      } else {
        this._updateConnectionState('failed', `Device error: ${errorMessage}`);
      }

      this._emitError(error);
    });

    this.twilioDevice.on('tokenWillExpire', () => {
      logger.warn('TwilioDevice', 'Token will expire soon');
      // Could trigger token refresh here
    });
  }

  /**
   * Set up WebRTC event handlers
   */
  _setupWebRTCHandlers() {
    if (!this.webrtcManager) return;

    this.webrtcManager.on('onStateChange', (state) => {
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

    this.webrtcManager.on('onRemoteTrack', ({ track, streams }) => {
      logger.success('WebRTCManager', 'Remote track received');
      this._events.emit('remoteStream', streams[0]);
      if (this.listeners.onRemoteStream) {
        this.listeners.onRemoteStream(streams[0]);
      }
    });

    this.webrtcManager.on('onCallEnd', ({ reason }) => {
      logger.callEnd('WebRTCManager', reason);
      this._updateConnectionState('idle', 'Call ended');
      this.notifyStatusChange('idle');
      this._events.emit('callEnded');
      if (this.listeners.onCallEnded) {
        this.listeners.onCallEnded();
      }
    });

    this.webrtcManager.on('onIncomingCall', (callData) => {
      logger.incomingCall('WebRTCManager', callData.from);
      this._updateConnectionState('connecting', `Incoming call from ${callData.from}`);
      this.notifyStatusChange('incoming');
      this._events.emit('incomingCall', { ...callData, mode: 'webrtc' });
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
      this._emitError(error);
    });

    this.webrtcManager.on('onRecordingStarted', () => {
      logger.info('WebRTCManager', 'Recording started');
      this._events.emit('recordingStarted');
      if (this.listeners.onRecordingStarted) {
        this.listeners.onRecordingStarted();
      }
    });

    this.webrtcManager.on('onRecordingStopped', (recording) => {
      logger.info('WebRTCManager', 'Recording stopped');
      this._events.emit('recordingStopped', recording);
      if (this.listeners.onRecordingStopped) {
        this.listeners.onRecordingStopped(recording);
      }
    });

    this.webrtcManager.on('onRecordingError', (error) => {
      logger.error('WebRTCManager', `Recording error: ${error?.message || error}`);
      this._events.emit('recordingError', error);
      if (this.listeners.onRecordingError) {
        this.listeners.onRecordingError(error);
      }
    });
  }

  /**
   * Phone lookup wrapper
   * @param {string} phoneNumber - Phone number to look up
   * @returns {Promise<Object>} Lookup result
   * @private
   */
  async _phoneLookup(phoneNumber) {
    return this._phoneLookupService.lookupByPhone(phoneNumber);
  }

  /**
   * Check if WebRTC is supported in the browser
   * @returns {boolean} True if WebRTC is supported
   * @private
   */
  _isWebRTCSupportedInBrowser() {
    if (typeof window === 'undefined') return false;
    return !!(
      window.RTCPeerConnection &&
      window.RTCSessionDescription &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * Make a call to a phone number or CareFlow ID
   * Supports dual-mode: automatically selects the best available mode
   */
  async makeCall(number) {
    if (!number) {
      throw new Error('Phone number or CareFlow ID is required');
    }

    // Ensure number is a string (handle event objects or other non-string inputs)
    const destination = typeof number === 'string' ? number : String(number);

    // Check rate limit using the rate limiter service
    const rateLimit = this._rateLimiter.check();
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

    // Also check state manager if initialization promise is not available
    const initManager = this._initStateManager;
    if (!this._initialized && initManager.isInitializing) {
      logger.debug('CallManager', 'State manager says initializing, waiting...');
      let waitAttempts = 0;
      while (initManager.isInitializing && waitAttempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitAttempts++;
      }
      if (!initManager.isInitialized && !initManager.isWebRTCReady) {
        throw new Error('Call system still initializing. Please wait a moment and try again.');
      }
    }

    // Check if initialized
    if (!this._initialized) {
      throw new Error('Call system not initialized. Please wait a moment and try again.');
    }

    // Use CallModeResolver to determine the best mode
    const snapshot = this._initStateManager.getSnapshot();
    logger.debug('CallManager', `Determining call mode for: ${destination}`);
    const modeResult = await this._callModeResolver.determineCallMode(destination, snapshot);

    // Handle resolved care4wId and firebaseUid from phone lookup
    let resolvedCare4wId = null;
    let resolvedFirebaseUid = null;
    let callMode = modeResult;
    if (typeof modeResult === 'object' && modeResult.mode) {
      callMode = modeResult.mode;
      resolvedCare4wId = modeResult.resolvedCare4wId;
      resolvedFirebaseUid = modeResult.resolvedFirebaseUid;
    }

    // Update rate limit counters
    this._rateLimiter.recordCall();

    logger.callStart(callMode, destination);
    this._updateConnectionState('connecting', `Calling ${destination}...`);

    try {
      if (callMode === CallMode.TWILIO) {
        return this.makeTwilioCall(destination);
      }
      // Resolve destination to firebaseUid for WebRTC calls
      // Use resolved firebaseUid if available (from phone lookup), otherwise look up from care4wId
      let firebaseUid = resolvedFirebaseUid;
      const webRTCDestination = resolvedCare4wId || destination;

      logger.debug(
        'CallManager',
        `Resolving WebRTC call: input=${destination}, resolvedCare4wId=${resolvedCare4wId}, resolvedFirebaseUid=${resolvedFirebaseUid}`
      );

      if (!firebaseUid) {
        // Need to resolve care4wId to firebaseUid
        logger.debug('CallManager', `Looking up firebaseUid for: ${webRTCDestination}`);
        firebaseUid = await this._resolveCare4wIdToFirebaseUid(webRTCDestination);
        if (!firebaseUid) {
          logger.error(
            'CallManager',
            `Failed to resolve firebaseUid for destination: ${webRTCDestination}`
          );
          throw new Error(
            `Unable to resolve recipient for WebRTC call: ${webRTCDestination} not found`
          );
        }
      }

      return await this.makeWebRTCCall(firebaseUid, webRTCDestination);
    } catch (error) {
      this._updateConnectionState(
        'failed',
        `Call failed: ${error?.message || error || 'Unknown error'}`
      );
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
   * @param {string} firebaseUid - Recipient's Firebase UID (primary identifier for WebRTC)
   * @param {string} care4wId - Recipient's CareFlow ID (for display purposes)
   */
  async makeWebRTCCall(firebaseUid, care4wId) {
    // Validate Firebase UID is provided
    if (!firebaseUid) {
      throw new Error('Recipient Firebase UID is required for WebRTC call');
    }

    // Prevent calling yourself
    if (firebaseUid === this.firebaseUid) {
      throw new Error('Cannot call yourself');
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

    // Create and send offer using firebaseUid as the primary identifier
    await this.webrtcManager.startCall(firebaseUid);

    // Send push notification to recipient (non-blocking)
    this._sendWebRTCCallNotification(firebaseUid, care4wId).catch((err) => {
      logger.warn('WebRTCCall', `Failed to send notification: ${err.message}`);
    });

    logger.loading('WebRTCCall', 'Waiting for answer...');
    this._updateConnectionState('connecting', 'Waiting for answer...');
    this.notifyStatusChange('connecting');
  }

  /**
   * Send push notification for WebRTC call
   * @param {string} firebaseUid - Recipient's Firebase UID
   * @param {string} care4wId - Recipient's CareFlow ID (for display)
   * @private
   */
  async _sendWebRTCCallNotification(firebaseUid, care4wId) {
    try {
      // Send push notification using firebaseUid (already resolved)
      await sendIncomingCallNotification(firebaseUid, {
        callSid: `webrtc-${Date.now()}`,
        from: this.care4wId,
        to: care4wId,
      });

      logger.info('WebRTCCall', `Notification sent to ${care4wId} (${firebaseUid})`);
    } catch (error) {
      logger.warn('WebRTCCall', `Failed to send notification: ${error.message}`);
      // Don't throw - notification failure shouldn't fail the call
    }
  }

  /**
   * Resolve CareFlow ID to Firebase UID
   * @param {string} care4wId - CareFlow ID to resolve
   * @returns {Promise<string|null>} - Firebase UID or null if not found
   * @private
   */
  async _resolveCare4wIdToFirebaseUid(care4wId) {
    try {
      const response = await fetch(`/api/users/lookup?care4wId=${encodeURIComponent(care4wId)}`, {
        headers: {
          // Include auth token if available
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
        },
      });

      if (!response.ok) {
        logger.warn('WebRTCCall', `User lookup failed: ${response.status}`);
        return null;
      }

      const userData = await response.json();

      if (!userData.success) {
        logger.warn(
          'WebRTCCall',
          `User lookup returned unsuccessful: ${userData.message || 'unknown'}`
        );
        return null;
      }

      if (!userData.data?.firebaseUid) {
        logger.warn('WebRTCCall', `No Firebase UID in response for care4wId: ${care4wId}`);
        return null;
      }

      logger.debug(
        'WebRTCCall',
        `Resolved ${care4wId} to Firebase UID: ${userData.data.firebaseUid}`
      );
      return userData.data.firebaseUid;
    } catch (error) {
      logger.error('WebRTCCall', `Failed to resolve care4wId to firebaseUid: ${error.message}`);
      return null;
    }
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
    }
    // WebRTC - handled by accepting the offer
  }

  /**
   * Accept a WebRTC call with specific call data
   */
  async acceptWebRTCCall(callId, offer) {
    if (!this.webrtcManager) {
      throw new Error('WebRTC not initialized');
    }

    logger.loading('WebRTCCall', 'Accepting call...');
    this._updateConnectionState('connecting', 'Accepting call...');

    try {
      await this.webrtcManager.acceptCall(callId, offer);
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
      await this.webrtcManager.endCall('rejected');
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
        localStream = this.webrtcManager.getLocalStream?.() || null;
        remoteStream = this.webrtcManager.getRemoteStream?.() || null;
      }

      if (!localStream) {
        logger.warn('CallManager', 'No local stream available for recording');
      }

      // Set up recording event listeners
      recordingManager.on('onRecordingStarted', (data) => {
        this.isRecordingEnabled = true;
        this._events.emit('recordingStarted', data);
        if (this.listeners.onRecordingStarted) {
          this.listeners.onRecordingStarted(data);
        }
      });

      recordingManager.on('onRecordingStopped', (data) => {
        this.isRecordingEnabled = false;
        this._events.emit('recordingStopped', data);
        if (this.listeners.onRecordingStopped) {
          this.listeners.onRecordingStopped(data);
        }
      });

      recordingManager.on('onRecordingError', (data) => {
        this.isRecordingEnabled = false;
        this._events.emit('recordingError', data);
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
      this._emitError({ message: 'Failed to start recording', error });
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
      this._emitError({ message: 'Failed to stop recording', error });
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
        this._events.emit('recordingUploaded', result);
        if (this.listeners.onRecordingUploaded) {
          this.listeners.onRecordingUploaded(result);
        }
      });

      recordingUploader.on('onError', (data) => {
        logger.error('CallManager', `Upload failed: ${data.message}`);
        this._events.emit('recordingError', data);
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
   * Set up event listeners (legacy compatibility)
   */
  on(event, callback) {
    if (this.listeners.hasOwnProperty(event)) {
      logger.debug('CallManager', `Registered listener for: ${event}`);
      this.listeners[event] = callback;
    }
  }

  /**
   * Remove event listeners (legacy compatibility)
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
    this._events.emit('statusChange', status);
    this._events.emit('callStateChange', status);

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

    // Reset services
    this._tokenService.reset();
    this._phoneLookupService.reset();

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

    logger.complete('CallManager');
  }
}

// Export the CallManager class
export { CallManager };

// Also export for backward compatibility
export default CallManager;
