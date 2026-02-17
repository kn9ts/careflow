/**
 * Initialization State Manager
 *
 * A robust global state management system for tracking initialization lifecycle
 * with distinct states: 'idle', 'initializing', 'initialized', and 'error'.
 *
 * Features:
 * - Singleton pattern with locking mechanism
 * - Reactive state updates via event emitters
 * - Promise-based initialization with deduplication
 * - Comprehensive error handling with user-friendly messages
 */

import { logger } from './logger';

/**
 * Initialization lifecycle states
 */
export const InitState = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  INITIALIZED: 'initialized',
  ERROR: 'error',
};

/**
 * Initialization progress stages for granular tracking
 */
export const InitStage = {
  NONE: 'none',
  VALIDATING_INPUT: 'validating_input',
  FETCHING_TOKEN: 'fetching_token',
  DETERMINING_MODE: 'determining_mode',
  INITIALIZING_WEBRTC: 'initializing_webrtc',
  INITIALIZING_TWILIO: 'initializing_twilio',
  REGISTERING_HANDLERS: 'registering_handlers',
  COMPLETING: 'completing',
  COMPLETE: 'complete',
};

/**
 * Stage labels for UI display
 */
export const InitStageLabels = {
  [InitStage.NONE]: 'Not started',
  [InitStage.VALIDATING_INPUT]: 'Validating credentials...',
  [InitStage.FETCHING_TOKEN]: 'Fetching authentication token...',
  [InitStage.DETERMINING_MODE]: 'Determining call mode...',
  [InitStage.INITIALIZING_WEBRTC]: 'Initializing WebRTC...',
  [InitStage.INITIALIZING_TWILIO]: 'Initializing Twilio Voice...',
  [InitStage.REGISTERING_HANDLERS]: 'Setting up event handlers...',
  [InitStage.COMPLETING]: 'Finalizing setup...',
  [InitStage.COMPLETE]: 'Ready',
};

/**
 * Service initialization states for dual-mode support
 */
export const ServiceState = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  READY: 'ready',
  FAILED: 'failed',
  DISABLED: 'disabled',
};

/**
 * Error codes for initialization failures
 */
export const InitErrorCode = {
  INVALID_TOKEN: 'init/invalid-token',
  TOKEN_FETCH_FAILED: 'init/token-fetch-failed',
  NETWORK_ERROR: 'init/network-error',
  TIMEOUT: 'init/timeout',
  TWILIO_INIT_FAILED: 'init/twilio-failed',
  WEBRTC_INIT_FAILED: 'init/webrtc-failed',
  MODE_DETERMINATION_FAILED: 'init/mode-failed',
  ALREADY_INITIALIZING: 'init/already-initializing',
  LOCK_ACQUISITION_FAILED: 'init/lock-failed',
  UNKNOWN: 'init/unknown',
};

/**
 * User-friendly error messages for initialization failures
 */
