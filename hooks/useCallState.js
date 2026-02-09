/**
 * useCallState Hook
 * Manages all call-related local state
 * Following separation of concerns - state management only, no side effects
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { logger } from "@/lib/logger";

const CallStateContext = createContext(null);

export function CallStateProvider({ children }) {
  logger.init("useCallState");

  // Core call state
  const [callStatus, setCallStatus] = useState("idle"); // idle, connecting, ringing, connected, disconnected, incoming, ready
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [mode, setMode] = useState(null); // 'twilio' | 'webrtc'
  const [care4wId, setCare4wId] = useState(null);
  const [modeInfo, setModeInfo] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callError, setCallError] = useState(null);

  // WebRTC specific state
  const [pendingWebRTCCall, setPendingWebRTCCall] = useState(null);

  // Memoized callbacks to prevent unnecessary re-renders
  const resetCallState = useCallback(() => {
    logger.debug("useCallState", "Resetting call state");
    setCallStatus("idle");
    setCallDuration(0);
    setIsMuted(false);
    setPhoneNumber("");
    setCallError(null);
    setPendingWebRTCCall(null);
  }, []);

  const setConnected = useCallback(() => {
    logger.success("useCallState", "Status: connected");
    setCallStatus("connected");
    setCallError(null);
  }, []);

  const setDisconnected = useCallback(() => {
    logger.debug("useCallState", "Status: disconnected");
    setCallStatus("disconnected");
  }, []);

  const setConnecting = useCallback(() => {
    logger.loading("useCallState", "Status: connecting...");
    setCallStatus("connecting");
    setCallError(null);
  }, []);

  const setRinging = useCallback(() => {
    logger.debug("useCallState", "Status: ringing");
    setCallStatus("ringing");
  }, []);

  const setIncoming = useCallback((fromNumber) => {
    logger.incomingCall("useCallState", fromNumber);
    setCallStatus("incoming");
    setPhoneNumber(fromNumber);
  }, []);

  const setReady = useCallback(() => {
    logger.success("useCallState", "Status: ready");
    setCallStatus("ready");
  }, []);

  const setIdle = useCallback(() => {
    logger.debug("useCallState", "Status: idle");
    setCallStatus("idle");
  }, []);

  const toggleMuted = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const updateCallDuration = useCallback((duration) => {
    setCallDuration(duration);
  }, []);

  // Computed values - memoized
  const isCallActive = useMemo(() => callStatus === "connected", [callStatus]);

  const isIncomingCall = useMemo(() => callStatus === "incoming", [callStatus]);

  const isCalling = useMemo(
    () => callStatus === "connecting" || callStatus === "ringing",
    [callStatus],
  );

  const isReady = useMemo(
    () => callStatus === "ready" || callStatus === "idle",
    [callStatus],
  );

  // Memoized value object - only recomputes when actual state changes
  const value = useMemo(
    () => ({
      // State
      callStatus,
      callDuration,
      isMuted,
      mode,
      care4wId,
      modeInfo,
      phoneNumber,
      callError,
      pendingWebRTCCall,

      // Computed
      isCallActive,
      isIncomingCall,
      isCalling,
      isReady,

      // Setters
      setCallStatus,
      setCallDuration,
      setIsMuted,
      setMode,
      setCare4wId,
      setModeInfo,
      setPhoneNumber,
      setCallError,
      setPendingWebRTCCall,

      // Actions
      resetCallState,
      setConnected,
      setDisconnected,
      setConnecting,
      setRinging,
      setIncoming,
      setReady,
      setIdle,
      toggleMuted,
      updateCallDuration,
    }),
    [
      callStatus,
      callDuration,
      isMuted,
      mode,
      care4wId,
      modeInfo,
      phoneNumber,
      callError,
      pendingWebRTCCall,
      isCallActive,
      isIncomingCall,
      isCalling,
      isReady,
      resetCallState,
      setConnected,
      setDisconnected,
      setConnecting,
      setRinging,
      setIncoming,
      setReady,
      setIdle,
      toggleMuted,
      updateCallDuration,
    ],
  );

  return (
    <CallStateContext.Provider value={value}>
      {children}
    </CallStateContext.Provider>
  );
}

export function useCallState() {
  const context = useContext(CallStateContext);
  if (!context) {
    throw new Error("useCallState must be used within a CallStateProvider");
  }
  return context;
}

// Utility function for formatting call duration
export function formatCallDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Utility function for getting status text
export function getStatusText(status) {
  const statusMap = {
    idle: "Ready to make calls",
    connecting: "Connecting...",
    ringing: "Ringing...",
    connected: "Connected",
    disconnected: "Call ended",
    incoming: "Incoming call",
    ready: "Ready",
  };
  return statusMap[status] || "Status unknown";
}

// Utility function for getting status color class
export function getStatusColor(status) {
  const colorMap = {
    idle: "text-green-400",
    connecting: "text-yellow-400",
    ringing: "text-blue-400",
    connected: "text-green-400",
    disconnected: "text-gray-400",
    incoming: "text-red-400",
    ready: "text-blue-400",
  };
  return colorMap[status] || "text-gray-400";
}
