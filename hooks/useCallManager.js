/**
 * useCallManager Hook
 * Manages call manager initialization, event listeners, and actions
 * Following separation of concerns - side effects and business logic
 */

import { useEffect, useCallback, useRef, useMemo } from "react";
import { useCallState } from "./useCallState";
import { useAuth } from "@/context/AuthContext";
import { callManager } from "@/lib/callManager";
import { logger } from "@/lib/logger";

export function useCallManager() {
  const { token, user } = useAuth();
  const {
    setCallStatus,
    setMode,
    setCare4wId,
    setModeInfo,
    setPhoneNumber,
    setCallError,
    setPendingWebRTCCall,
    pendingWebRTCCall,
    setIncoming,
    resetCallState,
    updateCallDuration,
  } = useCallState();

  const initializedRef = useRef(false);
  const timerIntervalRef = useRef(null);
  const eventListenersRef = useRef(null);

  // Timer functions - defined before useMemo that depends on them
  const startCallTimer = useCallback(() => {
    logger.loading("useCallManager", "Starting call timer...");
    updateCallDuration(0);
    timerIntervalRef.current = setInterval(() => {
      updateCallDuration((prev) => prev + 1);
    }, 1000);
  }, [updateCallDuration]);

  const stopCallTimer = useCallback(() => {
    logger.debug("useCallManager", "Stopping call timer");
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    updateCallDuration(0);
  }, [updateCallDuration]);

  // Memoized event handlers - defined after timer functions they reference
  const eventHandlers = useMemo(
    () => ({
      handleStateChange: (status) => {
        logger.trace("useCallManager", `Call state changed: ${status}`);
        setCallStatus(status);

        // Handle timer
        if (status === "connected") {
          startCallTimer();
        } else if (status === "disconnected" || status === "idle") {
          stopCallTimer();
        }
      },
      handleIncomingCall: (callData) => {
        logger.incomingCall(
          "useCallManager",
          callData.from || callData.targetCare4wId,
        );
        setPhoneNumber(callData.from || callData.targetCare4wId);

        if (callData.mode === "webrtc") {
          logger.debug("useCallManager", "Pending WebRTC call setup");
          setPendingWebRTCCall({
            roomId: callData.roomId,
            offer: callData.offer,
            from: callData.from,
          });
        }

        setIncoming(callData.from || callData.targetCare4wId);
      },
      handleError: (error) => {
        logger.error("useCallManager", `Call manager error: ${error.message}`);
        setCallError(error.message || "An error occurred");
      },
      handleCallEnded: () => {
        logger.debug("useCallManager", "Call ended - cleaning up");
        setPendingWebRTCCall(null);
        stopCallTimer();
      },
    }),
    [
      setCallStatus,
      setPhoneNumber,
      setPendingWebRTCCall,
      setIncoming,
      setCallError,
      startCallTimer,
      stopCallTimer,
    ],
  );

  // Initialize call manager
  useEffect(() => {
    logger.init("useCallManager");

    if (!token || !user) {
      logger.warn(
        "useCallManager",
        "No token or user - skipping initialization",
      );
      return;
    }

    if (initializedRef.current) {
      logger.debug("useCallManager", "Already initialized - skipping");
      return;
    }

    const initialize = async () => {
      try {
        logger.loading("useCallManager", "Initializing call manager...");

        const { mode: callMode, care4wId: cfId } = await callManager.initialize(
          token,
          user.care4wId || null,
        );

        logger.success("useCallManager", `Mode determined: ${callMode}`);

        setMode(callMode);
        setCare4wId(cfId);
        setModeInfo(callManager.getModeInfo());

        // Register event listeners with memoized handlers
        logger.loading("useCallManager", "Registering event listeners...");
        callManager.on("onCallStateChange", eventHandlers.handleStateChange);
        callManager.on("onIncomingCall", eventHandlers.handleIncomingCall);
        callManager.on("onError", eventHandlers.handleError);
        callManager.on("onCallEnded", eventHandlers.handleCallEnded);

        // Store listeners for cleanup
        eventListenersRef.current = {
          onCallStateChange: eventHandlers.handleStateChange,
          onIncomingCall: eventHandlers.handleIncomingCall,
          onError: eventHandlers.handleError,
          onCallEnded: eventHandlers.handleCallEnded,
        };

        initializedRef.current = true;
        logger.ready("useCallManager", "Initialization complete!");
      } catch (error) {
        logger.error(
          "useCallManager",
          `Failed to initialize: ${error.message}`,
        );
        setCallError(error.message || "Failed to initialize call system");
      }
    };

    initialize();

    // Cleanup function
    return () => {
      if (initializedRef.current && eventListenersRef.current) {
        logger.loading("useCallManager", "Cleaning up...");
        callManager.off("onCallStateChange");
        callManager.off("onIncomingCall");
        callManager.off("onError");
        callManager.off("onCallEnded");
        callManager.disconnect();
        initializedRef.current = false;
        eventListenersRef.current = null;
        stopCallTimer();
        logger.complete("useCallManager");
      }
    };
  }, [
    token,
    user,
    setMode,
    setCare4wId,
    setModeInfo,
    setPhoneNumber,
    setCallError,
    setPendingWebRTCCall,
    setIncoming,
    eventHandlers,
    setCallStatus,
    stopCallTimer,
  ]);

  // Call actions - memoized for stability
  const makeCall = useCallback(
    async (number) => {
      if (!number) {
        setCallError("Phone number is required");
        return;
      }

      setCallError(null);
      setCallStatus("connecting");

      // Wait for initialization if in progress
      if (callManager._initializationPromise) {
        await callManager._initializationPromise;
      }

      // Check if initialized after waiting
      if (!callManager._initialized || !callManager.mode) {
        setCallError(
          "Call system not initialized. Please wait a moment and try again.",
        );
        setCallStatus("idle");
        return;
      }

      try {
        await callManager.makeCall(number);
      } catch (error) {
        console.error("Call failed:", error);
        setCallError(error.message);
        setCallStatus("idle");
        throw error;
      }
    },
    [setCallError, setCallStatus],
  );

  const hangupCall = useCallback(async () => {
    logger.debug("useCallManager", "Hanging up call...");
    await callManager.endCall();
    resetCallState();
  }, [resetCallState]);

  const acceptCall = useCallback(async () => {
    // Check if this is a WebRTC incoming call
    if (pendingWebRTCCall && pendingWebRTCCall.roomId) {
      // Use WebRTC accept path
      try {
        logger.loading("useCallManager", "Accepting WebRTC call...");
        await callManager.acceptWebRTCCall(
          pendingWebRTCCall.roomId,
          pendingWebRTCCall.offer,
        );
        setPendingWebRTCCall(null);
        logger.callConnect("useCallManager");
        return;
      } catch (error) {
        logger.error(
          "useCallManager",
          `WebRTC accept failed: ${error.message}`,
        );
        setCallError(error.message);
        resetCallState();
        throw error;
      }
    }

    setCallStatus("connecting");

    try {
      logger.loading("useCallManager", "Accepting call...");
      await callManager.acceptCall();
    } catch (error) {
      logger.error("useCallManager", `Accept failed: ${error.message}`);
      setCallError(error.message);
      resetCallState();
      throw error;
    }
  }, [
    setCallStatus,
    setCallError,
    resetCallState,
    pendingWebRTCCall,
    setPendingWebRTCCall,
  ]);

  const acceptWebRTCCall = useCallback(async () => {
    setCallStatus("connecting");

    try {
      await callManager.acceptWebRTCCall(
        pendingWebRTCCall.roomId,
        pendingWebRTCCall.offer,
      );
      setPendingWebRTCCall(null);
    } catch (error) {
      console.error("Failed to accept WebRTC call:", error);
      setCallError(error.message);
      resetCallState();
      throw error;
    }
  }, [
    setCallStatus,
    setCallError,
    setPendingWebRTCCall,
    resetCallState,
    pendingWebRTCCall,
  ]);

  const rejectCall = useCallback(async () => {
    logger.warn("useCallManager", "Rejecting call");
    await callManager.rejectCall();
    setPendingWebRTCCall(null);
    resetCallState();
  }, [resetCallState, setPendingWebRTCCall]);

  const toggleMute = useCallback(() => {
    const muted = callManager.toggleMute();
    logger.debug("useCallManager", `Mute toggled: ${muted}`);
    // The muted state is updated via the event listener
  }, []);

  const sendDigits = useCallback((digit) => {
    logger.debug("useCallManager", `Sending DTMF: ${digit}`);
    callManager.sendDigits(digit);
  }, []);

  // Expose the call manager instance for advanced use cases
  const getCallManager = useCallback(() => callManager, []);

  return {
    // Actions
    makeCall,
    hangupCall,
    acceptCall,
    acceptWebRTCCall,
    rejectCall,
    toggleMute,
    sendDigits,

    // Utilities
    startCallTimer,
    stopCallTimer,
    getCallManager,

    // Event triggers for external components
    triggerCallStateChange: (status) => setCallStatus(status),
  };
}

