import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Device } from "@twilio/voice-sdk";
import Head from "next/head";

// Components
import CallControls from "@/components/dashboard/CallControls";
import DialPad from "@/components/dashboard/DialPad";
import CallStatus from "@/components/dashboard/CallStatus";
import CallHistory from "@/components/dashboard/CallHistory";
import Analytics from "@/components/dashboard/Analytics";
import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";
import NotificationPermission from "@/components/NotificationPermission";

// Hooks
import { useNotifications } from "@/hooks/useNotifications";

export default function Dashboard() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("dialer");

  // Call state
  const [device, setDevice] = useState(null);
  const [connection, setConnection] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callStatus, setCallStatus] = useState("idle"); // idle, connecting, ringing, connected, disconnected
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Data
  const [callHistory, setCallHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  // Timer ref to avoid memory leaks
  const timerInterval = useRef(null);

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
      // Handle incoming call from notification
      setPhoneNumber(callData.from);
      setCallStatus("incoming");
    },
  });

  // Initialize Twilio Device
  const initializeTwilioDevice = async () => {
    if (!token) return;

    try {
      const tokenRes = await fetch("/api/token", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const { token: twilioToken } = await tokenRes.json();

      const twilioDevice = new Device(twilioToken, {
        codecPreferences: ["opus", "pcmu"],
        fakeLocalDTMF: true,
        enableRingingState: true,
      });

      twilioDevice.on("ready", () => {
        console.log("Twilio device ready");
        setCallStatus("ready");
      });

      twilioDevice.on("error", (error) => {
        console.error("Twilio device error:", error);
        setCallStatus("error");
      });

      twilioDevice.on("connect", (conn) => {
        setConnection(conn);
        setCallStatus("connected");
        startCallTimer();
      });

      twilioDevice.on("disconnect", () => {
        setConnection(null);
        setCallStatus("disconnected");
        stopCallTimer();
        fetchCallHistory();
      });

      twilioDevice.on("incoming", (conn) => {
        setConnection(conn);
        setCallStatus("incoming");
        setPhoneNumber(conn.parameters.From);
      });

      setDevice(twilioDevice);
    } catch (error) {
      console.error("Failed to initialize Twilio device:", error);
    }
  };

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
  const makeCall = useCallback(() => {
    if (!device || !phoneNumber) return;

    const params = {
      To: phoneNumber,
    };

    const conn = device.connect(params);
    setConnection(conn);
    setCallStatus("connecting");
  }, [device, phoneNumber]);

  const hangupCall = useCallback(() => {
    if (connection) {
      connection.disconnect();
    }
    if (device) {
      device.disconnectAll();
    }
    setCallStatus("disconnected");
  }, [connection, device]);

  const acceptCall = useCallback(() => {
    if (connection) {
      connection.accept();
      setCallStatus("connected");
      startCallTimer();
    }
  }, [connection]);

  const rejectCall = useCallback(() => {
    if (connection) {
      connection.reject();
    }
    setCallStatus("idle");
  }, [connection]);

  const toggleMute = useCallback(() => {
    if (connection) {
      connection.mute(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [connection, isMuted]);

  const sendDigits = useCallback(
    (digit) => {
      if (connection) {
        connection.sendDigits(digit);
      }
    },
    [connection],
  );

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
      initializeTwilioDevice();
      fetchCallHistory();
      fetchAnalytics();
    }
  }, [user, token]);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  // Logout
  const handleLogout = async () => {
    if (connection) {
      connection.disconnect();
    }
    if (device) {
      device.disconnectAll();
    }
    // Unregister notification token on logout
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
                  />

                  <DialPad
                    phoneNumber={phoneNumber}
                    setPhoneNumber={setPhoneNumber}
                    onDigitPress={sendDigits}
                    disabled={callStatus === "connected"}
                  />

                  <CallControls
                    callStatus={callStatus}
                    onCall={makeCall}
                    onHangup={hangupCall}
                    onAccept={acceptCall}
                    onReject={rejectCall}
                    onMute={toggleMute}
                    isMuted={isMuted}
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
          </main>
        </div>
      </>
    </ProtectedRoute>
  );
}
