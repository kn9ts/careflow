/**
 * Dialer Tab Component
 * Pure presentation component for the dialer functionality
 */

import { useCallback, useState } from "react";
import CallStatus from "@/components/dashboard/CallStatus";
import CallControls from "@/components/dashboard/CallControls";
import DialPad from "@/components/dashboard/DialPad";
import { CardSkeleton } from "@/components/common/Loading/LoadingComponents";

export default function DialerTab({
  callManager,
  audioRecorder,
  analytics,
  analyticsError,
  analyticsLoading,
}) {
  const { callStatus, callDuration, phoneNumber, callError, isMuted } =
    callManager;

  // Local state for dialed number - controls the DialPad input
  const [dialedNumber, setDialedNumber] = useState("");

  const handleMakeCall = useCallback(
    (number) => {
      callManager.makeCall(number || dialedNumber);
    },
    [callManager, dialedNumber],
  );

  const handleHangup = useCallback(() => {
    callManager.hangupCall();
    setDialedNumber("");
  }, [callManager]);

  const handleAccept = useCallback(() => {
    callManager.acceptCall();
  }, [callManager]);

  const handleReject = useCallback(() => {
    callManager.rejectCall();
  }, [callManager]);

  const handleMute = useCallback(() => {
    callManager.toggleMute();
  }, [callManager]);

  const handleStartRecording = useCallback(async () => {
    await audioRecorder.startRecording();
  }, [audioRecorder]);

  const handleStopRecording = useCallback(async () => {
    await audioRecorder.stopRecording();
  }, [audioRecorder]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (analyticsLoading) {
    return (
      <div className="dialer-tab">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <CardSkeleton />
        </div>

        <style jsx>{`
          .dialer-tab {
            padding: 1rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dialer-tab">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Call Controls */}
        <div className="space-y-6">
          {/* Call Status */}
          <CallStatus
            status={callStatus}
            duration={callDuration}
            phoneNumber={phoneNumber}
            error={callError}
          />

          {/* Dial Pad */}
          <DialPad
            phoneNumber={dialedNumber}
            setPhoneNumber={setDialedNumber}
            disabled={callStatus === "connected"}
          />

          {/* Call Controls */}
          <CallControls
            callStatus={callStatus}
            onCall={handleMakeCall}
            onHangup={handleHangup}
            onAccept={handleAccept}
            onReject={handleReject}
            onMute={handleMute}
            isMuted={isMuted}
            isRecording={audioRecorder.isRecording}
            isRecordingSupported={audioRecorder.recordingSupported}
            recordingDuration={audioRecorder.recordingDuration}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        </div>

        {/* Right Column - Quick Stats */}
        <div className="quick-stats-card">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Stats</h2>

          {analyticsError ? (
            <div className="text-red-400 text-sm">{analyticsError}</div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="stat-item">
                  <p className="stat-label">Total Calls</p>
                  <p className="stat-value">{analytics.totalCalls || 0}</p>
                </div>
                <div className="stat-item">
                  <p className="stat-label">Total Duration</p>
                  <p className="stat-value">
                    {Math.round((analytics.totalDuration || 0) / 60)} min
                  </p>
                </div>
                <div className="stat-item">
                  <p className="stat-label">Success Rate</p>
                  <p className="stat-value success">
                    {analytics.successRate || 0}%
                  </p>
                </div>
                <div className="stat-item">
                  <p className="stat-label">Today's Calls</p>
                  <p className="stat-value">{analytics.todayCalls || 0}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-400">Loading stats...</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .dialer-tab {
          padding: 1rem;
        }

        .quick-stats-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .stat-item {
          background: #0f172a;
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .stat-label {
          color: #94a3b8;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .stat-value.success {
          color: #4ade80;
        }
      `}</style>
    </div>
  );
}
