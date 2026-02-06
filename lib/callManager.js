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
  }

  /**
   * Initialize the call manager with user token
   * @param {string} token - Authentication token
   * @param {string} care4wId - User's CareFlow ID
   * @returns {Promise<{mode: string, care4wId: string}>}
   */
  async initialize(token, care4wId) {
    // If already initializing, return the existing promise
    if (this._initializationPromise) {
      return this._initializationPromise;
    }

    this._initializationPromise = this._doInitialize(token, care4wId);

    try {
      const result = await this._initializationPromise;
      this._initialized = true;
      this._initializationPromise = null;
      return result;
    } catch (error) {
      this._initialized = false;
      this._initializationPromise = null;
      console.error("CallManager initialization failed:", error);
      throw error;
    }
  }

  async _doInitialize(token, care4wId) {
    this.token = token;
    this.care4wId = care4wId;

    // Fetch token info to determine mode
    const tokenInfo = await this.fetchTokenInfo();
    this.mode = tokenInfo.mode;

    console.log(`CallManager initialized in ${this.mode} mode`);

    if (this.mode === "twilio") {
      await this.initializeTwilio(tokenInfo.token);
    } else {
      await this.initializeWebRTC();
    }

    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange({ mode: this.mode, care4wId });
    }

    return { mode: this.mode, care4wId };
  }

  /**
   * Fetch token info from API
   */
  async fetchTokenInfo() {
    const response = await fetch("/api/token", {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = new Error("Failed to fetch token info");
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  /**
   * Initialize Twilio Device
   */
  async initializeTwilio(twilioToken) {
    this.twilioDevice = new Device(twilioToken, {
      codecPreferences: ["opus", "pcmu"],
    });

    // Handle incoming calls
    this.twilioDevice.on("incoming", (conn) => {
      this.twilioConnection = conn;
      this.notifyStatusChange("incoming");

      if (this.listeners.onIncomingCall) {
        this.listeners.onIncomingCall({
          from: conn.parameters.From,
          to: conn.parameters.To,
        });
      }

      conn.on("connect", () => {
        this.notifyStatusChange("connected");
        this.startCallTimer();
      });

      conn.on("disconnect", () => {
        this.notifyStatusChange("idle");
        this.stopCallTimer();
        if (this.listeners.onCallEnded) {
          this.listeners.onCallEnded();
        }
      });

      conn.on("error", (error) => {
        console.error("Twilio connection error:", error);
        this.notifyStatusChange("idle");
        if (this.listeners.onError) {
          this.listeners.onError(error);
        }
      });
    });

    this.twilioDevice.on("error", (error) => {
      console.error("Twilio Device error:", error);
      if (this.listeners.onError) {
        this.listeners.onError(error);
      }
    });

    console.log("Twilio Device initialized");
    this.notifyStatusChange("ready");
  }

  /**
   * Initialize WebRTC Manager
   */
  async initializeWebRTC() {
    this.webrtcManager = createWebRTCManager();

    await this.webrtcManager.initialize(this.care4wId);

    this.webrtcManager.on("onConnectionStateChange", (state) => {
      console.log("WebRTC connection state:", state);
      this.notifyStatusChange(state);
      if (state === "connected") {
        this.startCallTimer();
      } else if (state === "disconnected" || state === "failed") {
        this.stopCallTimer();
        this.notifyStatusChange("disconnected");
      }
    });

    this.webrtcManager.on("onLocalStream", (stream) => {
      if (this.listeners.onLocalStream) {
        this.listeners.onLocalStream(stream);
      }
    });

    this.webrtcManager.on("onRemoteStream", (stream) => {
      if (this.listeners.onRemoteStream) {
        this.listeners.onRemoteStream(stream);
      }
    });

    this.webrtcManager.on("onCallEnded", () => {
      this.notifyStatusChange("idle");
      if (this.listeners.onCallEnded) {
        this.listeners.onCallEnded();
      }
    });

    this.webrtcManager.on("onIncomingCall", (callData) => {
      this.notifyStatusChange("incoming");
      if (this.listeners.onIncomingCall) {
        this.listeners.onIncomingCall({
          ...callData,
          mode: "webrtc",
        });
      }
    });

    console.log("WebRTC manager initialized");
    this.notifyStatusChange("ready");
  }

  /**
   * Make a call to a phone number or CareFlow ID
   */
  async makeCall(number) {
    if (!number) {
      throw new Error("Phone number or CareFlow ID is required");
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

    this.notifyStatusChange("connecting");
    return conn;
  }

  /**
   * Make a WebRTC call
   */
  async makeWebRTCCall(care4wId) {
    if (!isValidCare4wId(care4wId)) {
      throw new Error(
        "Invalid CareFlow User ID. Format: care4w-XXXXXXX (e.g., care4w-1000001)",
      );
    }

    if (care4wId === this.care4wId) {
      throw new Error("Cannot call your own CareFlow ID");
    }

    if (!this.webrtcManager) {
      throw new Error("WebRTC not initialized");
    }

    // Get local audio stream
    await this.webrtcManager.getLocalStream({ audio: true, video: false });

    // Create and send offer
    await this.webrtcManager.createOffer(care4wId);

    this.notifyStatusChange("connecting");
  }

  /**
   * Accept an incoming call
   */
  async acceptCall() {
    if (this.mode === "twilio") {
      if (this.twilioConnection) {
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

    await this.webrtcManager.acceptOffer(roomId, offer);
    this.notifyStatusChange("connected");
    this.startCallTimer();
  }

  /**
   * Reject an incoming call
   */
  async rejectCall() {
    if (this.mode === "twilio") {
      if (this.twilioConnection) {
        this.twilioConnection.reject();
        this.twilioConnection = null;
        this.notifyStatusChange("idle");
      }
    } else {
      // WebRTC rejection
      this.notifyStatusChange("idle");
    }
  }

  /**
   * End the current call
   */
  async endCall() {
    if (this.mode === "twilio") {
      if (this.twilioConnection) {
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
        return !isMuted;
      }
    } else {
      if (this.webrtcManager) {
        return this.webrtcManager.toggleMute();
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
        this.twilioConnection.sendDigits(digits);
      }
    } else {
      // WebRTC DTMF
      console.log("DTMF via WebRTC:", digits);
    }
  }

  /**
   * Hold call
   */
  async holdCall() {
    if (this.mode === "twilio") {
      if (this.twilioConnection) {
        this.twilioConnection.transfer({
          to: "client:hold",
        });
      }
    } else {
      // WebRTC hold
      console.log("WebRTC hold not yet implemented");
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
      this.listeners[event] = callback;
    }
  }

  /**
   * Remove event listener
   */
  off(event) {
    if (this.listeners.hasOwnProperty(event)) {
      this.listeners[event] = null;
    }
  }

  /**
   * Notify status change
   */
  notifyStatusChange(status) {
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
    // Timer is managed by the component
  }

  /**
   * Stop call timer
   */
  stopCallTimer() {
    // Timer is managed by the component
  }

  /**
   * Clean up resources
   */
  async destroy() {
    try {
      if (this.twilioDevice) {
        this.twilioDevice.destroy();
        this.twilioDevice = null;
      }
      if (this.webrtcManager) {
        await this.webrtcManager.destroy();
        this.webrtcManager = null;
      }
      this.mode = null;
      this.care4wId = null;
      this.token = null;
      this._initialized = false;
      console.log("CallManager destroyed");
    } catch (error) {
      console.error("Error destroying CallManager:", error);
    }
  }
}

// Singleton instance
export const callManager = new CallManager();
export default callManager;
