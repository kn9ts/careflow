/**
 * CallStatus Component
 *
 * Displays the current call status with proper connection state handling.
 * Shows initialization state, connection progress, and error states.
 *
 * IMPROVEMENTS:
 * - Added connection state display
 * - Added initialization progress indicator
 * - Added retry button for failed states
 * - Better error display with actionable messages
 * - Added automatic recovery monitoring
 * - Added care4Id display with copy-to-clipboard
 * - Added success toast notification
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Check, X, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';

// Maximum auto-retry attempts before showing persistent error
const MAX_RETRY_ATTEMPTS = 5;
// Polling interval for auto-recovery (in milliseconds)
const RECOVERY_POLL_INTERVAL = 4000;

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
 * Get status color class based on status
 */
function getStatusColor(status, connectionState) {
  // Handle connection states first
  if (connectionState) {
    switch (connectionState.state) {
      case 'initializing':
      case 'recovering':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      case 'ready':
        return 'text-green-400';
      default:
        break;
    }
  }

  // Handle call states
  switch (status) {
    case 'idle':
    case 'ready':
      return 'text-green-400';
    case 'connecting':
    case 'ringing':
      return 'text-yellow-400';
    case 'connected':
      return 'text-green-400';
    case 'disconnected':
      return 'text-gray-400';
    case 'incoming':
      return 'text-blue-400';
    case 'failed':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get status icon based on status
 */
function getStatusIcon(status, connectionState) {
  // Handle connection states
  if (connectionState) {
    switch (connectionState.state) {
      case 'initializing':
      case 'recovering':
        return '⏳';
      case 'failed':
        return '❌';
      case 'ready':
        return '✅';
      default:
        break;
    }
  }

  // Handle call states
  switch (status) {
    case 'idle':
    case 'ready':
      return '✅';
    case 'connecting':
    case 'ringing':
      return '📞';
    case 'connected':
      return '🎙️';
    case 'disconnected':
      return '👋';
    case 'incoming':
      return '📲';
    case 'failed':
      return '❌';
    default:
      return '❓';
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
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-green-600/90 backdrop-blur-sm border border-green-400/40 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-white font-medium">{message}</p>
            {showCare4Id && care4Id && (
              <div className="mt-2">
                <p className="text-green-200 text-xs mb-1">Your CareFlow ID:</p>
                <div className="flex items-center gap-2 bg-green-700/50 rounded px-2 py-1">
                  <code className="text-green-100 text-sm font-mono flex-1 truncate">
                    {care4Id}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-green-600/50 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-300" />
                    ) : (
                      <Copy className="w-4 h-4 text-green-300" />
                    )}
                  </button>
                </div>
                <p className="text-green-200/70 text-xs mt-1">
                  Share this ID with friends to receive calls
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-green-500/30 rounded transition-colors"
          >
            <X className="w-4 h-4 text-green-200" />
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
    <div className="mt-4 p-3 bg-blue-600/10 border border-blue-400/30 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-blue-300 text-sm font-medium">Your CareFlow ID</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 rounded transition-colors"
          title="Copy to clipboard"
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
      <code className="text-white font-mono text-sm block truncate">{care4Id}</code>
      <p className="text-blue-300/60 text-xs mt-1">
        Share this ID with friends so they can call you
      </p>
    </div>
  );
}

/**
 * PersistentErrorState Component - Shows when max retries exceeded
 */
function PersistentErrorState({ error, onRetry, onContactSupport }) {
  return (
    <div className="mt-4 p-4 bg-red-600/20 border border-red-400/40 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-400 font-medium">Unable to initialize call system</p>
          <p className="text-red-300/70 text-sm mt-1">
            {error || 'The call system could not be initialized after multiple attempts.'}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onRetry}
              className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/50 text-red-200 text-sm rounded transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Manually
            </button>
            {onContactSupport && (
              <button
                onClick={onContactSupport}
                className="px-3 py-1.5 bg-gray-600/30 hover:bg-gray-600/50 text-gray-200 text-sm rounded transition-colors"
              >
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
    <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-400/40 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
        <span className="text-yellow-400 text-sm font-medium">
          Attempting to recover... ({retryCount}/{maxRetries})
        </span>
      </div>
      <div className="w-full bg-yellow-600/20 rounded-full h-1.5">
        <div
          className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-yellow-300/60 text-xs mt-2">Checking call system availability...</p>
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
}) {
  const [retryCount, setRetryCount] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [hasShownSuccess, setHasShownSuccess] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [persistentError, setPersistentError] = useState(false);

  const statusText = getStatusText(status, connectionState, retryCount);
  const statusColor = getStatusColor(status, connectionState);
  const statusIcon = getStatusIcon(status, connectionState);
  const isLoading = shouldShowLoading(status, connectionState);
  const isFailed = connectionState?.state === 'failed' || status === 'failed';

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

      <div className="card">
        <h2 className="card-title mb-4">Call Status</h2>

        <div className="space-y-4">
          {/* Main Status */}
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-400 text-sm">Status</span>
            <div className="flex items-center gap-2">
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-red" />
              )}
              <span className={`font-medium ${statusColor}`}>
                {statusIcon} {statusText}
              </span>
            </div>
          </div>

          {/* Connection State Message */}
          {connectionState?.message && connectionState.state !== 'ready' && !isRecovering && (
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-gray-400 text-sm">Details</span>
              <span className="text-sm text-gray-300 max-w-[200px] text-right">
                {connectionState.message}
              </span>
            </div>
          )}

          {/* Phone Number / Call Target */}
          {phoneNumber && (
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-gray-400 text-sm">
                {phoneNumber.startsWith('care4w-') ? 'CareFlow ID' : 'Phone Number'}
              </span>
              <span className="font-medium text-white font-mono">{phoneNumber}</span>
            </div>
          )}

          {/* Call Duration */}
          {status === 'connected' && (
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-gray-400 text-sm">Duration</span>
              <span className="font-medium text-white font-mono text-lg">
                {formatDuration(duration)}
              </span>
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
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
              {onRetry && isFailed && (
                <button
                  onClick={handleManualRetry}
                  className="mt-3 px-4 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 text-sm rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
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
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">
                {connectionState.error.message || connectionState.message}
              </p>
              {onRetry && (
                <button
                  onClick={handleManualRetry}
                  className="mt-3 px-4 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 text-sm rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Retry Initialization
                </button>
              )}
            </div>
          )}

          {/* Initializing State */}
          {connectionState?.state === 'initializing' && !isRecovering && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p className="text-yellow-400 text-sm">
                Please wait while the call system initializes...
              </p>
              <div className="mt-3 w-full bg-yellow-500/20 rounded-full h-1.5">
                <div
                  className="bg-yellow-400 h-1.5 rounded-full animate-pulse"
                  style={{ width: '60%' }}
                />
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

  const badgeClasses = {
    initializing: 'badge-warning',
    ready: 'badge-success',
    failed: 'badge-error',
    connecting: 'badge-info',
    connected: 'badge-success',
    disconnected: 'badge-neutral',
    recovering: 'badge-warning',
  };

  const badgeIcons = {
    initializing: '⏳',
    ready: '✅',
    failed: '❌',
    connecting: '📞',
    connected: '🎙️',
    disconnected: '👋',
    recovering: '🔄',
  };

  const badgeClass = badgeClasses[connectionState.state] || badgeClasses.disconnected;
  const icon = badgeIcons[connectionState.state] || '❓';

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {(connectionState.state === 'initializing' || connectionState.state === 'recovering') && (
        <span className="animate-spin">⏳</span>
      )}
      {connectionState.state !== 'initializing' && connectionState.state !== 'recovering' && icon}
      <span className="capitalize">{connectionState.state}</span>
    </span>
  );
}
