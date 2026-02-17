/**
 * CallStatus Component
 *
 * Displays the current call status with proper connection state handling.
 * Shows initialization state, connection progress, and error states.
 *
 * REFACTORED: Aligned with Design System v2.0
 * - Uses CSS module for component-specific styles
 * - Uses design system color tokens (success, warning, error, secondary, navy)
 * - Consistent spacing and typography with other dashboard components
 * - Removed arbitrary values and inline styles
 * - Better semantic structure and accessibility
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Check, X, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import styles from './CallStatus.module.css';

// Maximum auto-retry attempts before showing persistent error
const MAX_RETRY_ATTEMPTS = 3;
// Polling interval for auto-recovery (in milliseconds)
const RECOVERY_POLL_INTERVAL = 6000;

/**
 * Get status text based on call/connection status
 */
function getStatusText(status, connectionState, retryCount) {
  // Handle connection states first
  if (connectionState) {
    switch (connectionState.state) {
      case 'initializing':
        return connectionState.message || 'Initializing...';
      case 'failed':
        return `Failed: ${connectionState.message || 'Unknown error'}`;
      case 'ready':
        return 'Ready to make calls';
      case 'recovering':
        return `Recovering... (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS})`;
      default:
        break;
    }
  }

  // Handle call states
  switch (status) {
    case 'idle':
      return 'Ready to make calls';
    case 'connecting':
      return 'Connecting...';
    case 'ringing':
      return 'Ringing...';
    case 'connected':
      return 'Connected';
    case 'disconnected':
      return 'Call ended';
    case 'incoming':
      return 'Incoming call';
    case 'ready':
      return 'Ready';
    case 'failed':
      return 'Connection failed';
    default:
      return 'Status unknown';
  }
}

/**
 * Get status color class based on status - using design system tokens
 */
function getStatusColorClass(status, connectionState) {
  // Handle connection states first
  if (connectionState) {
    switch (connectionState.state) {
      case 'initializing':
      case 'recovering':
        return styles.statusConnecting;
      case 'failed':
        return styles.statusFailed;
      case 'ready':
        return styles.statusReady;
      default:
        break;
    }
  }

  // Handle call states
  switch (status) {
    case 'idle':
    case 'ready':
      return styles.statusReady;
    case 'connecting':
    case 'ringing':
      return styles.statusConnecting;
    case 'connected':
      return styles.statusConnected;
    case 'disconnected':
      return styles.statusDisconnected;
    case 'incoming':
      return styles.statusIncoming;
    case 'failed':
      return styles.statusFailed;
    default:
      return styles.statusUnknown;
  }
}

/**
 * Get status dot class based on status
 */
function getStatusDotClass(status, connectionState) {
  if (connectionState) {
    switch (connectionState.state) {
      case 'initializing':
      case 'recovering':
        return styles.statusDotConnecting;
      case 'failed':
        return styles.statusDotFailed;
      case 'ready':
        return styles.statusDotReady;
      default:
        break;
    }
  }

  switch (status) {
    case 'idle':
    case 'ready':
    case 'connected':
      return styles.statusDotReady;
    case 'connecting':
    case 'ringing':
    case 'incoming':
      return styles.statusDotConnecting;
    case 'failed':
      return styles.statusDotFailed;
    default:
      return styles.statusDotUnknown;
  }
}

/**
 * Format duration in MM:SS format
 */
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Determine if we should show loading spinner
 */
function shouldShowLoading(status, connectionState) {
  if (connectionState?.state === 'initializing' || connectionState?.state === 'recovering')
    return true;
  return status === 'connecting' || status === 'ringing';
}

/**
 * SuccessToast Component - Shows a success notification
 */
