"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Head from "next/head";

// Components
import CallControls from "@/components/dashboard/CallControls";
import DialPad from "@/components/dashboard/DialPad";
import CallStatus from "@/components/dashboard/CallStatus";
import CallHistory from "@/components/dashboard/CallHistory";
import Analytics from "@/components/dashboard/Analytics";
import RecordingManager from "@/components/dashboard/RecordingManager";
import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";
import NotificationPermission from "@/components/NotificationPermission";

// Hooks
import { useNotifications } from "@/hooks/useNotifications";

// Call Manager
import { callManager } from "@/lib/callManager";

// Audio Processor (SimplePeer-based)
import { AudioProcessor, RecordingUploader } from "@/lib/audioProcessor";

export default function Dashboard() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("dialer");

  // Call state
  const [callStatus, setCallStatus] = useState("idle"); // idle, connecting, ringing, connected, disconnected, incoming
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [mode, setMode] = useState(null); // 'twilio' | 'webrtc'
  const [care4wId, setCare4wId] = useState(null);
  const [modeInfo, setModeInfo] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callError, setCallError] = useState(null);

  // Data
  const [callHistory, setCallHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  // Timer ref to avoid memory leaks
  const timerInterval = useRef(null);

  // Pending WebRTC call data
  const [pendingWebRTCCall, setPendingWebRTCCall] = useState(null);

  // Notifications
  const {
    isSupported: notificationsSupported,
    permission: notificationPermission,
    registerToken,
    unregisterToken,
  } = useNotifications({
    token,
    onIncomingCall: (callData) => {
      console.log("Incoming call notification received:", callData);
      setPhoneNumber(callData.from);
      setCallStatus("incoming");
    },
  });

  // Recording state
  const [recordings, setRecordings] = useState([]);
  const [currentRecording, setCurrentRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState(null);

  // Fetch recordings on mount
  useEffect(() => {
    if (token) {
      fetchRecordings();
    }
  }, [token]);

  const fetchRecordings = async () => {
    // Get token from state or localStorage as fallback
    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("careflow_token")
        : null);

    if (!authToken) {
      setRecordingError("Not authenticated");
      return;
    }

    try {
      const response = await fetch("/api/recordings", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setRecordings(data.data.recordings);
      } else {
        setRecordingError(data.error?.message || "Failed to load recordings");
      }
    } catch (error) {
      console.error("Error fetching recordings:", error);
      setRecordingError("Failed to load recordings");
    }
  };

  // Initialize Call Manager
  const initializeCallManager = useCallback(async () => {
    if (!token || !user) {
      console.log("Waiting for auth - token:", !!token, "user:", !!user);
      return;
    }

    try {
      console.log(
        "Initializing CallManager with token:",
        token?.substring(0, 20) + "...",
      );

      // Get care4wId from user profile or token response
      // For now, we'll get it from the token response
      const { mode: callMode, care4wId: cfId } = await callManager.initialize(
        token,
        user.care4wId || null,
      );

      setMode(callMode);
      setCare4wId(cfId);
      setModeInfo(callManager.getModeInfo());

      // Set up event listeners
      callManager.on("onCallStateChange", (status) => {
        console.log("Call state changed:", status);
        setCallStatus(status);
      });

      callManager.on("onIncomingCall", async (callData) => {
        console.log("Incoming call:", callData);
        setPhoneNumber(callData.from || callData.targetCare4wId);

        if (callData.mode === "webrtc") {
          // Store pending WebRTC call data
          setPendingWebRTCCall({
            roomId: callData.roomId,
            offer: callData.offer,
            from: callData.from,
          });
        }

        setCallStatus("incoming");
      });

      callManager.on("onError", (error) => {
        console.error("Call manager error:", error);
        setCallError(error.message || "An error occurred");
      });

      callManager.on("onCallEnded", () => {
        setPendingWebRTCCall(null);
      });

      console.log(`CallManager initialized in ${callMode} mode`);
    } catch (error) {
      console.error("Failed to initialize CallManager:", error);
      setCallError(error.message || "Failed to initialize call system");
    }
  }, [token, user]);

  // Call timer
  const startCallTimer = () => {
    setCallDuration(0);
    timerInterval.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    setCallDuration(0);
  };

  // Call actions
  const makeCall = useCallback(async () => {
    if (!phoneNumber) return;

    setCallError(null);

    try {
      await callManager.makeCall(phoneNumber);
    } catch (error) {
      console.error("Call failed:", error);
      setCallError(error.message);
      setCallStatus("idle");
    }
  }, [phoneNumber]);

  const hangupCall = useCallback(async () => {
    await callManager.endCall();
    setCallStatus("idle");
  }, []);

  const acceptCall = useCallback(async () => {
    if (mode === "twilio") {
      await callManager.acceptCall();
    } else if (mode === "webrtc" && pendingWebRTCCall) {
      try {
        await callManager.acceptWebRTCCall(
          pendingWebRTCCall.roomId,
          pendingWebRTCCall.offer,
        );
        setPendingWebRTCCall(null);
      } catch (error) {
        console.error("Failed to accept WebRTC call:", error);
        setCallError(error.message);
      }
    }
  }, [mode, pendingWebRTCCall]);

  const rejectCall = useCallback(async () => {
    await callManager.rejectCall();
    setPendingWebRTCCall(null);
    setCallStatus("idle");
  }, []);

  const toggleMute = useCallback(() => {
    const muted = callManager.toggleMute();
    setIsMuted(muted);
  }, []);

  const sendDigits = useCallback((digit) => {
    callManager.sendDigits(digit);
  }, []);

  // Recording state
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingSupported, setRecordingSupported] = useState(false);
  const recordingTimerInterval = useRef(null);
  const audioProcessorRef = useRef(null);
  const recordingUploaderRef = useRef(null);

  // Initialize audio processor for WebRTC calls
  useEffect(() => {
    if (mode === "webrtc" && token) {
      audioProcessorRef.current = new AudioProcessor({
        token,
        onCallState: (state) => {
          console.log("Audio processor call state:", state);
          if (state.status === "connected") {
            setCallStatus("connected");
            startCallTimer();
          } else if (state.status === "ended") {
            setCallStatus("idle");
            stopCallTimer();
          } else if (state.status === "error") {
            setCallError(state.error);
            setCallStatus("idle");
          }
        },
        onRecordingState: async (state) => {
          console.log("Recording state:", state);
          setIsRecording(state.isRecording);
          if (state.isRecording) {
            // Start recording timer
            setRecordingDuration(0);
            recordingTimerInterval.current = setInterval(() => {
              setRecordingDuration((prev) => prev + 1);
            }, 1000);
          } else {
            // Stop recording timer
            if (recordingTimerInterval.current) {
              clearInterval(recordingTimerInterval.current);
            }

            // Upload recording if available
            if (state.recording && recordingUploaderRef.current) {
              try {
                await recordingUploaderRef.current.uploadWithProgress(
                  state.recording,
                  (progress) => {
                    console.log("Upload progress:", progress);
                  },
                );
                // Refresh recordings list
                fetchRecordings();
              } catch (error) {
                console.error("Upload failed:", error);
                setRecordingError("Recording upload failed");
              }
            }
          }
        },
        onError: (error) => {
          console.error("Audio processor error:", error);
          setCallError(error.message);
        },
      });

      // Check recording support
      const checkRecordingSupport = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          stream.getTracks().forEach((track) => track.stop());
          setRecordingSupported(true);
        } catch (error) {
          console.error("Recording not supported:", error);
          setRecordingSupported(false);
        }
      };
      checkRecordingSupport();

      // Initialize uploader
      recordingUploaderRef.current = new RecordingUploader({
        token,
        onProgress: (progress) => console.log("Upload progress:", progress),
        onError: (error) => {
          console.error("Upload error:", error);
          setRecordingError(error.message);
        },
        onSuccess: (data) => {
          console.log("Upload success:", data);
        },
      });
    }

    return () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.destroy();
      }
      if (recordingTimerInterval.current) {
        clearInterval(recordingTimerInterval.current);
      }
    };
  }, [mode, token]);

  // Recording handlers
  const handleStartRecording = useCallback(async () => {
    if (audioProcessorRef.current) {
      try {
        await audioProcessorRef.current.startRecording();
      } catch (error) {
        console.error("Failed to start recording:", error);
        setRecordingError("Failed to start recording: " + error.message);
      }
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (audioProcessorRef.current) {
      const recording = await audioProcessorRef.current.stopRecording();
      return recording;
    }
    return null;
  }, []);

  // Fetch data
  const fetchCallHistory = async () => {
    if (!token) return;

    try {
      setHistoryError(null);
      const res = await fetch("/api/calls/history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error?.message || data.error || "Failed to fetch call history",
        );
      }
      const payload = data.data || data;
      setCallHistory(payload.calls || []);
    } catch (error) {
      console.error("Failed to fetch call history:", error);
      setHistoryError(error.message || "Failed to fetch call history");
    }
  };

  const fetchAnalytics = async () => {
    if (!token) return;

    try {
      setAnalyticsError(null);
      const res = await fetch("/api/analytics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error?.message || data.error || "Failed to fetch analytics",
        );
      }
      const payload = data.data || data;
      setAnalytics(payload.analytics || payload);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setAnalyticsError(error.message || "Failed to fetch analytics");
    }
  };

  useEffect(() => {
    if (user && token) {
      initializeCallManager();
      fetchCallHistory();
      fetchAnalytics();
    }
  }, [user, token, initializeCallManager]);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      callManager.destroy();
    };
  }, []);

  // Logout
  const handleLogout = async () => {
    await callManager.endCall();
    await unregisterToken();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-red"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <>
        <Head>
          <title>Dashboard | CareFlow</title>
        </Head>

        {/* Notification Permission Component */}
        {notificationsSupported && notificationPermission === "default" && (
          <NotificationPermission onTokenRegistered={registerToken} />
        )}

        <div className="min-h-screen bg-background-dark">
          {/* Header */}
          <header className="bg-background-card border-b border-white/10 px-6 py-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <h1 className="text-2xl font-bold text-white">CareFlow</h1>
              <div className="flex items-center gap-4">
                {mode && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${
                      mode === "twilio"
                        ? "border-blue-400/40 text-blue-300"
                        : "border-green-400/40 text-green-300"
                    }`}
                  >
                    {mode === "twilio" ? "Twilio" : "WebRTC"}
                  </span>
                )}
                {care4wId && (
                  <span className="text-xs text-gray-400">ID: {care4wId}</span>
                )}
                <span className="text-gray-400">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav className="bg-background-card border-b border-white/10 px-6 py-2">
            <div className="flex gap-4 max-w-7xl mx-auto">
              {["dialer", "history", "analytics"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                    activeTab === tab
                      ? "bg-primary-red text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-6 py-8">
            {activeTab === "dialer" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Dialer */}
                <div className="space-y-6">
                  <CallStatus
                    status={callStatus}
                    duration={callDuration}
                    phoneNumber={phoneNumber}
                    error={callError}
                  />

                  <DialPad
                    phoneNumber={phoneNumber}
                    setPhoneNumber={setPhoneNumber}
                    onDigitPress={sendDigits}
                    disabled={callStatus === "connected"}
                    placeholder={modeInfo?.placeholder}
                    helpText={modeInfo?.helpText}
                  />

                  <CallControls
                    callStatus={callStatus}
                    onCall={makeCall}
                    onHangup={hangupCall}
                    onAccept={acceptCall}
                    onReject={rejectCall}
                    onMute={toggleMute}
                    isMuted={isMuted}
                    isRecording={isRecording}
                    isRecordingSupported={recordingSupported}
                    recordingDuration={recordingDuration}
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                  />
                </div>

                {/* Quick Stats */}
                <div className="bg-background-card rounded-xl border border-white/10 p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Quick Stats
                  </h2>
                  {analytics ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-background-input rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Total Calls</p>
                        <p className="text-2xl font-bold text-white">
                          {analytics.totalCalls || 0}
                        </p>
                      </div>
                      <div className="bg-background-input rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Total Duration</p>
                        <p className="text-2xl font-bold text-white">
                          {Math.round((analytics.totalDuration || 0) / 60)} min
                        </p>
                      </div>
                      <div className="bg-background-input rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Success Rate</p>
                        <p className="text-2xl font-bold text-green-400">
                          {analytics.successRate || 0}%
                        </p>
                      </div>
                      <div className="bg-background-input rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Today's Calls</p>
                        <p className="text-2xl font-bold text-white">
                          {analytics.todayCalls || 0}
                        </p>
                      </div>
                    </div>
                  ) : analyticsError ? (
                    <div className="text-red-400 text-sm">{analyticsError}</div>
                  ) : (
                    <div className="text-gray-400">Loading stats...</div>
                  )}

                  {/* Mode Info */}
                  {modeInfo && (
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">
                        Current Mode
                      </h3>
                      <p className="text-white font-medium">
                        {modeInfo.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {modeInfo.helpText}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-4">
                {historyError && (
                  <div className="text-red-400 text-sm">{historyError}</div>
                )}
                <CallHistory calls={callHistory} onRefresh={fetchCallHistory} />
              </div>
            )}

            {activeTab === "analytics" && (
              <Analytics data={analytics} onRefresh={fetchAnalytics} />
            )}

            {activeTab === "recordings" && (
              <div className="space-y-4">
                {recordingError && (
                  <div className="text-red-400 text-sm">{recordingError}</div>
                )}
                <RecordingManager
                  recordings={recordings}
                  currentRecording={currentRecording}
                  isRecording={isRecording}
                  onRefresh={fetchRecordings}
                />
              </div>
            )}
          </main>
        </div>
      </>
    </ProtectedRoute>
  );
}
