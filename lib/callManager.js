/**
 * Unified Call Manager
 *
 * Provides a unified interface for both Twilio Voice and WebRTC calls.
 * Automatically switches between modes based on available credentials.
 * Includes call recording functionality.
 */

import { Device } from "@twilio/voice-sdk";
import { createWebRTCManager } from "./webrtc";
import { isValidCare4wId } from "./careFlowIdValidator";
import { recordingManager, recordingUploader } from "./recordingManager";
import { logger } from "./logger";

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
    this._initialized = false;
    this._initializationPromise = null;
    this._lastCallTime = 0;
    this._callCount = 0;
    this._callCountResetTime = Date.now();
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
    };

    logger.init("CallManager");
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
      logger.warn("CallManager", "Rate limit exceeded - too many calls");
      return {
        allowed: false,
        message: "Too many calls. Please wait a moment.",
      };
    }

    // Min 5 seconds between calls
    if (now - this._lastCallTime < 5000) {
      logger.warn("CallManager", "Rate limit - call too soon");
      return {
        allowed: false,
        message: "Please wait before making another call.",
      };
    }

    logger.debug("CallManager", "Rate limit check passed");
    return { allowed: true, message: "OK" };
  }

  /**
   * Update rate limit counters
   */
  _updateRateLimit() {
    this._lastCallTime = Date.now();
    this._callCount++;
    logger.debug(
      "CallManager",
      `Rate limit updated - count: ${this._callCount}`,
    );
  }

  /**
   * Initialize the call manager with user token
   * @param {string} token - Authentication token
   * @param {string} care4wId - User's CareFlow ID
   * @returns {Promise<{mode: string, care4wId: string}>}
   */
  async initialize(token, care4wId) {
    logger.loading("CallManager", "Starting initialization...");

    // If already initializing, return the existing promise
    if (this._initializationPromise) {
      logger.debug("CallManager", "Returning existing initialization promise");
      return this._initializationPromise;
    }

    this._initializationPromise = this._doInitialize(token, care4wId);

    try {
      const result = await this._initializationPromise;
      this._initialized = true;
      this._initializationPromise = null;
      logger.ready(
        "CallManager",
        `Initialization complete - mode: ${result.mode}`,
      );
      return result;
    } catch (error) {
      this._initialized = false;
      this._initializationPromise = null;
      logger.error("CallManager", `Initialization failed: ${error.message}`);
      throw error;
    }
  }

  async _doInitialize(token, care4wId) {
    logger.trace("CallManager", "Setting token and care4wId");
    this.token = token;
    this.care4wId = care4wId;

    // Fetch token info to determine mode
    logger.loading("CallManager", "Fetching token info from API...");
    const tokenInfo = await this.fetchTokenInfo();
    this.mode = tokenInfo.mode;

    logger.success("CallManager", `Determined mode: ${this.mode}`);

    logger.loading("CallManager", `Initializing ${this.mode} mode...`);

    if (this.mode === "twilio") {
      await this.initializeTwilio(tokenInfo.token);
    } else {
      await this.initializeWebRTC();
    }

    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange({ mode: this.mode, care4wId });
    }

    logger.complete("CallManager");
    return { mode: this.mode, care4wId };
  }

  /**
   * Fetch token info from API
   */
  async fetchTokenInfo() {
    logger.trace("CallManager", "Fetching token info from /api/token");
    const response = await fetch("/api/token", {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = new Error("Failed to fetch token info");
      error.status = response.status;
      logger.error("CallManager", `Token fetch failed: ${error.message}`);
      throw error;
    }

    const tokenInfo = await response.json();
    logger.success("CallManager", "Token info fetched successfully");
    return tokenInfo;
  }

  /**
   * Initialize Twilio Device
   */
  async initializeTwilio(twilioToken) {
    logger.init("TwilioDevice");

    this.twilioDevice = new Device(twilioToken, {
      codecPreferences: ["opus", "pcmu"],
    });

    // Handle incoming calls
    this.twilioDevice.on("incoming", (conn) => {
      logger.incomingCall("TwilioDevice", conn.parameters.From);
      this.twilioConnection = conn;
      this.notifyStatusChange("incoming");

      if (this.listeners.onIncomingCall) {
        this.listeners.onIncomingCall({
          from: conn.parameters.From,
          to: conn.parameters.To,
        });
      }

      conn.on("connect", () => {
        logger.callConnect("TwilioDevice");
        this.notifyStatusChange("connected");
        this.startCallTimer();
      });

      conn.on("disconnect", () => {
        logger.callEnd("TwilioDevice");
        this.notifyStatusChange("idle");
        this.stopCallTimer();
        if (this.listeners.onCallEnded) {
          this.listeners.onCallEnded();
        }
      });

      conn.on("error", (error) => {
        logger.error("TwilioConnection", error.message);
        this.notifyStatusChange("idle");
        if (this.listeners.onError) {
          this.listeners.onError(error);
        }
      });
    });

    this.twilioDevice.on("error", (error) => {
      logger.error("TwilioDevice", error.message);
      if (this.listeners.onError) {
        this.listeners.onError(error);
      }
    });

    logger.success(
      "TwilioDevice",
      "Device initialized and listening for calls",
    );
    this.notifyStatusChange("ready");
  }

  /**
   * Initialize WebRTC Manager
   */
  async initializeWebRTC() {
    logger.init("WebRTCManager");

    this.webrtcManager = createWebRTCManager();

    logger.loading("WebRTCManager", "Initializing Firebase connection...");

    // Pass the auth token for secure Firebase operations
    await this.webrtcManager.initialize(this.care4wId, this.token);

    this.webrtcManager.on("onConnectionStateChange", (state) => {
      logger.trace("WebRTCManager", `Connection state: ${state}`);
      this.notifyStatusChange(state);
      if (state === "connected") {
        this.startCallTimer();
      } else if (state === "disconnected" || state === "failed") {
        this.stopCallTimer();
        this.notifyStatusChange("disconnected");
      }
    });

    this.webrtcManager.on("onLocalStream", (stream) => {
      logger.debug("WebRTCManager", "Local stream acquired");
      if (this.listeners.onLocalStream) {
        this.listeners.onLocalStream(stream);
      }
    });

    this.webrtcManager.on("onRemoteStream", (stream) => {
      logger.success("WebRTCManager", "Remote stream received");
      if (this.listeners.onRemoteStream) {
        this.listeners.onRemoteStream(stream);
      }
    });

    this.webrtcManager.on("onCallEnded", () => {
      logger.callEnd("WebRTCManager");
      this.notifyStatusChange("idle");
      if (this.listeners.onCallEnded) {
        this.listeners.onCallEnded();
      }
    });

    this.webrtcManager.on("onIncomingCall", (callData) => {
      logger.incomingCall("WebRTCManager", callData.from);
      this.notifyStatusChange("incoming");
      if (this.listeners.onIncomingCall) {
        this.listeners.onIncomingCall({
          ...callData,
          mode: "webrtc",
        });
      }
    });

    logger.success(
      "WebRTCManager",
      "Manager initialized and listening for calls",
    );
    this.notifyStatusChange("ready");
  }

  /**
   * Make a call to a phone number or CareFlow ID
   */
  async makeCall(number) {
    if (!number) {
      throw new Error("Phone number or CareFlow ID is required");
    }

    // Check rate limit
    const rateLimit = this._checkRateLimit();
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.message);
    }

    // Wait for initialization if in progress
    if (this._initializationPromise) {
      await this._initializationPromise;
    }

    // Check if initialized
    if (!this._initialized || !this.mode) {
      throw new Error(
        "Call system not initialized. Please wait a moment and try again.",
      );
    }

    // Update rate limit counters
    this._updateRateLimit();

    logger.callStart(this.mode, number);

    if (this.mode === "twilio") {
      return this.makeTwilioCall(number);
    } else {
      return this.makeWebRTCCall(number);
    }
  }

  /**
   * Make a Twilio call
   */
  makeTwilioCall(number) {
    if (!this.twilioDevice) {
      throw new Error("Twilio not initialized");
    }

    const conn = this.twilioDevice.connect({
      To: number,
    });

    logger.loading("TwilioCall", `Connecting to ${number}...`);
    this.notifyStatusChange("connecting");
    return conn;
  }

  /**
   * Make a WebRTC call
   */
  async makeWebRTCCall(care4wId) {
    // Validate CareFlow ID format
    if (!isValidCare4wId(care4wId)) {
      throw new Error(
        "Invalid CareFlow User ID. Format: care4w-XXXXXXX (e.g., care4w-1000001)",
      );
    }

    // Prevent calling yourself
    if (care4wId === this.care4wId) {
      throw new Error("Cannot call your own CareFlow ID");
    }

    if (!this.webrtcManager) {
      throw new Error("WebRTC not initialized. Please wait and try again.");
    }

    // Check WebRTC support
    if (!this.webrtcManager.constructor.isSupported()) {
      throw new Error("WebRTC is not supported in this browser");
    }

    logger.loading("WebRTCCall", `Getting local audio stream...`);

    // Get local audio stream
    await this.webrtcManager.getLocalStream({ audio: true, video: false });

    logger.loading("WebRTCCall", "Creating and sending offer...");

    // Create and send offer
    await this.webrtcManager.createOffer(care4wId);

    logger.loading("WebRTCCall", "Waiting for answer...");
    this.notifyStatusChange("connecting");
  }

  /**
   * Accept an incoming call
   */
  async acceptCall() {
    if (this.mode === "twilio") {
      if (this.twilioConnection) {
        logger.success("TwilioCall", "Accepting incoming call");
        this.twilioConnection.accept();
        this.notifyStatusChange("connected");
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
      throw new Error("WebRTC not initialized");
    }

    logger.loading("WebRTCCall", "Accepting call...");
    await this.webrtcManager.acceptCall(roomId, offer);
    logger.callConnect("WebRTCCall");
    this.notifyStatusChange("connected");
    this.startCallTimer();
  }

  /**
   * Reject an incoming call
   */
  async rejectCall() {
    if (this.mode === "twilio") {
      if (this.twilioConnection) {
        logger.warn("TwilioCall", "Rejecting call");
        this.twilioConnection.reject();
        this.twilioConnection = null;
        this.notifyStatusChange("idle");
      }
    } else {
      // WebRTC rejection
      logger.warn("WebRTCCall", "Rejecting call");
      this.notifyStatusChange("idle");
    }
  }

  /**
   * End the current call
   */
  async endCall() {
    logger.loading("CallManager", "Ending call...");

    if (this.mode === "twilio") {
      if (this.twilioConnection) {
        logger.callEnd("TwilioCall");
        this.twilioConnection.disconnect();
        this.twilioConnection = null;
      }
    } else {
      if (this.webrtcManager) {
        await this.webrtcManager.endCall();
      }
    }

    this.notifyStatusChange("idle");
    this.stopCallTimer();
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (this.mode === "twilio") {
      if (this.twilioConnection) {
        const isMuted = this.twilioConnection.isMuted();
        this.twilioConnection.mute(!isMuted);
        logger.debug("TwilioCall", `Mute: ${!isMuted}`);
        return !isMuted;
      }
    } else {
      if (this.webrtcManager) {
        const muted = this.webrtcManager.toggleMute();
        logger.debug("WebRTCCall", `Mute: ${muted}`);
        return muted;
      }
    }
    return false;
  }

  /**
   * Send DTMF tones
   */
  sendDtmf(digits) {
    if (this.mode === "twilio") {
      if (this.twilioConnection) {
        logger.debug("TwilioCall", `Sending DTMF: ${digits}`);
        this.twilioConnection.sendDigits(digits);
      }
    } else {
      // WebRTC DTMF
      logger.debug("WebRTCCall", `DTMF via WebRTC: ${digits}`);
    }
  }

  /**
   * Hold call
   */
  async holdCall() {
    if (this.mode === "twilio") {
      if (this.twilioConnection) {
        logger.debug("TwilioCall", "Placing call on hold");
        this.twilioConnection.transfer({
          to: "client:hold",
        });
      }
    } else {
      // WebRTC hold
      logger.debug("WebRTCCall", "WebRTC hold not yet implemented");
    }
  }

  /**
   * Get call status
   */
  getStatus() {
    if (this.mode === "twilio") {
      if (this.twilioConnection) {
        return {
          status: this.twilioConnection.state,
          isMuted: this.twilioConnection.isMuted(),
          isOnHold: false,
        };
      }
    }
    return {
      status: "idle",
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
        hold: this.mode === "twilio",
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
      logger.debug("CallManager", `Registered listener for: ${event}`);
      this.listeners[event] = callback;
    }
  }

  /**
   * Remove event listeners
   */
  off(event) {
    if (this.listeners.hasOwnProperty(event)) {
      logger.debug("CallManager", `Removed listener for: ${event}`);
      this.listeners[event] = null;
    }
  }

  /**
   * Notify status change
   */
  notifyStatusChange(status) {
    logger.trace("CallManager", `Status changed: ${status}`);
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
    logger.debug("CallManager", "Call timer started");
  }

  /**
   * Stop call timer
   */
  stopCallTimer() {
    logger.debug("CallManager", "Call timer stopped");
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    logger.loading("CallManager", "Disconnecting and cleaning up...");
    if (this.twilioDevice) {
      this.twilioDevice.destroy();
      this.twilioDevice = null;
    }
    if (this.webrtcManager) {
      this.webrtcManager.endCall();
      this.webrtcManager = null;
    }
    this._initialized = false;
    logger.complete("CallManager");
  }
}

// Singleton instance
const callManager = new CallManager();

export { callManager };
export default callManager;
