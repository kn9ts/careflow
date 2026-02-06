/**
 * Unified Call Manager
 *
 * Provides a unified interface for both Twilio Voice and WebRTC calls.
 * Automatically switches between modes based on available credentials.
 */

import { Device } from "@twilio/voice-sdk";
import { createWebRTCManager } from "./webrtc";
import { isValidCare4wId } from "./careFlowIdGenerator";

class CallManager {
  constructor() {
    this.mode = null; // 'twilio' | 'webrtc'
    this.care4wId = null;
    this.twilioDevice = null;
    this.twilioConnection = null;
    this.webrtcManager = null;
    this.token = null;
    this.listeners = {
      onStatusChange: null,
      onCallStateChange: null,
      onIncomingCall: null,
      onCallEnded: null,
      onError: null,
      onLocalStream: null,
      onRemoteStream: null,
    };
  }

  /**
   * Initialize the call manager with user token
   * @param {string} token - Authentication token
   * @param {string} care4wId - User's CareFlow ID
   * @returns {Promise<{mode: string, care4wId: string}>}
   */
  async initialize(token, care4wId) {
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
      throw new Error("Failed to fetch token info");
    }

    return response.json();
  }

  /**
   * Initialize Twilio Device
   */
  async initializeTwilio(twilioToken) {
    this.twilioDevice = new Device(twilioToken, {
      codecPreferences: ["opus", "pcmu"],
      fakeLocalDTMF: true,
      enableRingingState: true,
    });

    this.twilioDevice.on("ready", () => {
      console.log("Twilio device ready");
      this.notifyStatusChange("ready");
    });

    this.twilioDevice.on("error", (error) => {
      console.error("Twilio device error:", error);
      if (this.listeners.onError) {
        this.listeners.onError({ mode: "twilio", error });
      }
    });

    this.twilioDevice.on("connect", (conn) => {
      this.twilioConnection = conn;
      this.notifyStatusChange("connected");
      this.startCallTimer();
    });

    this.twilioDevice.on("disconnect", () => {
      this.twilioConnection = null;
      this.notifyStatusChange("disconnected");
      this.stopCallTimer();
    });

    this.twilioDevice.on("incoming", (conn) => {
      this.twilioConnection = conn;
      this.notifyStatusChange("incoming");
      if (this.listeners.onIncomingCall) {
        this.listeners.onIncomingCall({
          from: conn.parameters.From,
          mode: "twilio",
        });
      }
    });
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

    // Get local audio stream
    await this.webrtcManager.getLocalStream({ audio: true, video: false });

    // Accept the call
    await this.webrtcManager.acceptCall(roomId, offer);

    this.notifyStatusChange("connected");
  }

  /**
   * Reject or end the current call
   */
  rejectCall() {
    if (this.mode === "twilio") {
      if (this.twilioConnection) {
        this.twilioConnection.reject();
        this.twilioConnection = null;
      }
    }
    this.notifyStatusChange("idle");
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
      if (this.twilioDevice) {
        this.twilioDevice.disconnectAll();
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
   * Toggle mute state
   */
  toggleMute() {
    if (this.mode === "twilio" && this.twilioConnection) {
      const isMuted = this.twilioConnection.isMuted();
      this.twilioConnection.mute(!isMuted);
      return !isMuted;
    }
    return false;
  }

  /**
   * Send DTMF digits
   */
  sendDigits(digit) {
    if (this.mode === "twilio" && this.twilioConnection) {
      this.twilioConnection.sendDigits(digit);
    }
  }

  /**
   * Notify status change
   */
  notifyStatusChange(status) {
    if (this.listeners.onCallStateChange) {
      this.listeners.onCallStateChange(status);
    }
  }

  /**
   * Set event listener
   */
  on(event, callback) {
    if (this.listeners.hasOwnProperty(event)) {
      this.listeners[event] = callback;
    }
  }

  /**
   * Get current call status
   */
  getStatus() {
    return {
      mode: this.mode,
      care4wId: this.care4wId,
      connectionState:
        this.twilioConnection?.state ||
        this.webrtcManager?.getConnectionState() ||
        "idle",
    };
  }

  /**
   * Get mode information
   */
  getModeInfo() {
    if (this.mode === "twilio") {
      return {
        mode: "twilio",
        description: "Twilio Voice - PSTN Calls",
        placeholder: "Enter phone number (+1234567890)",
        format: "E.164 phone format",
        helpText: "Enter a phone number including country code",
      };
    } else {
      return {
        mode: "webrtc",
        description: "WebRTC - CareFlow User Calls",
        placeholder: "Enter CareFlow ID (care4w-XXXXXXX)",
        format: "care4w- followed by 7 digits",
        helpText: "Enter a CareFlow User ID like care4w-1000001",
      };
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.twilioDevice) {
      this.twilioDevice.destroy();
      this.twilioDevice = null;
    }
    if (this.webrtcManager) {
      this.webrtcManager.endCall();
      this.webrtcManager = null;
    }
    this.stopCallTimer();
  }

  // Timer methods
  startCallTimer = () => {
    this.callStartTime = Date.now();
    this.callTimer = setInterval(() => {
      if (this.callStartTime) {
        const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
        // Emit duration update event if needed
      }
    }, 1000);
  };

  stopCallTimer = () => {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
    this.callStartTime = null;
  };
}

// Export singleton
export const callManager = new CallManager();
export default CallManager;
