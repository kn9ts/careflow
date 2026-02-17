'use client';

import React from 'react';
import { InitState, getInitErrorInfo, ServiceState } from '@/lib/initializationStateManager';
import styles from './InitializationStatus.module.css';

/**
 * Icons for different states
 */
const Icons = {
  idle: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  initializing: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  initialized: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  retry: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  mode: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  webrtc: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  twilio: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  warning: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

/**
 * InitializationStatus Component
 *
 * Displays real-time initialization progress with visual indicators.
 * Shows status label, progress bar, and error messages.
 * Supports dual-mode display (WebRTC + Twilio).
 *
 * @param {Object} props
 * @param {string} props.state - Current initialization state
 * @param {string} props.stage - Current initialization stage
 * @param {string} props.stageLabel - Human-readable stage label
 * @param {string} props.mode - Call mode (twilio/webrtc/dual)
 * @param {string} props.errorCode - Error code if any
 * @param {string} props.error - Error message if any
 * @param {number} props.retryCount - Number of retry attempts
 * @param {boolean} props.canRetry - Whether retry is available
 * @param {boolean} props.isRetrying - Whether currently retrying
 * @param {Function} props.onRetry - Retry callback
 * @param {Function} props.onDismiss - Dismiss callback
 * @param {string} props.variant - Display variant ('full', 'compact', 'badge')
 * @param {string} props.webrtcState - WebRTC service state
 * @param {string} props.twilioState - Twilio service state
 * @param {string} props.webrtcError - WebRTC error message
 * @param {string} props.twilioError - Twilio error message
 * @param {boolean} props.webrtcReady - Whether WebRTC is ready
 * @param {boolean} props.twilioReady - Whether Twilio is ready
 * @param {string[]} props.activeModes - Array of active modes
 */
export default function InitializationStatus({
  state,
  _stage,
  stageLabel,
  mode,
  errorCode,
  _error,
  retryCount = 0,
  canRetry = false,
  isRetrying = false,
  onRetry,
  onDismiss,
  variant = 'full',
  // Dual-mode props
  webrtcState,
  twilioState,
  webrtcError,
  twilioError,
  webrtcReady,
  twilioReady,
  _activeModes = [],
}) {
  // Get error info if applicable
  const errorInfo = errorCode ? getInitErrorInfo(errorCode) : null;

  // Determine status class
  const statusClass =
    {
      [InitState.IDLE]: styles.idle,
      [InitState.INITIALIZING]: styles.initializing,
      [InitState.INITIALIZED]: styles.initialized,
      [InitState.ERROR]: styles.error,
    }[state] || styles.idle;

  // Helper to get service status icon
  const getServiceIcon = (serviceState, isReady) => {
    if (serviceState === ServiceState.INITIALIZING) {
      return <span className={styles.spinning}>{Icons.initializing}</span>;
    }
    if (isReady) {
      return Icons.initialized;
    }
    if (serviceState === ServiceState.FAILED) {
      return Icons.error;
    }
    return Icons.idle;
  };

  // Helper to get service status class
  const getServiceClass = (serviceState, isReady) => {
    if (serviceState === ServiceState.INITIALIZING) return styles.serviceInitializing;
    if (isReady) return styles.serviceReady;
    if (serviceState === ServiceState.FAILED) return styles.serviceFailed;
    if (serviceState === ServiceState.DISABLED) return styles.serviceDisabled;
    return styles.serviceIdle;
  };

  // Compact badge variant
  if (variant === 'badge') {
    return (
      <div className={`${styles.badge} ${statusClass}`}>
        <span className={styles.badgeIcon}>
          {state === InitState.INITIALIZING ? (
            <span className={styles.spinning}>{Icons.initializing}</span>
          ) : state === InitState.INITIALIZED ? (
            Icons.initialized
          ) : state === InitState.ERROR ? (
            Icons.error
          ) : (
            Icons.idle
          )}
        </span>
        <span className={styles.badgeText}>
          {state === InitState.INITIALIZED
            ? mode === 'dual'
              ? 'Both'
              : mode === 'twilio'
                ? 'Twilio'
                : 'WebRTC'
            : state === InitState.INITIALIZING
              ? 'Loading...'
              : state === InitState.ERROR
                ? 'Error'
                : 'Idle'}
        </span>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`${styles.compact} ${statusClass}`}>
        <div className={styles.compactLeft}>
          <span className={styles.compactIcon}>
            {state === InitState.INITIALIZING || isRetrying ? (
              <span className={styles.spinning}>{Icons.initializing}</span>
            ) : state === InitState.INITIALIZED ? (
              Icons.initialized
            ) : state === InitState.ERROR ? (
              Icons.error
            ) : (
              Icons.idle
            )}
          </span>
          <div className={styles.compactContent}>
            <span className={styles.compactTitle}>
              {state === InitState.INITIALIZED
                ? mode === 'dual'
                  ? 'Twilio + WebRTC Ready'
                  : mode === 'twilio'
                    ? 'Twilio Voice Ready'
                    : 'WebRTC Ready'
                : state === InitState.ERROR
                  ? errorInfo?.title || 'Error'
                  : stageLabel || 'Initializing...'}
            </span>
          </div>
        </div>
        {state === InitState.ERROR && canRetry && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className={styles.compactRetry}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    );
  }

  // Full variant (default)
  return (
    <div className={`${styles.container} ${statusClass}`}>
      {/* Header with icon and title */}
      <div className={styles.header}>
        <span className={styles.icon}>
          {state === InitState.INITIALIZING || isRetrying ? (
            <span className={styles.spinning}>{Icons.initializing}</span>
          ) : state === InitState.INITIALIZED ? (
            Icons.initialized
          ) : state === InitState.ERROR ? (
            Icons.error
          ) : (
            Icons.idle
          )}
        </span>
        <div className={styles.titleWrapper}>
          <h4 className={styles.title}>
            {state === InitState.INITIALIZED
              ? 'Call System Ready'
              : state === InitState.ERROR
                ? errorInfo?.title || 'Initialization Failed'
                : 'Initializing Call System'}
          </h4>
          {/* Dual-mode status indicators */}
          {state === InitState.INITIALIZED && (
            <div className={styles.modesContainer}>
              {/* WebRTC Status */}
              <span
                className={`${styles.modeBadge} ${getServiceClass(webrtcState, webrtcReady)}`}
                title={webrtcError || 'WebRTC Status'}
              >
                {getServiceIcon(webrtcState, webrtcReady)}
                <span className={styles.modeBadgeText}>WebRTC</span>
                {webrtcReady && <span className={styles.modeBadgeCheck}>{'\u2713'}</span>}
              </span>

              {/* Twilio Status */}
              <span
                className={`${styles.modeBadge} ${getServiceClass(twilioState, twilioReady)}`}
                title={twilioError || 'Twilio Status'}
              >
                {getServiceIcon(twilioState, twilioReady)}
                <span className={styles.modeBadgeText}>Twilio</span>
                {twilioReady && <span className={styles.modeBadgeCheck}>{'\u2713'}</span>}
                {twilioState === ServiceState.FAILED && (
                  <span className={styles.modeBadgeWarning} title={twilioError}>
                    {Icons.warning}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
        {onDismiss && (
          <button type="button" onClick={onDismiss} className={styles.dismiss} aria-label="Dismiss">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar for initializing state */}
      {state === InitState.INITIALIZING && (
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} />
          </div>
          <p className={styles.progressText}>{stageLabel || 'Please wait...'}</p>
        </div>
      )}

      {/* Error details */}
      {state === InitState.ERROR && errorInfo && (
        <div className={styles.errorDetails}>
          <p className={styles.errorDescription}>{errorInfo.description}</p>
          <p className={styles.errorAction}>{errorInfo.action}</p>
          {retryCount > 0 && <p className={styles.retryInfo}>Retry attempt {retryCount} of 3</p>}
        </div>
      )}

      {/* Twilio partial failure warning (non-blocking) */}
      {state === InitState.INITIALIZED && twilioState === ServiceState.FAILED && webrtcReady && (
        <div className={styles.warningDetails}>
          <span className={styles.warningIcon}>{Icons.warning}</span>
          <div className={styles.warningContent}>
            <p className={styles.warningTitle}>Twilio Unavailable</p>
            <p className={styles.warningDescription}>
              {twilioError ||
                'Twilio service could not be initialized. You can still make free WebRTC calls using CareFlow IDs.'}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      {state === InitState.ERROR && canRetry && onRetry && (
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className={styles.retryButton}
          >
            {isRetrying ? (
              <>
                <span className={styles.spinning}>{Icons.retry}</span>
                Retrying...
              </>
            ) : (
              <>
                {Icons.retry}
                Try Again
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * InitializationStatusInline Component
 *
 * A minimal inline status indicator for compact spaces.
 */
export function InitializationStatusInline({ state, mode, _error }) {
  const statusClass =
    {
      [InitState.IDLE]: styles.inlineIdle,
      [InitState.INITIALIZING]: styles.inlineInitializing,
      [InitState.INITIALIZED]: styles.inlineInitialized,
      [InitState.ERROR]: styles.inlineError,
    }[state] || styles.inlineIdle;

  return (
    <span className={`${styles.inline} ${statusClass}`}>
      {state === InitState.INITIALIZED
        ? mode === 'twilio'
          ? '● Twilio'
          : '● WebRTC'
        : state === InitState.INITIALIZING
          ? '◐ Loading...'
          : state === InitState.ERROR
            ? '✕ Error'
            : '○ Idle'}
    </span>
  );
}