/**
 * useOutgoingCall Hook
 * Handles outgoing call logic
 */
export function useOutgoingCall() {
  const { token } = useAuth();
  const {
    phoneNumber,
    setPhoneNumber,
    callStatus,
    setCallStatus,
    setCallError,
  } = useCallState();

  const callManagerRef = useRef(null);

  const dial = useCallback(
    async (number) => {
      if (!number) {
        setCallError("Phone number is required");
        return { success: false, error: "Phone number is required" };
      }

      setPhoneNumber(number);
      setCallStatus("connecting");
      setCallError(null);

      try {
        await callManager.makeCall(number);
        return { success: true };
      } catch (error) {
        setCallError(error.message);
        setCallStatus("idle");
        return { success: false, error: error.message };
      }
    },
    [setPhoneNumber, setCallStatus, setCallError],
  );

  const clearNumber = useCallback(() => {
    setPhoneNumber("");
  }, [setPhoneNumber]);

  const appendDigit = useCallback(
    (digit) => {
      setPhoneNumber((prev) => prev + digit);
    },
    [setPhoneNumber],
  );

  const backspace = useCallback(() => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  }, [setPhoneNumber]);

  return {
    phoneNumber,
    callStatus,
    dial,
    clearNumber,
    appendDigit,
    backspace,
    setPhoneNumber,
  };
}