export const InitErrorMessages = {
  [InitErrorCode.INVALID_TOKEN]: {
    title: 'Invalid Authentication',
    description: 'Your authentication token is invalid or has expired. Please sign in again.',
    action: 'Try signing out and signing back in to refresh your session.',
    retryable: false,
  },
  [InitErrorCode.TOKEN_FETCH_FAILED]: {
    title: 'Token Request Failed',
    description: "We couldn't retrieve your call credentials. This may be due to a server issue.",
    action: 'Please wait a moment and try again. If the problem persists, contact support.',
    retryable: true,
  },
  [InitErrorCode.NETWORK_ERROR]: {
    title: 'Connection Problem',
    description: 'Unable to reach our servers. Please check your internet connection.',
    action:
      "Verify you're connected to the internet and try again. If using a VPN, try disabling it.",
    retryable: true,
  },
  [InitErrorCode.TIMEOUT]: {
    title: 'Initialization Timeout',
    description: 'The initialization process took too long. This may be due to a slow connection.',
    action: 'Please check your connection and try again. The system will retry automatically.',
    retryable: true,
  },
  [InitErrorCode.TWILIO_INIT_FAILED]: {
    title: 'Twilio Setup Failed',
    description: "We couldn't set up the Twilio voice system. This is usually temporary.",
    action: "Please try again. If the problem persists, we'll fall back to WebRTC mode.",
    retryable: true,
  },
  [InitErrorCode.WEBRTC_INIT_FAILED]: {
    title: 'WebRTC Setup Failed',
    description:
      "We couldn't set up the WebRTC calling system. Please check your browser permissions.",
    action: 'Ensure your browser allows microphone access. Try refreshing the page.',
    retryable: true,
  },
  [InitErrorCode.MODE_DETERMINATION_FAILED]: {
    title: 'Mode Detection Failed',
    description: "We couldn't determine the appropriate calling mode for your account.",
    action: 'Please contact support if this issue persists.',
    retryable: true,
  },
  [InitErrorCode.ALREADY_INITIALIZING]: {
    title: 'Initialization In Progress',
    description: 'The call system is already being initialized. Please wait.',
    action: 'The system will complete initialization shortly. No action needed.',
    retryable: false,
  },
  [InitErrorCode.LOCK_ACQUISITION_FAILED]: {
    title: 'System Busy',
    description: 'Another initialization is in progress. Please wait for it to complete.',
    action: 'Wait a moment and try again.',
    retryable: true,
  },
  [InitErrorCode.UNKNOWN]: {
    title: 'Unexpected Error',
    description: 'An unexpected error occurred during initialization.',
    action: 'Please try again. If the problem persists, contact support.',
    retryable: true,
  },
};

/**
 * Get user-friendly error info for an error code
 * @param {string} code - Error code
 * @returns {Object} Error info with title, description, action, retryable
 */
export function getInitErrorInfo(code) {
  return InitErrorMessages[code] || InitErrorMessages[InitErrorCode.UNKNOWN];
}

/**
 * Initialization State Manager Class
 * Manages the initialization lifecycle with locking and state tracking
 * Supports dual-mode initialization (WebRTC + Twilio) with independent status tracking
 */
class InitializationStateManager {
  constructor() {
    // Core state
    this._state = InitState.IDLE;
    this._stage = InitStage.NONE;
    this._error = null;
    this._errorCode = null;

    // Locking mechanism
    this._lockAcquired = false;
    this._lockOwner = null;
    this._lockTimestamp = null;

    // Promise management
    this._initializationPromise = null;
    this._resolveInit = null;
    this._rejectInit = null;

    // Metadata
    this._mode = null; // Primary mode: 'twilio' | 'webrtc' | 'dual'
    this._care4wId = null;
    this._startedAt = null;
    this._completedAt = null;
    this._lastAttemptAt = null;

    // Dual-mode service states (for resilient initialization)
    this._webrtcState = ServiceState.IDLE;
    this._webrtcError = null;
    this._twilioState = ServiceState.IDLE;
    this._twilioError = null;

    // Event listeners
    this._listeners = new Map();

    // Retry tracking
    this._retryCount = 0;
    this._maxRetries = 3;

    logger.init('InitializationStateManager');
  }

  /**
   * Get current state
   * @returns {string} Current initialization state
   */
  get state() {
    return this._state;
  }

  /**
   * Get current stage
   * @returns {string} Current initialization stage
   */
  get stage() {
    return this._stage;
  }

  /**
   * Get current error
   * @returns {Error|null} Current error if any
   */
  get error() {
    return this._error;
  }

  /**
   * Get error code
   * @returns {string|null} Error code if any
   */
  get errorCode() {
    return this._errorCode;
  }

  /**
   * Check if initialized
   * @returns {boolean} True if initialized
   */
  get isInitialized() {
    return this._state === InitState.INITIALIZED;
  }

  /**
   * Check if initializing
   * @returns {boolean} True if initializing
   */
  get isInitializing() {
    return this._state === InitState.INITIALIZING;
  }

  /**
   * Check if has error
   * @returns {boolean} True if has error
   */
  get hasError() {
    return this._state === InitState.ERROR;
  }

  /**
   * Check if is idle
   * @returns {boolean} True if idle
   */
  get isIdle() {
    return this._state === InitState.IDLE;
  }

  /**
   * Check if lock is acquired
   * @returns {boolean} True if locked
   */
  get isLocked() {
    return this._lockAcquired;
  }

