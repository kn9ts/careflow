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
 * - Integrated InitializationStatus component for real-time progress
 */

'use client';

import { useCallback, useState } from 'react';
import CallStatus, { ConnectionStatusBadge } from '@/components/dashboard/CallStatus';
import CallControls from '@/components/dashboard/CallControls';
import DialPad from '@/components/dashboard/DialPad';
import InitializationStatus, {
  InitializationStatusInline,
} from '@/components/dashboard/InitializationStatus';
import QuickStats from '@/components/dashboard/QuickStats';
import { CardSkeleton } from '@/components/common/Loading/LoadingComponents';
import {
  useInitializationState,
  useCallManager,
  useAudioRecorder,
  useAuth,
  useAnalytics,
} from '@/hooks';
import { InitErrorCode, ServiceState } from '@/lib/initializationStateManager';
import styles from './DialerTab.module.css';

export default function DialerTab({
  analytics: propAnalytics,
  analyticsError: propAnalyticsError,
  analyticsLoading: propAnalyticsLoading,
  onRefreshAnalytics: propOnRefreshAnalytics,
}) {
  // Use hooks to get call manager, audio recorder, and auth state
  const callManager = useCallManager();
  const audioRecorder = useAudioRecorder();
  const { user, loading: authLoading, token: authToken } = useAuth();

  // Get analytics data - pass the auth token
  const {
    analytics: hookAnalytics,
    error: analyticsError,
    loading: analyticsLoading,
    refresh: onRefreshAnalytics,
  } = useAnalytics(authToken);

  // Use props if provided, otherwise use hooks
  const analytics = propAnalytics ?? hookAnalytics;
  const analyticsLoadingFinal = propAnalyticsLoading ?? analyticsLoading;
  const analyticsErrorFinal = propAnalyticsError ?? analyticsError;
  const onRefreshAnalyticsFinal = propOnRefreshAnalytics ?? onRefreshAnalytics;

  // Get call manager state (handle case where it might be null)
  const callStatus = callManager?.callStatus || 'idle';
  const callDuration = callManager?.callDuration || 0;
  const phoneNumber = callManager?.phoneNumber || '';
  const callError = callManager?.callError || null;
  const isMuted = callManager?.isMuted || false;
  const connectionState = callManager?.connectionState || null;
  const retryInitialization = callManager?.retryInitialization || null;
  const care4wId = callManager?.care4wId || null;

  // Get reactive initialization state from the state manager
  const initState = useInitializationState();

  // Determine authentication status
  // Check both user object and token - token may exist in sessionStorage before user object is populated
  const isAuthenticated = !!user || !!authToken;
  const authLoadingState = authLoading && !user && !authToken;

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
    } else if (initState.canRetry) {
      initState.retry();
    }
  }, [retryInitialization, initState]);

  // Show loading state during initialization with new InitializationStatus component
  if (initState.isInitializing && !analyticsLoadingFinal) {
    return (
      <div className={styles.dialerTab}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingLeft}>
            {/* New Initialization Status Component */}
            <InitializationStatus
              state={initState.state}
              stage={initState.stage}
              stageLabel={initState.stageLabel}
              mode={initState.mode}
              errorCode={initState.errorCode}
              error={initState.error}
              retryCount={initState.retryCount}
              canRetry={initState.canRetry}
              isRetrying={initState.isRetrying}
              onRetry={handleRetry}
              variant="full"
            />
            <CardSkeleton />
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  // Error state is handled inline with a banner above the dashboard
  // to keep the dashboard visible and accessible even when initialization fails

  // For non-Twilio errors, show full-page error (keep existing behavior)
  // For Twilio errors, fall through to show banner above dashboard
  if (initState.hasError && !initState.isRetrying) {
    // Only show full-page error for non-Twilio failures
    if (initState.errorCode !== InitErrorCode.TWILIO_INIT_FAILED) {
      return (
        <div className={styles.dialerTab}>
          <div className={styles.errorContainer}>
            <div className={styles.loadingLeft}>
              <InitializationStatus
                state={initState.state}
                stage={initState.stage}
                stageLabel={initState.stageLabel}
                mode={initState.mode}
                errorCode={initState.errorCode}
                error={initState.error}
                retryCount={initState.retryCount}
                canRetry={initState.canRetry}
                isRetrying={initState.isRetrying}
                onRetry={handleRetry}
                variant="full"
              />
            </div>
            <CardSkeleton />
          </div>
        </div>
      );
    }
    // For Twilio errors, we don't return early; we'll show banner in main layout
  }

  // Show loading state during initialization
  if (connectionState?.isInitializing && !analyticsLoadingFinal) {
    return (
      <div className={styles.dialerTab}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingLeft}>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  // Get status dot class based on connection state
  const getStatusDotClass = () => {
    switch (connectionState?.state) {
      case 'ready':
        return styles.statusReady;
      case 'failed':
        return styles.statusFailed;
      default:
        return styles.statusConnecting;
    }
  };

  return (
    <div className={styles.dialerTab}>
      {/* Error Banner - Shows when Twilio fails, keeping dashboard accessible */}
      {initState.twilioState === ServiceState.FAILED &&
        !initState.isInitialized &&
        !initState.isRetrying && (
          <div className={styles.errorBanner}>
            <InitializationStatus
              state={initState.state}
              stage={initState.stage}
              stageLabel={initState.stageLabel}
              mode={initState.mode}
              errorCode={initState.errorCode}
              error={initState.error}
              retryCount={initState.retryCount}
              canRetry={initState.canRetry}
              isRetrying={initState.isRetrying}
              onRetry={handleRetry}
              variant="compact"
            />
          </div>
        )}

      <div className={styles.dialerGrid}>
        {/* Left Column - Call Controls */}
        <div className={styles.leftColumn}>
          {/* Initialization Status Label - Shows real-time progress above Call Mode */}
          {!initState.isInitialized && (
            <InitializationStatus
              state={initState.state}
              stage={initState.stage}
              stageLabel={initState.stageLabel}
              mode={initState.mode}
              errorCode={initState.errorCode}
              error={initState.error}
              retryCount={initState.retryCount}
              canRetry={initState.canRetry}
              isRetrying={initState.isRetrying}
              onRetry={handleRetry}
              variant="compact"
            />
          )}

          {/* Call Mode Info - Moved to left column above dialer */}
          <div className={styles.callModeCard}>
            <div className={styles.callModeHeader}>
              <div className={styles.callModeTitle}>
                <div className={styles.callModeIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <span className={styles.callModeLabel}>Call Mode</span>
              </div>
              {/* Inline status badge */}
              <InitializationStatusInline
                state={initState.state}
                mode={initState.mode}
                error={initState.error}
              />
            </div>
            <div className={styles.callModeStatus}>
              <div className={styles.statusIndicator}>
                <span className={`${styles.statusDot} ${getStatusDotClass()}`} />
                <span className={styles.statusText}>
                  {connectionState?.state === 'ready'
                    ? 'Ready'
                    : connectionState?.state || 'Unknown'}
                </span>
              </div>
              <div className={styles.serviceBadge}>
                {serviceStatus?.mode === 'twilio' ? 'Twilio Voice' : 'WebRTC'}
              </div>
            </div>
          </div>

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

        {/* Right Column - Call Status & Quick Stats */}
        <div className={styles.rightColumn}>
          {/* Connection Status Badge (for failed/initializing states) */}
          {connectionState && connectionState.state !== 'ready' && (
            <div className="mb-2">
              <ConnectionStatusBadge connectionState={connectionState} />
            </div>
          )}

          {/* Call Status - Moved to right column */}
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

          <QuickStats
            analytics={analytics}
            analyticsError={analyticsErrorFinal}
            analyticsLoading={analyticsLoadingFinal}
            onRefresh={onRefreshAnalyticsFinal}
            autoRefreshInterval={60000} // 1 minute
          />
        </div>
      </div>
    </div>
  );
}
