/**
 * Dialer Tab Component
 * Pure presentation component for the dialer functionality
 *
 * IMPROVEMENTS:
 * - Added connection state display
 * - Added retry functionality for failed initialization
 * - Better loading states
 * - Added care4Id display with copy-to-clipboard
 * - Added authentication status display
 * - Added WebRTC/Twilio service status indicators
 */

import { useCallback, useState } from 'react';
import CallStatus, { ConnectionStatusBadge } from '@/components/dashboard/CallStatus';
import CallControls from '@/components/dashboard/CallControls';
import DialPad from '@/components/dashboard/DialPad';
import { CardSkeleton } from '@/components/common/Loading/LoadingComponents';

export default function DialerTab({
  callManager,
  audioRecorder,
  analytics,
  analyticsError,
  analyticsLoading,
  // Auth state props
  user,
  authLoading,
}) {
  const {
    callStatus,
    callDuration,
    phoneNumber,
    callError,
    isMuted,
    connectionState,
    retryInitialization,
    care4wId,
  } = callManager;

  // Determine authentication status
  const isAuthenticated = !!user;
  const authLoadingState = authLoading && !user;

  // Build service status object for the CallStatus component
  const serviceStatus = connectionState
    ? {
        mode: connectionState.message?.includes('twilio')
          ? 'twilio'
          : connectionState.message?.includes('webrtc')
            ? 'webrtc'
            : callManager.mode || 'unknown',
        status: connectionState.state,
        message: connectionState.message,
      }
    : null;

  // Local state for dialed number - controls the DialPad input
  const [dialedNumber, setDialedNumber] = useState('');

  const handleMakeCall = useCallback(
    (number) => {
      callManager.makeCall(number || dialedNumber);
    },
    [callManager, dialedNumber]
  );

  const handleHangup = useCallback(() => {
    callManager.hangupCall();
    setDialedNumber('');
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

  const handleDTMF = useCallback(
    (digit) => {
      callManager.sendDigits(digit);
    },
    [callManager]
  );

  const handleStartRecording = useCallback(async () => {
    await audioRecorder.startRecording();
  }, [audioRecorder]);

  const handleStopRecording = useCallback(async () => {
    await audioRecorder.stopRecording();
  }, [audioRecorder]);

  const handleRetry = useCallback(() => {
    if (retryInitialization) {
      retryInitialization();
    }
  }, [retryInitialization]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show loading state during initialization
  if (connectionState?.isInitializing && !analyticsLoading) {
    return (
      <div className="dialer-tab">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Initialization Status */}
            <div className="bg-background-card rounded-xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-red" />
                <h2 className="text-xl font-semibold text-white">Initializing Call System</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                {connectionState.message || 'Please wait while we set up the call system...'}
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-red h-2 rounded-full animate-pulse"
                  style={{ width: '60%' }}
                />
              </div>
            </div>
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
          {/* Connection Status Badge (for failed/initializing states) */}
          {connectionState && connectionState.state !== 'ready' && (
            <div className="mb-2">
              <ConnectionStatusBadge connectionState={connectionState} />
            </div>
          )}

          {/* Call Status */}
          <CallStatus
            status={callStatus}
            duration={callDuration}
            phoneNumber={phoneNumber}
            error={callError}
            connectionState={connectionState}
            onRetry={handleRetry}
            care4Id={care4wId}
            isAuthenticated={isAuthenticated}
            authLoading={authLoadingState}
            serviceStatus={serviceStatus}
          />

          {/* Dial Pad */}
          <DialPad
            phoneNumber={dialedNumber}
            setPhoneNumber={setDialedNumber}
            disabled={callStatus === 'connected' || connectionState?.state === 'initializing'}
          />

          {/* Call Controls */}
          <CallControls
            callStatus={callStatus}
            onCall={handleMakeCall}
            onHangup={handleHangup}
            onAccept={handleAccept}
            onReject={handleReject}
            onMute={handleMute}
            onDTMF={handleDTMF}
            isMuted={isMuted}
            isRecording={audioRecorder.isRecording}
            isRecordingSupported={audioRecorder.recordingSupported}
            recordingDuration={audioRecorder.recordingDuration}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            disabled={connectionState?.state === 'initializing'}
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
                  <p className="stat-value success">{analytics.successRate || 0}%</p>
                </div>
                <div className="stat-item">
                  <p className="stat-label">Today's Calls</p>
                  <p className="stat-value">{analytics.todayCalls || 0}</p>
                </div>
              </div>

              {/* Call Mode Info */}
              {connectionState && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-gray-400 text-sm mb-2">Call Mode</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        connectionState.state === 'ready'
                          ? 'bg-green-400'
                          : connectionState.state === 'failed'
                            ? 'bg-red-400'
                            : 'bg-yellow-400'
                      }`}
                    />
                    <span className="text-white text-sm capitalize">
                      {connectionState.state === 'ready' ? 'Ready' : connectionState.state}
                    </span>
                  </div>
                </div>
              )}
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
