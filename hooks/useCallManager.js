/**
 * useCallManager Hook
 * Manages call manager initialization, event listeners, and actions
 * Following separation of concerns - side effects and business logic
 */

import { useEffect, useCallback, useRef, useMemo } from "react";
import { useCallState } from "./useCallState";
import { useAuth } from "@/context/AuthContext";
import { callManager } from "@/lib/callManager";

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
    setConnected,
    setDisconnected,
    setConnecting,
    setIncoming,
    resetCallState,
    updateCallDuration,
  } = useCallState();

  const initializedRef = useRef(false);
  const timerIntervalRef = useRef(null);
  const eventListenersRef = useRef(null);

  // Memoized event handlers to maintain reference stability
  const eventHandlers = useMemo(
    () => ({
      handleStateChange: (status) => {
        console.log("Call state changed:", status);
        setCallStatus(status);

        // Handle timer
        if (status === "connected") {
          startCallTimer();
        } else if (status === "disconnected" || status === "idle") {
          stopCallTimer();
        }
      },
      handleIncomingCall: (callData) => {
        console.log("Incoming call:", callData);
        setPhoneNumber(callData.from || callData.targetCare4wId);

        if (callData.mode === "webrtc") {
          setPendingWebRTCCall({
            roomId: callData.roomId,
            offer: callData.offer,
            from: callData.from,
          });
        }

        setIncoming(callData.from || callData.targetCare4wId);
      },
      handleError: (error) => {
        console.error("Call manager error:", error);
        setCallError(error.message || "An error occurred");
      },
      handleCallEnded: () => {
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
    if (!token || !user || initializedRef.current) {
      return;
    }

    const initialize = async () => {
      try {
        console.log("Initializing CallManager...");

        const { mode: callMode, care4wId: cfId } = await callManager.initialize(
          token,
          user.care4wId || null,
        );

        setMode(callMode);
        setCare4wId(cfId);
        setModeInfo(callManager.getModeInfo());

        // Register event listeners with memoized handlers
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
        console.log(`CallManager initialized in ${callMode} mode`);
      } catch (error) {
        console.error("Failed to initialize CallManager:", error);
        setCallError(error.message || "Failed to initialize call system");
      }
    };

    initialize();

    // Cleanup function
    return () => {
      if (initializedRef.current && eventListenersRef.current) {
        console.log("Cleaning up CallManager...");
        callManager.off("onCallStateChange");
        callManager.off("onIncomingCall");
        callManager.off("onError");
        callManager.off("onCallEnded");
        callManager.disconnect();
        initializedRef.current = false;
        eventListenersRef.current = null;
        stopCallTimer();
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
  ]);

  // Memoize timer functions
  const startCallTimer = useCallback(() => {
    updateCallDuration(0);
    timerIntervalRef.current = setInterval(() => {
      updateCallDuration((prev) => prev + 1);
    }, 1000);
  }, [updateCallDuration]);

  const stopCallTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    updateCallDuration(0);
  }, [updateCallDuration]);

  // Call actions - memoized for stability
  const makeCall = useCallback(
    async (number) => {
      if (!number) {
        setCallError("Phone number is required");
        return;
      }

      setCallError(null);
      setConnecting();

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
    [setCallError, setConnecting, setCallStatus],
  );

  const hangupCall = useCallback(async () => {
    await callManager.endCall();
    resetCallState();
  }, [resetCallState]);

  const acceptCall = useCallback(async () => {
    // Check if this is a WebRTC incoming call
    if (pendingWebRTCCall && pendingWebRTCCall.roomId) {
      // Use WebRTC accept path
      try {
        await callManager.acceptWebRTCCall(
          pendingWebRTCCall.roomId,
          pendingWebRTCCall.offer,
        );
        setPendingWebRTCCall(null);
        return;
      } catch (error) {
        console.error("Failed to accept WebRTC call:", error);
        setCallError(error.message);
        resetCallState();
        throw error;
      }
    }

    setConnecting();

    try {
      await callManager.acceptCall();
    } catch (error) {
      console.error("Failed to accept call:", error);
      setCallError(error.message);
      resetCallState();
      throw error;
    }
  }, [
    setConnecting,
    setCallError,
    resetCallState,
    pendingWebRTCCall,
    setPendingWebRTCCall,
  ]);

  const acceptWebRTCCall = useCallback(async () => {
    setConnecting();

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
    setConnecting,
    setCallError,
    setPendingWebRTCCall,
    resetCallState,
    pendingWebRTCCall,
  ]);

  const rejectCall = useCallback(async () => {
    await callManager.rejectCall();
    setPendingWebRTCCall(null);
    resetCallState();
  }, [resetCallState, setPendingWebRTCCall]);

  const toggleMute = useCallback(() => {
    const muted = callManager.toggleMute();
    // The muted state is updated via the event listener
  }, []);

  const sendDigits = useCallback((digit) => {
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
 *专门处理拨打电话的逻辑
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