  /**
   * Get initialization mode
   * @returns {string|null} Mode (twilio/webrtc) or null
   */
  get mode() {
    return this._mode;
  }

  /**
   * Get care4wId
   * @returns {string|null} CareFlow ID or null
   */
  get care4wId() {
    return this._care4wId;
  }

  /**
   * Get retry count
   * @returns {number} Number of retry attempts
   */
  get retryCount() {
    return this._retryCount;
  }

  /**
   * Check if can retry
   * @returns {boolean} True if can retry
   */
  get canRetry() {
    if (this._state !== InitState.ERROR) return false;
    if (this._retryCount >= this._maxRetries) return false;
    const errorInfo = getInitErrorInfo(this._errorCode);
    return errorInfo.retryable;
  }

  /**
   * Get full state snapshot
   * @returns {Object} State snapshot
   */
  getSnapshot() {
    return {
      state: this._state,
      stage: this._stage,
      stageLabel: InitStageLabels[this._stage],
      error: this._error?.message || null,
      errorCode: this._errorCode,
      errorInfo: this._errorCode ? getInitErrorInfo(this._errorCode) : null,
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      hasError: this.hasError,
      isLocked: this.isLocked,
      mode: this._mode,
      care4wId: this._care4wId,
      retryCount: this._retryCount,
      canRetry: this.canRetry,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      lastAttemptAt: this._lastAttemptAt,
      // Dual-mode service states
      webrtcState: this._webrtcState,
      webrtcError: this._webrtcError?.message || null,
      twilioState: this._twilioState,
      twilioError: this._twilioError?.message || null,
      // Computed mode availability
      webrtcReady: this._webrtcState === ServiceState.READY,
      twilioReady: this._twilioState === ServiceState.READY,
      activeModes: this._getActiveModes(),
    };
  }

  /**
   * Get active modes array
   * @returns {string[]} Array of active modes
   * @private
   */
  _getActiveModes() {
    const modes = [];
    if (this._webrtcState === ServiceState.READY) modes.push('webrtc');
    if (this._twilioState === ServiceState.READY) modes.push('twilio');
    return modes;
  }

  /**
   * Get WebRTC service state
   * @returns {string} WebRTC service state
   */
  get webrtcState() {
    return this._webrtcState;
  }

  /**
   * Get Twilio service state
   * @returns {string} Twilio service state
   */
  get twilioState() {
    return this._twilioState;
  }

  /**
   * Check if WebRTC is ready
   * @returns {boolean} True if WebRTC is ready
   */
  get isWebRTCReady() {
    return this._webrtcState === ServiceState.READY;
  }

  /**
   * Check if Twilio is ready
   * @returns {boolean} True if Twilio is ready
   */
  get isTwilioReady() {
    return this._twilioState === ServiceState.READY;
  }

  /**
   * Update WebRTC service state
   * @param {string} state - New service state
   * @param {Error|null} error - Optional error
   */
  updateWebRTCState(state, error = null) {
    const previousState = this._webrtcState;
    this._webrtcState = state;
    this._webrtcError = error;

    logger.debug(
      'InitializationStateManager',
      `WebRTC state: ${previousState} -> ${state}${error ? ` (${error.message})` : ''}`
    );

    this._emit('serviceStateChange', {
      service: 'webrtc',
      previousState,
      state,
      error,
      timestamp: new Date().toISOString(),
    });

    // Update overall mode based on service states
    this._updateOverallMode();
  }

  /**
   * Update Twilio service state
   * @param {string} state - New service state
   * @param {Error|null} error - Optional error
   */
  updateTwilioState(state, error = null) {
    const previousState = this._twilioState;
    this._twilioState = state;
    this._twilioError = error;

    logger.debug(
      'InitializationStateManager',
      `Twilio state: ${previousState} -> ${state}${error ? ` (${error.message})` : ''}`
    );

    this._emit('serviceStateChange', {
      service: 'twilio',
      previousState,
      state,
      error,
      timestamp: new Date().toISOString(),
    });

    // Update overall mode based on service states
    this._updateOverallMode();
  }

