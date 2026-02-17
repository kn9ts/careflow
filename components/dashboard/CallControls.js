/**
 * CallControls Component
 *
 * Provides controls for managing calls including dial, hangup, mute, and recording.
 *
 * REFACTORED: Aligned with Design System v2.0
 * - Uses CSS module for component-specific styles
 * - Uses design system color tokens (success, warning, error, secondary, navy)
 * - Consistent spacing and typography with other dashboard components
 * - Removed arbitrary values and inline styles
 * - Better semantic structure and accessibility
 * - Full-width main call button with feature buttons in separate row
 * - Accessible tooltips on all feature buttons
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  Disc,
  Square,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  CircleDot,
  Grid3X3,
  X,
  Pause,
} from 'lucide-react';
import styles from './CallControls.module.css';

// Memoized formatDuration utility - defined outside component
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Memoized status text function
const getStatusText = (isCallActive, isIncomingCall, isCalling, isReady) => {
  if (isCallActive) return 'Live';
  if (isIncomingCall) return 'Incoming';
  if (isCalling) return 'Connecting';
  if (isReady) return 'Ready';
  return 'Idle';
};

// Memoized status badge class
const getStatusBadgeClass = (isCallActive, isIncomingCall, isCalling) => {
  if (isCallActive) return 'badge-success';
  if (isIncomingCall) return 'badge-warning';
  if (isCalling) return 'badge-secondary';
  return 'badge-neutral';
};

// Memoized help text
const getHelpText = (isIncomingCall, isCallActive) => {
  if (isIncomingCall) return 'Incoming call detected. Accept or reject.';
  if (isCallActive) return 'Call in progress. Use feature buttons below to manage.';
  return 'Enter a number and tap Make Call to start.';
};

function CallControls({
  callStatus,
  onCall,
  onHangup,
  onAccept,
  onReject,
  onMute,
  onStartRecording,
  onStopRecording,
  onDTMF,
  isMuted,
  isRecording,
  isRecordingSupported,
  recordingDuration = 0,
  disabled = false,
}) {
  // Memoize computed values to avoid recalculation on every render
  const isCallActive = useMemo(() => callStatus === 'connected', [callStatus]);
  const isIncomingCall = useMemo(() => callStatus === 'incoming', [callStatus]);
  const isCalling = useMemo(
    () => callStatus === 'connecting' || callStatus === 'ringing',
    [callStatus]
  );
  const isReady = useMemo(() => callStatus === 'ready' || callStatus === 'idle', [callStatus]);

  // Memoize formatted duration
  const formattedDuration = useMemo(() => formatDuration(recordingDuration), [recordingDuration]);

  // Memoize status text
  const statusText = useMemo(
    () => getStatusText(isCallActive, isIncomingCall, isCalling, isReady),
    [isCallActive, isIncomingCall, isCalling, isReady]
  );

  // Memoize status badge class
  const statusBadgeClass = useMemo(
    () => getStatusBadgeClass(isCallActive, isIncomingCall, isCalling),
    [isCallActive, isIncomingCall, isCalling]
  );

  // Memoize help text
  const helpText = useMemo(
    () => getHelpText(isIncomingCall, isCallActive),
    [isIncomingCall, isCallActive]
  );

  // Memoize button handlers to stable references
  const handleAccept = useCallback(onAccept, [onAccept]);
  const handleReject = useCallback(onReject, [onReject]);
  const handleHangup = useCallback(onHangup, [onHangup]);
  const handleCall = useCallback(onCall, [onCall]);
  const handleMute = useCallback(onMute, [onMute]);
  const handleStartRecording = useCallback(onStartRecording, [onStartRecording]);
  const handleStopRecording = useCallback(onStopRecording, [onStopRecording]);

  // Tooltip visibility state
  const [tooltipVisible, setTooltipVisible] = useState(null);

  // DTMF keypad state
  const [showDTMFKeypad, setShowDTMFKeypad] = useState(false);

  // DTMF digits
  const dtmfDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  // Handle DTMF digit press
  const handleDTMFPress = useCallback(
    (digit) => {
      if (onDTMF) {
        onDTMF(digit);
      }
    },
    [onDTMF]
  );

  // Toggle DTMF keypad
  const toggleDTMFKeypad = useCallback(() => {
    setShowDTMFKeypad((prev) => !prev);
  }, []);

  // Tooltip handlers
  const showTooltip = useCallback((tooltipId) => {
    setTooltipVisible(tooltipId);
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltipVisible(null);
  }, []);

  // Check if feature row should be shown
  const showFeatureRow = isCallActive || isIncomingCall;

  return (
    <div className={styles.callControlsCard}>
      {/* Header with status */}
      <div className={styles.callControlsHeader}>
        <h2 className={styles.callControlsTitle}>Call Controls</h2>
        <div className="flex items-center gap-2">
          {/* Recording Status Indicator */}
          {isRecording && (
            <div className={styles.recordingIndicator}>
              <CircleDot className={styles.recordingIndicatorIcon} />
              <span className={styles.recordingIndicatorText}>REC {formattedDuration}</span>
            </div>
          )}
          <span className={`badge ${statusBadgeClass}`}>{statusText}</span>
        </div>
      </div>

      {/* Main Call Button Row - Full Width */}
      <div className={styles.mainCallRow}>
        {isIncomingCall ? (
          <>
            <button
              onClick={handleAccept}
              className={styles.mainCallButtonAccept}
              aria-label="Accept incoming call"
            >
              <Phone className="w-5 h-5" />
              Accept Call
            </button>
            <button
              onClick={handleReject}
              className={styles.mainCallButtonEnd}
              style={{ marginTop: '0.75rem' }}
              aria-label="Reject incoming call"
            >
              <PhoneOff className="w-5 h-5" />
              Reject Call
            </button>
          </>
        ) : isCallActive ? (
          <button
            onClick={handleHangup}
            className={styles.mainCallButtonEnd}
            aria-label="End current call"
          >
            <PhoneOff className="w-5 h-5" />
            End Call
          </button>
        ) : (
          <button
            onClick={handleCall}
            className={styles.mainCallButton}
            disabled={isCalling}
            aria-label={isCalling ? 'Calling...' : 'Make a call'}
          >
            <Phone className="w-5 h-5" />
            {isCalling ? 'Calling...' : 'Make Call'}
          </button>
        )}
        <p className={styles.helpText}>{helpText}</p>
      </div>

      {/* Feature Buttons Row - Shows when call is active or incoming */}
      {showFeatureRow && (
        <div className={styles.featureRow}>
          <h3 className={styles.featureRowTitle}>Call Features</h3>
          <div className={styles.featureButtonsGrid}>
            {/* Mute Button */}
            <div className={styles.featureButtonWrapper}>
              <button
                onClick={handleMute}
                className={`${styles.featureButton} ${isMuted ? styles.featureButtonMuteActive : styles.featureButtonMute}`}
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                aria-pressed={isMuted}
                onMouseEnter={() => showTooltip('mute')}
                onMouseLeave={hideTooltip}
                onFocus={() => showTooltip('mute')}
                onBlur={hideTooltip}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
              <div
                className={`${styles.tooltip} ${tooltipVisible === 'mute' ? styles.tooltipVisible : ''}`}
                role="tooltip"
              >
                {isMuted ? 'Unmute: Turn your microphone back on' : 'Mute: Silence your microphone'}
              </div>
            </div>

            {/* Hold Button (placeholder) */}
            <div className={styles.featureButtonWrapper}>
              <button
                className={`${styles.featureButton} ${styles.featureButtonHold}`}
                disabled
                aria-label="Hold feature coming soon"
                onMouseEnter={() => showTooltip('hold')}
                onMouseLeave={hideTooltip}
                onFocus={() => showTooltip('hold')}
                onBlur={hideTooltip}
              >
                <Pause className="w-5 h-5" />
                <span>Hold</span>
              </button>
              <div
                className={`${styles.tooltip} ${tooltipVisible === 'hold' ? styles.tooltipVisible : ''}`}
                role="tooltip"
              >
                Hold: Temporarily pause the call (coming soon)
              </div>
            </div>

            {/* Record Button */}
            {isRecordingSupported && (
              <div className={styles.featureButtonWrapper}>
                {isCallActive ? (
                  isRecording ? (
                    <button
                      onClick={handleStopRecording}
                      className={`${styles.featureButton} ${styles.featureButtonRecordStop}`}
                      aria-label="Stop recording"
                      onMouseEnter={() => showTooltip('record')}
                      onMouseLeave={hideTooltip}
                      onFocus={() => showTooltip('record')}
                      onBlur={hideTooltip}
                    >
                      <Square className="w-5 h-5" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStartRecording}
                      className={`${styles.featureButton} ${styles.featureButtonRecord}`}
                      aria-label="Start recording"
                      onMouseEnter={() => showTooltip('record')}
                      onMouseLeave={hideTooltip}
                      onFocus={() => showTooltip('record')}
                      onBlur={hideTooltip}
                    >
                      <Disc className="w-5 h-5" />
                      <span>Record</span>
                    </button>
                  )
                ) : (
                  <button
                    className={`${styles.featureButton} ${styles.featureButtonDisabled}`}
                    disabled
                    aria-label="Recording requires active call"
                    onMouseEnter={() => showTooltip('record')}
                    onMouseLeave={hideTooltip}
                    onFocus={() => showTooltip('record')}
                    onBlur={hideTooltip}
                  >
                    <Disc className="w-5 h-5" />
                    <span>Record</span>
                  </button>
                )}
                <div
                  className={`${styles.tooltip} ${tooltipVisible === 'record' ? styles.tooltipVisible : ''}`}
                  role="tooltip"
                >
                  {isRecording
                    ? 'Stop Recording: Save the current recording'
                    : isCallActive
                      ? 'Record: Start recording the call'
                      : 'Record: Requires an active call'}
                </div>
              </div>
            )}

            {/* Keypad (DTMF) Button */}
            <div className={styles.featureButtonWrapper}>
              <button
                onClick={toggleDTMFKeypad}
                className={`${styles.featureButton} ${showDTMFKeypad ? styles.featureButtonKeypadActive : styles.featureButtonKeypad}`}
                disabled={!isCallActive || disabled}
                aria-label={showDTMFKeypad ? 'Close DTMF keypad' : 'Open DTMF keypad'}
                aria-expanded={showDTMFKeypad}
                onMouseEnter={() => showTooltip('keypad')}
                onMouseLeave={hideTooltip}
                onFocus={() => showTooltip('keypad')}
                onBlur={hideTooltip}
              >
                {showDTMFKeypad ? <X className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
                <span>{showDTMFKeypad ? 'Close' : 'Keypad'}</span>
              </button>
              <div
                className={`${styles.tooltip} ${tooltipVisible === 'keypad' ? styles.tooltipVisible : ''}`}
                role="tooltip"
              >
                Keypad: Send DTMF tones during the call
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DTMF Keypad - Inline display below feature row */}
      {showDTMFKeypad && isCallActive && (
        <div className={styles.dtmfKeypad}>
          <p className={styles.dtmfHint}>Press digits to send DTMF tones</p>
          <div className={styles.dtmfGrid}>
            {dtmfDigits.map((digit) => (
              <button
                key={digit}
                onClick={() => handleDTMFPress(digit)}
                className={styles.dtmfButton}
                aria-label={`Send DTMF tone ${digit}`}
              >
                {digit}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status Indicators */}
      <div className={styles.statusIndicators}>
        <div className={styles.statusIndicatorsRow}>
          {/* Line Active */}
          <div className={styles.statusIndicator}>
            <div
              className={isCallActive ? styles.statusDotActive : styles.statusDotInactive}
              aria-hidden="true"
            />
            <span>Line {isCallActive ? 'Active' : 'Inactive'}</span>
          </div>
          {/* Mute Status */}
          <div className={styles.statusIndicator}>
            <div
              className={isMuted ? styles.statusDotWarning : styles.statusDotInactive}
              aria-hidden="true"
            />
            <span>{isMuted ? 'Muted' : 'Unmuted'}</span>
          </div>
          {/* Ready Status */}
          <div className={styles.statusIndicator}>
            <div
              className={isReady ? styles.statusDotInfo : styles.statusDotInactive}
              aria-hidden="true"
            />
            <span>{isReady ? 'Ready' : 'Busy'}</span>
          </div>
          {/* Recording Status */}
          {isRecording && (
            <div className={styles.statusIndicator}>
              <div className={styles.statusDotRecording} aria-hidden="true" />
              <span className={styles.statusRecordingText}>Recording</span>
            </div>
          )}
        </div>

        {/* Recording Progress Bar */}
        {isRecording && (
          <div className={styles.recordingProgress}>
            <div className={styles.recordingProgressBar}>
              <div className={styles.recordingProgressFill} style={{ width: '100%' }} />
            </div>
            <p className={styles.recordingProgressText}>
              Recording in progress... Click "Stop Recording" when done
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(CallControls);
