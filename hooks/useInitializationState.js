/**
 * useInitializationState Hook
 *
 * React hook for subscribing to initialization state changes.
 * Provides reactive state updates and integrates with the notification system.
 * Supports dual-mode initialization (WebRTC + Twilio).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getInitializationStateManager,
  InitState,
  InitStage,
  InitStageLabels,
  getInitErrorInfo,
  ServiceState,
} from '@/lib/initializationStateManager';
import { logger } from '@/lib/logger';

/**
 * Hook for tracking initialization state
 * @returns {Object} Initialization state and actions
 */
export function useInitializationState() {
  const stateManager = getInitializationStateManager();

  // Local state for reactivity
  const [snapshot, setSnapshot] = useState(() => stateManager.getSnapshot());
  const [isRetrying, setIsRetrying] = useState(false);

  // Track if mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Update snapshot on any state change
    const unsubStateChange = stateManager.on('stateChange', () => {
      if (isMountedRef.current) {
        setSnapshot(stateManager.getSnapshot());
      }
    });

    const unsubProgress = stateManager.on('progress', () => {
      if (isMountedRef.current) {
        setSnapshot(stateManager.getSnapshot());
      }
    });

    const unsubComplete = stateManager.on('complete', () => {
      if (isMountedRef.current) {
        setSnapshot(stateManager.getSnapshot());
        setIsRetrying(false);
      }
    });

    const unsubError = stateManager.on('error', () => {
      if (isMountedRef.current) {
        setSnapshot(stateManager.getSnapshot());
        setIsRetrying(false);
      }
    });

    const unsubRetry = stateManager.on('retry', () => {
      if (isMountedRef.current) {
        setSnapshot(stateManager.getSnapshot());
        setIsRetrying(true);
      }
    });

    const unsubReset = stateManager.on('reset', () => {
      if (isMountedRef.current) {
        setSnapshot(stateManager.getSnapshot());
        setIsRetrying(false);
      }
    });

    // Listen for service state changes (dual-mode)
    const unsubServiceState = stateManager.on('serviceStateChange', () => {
      if (isMountedRef.current) {
        setSnapshot(stateManager.getSnapshot());
      }
    });

    // Cleanup
    return () => {
      isMountedRef.current = false;
      unsubStateChange();
      unsubProgress();
      unsubComplete();
      unsubError();
      unsubRetry();
      unsubReset();
      unsubServiceState();
    };
  }, [stateManager]);

  // Retry action
  const retry = useCallback(async () => {
    if (!snapshot.canRetry) {
      logger.warn('useInitializationState', 'Cannot retry - not in retryable state');
      return false;
    }

    setIsRetrying(true);
    try {
      await stateManager.retry();
      return true;
    } catch (error) {
      logger.error('useInitializationState', `Retry failed: ${error.message}`);
      return false;
    }
  }, [stateManager, snapshot.canRetry]);

  // Reset action
  const reset = useCallback(() => {
    stateManager.reset();
  }, [stateManager]);

  return {
    // State
    ...snapshot,
    isRetrying,

    // Computed states
    isIdle: snapshot.state === InitState.IDLE,
    isInitializing: snapshot.state === InitState.INITIALIZING,
    isInitialized: snapshot.state === InitState.INITIALIZED,
    hasError: snapshot.state === InitState.ERROR,

    // Stage info
    stageLabel: InitStageLabels[snapshot.stage] || snapshot.stage,

    // Error info
    errorInfo: snapshot.errorCode ? getInitErrorInfo(snapshot.errorCode) : null,

    // Dual-mode computed states
    isWebRTCReady: snapshot.webrtcReady,
    isTwilioReady: snapshot.twilioReady,
    isDualMode: snapshot.webrtcReady && snapshot.twilioReady,
    hasTwilioWarning: snapshot.twilioState === ServiceState.FAILED && snapshot.webrtcReady,
    activeModes: snapshot.activeModes || [],

    // Actions
    retry,
    reset,

    // Raw state manager (for advanced use)
    stateManager,
  };
}

/**
 * Hook for initialization progress notifications
 * Integrates with the browser notification system
 * @param {Object} options - Options for notifications
 * @param {boolean} options.enabled - Whether notifications are enabled
 * @param {boolean} options.showProgress - Whether to show progress notifications
 * @param {boolean} options.showComplete - Whether to show completion notifications
 * @param {boolean} options.showError - Whether to show error notifications
 * @returns {Object} Initialization state
 */
export function useInitializationNotifications(options = {}) {
  const { enabled = true, showProgress = false, showComplete = true, showError = true } = options;

  const state = useInitializationState();
  const lastStageRef = useRef(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    // Check notification permission
    const checkPermission = async () => {
      if (!('Notification' in window)) {
        return false;
      }

      if (Notification.permission === 'granted') {
        return true;
      }

      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }

      return false;
    };

    const showNotification = (title, body, options = {}) => {
      checkPermission().then((hasPermission) => {
        if (!hasPermission) return;

        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'careflow-init',
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || false,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        if (options.autoClose !== false) {
          setTimeout(() => notification.close(), 5000);
        }
      });
    };

    // Handle progress updates
    if (showProgress && state.isInitializing && state.stage !== lastStageRef.current) {
      lastStageRef.current = state.stage;
      showNotification('CareFlow - Initializing', state.stageLabel, { silent: true });
    }

    // Handle completion
    if (showComplete && state.isInitialized && !state.isRetrying) {
      // Build mode display string for dual-mode
      let modeDisplay;
      if (state.isDualMode) {
        modeDisplay = 'Twilio Voice and WebRTC';
      } else if (state.isTwilioReady) {
        modeDisplay = 'Twilio Voice';
      } else {
        modeDisplay = 'WebRTC';
      }

      // Include warning if Twilio failed but WebRTC is available
      let warningText = '';
      if (state.hasTwilioWarning) {
        warningText = ' (Twilio unavailable - WebRTC calls only)';
      }

      showNotification(
        'CareFlow - Call System Ready',
        `Your call system is now ready using ${modeDisplay}.${warningText} You can make and receive calls.`,
        { silent: false }
      );
    }

    // Handle errors
    if (showError && state.hasError && state.errorInfo) {
      showNotification(`CareFlow - ${state.errorInfo.title}`, state.errorInfo.description, {
        requireInteraction: true,
        autoClose: false,
      });
    }
  }, [
    enabled,
    showProgress,
    showComplete,
    showError,
    state.isInitializing,
    state.isInitialized,
    state.hasError,
    state.stage,
    state.stageLabel,
    state.mode,
    state.errorInfo,
    state.isRetrying,
    state.isDualMode,
    state.isTwilioReady,
    state.hasTwilioWarning,
  ]);

  return state;
}

export default useInitializationState;