  /**
   * Update overall mode based on service states
   * @private
   */
  _updateOverallMode() {
    const webrtcReady = this._webrtcState === ServiceState.READY;
    const twilioReady = this._twilioState === ServiceState.READY;

    if (webrtcReady && twilioReady) {
      this._mode = 'dual';
    } else if (twilioReady) {
      this._mode = 'twilio';
    } else if (webrtcReady) {
      this._mode = 'webrtc';
    } else {
      this._mode = null;
    }
  }

  /**
   * Acquire initialization lock
   * @param {string} owner - Lock owner identifier
   * @returns {boolean} True if lock acquired
   */
  acquireLock(owner = 'unknown') {
    if (this._lockAcquired) {
      logger.warn('InitializationStateManager', `Lock already held by: ${this._lockOwner}`);
      return false;
    }

    this._lockAcquired = true;
    this._lockOwner = owner;
    this._lockTimestamp = Date.now();
    logger.debug('InitializationStateManager', `Lock acquired by: ${owner}`);
    return true;
  }

  /**
   * Release initialization lock
   * @param {string} owner - Lock owner identifier
   * @returns {boolean} True if lock released
   */
  releaseLock(owner = 'unknown') {
    if (!this._lockAcquired) {
      return true; // Already released
    }

    if (this._lockOwner && this._lockOwner !== owner) {
      logger.warn(
        'InitializationStateManager',
        `Lock release attempted by non-owner: ${owner} (owner: ${this._lockOwner})`
      );
      return false;
    }

    this._lockAcquired = false;
    this._lockOwner = null;
    this._lockTimestamp = null;
    logger.debug('InitializationStateManager', `Lock released by: ${owner}`);
    return true;
  }