function SuccessToast({ message, onDismiss, showCare4Id, care4Id }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (care4Id) {
      try {
        await navigator.clipboard.writeText(care4Id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }, [care4Id]);

  return (
    <div className={styles.successToast}>
      <div className={styles.successToastContent}>
        <div className={styles.successToastInner}>
          <CheckCircle className={styles.successToastIcon} />
          <div className="flex-1">
            <p className={styles.successToastMessage}>{message}</p>
            {showCare4Id && care4Id && (
              <div className={styles.successToastCare4Id}>
                <p className={styles.successToastCare4IdLabel}>Your CareFlow ID:</p>
                <div className={styles.successToastCare4IdValue}>
                  <code className={styles.successToastCare4IdCode}>{care4Id}</code>
                  <button
                    onClick={handleCopy}
                    className={styles.successToastCopyBtn}
                    title="Copy to clipboard"
                    aria-label="Copy CareFlow ID to clipboard"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success-300" />
                    ) : (
                      <Copy className="w-4 h-4 text-success-300" />
                    )}
                  </button>
                </div>
                <p className={styles.successToastHint}>
                  Share this ID with friends to receive calls
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onDismiss}
            className={styles.successToastDismiss}
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4 text-success-200" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Care4IdDisplay Component - Shows the user's CareFlow ID with copy functionality
 */
function Care4IdDisplay({ care4Id }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (care4Id) {
      try {
        await navigator.clipboard.writeText(care4Id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }, [care4Id]);

  if (!care4Id) return null;

  return (
    <div className={styles.care4IdDisplay}>
      <div className={styles.care4IdHeader}>
        <span className={styles.care4IdLabel}>Your CareFlow ID</span>
        <button
          onClick={handleCopy}
          className={styles.care4IdCopyBtn}
          title="Copy to clipboard"
          aria-label="Copy CareFlow ID to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <code className={styles.care4IdValue}>{care4Id}</code>
      <p className={styles.care4IdHint}>Share this ID with friends so they can call you</p>
    </div>
  );
}

/**
 * PersistentErrorState Component - Shows when max retries exceeded
 */
function PersistentErrorState({ error, onRetry, onContactSupport }) {
  return (
    <div className={styles.persistentErrorContainer}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className={styles.persistentErrorTitle}>Unable to initialize call system</p>
          <p className={styles.persistentErrorText}>
            {error || 'The call system could not be initialized after multiple attempts.'}
          </p>
          <div className={styles.persistentErrorActions}>
            <button onClick={onRetry} className={styles.persistentErrorRetryBtn}>
              <RefreshCw className="w-3 h-3" />
              Retry Manually
            </button>
            {onContactSupport && (
              <button onClick={onContactSupport} className={styles.persistentErrorSupportBtn}>
                Contact Support
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * RecoveryProgress Component - Shows during auto-recovery
 */
function RecoveryProgress({ retryCount, maxRetries }) {
  const progress = (retryCount / maxRetries) * 100;

  return (
    <div className={styles.recoveryContainer}>
      <div className={styles.recoveryHeader}>
        <RefreshCw className="w-4 h-4 text-warning-400 animate-spin" />
        <span className={styles.recoveryText}>
          Attempting to recover... ({retryCount}/{maxRetries})
        </span>
      </div>
      <div className={styles.recoveryProgressBar}>
        <div className={styles.recoveryProgressFill} style={{ width: `${progress}%` }} />
      </div>
      <p className={styles.recoveryHint}>Checking call system availability...</p>
    </div>
  );
}

/**
 * CallStatus Component
 */
export default function CallStatus({
  status,
  duration,
  phoneNumber,
  error,
  connectionState,
  onRetry,
  care4Id,
  onContactSupport,
  // Auth state props
  isAuthenticated,
  authLoading,
  // Service status props
  serviceStatus,
}) {
  const [retryCount, setRetryCount] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [hasShownSuccess, setHasShownSuccess] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [persistentError, setPersistentError] = useState(false);

  const statusText = getStatusText(status, connectionState, retryCount);
  const statusColorClass = getStatusColorClass(status, connectionState);
  const statusDotClass = getStatusDotClass(status, connectionState);
  const isLoading = shouldShowLoading(status, connectionState);
  const isFailed = connectionState?.state === 'failed' || status === 'failed';

  // Determine auth status display
  const authStatusText = authLoading
    ? 'Loading...'
    : isAuthenticated
      ? 'Authenticated'
      : 'Not authenticated';
  const authStatusColorClass = authLoading
    ? styles.statusConnecting
    : isAuthenticated
      ? styles.statusReady
      : styles.statusFailed;
  const authStatusDotClass = authLoading
    ? styles.statusDotConnecting
    : isAuthenticated
      ? styles.statusDotReady
      : styles.statusDotFailed;

  // Show success toast when connection becomes ready
  useEffect(() => {
    if (connectionState?.state === 'ready' && !hasShownSuccess) {
      setShowSuccessToast(true);
      setHasShownSuccess(true);
      setRetryCount(0);
      setPersistentError(false);
      setIsRecovering(false);
    }
  }, [connectionState?.state, hasShownSuccess]);

  // Auto-recovery polling when in failed state
  useEffect(() => {
    if (!isFailed || persistentError) return;

    // Don't auto-retry if user is in an active call
    if (status === 'connected' || status === 'connecting' || status === 'ringing') {
      return;
    }

    const attemptRecovery = async () => {
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        setPersistentError(true);
        setIsRecovering(false);
        return;
      }

      setIsRecovering(true);
      setRetryCount((prev) => prev + 1);

      // Call the retry function if provided
      if (onRetry) {
        try {
          await onRetry();
        } catch (err) {
          console.error('Recovery attempt failed:', err);
        }
      }
    };

    // Start recovery polling
    const pollInterval = setInterval(attemptRecovery, RECOVERY_POLL_INTERVAL);

    // Initial attempt after a short delay
    const initialTimeout = setTimeout(() => {
      if (isFailed && !persistentError) {
        attemptRecovery();
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(initialTimeout);
    };
  }, [isFailed, persistentError, status, onRetry, retryCount]);

  // Reset state when connection state changes from failed
  useEffect(() => {
    if (connectionState?.state !== 'failed') {
      setPersistentError(false);
    }
  }, [connectionState?.state]);

  const handleManualRetry = useCallback(async () => {
    setPersistentError(false);
    setRetryCount(0);
    setIsRecovering(false);
    if (onRetry) {
      await onRetry();
    }
  }, [onRetry]);

  const handleDismissToast = useCallback(() => {
    setShowSuccessToast(false);
  }, []);

  // Get service status badge class
  const getServiceStatusClass = (serviceStatusState) => {
    switch (serviceStatusState) {
      case 'ready':
        return styles.serviceStatusReady;
      case 'initializing':
        return styles.serviceStatusInitializing;
      case 'failed':
        return styles.serviceStatusFailed;
      default:
        return styles.serviceStatusUnknown;
    }
  };

  return (
    <>
      {/* Success Toast */}
      {showSuccessToast && (
        <SuccessToast
          message="Call system is ready!"
          onDismiss={handleDismissToast}
          showCare4Id
          care4Id={care4Id}
        />
      )}

      <div className={styles.callStatusCard}>
        <div className={styles.callStatusHeader}>
          <h2 className={styles.callStatusTitle}>Call Status</h2>
        </div>

        <div className="space-y-4">
          {/* Authentication Status */}
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Authentication</span>
            <div className={styles.statusValue}>
              {authLoading && <div className={styles.loadingSpinnerSm} />}
              <span className={`${statusDotClass} ${authStatusDotClass}`} />
              <span className={`text-sm font-medium ${authStatusColorClass}`}>
                {authStatusText}
              </span>
            </div>
          </div>

          {/* Service Status (WebRTC/Twilio) */}
          {serviceStatus && (
            <div className={`${styles.statusRow} ${styles.statusRowBorder}`}>
              <span className={styles.statusLabel}>Service</span>
              <div className={styles.statusValue}>
                <span className={statusDotClass} />
                <span className={styles.serviceBadge}>
                  {serviceStatus.mode === 'twilio' ? 'Twilio Voice' : 'WebRTC'}
                </span>
                <span className={getServiceStatusClass(serviceStatus.status)}>
                  {serviceStatus.status}
                </span>
              </div>
            </div>
          )}

          {/* Main Status */}
          <div className={`${styles.statusRow} ${styles.statusRowBorder}`}>
            <span className={styles.statusLabel}>Call Status</span>
            <div className={styles.statusValue}>
              {isLoading && <div className={styles.loadingSpinnerMd} />}
              <span className={statusDotClass} />
              <span className={`font-medium ${statusColorClass}`}>{statusText}</span>
            </div>
          </div>

          {/* Connection State Message */}
          {connectionState?.message && connectionState.state !== 'ready' && !isRecovering && (
            <div className={`${styles.statusRow} ${styles.statusRowBorder}`}>
              <span className={styles.statusLabel}>Details</span>
              <span className="text-sm text-navy-300 max-w-xs text-right">
                {connectionState.message}
              </span>
            </div>
          )}

          {/* Phone Number / Call Target */}
          {phoneNumber && (
            <div className={`${styles.statusRow} ${styles.statusRowBorder}`}>
              <span className={styles.statusLabel}>
                {phoneNumber.startsWith('care4w-') ? 'CareFlow ID' : 'Phone Number'}
              </span>
              <span className={styles.phoneNumber}>{phoneNumber}</span>
            </div>
          )}

          {/* Call Duration */}
          {status === 'connected' && (
            <div className={`${styles.statusRow} ${styles.statusRowBorder}`}>
              <span className={styles.statusLabel}>Duration</span>
              <span className={styles.duration}>{formatDuration(duration)}</span>
            </div>
          )}

          {/* Care4Id Display when ready */}
          {connectionState?.state === 'ready' && care4Id && <Care4IdDisplay care4Id={care4Id} />}

          {/* Recovery Progress */}
          {isRecovering && !persistentError && (
            <RecoveryProgress retryCount={retryCount} maxRetries={MAX_RETRY_ATTEMPTS} />
          )}

          {/* Error Display (non-persistent) */}
          {error && !persistentError && !isRecovering && (
            <div className={styles.errorContainer}>
              <p className={styles.errorText}>{error}</p>
              {onRetry && isFailed && (
                <button onClick={handleManualRetry} className={styles.errorRetryBtn}>
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Persistent Error State */}
          {persistentError && (
            <PersistentErrorState
              error={error || connectionState?.message}
              onRetry={handleManualRetry}
              onContactSupport={onContactSupport}
            />
          )}

          {/* Initialization Failed State (without auto-recovery) */}
          {isFailed && !error && connectionState?.error && !isRecovering && !persistentError && (
            <div className={styles.errorContainer}>
              <p className={styles.errorText}>
                {(connectionState.error &&
                  (connectionState.error.message || connectionState.error)) ||
                  connectionState.message ||
                  'Unknown error'}
              </p>
              {onRetry && (
                <button onClick={handleManualRetry} className={styles.errorRetryBtn}>
                  Retry Initialization
                </button>
              )}
            </div>
          )}

          {/* Initializing State */}
          {connectionState?.state === 'initializing' && !isRecovering && (
            <div className={styles.initializingContainer}>
              <p className={styles.initializingText}>
                Please wait while the call system initializes...
              </p>
              <div className={styles.initializingProgressBar}>
                <div className={styles.initializingProgressFill} style={{ width: '60%' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * ConnectionStatusBadge Component
 * A compact status indicator for headers/toolbars
 */
export function ConnectionStatusBadge({ connectionState, className = '' }) {
  if (!connectionState) return null;

  const getBadgeClass = (state) => {
    switch (state) {
      case 'ready':
      case 'connected':
        return styles.connectionBadgeReady;
      case 'initializing':
      case 'recovering':
        return styles.connectionBadgeInitializing;
      case 'failed':
        return styles.connectionBadgeFailed;
      case 'connecting':
        return styles.connectionBadgeConnecting;
      case 'disconnected':
        return styles.connectionBadgeDisconnected;
      default:
        return styles.connectionBadgeDisconnected;
    }
  };

  const getIcon = (state) => {
    switch (state) {
      case 'initializing':
      case 'recovering':
        return <RefreshCw className="w-3 h-3 animate-spin" />;
      case 'ready':
        return <CheckCircle className="w-3 h-3" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3" />;
      case 'connecting':
        return <RefreshCw className="w-3 h-3 animate-spin" />;
      default:
        return null;
    }
  };

  const badgeClass = getBadgeClass(connectionState.state);

  return (
    <span className={`${badgeClass} ${className}`}>
      {getIcon(connectionState.state)}
      <span className="capitalize">{connectionState.state}</span>
    </span>
  );
}
