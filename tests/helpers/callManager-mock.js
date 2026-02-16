/**
 * Mock CallManager for Testing
 *
 * Provides a mock implementation of the CallManager class for unit tests.
 * Simulates Twilio and WebRTC mode behavior without actual network calls.
 *
 * @module tests/helpers/callManager-mock
 */

/* eslint-disable no-underscore-dangle, camelcase, class-methods-use-this, no-else-return */

const { createMockWebRTCManager } = require('./webrtc-helpers');

/**
 * Mock CallManager class
 */
class MockCallManager {
  constructor() {
    this.mode = null;
    this.care4wId = null;
    this.twilioDevice = null;
    this.twilioConnection = null;
    this.webrtcManager = null;
    this.token = null;

    // Initialization state
    this._initialized = false;
    this._initializationPromise = null;
    this._initializationError = null;
    this._connectionState = 'idle';
    this._statusMessage = 'Not initialized';

    // Rate limiting
    this._lastCallTime = 0;
    this._callCount = 0;
    this._callCountResetTime = Date.now();

    // Event listeners
    this.listeners = new Map();
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    this.listeners.set(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event) {
    this.listeners.delete(event);
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    const callback = this.listeners.get(event);
    if (callback) {
      callback(data);
    }
  }

  /**
   * Get connection state
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
   * Update connection state
   */
  _updateConnectionState(state, message) {
    const previousState = this._connectionState;
    this._connectionState = state;
    this._statusMessage = message;

    this.emit('onConnectionStateChange', {
      previousState,
      state,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check rate limits
   */
  _checkRateLimit() {
    const now = Date.now();
    const oneMinute = 60 * 1000;

    if (now - this._callCountResetTime > oneMinute) {
      this._callCount = 0;
      this._callCountResetTime = now;
    }

    if (this._callCount >= 10) {
      return { allowed: false, message: 'Too many calls. Please wait a moment.' };
    }

    if (now - this._lastCallTime < 5000) {
      return { allowed: false, message: 'Please wait before making another call.' };
    }

    return { allowed: true, message: 'OK' };
  }

  /**
   * Update rate limit counters
   */
  _updateRateLimit() {
    this._lastCallTime = Date.now();
    this._callCount++;
  }

  /**
   * Initialize the call manager
   */
  async initialize(token, care4wId) {
    if (!token) {
      const error = new Error('Authentication token is required');
      this._initializationError = error;
      this._updateConnectionState('failed', 'Missing authentication token');
      throw error;
    }

    if (this._initialized) {
      return { mode: this.mode, care4wId: this.care4wId };
    }

    if (this._initializationPromise) {
      return this._initializationPromise;
    }

    this._updateConnectionState('initializing', 'Starting initialization...');

    this._initializationPromise = this._doInitialize(token, care4wId);

    try {
      const result = await this._initializationPromise;
      this._initialized = true;
      this._initializationPromise = null;
      this._updateConnectionState('ready', `Ready - ${result.mode} mode`);

      this.emit('onInitializationChange', {
        initialized: true,
        mode: result.mode,
      });

      return result;
    } catch (error) {
      this._initialized = false;
      this._initializationPromise = null;
      this._initializationError = error;
      this._updateConnectionState('failed', error.message);

      this.emit('onInitializationChange', {
        initialized: false,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Perform initialization
   */
  async _doInitialize(token, care4wId) {
    this.token = token;
    this.care4wId = care4wId;

    // Simulate token fetch
    await new Promise((resolve) => setTimeout(resolve, 5));

    // Default to webrtc mode for testing
    this.mode = 'webrtc';

    if (this.mode === 'twilio') {
      await this.initializeTwilio('mock-twilio-token');
    } else {
      await this.initializeWebRTC();
    }

    return { mode: this.mode, care4wId: this.care4wId };
  }

  /**
   * Initialize Twilio
   */
  async initializeTwilio(twilioToken) {
    this.twilioDevice = {
      register: jest.fn(async () => {}),
      disconnectAll: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
    };

    await this.twilioDevice.register();
    this._updateConnectionState('ready', 'Twilio device ready');
  }

  /**
   * Initialize WebRTC
   */
  async initializeWebRTC() {
    this.webrtcManager = createMockWebRTCManager({
      localCare4wId: this.care4wId,
    });

    // Mock initialize resolves immediately
    this._setupWebRTCHandlers();
    this._updateConnectionState('ready', 'WebRTC ready');
  }

  /**
   * Setup WebRTC event handlers
   */
  _setupWebRTCHandlers() {
    if (!this.webrtcManager) return;

    this.webrtcManager.on('onConnectionStateChange', (state) => {
      this._updateConnectionState(state, `WebRTC: ${state}`);
      this.emit('onStatusChange', state);

      if (state === 'connected') {
        this.emit('onCallStateChange', 'connected');
      } else if (state === 'disconnected' || state === 'failed') {
        this.emit('onCallStateChange', 'disconnected');
      }
    });

    this.webrtcManager.on('onIncomingCall', (callData) => {
      this.emit('onIncomingCall', { ...callData, mode: 'webrtc' });
    });

    this.webrtcManager.on('onError', (error) => {
      this._updateConnectionState('failed', error.message);
      this.emit('onError', error);
    });

    this.webrtcManager.on('onCallEnded', () => {
      this._updateConnectionState('idle', 'Call ended');
      this.emit('onCallEnded');
    });
  }

  /**
   * Make a call
   */
  async makeCall(number) {
    if (!number) {
      throw new Error('Phone number or CareFlow ID is required');
    }

    const rateLimit = this._checkRateLimit();
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.message);
    }

    if (!this._initialized || !this.mode) {
      throw new Error('Call system not initialized. Please wait a moment and try again.');
    }

    this._updateRateLimit();
    this._updateConnectionState('connecting', `Calling ${number}...`);

    if (this.mode === 'twilio') {
      return this.makeTwilioCall(number);
    }
    return this.makeWebRTCCall(number);
  }

  /**
   * Make a Twilio call
   */
  makeTwilioCall(number) {
    if (!this.twilioDevice) {
      throw new Error('Twilio not initialized');
    }

    this.twilioConnection = {
      disconnect: jest.fn(),
      accept: jest.fn(),
      reject: jest.fn(),
      isMuted: jest.fn(() => false),
      mute: jest.fn(),
    };

    this._updateConnectionState('connecting', `Calling ${number}...`);
    return this.twilioConnection;
  }

  /**
   * Make a WebRTC call
   */
  async makeWebRTCCall(care4wId) {
    if (!this.webrtcManager) {
      throw new Error('WebRTC not initialized');
    }

    await this.webrtcManager.getLocalStream({ audio: true, video: false });
    await this.webrtcManager.createOffer(care4wId);

    this._updateConnectionState('connecting', 'Waiting for answer...');
  }

  /**
   * Accept an incoming call
   */
  async acceptCall() {
    if (this.mode === 'twilio' && this.twilioConnection) {
      this.twilioConnection.accept();
      this._updateConnectionState('connected', 'Call connected');
    }
  }

  /**
   * Accept WebRTC call
   */
  async acceptWebRTCCall(roomId, offer) {
    if (!this.webrtcManager) {
      throw new Error('WebRTC not initialized');
    }

    await this.webrtcManager.acceptCall(roomId, offer);
    this._updateConnectionState('connected', 'Call connected');
  }

  /**
   * Reject an incoming call
   */
  async rejectCall() {
    if (this.mode === 'twilio' && this.twilioConnection) {
      this.twilioConnection.reject();
      this.twilioConnection = null;
    }
    this._updateConnectionState('idle', 'Call rejected');
  }

  /**
   * End the current call
   */
  async endCall() {
    if (this.mode === 'twilio' && this.twilioConnection) {
      this.twilioConnection.disconnect();
      this.twilioConnection = null;
    } else if (this.webrtcManager) {
      await this.webrtcManager.endCall();
    }

    this._updateConnectionState('idle', 'Call ended');
    this.emit('onCallEnded');
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (this.mode === 'twilio' && this.twilioConnection) {
      const isMuted = this.twilioConnection.isMuted();
      this.twilioConnection.mute(!isMuted);
      return !isMuted;
    } else if (this.webrtcManager) {
      return this.webrtcManager.toggleMute();
    }
    return false;
  }

  /**
   * Send DTMF tones
   */
  sendDtmf(digits) {
    if (this.mode === 'twilio' && this.twilioConnection) {
      // Twilio DTMF
      return true;
    }
    return false;
  }

  /**
   * Get mode info
   */
  getModeInfo() {
    return {
      mode: this.mode,
      isWebRTC: this.mode === 'webrtc',
      isTwilio: this.mode === 'twilio',
      care4wId: this.care4wId,
    };
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    if (this.twilioDevice) {
      this.twilioDevice.disconnectAll();
      this.twilioDevice.destroy();
      this.twilioDevice = null;
    }

    if (this.webrtcManager) {
      await this.webrtcManager.endCall();
      this.webrtcManager = null;
    }

    this._initialized = false;
    this._initializationPromise = null;
    this._connectionState = 'idle';
    this.listeners.clear();
  }

  /**
   * Retry initialization
   */
  async retryInitialization() {
    this._initialized = false;
    this._initializationError = null;
    return this.initialize(this.token, this.care4wId);
  }
}

module.exports = MockCallManager;