  /**
   * Set state and notify listeners
   * @param {string} state - New state
   * @param {string} stage - New stage
   * @private
   */
  _setState(state, stage = null) {
    const previousState = this._state;
    const previousStage = this._stage;

    this._state = state;
    if (stage) {
      this._stage = stage;
    }

    logger.debug(
      'InitializationStateManager',
      `State: ${previousState} -> ${state}, Stage: ${previousStage} -> ${this._stage}`
    );

    this._emit('stateChange', {
      previousState,
      state,
      previousStage,
      stage: this._stage,
      stageLabel: InitStageLabels[this._stage],
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Set error state
   * @param {Error} error - Error object
   * @param {string} code - Error code
   * @private
   */
  _setError(error, code = InitErrorCode.UNKNOWN) {
    this._error = error;
    this._errorCode = code;
    this._setState(InitState.ERROR);

    const errorInfo = getInitErrorInfo(code);
    logger.error('InitializationStateManager', `Error: ${error.message} (${code})`);

    this._emit('error', {
      error,
      code,
      ...errorInfo,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Start initialization
   * @returns {Promise} Initialization promise
   */
  startInitialization() {
    // If already initialized, return resolved promise
    if (this._state === InitState.INITIALIZED) {
      logger.debug('InitializationStateManager', 'Already initialized');
      return Promise.resolve({ mode: this._mode, care4wId: this._care4wId });
    }

    // If initializing, return existing promise
    if (this._state === InitState.INITIALIZING && this._initializationPromise) {
      logger.debug('InitializationStateManager', 'Returning existing initialization promise');
      return this._initializationPromise;
    }

    // Try to acquire lock
    if (!this.acquireLock('initialization')) {
      logger.warn('InitializationStateManager', 'Cannot start - lock not acquired');
      return Promise.reject(new Error('Initialization already in progress'));
    }

    // Create new initialization promise
    this._initializationPromise = new Promise((resolve, reject) => {
      this._resolveInit = resolve;
      this._rejectInit = reject;
    });

    // Update state
    this._startedAt = new Date().toISOString();
    this._lastAttemptAt = this._startedAt;
    this._setState(InitState.INITIALIZING, InitStage.NONE);

    this._emit('start', {
      startedAt: this._startedAt,
      retryCount: this._retryCount,
    });

    return this._initializationPromise;
  }

  /**
   * Update initialization stage
   * @param {string} stage - New stage
   */
  updateStage(stage) {
    if (this._state !== InitState.INITIALIZING) {
      logger.warn('InitializationStateManager', 'Cannot update stage - not initializing');
      return;
    }

    this._setState(InitState.INITIALIZING, stage);
    this._emit('progress', {
      stage,
      stageLabel: InitStageLabels[stage],
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Complete initialization successfully
   * @param {Object} result - Initialization result
   */
  completeInitialization(result) {
    if (this._state !== InitState.INITIALIZING) {
      logger.warn('InitializationStateManager', 'Cannot complete - not initializing');
      return;
    }

    this._mode = result.mode;
    this._care4wId = result.care4wId;
    this._completedAt = new Date().toISOString();
    this._error = null;
    this._errorCode = null;
    this._retryCount = 0;

    this._setState(InitState.INITIALIZED, InitStage.COMPLETE);
    this.releaseLock('initialization');

    if (this._resolveInit) {
      this._resolveInit(result);
    }

    this._emit('complete', {
      mode: this._mode,
      care4wId: this._care4wId,
      completedAt: this._completedAt,
      duration: this._startedAt ? new Date(this._completedAt) - new Date(this._startedAt) : null,
    });

    logger.ready('InitializationStateManager', `Complete - mode: ${this._mode}`);
  }

  /**
   * Fail initialization
   * @param {Error} error - Error object
   * @param {string} code - Error code
   */
  failInitialization(error, code = InitErrorCode.UNKNOWN) {
    if (this._state !== InitState.INITIALIZING) {
      logger.warn('InitializationStateManager', 'Cannot fail - not initializing');
      return;
    }

    this._setError(error, code);
    this.releaseLock('initialization');

    // Clear promise to allow retry
    const promise = this._initializationPromise;
    this._initializationPromise = null;

    if (this._rejectInit) {
      this._rejectInit(error);
    }

    this._rejectInit = null;
    this._resolveInit = null;

    logger.error('InitializationStateManager', `Failed: ${error.message}`);
  }

  /**
   * Retry initialization
   * @returns {Promise} Initialization promise
   */
  async retry() {
    if (!this.canRetry) {
      const error = new Error('Cannot retry initialization');
      error.code = this._retryCount >= this._maxRetries ? 'max_retries' : 'not_retryable';
      throw error;
    }

    this._retryCount++;
    this._error = null;
    this._errorCode = null;

    logger.loading('InitializationStateManager', `Retry attempt ${this._retryCount}`);

    this._emit('retry', {
      retryCount: this._retryCount,
      timestamp: new Date().toISOString(),
    });

    return this.startInitialization();
  }

  /**
   * Reset state manager
   */
  reset() {
    logger.loading('InitializationStateManager', 'Resetting...');

    this._state = InitState.IDLE;
    this._stage = InitStage.NONE;
    this._error = null;
    this._errorCode = null;
    this._lockAcquired = false;
    this._lockOwner = null;
    this._lockTimestamp = null;
    this._initializationPromise = null;
    this._resolveInit = null;
    this._rejectInit = null;
    this._mode = null;
    this._care4wId = null;
    this._startedAt = null;
    this._completedAt = null;
    this._retryCount = 0;
    // Reset dual-mode service states
    this._webrtcState = ServiceState.IDLE;
    this._webrtcError = null;
    this._twilioState = ServiceState.IDLE;
    this._twilioError = null;

    this._emit('reset', {
      timestamp: new Date().toISOString(),
    });

    logger.complete('InitializationStateManager');
  }

  /**
   * Subscribe to events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this._listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Unsubscribe from events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @private
   */
  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (err) {
          logger.error('InitializationStateManager', `Event listener error: ${err.message}`);
        }
      });
    }

    // Also emit to 'any' listeners
    const anyListeners = this._listeners.get('*');
    if (anyListeners) {
      anyListeners.forEach((callback) => {
        try {
          callback({ event, data });
        } catch (err) {
          logger.error('InitializationStateManager', `Event listener error: ${err.message}`);
        }
      });
    }
  }
}

// Singleton instance
let stateManagerInstance = null;

/**
 * Get the singleton InitializationStateManager instance
 * @returns {InitializationStateManager} The singleton instance
 */
export function getInitializationStateManager() {
  if (!stateManagerInstance) {
    stateManagerInstance = new InitializationStateManager();
  }
  return stateManagerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetInitializationStateManager() {
  if (stateManagerInstance) {
    stateManagerInstance.reset();
  }
  stateManagerInstance = null;
}

export default InitializationStateManager;
