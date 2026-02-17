/**
 * useCallManager Hook
 * Manages call manager initialization, event listeners, and actions
 * Following separation of concerns - side effects and business logic
 *
 * IMPROVEMENTS:
 * - Added timeout handling for initialization
 * - Added connection state tracking
 * - Added error recovery and retry logic
 * - Added proper cleanup on unmount
 * - Added browser notifications for initialization status
 */

import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useCallState } from './useCallState';
import { useAuth } from '@/context/AuthContext';
import { callManager } from '@/lib/callManager';
import { logger } from '@/lib/logger';

// Initialization timeout in milliseconds
const INIT_TIMEOUT = 50000; // 50 seconds (slightly longer than CallManager's internal timeout)

/**
 * Show browser notification for initialization status
 * @param {string} mode - The call mode (twilio/webrtc)
 */
const showInitializationNotification = (mode) => {
  // Check if running in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // Check if browser supports notifications
  if (!('Notification' in window)) {
    logger.debug('useCallManager', 'Browser does not support notifications');
    return;
  }

  // Check if we have permission to show notifications
  if (Notification.permission === 'granted') {
    const modeDisplay = mode === 'twilio' ? 'Twilio Voice' : 'WebRTC';
    const notification = new Notification('CareFlow - Call System Ready', {
      body: `Your call system is now ready using ${modeDisplay}. You can make and receive calls.`,
      icon: '/favicon.ico',
      tag: 'careflow-init-complete',
      requireInteraction: false,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    logger.debug(
      'useCallManager',
      `Browser notification shown: Call system ready (${modeDisplay})`
    );
  } else if (Notification.permission === 'default') {
    // Request permission for future notifications
    logger.debug(
      'useCallManager',
      'Notification permission not yet granted - requesting permission'
    );
    Notification.requestPermission().then((permission) => {
      logger.debug('useCallManager', `Notification permission result: ${permission}`);
    });
  } else {
    logger.debug('useCallManager', 'Notification permission denied - skipping notification');
  }
};

/**
 * Show browser notification for initialization failure
 * @param {string} errorMessage - The error message
 */
const showInitializationErrorNotification = (errorMessage) => {
  // Check if running in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification('CareFlow - Call System Error', {
    body: `Failed to initialize call system: ${errorMessage}. Click retry to try again.`,
    icon: '/favicon.ico',
    tag: 'careflow-init-error',
    requireInteraction: true,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  logger.debug('useCallManager', `Browser error notification shown: ${errorMessage}`);
};

/**
 * Custom hook for managing call functionality
 * @returns {Object} Call manager actions and state
 */
export function useCallManager() {
  const { token, user, updateUserCare4wId } = useAuth();
  const {
    setCallStatus,
    setMode,
    setCare4wId,
    setModeInfo,
    setPhoneNumber,
    setCallError,
    setPendingWebRTCCall,
    pendingWebRTCCall,
    setIncoming,
    resetCallState,
    updateCallDuration,
    setIsMuted,
  } = useCallState();

  // Track initialization state
  const initializedRef = useRef(false);
  const initAttemptRef = useRef(0);
  const timerIntervalRef = useRef(null);
  const eventListenersRef = useRef(null);
  const initTimeoutRef = useRef(null);
  // Store updateUserCare4wId in ref to avoid re-initialization on user state changes
  const updateUserCare4wIdRef = useRef(updateUserCare4wId);

  // Update ref when function changes
  useEffect(() => {
    updateUserCare4wIdRef.current = updateUserCare4wId;
  }, [updateUserCare4wId]);

  // Connection state for UI feedback
  const [connectionState, setConnectionState] = useState({
    state: 'idle',
    message: 'Not initialized',
    isInitializing: false,
    error: null,
  });

  // Timer functions - defined before useMemo that depends on them
  const startCallTimer = useCallback(() => {
    logger.loading('useCallManager', 'Starting call timer...');
    updateCallDuration(0);
    timerIntervalRef.current = setInterval(() => {
      updateCallDuration((prev) => prev + 1);
    }, 1000);
  }, [updateCallDuration]);

  const stopCallTimer = useCallback(() => {
    logger.debug('useCallManager', 'Stopping call timer');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    updateCallDuration(0);
  }, [updateCallDuration]);

  // Update connection state helper
  const updateConnectionState = useCallback((state) => {
    setConnectionState({
      state: state.state || 'idle',
      message: state.message || '',
      isInitializing: state.state === 'initializing',
      error: state.error || null,
    });
  }, []);

  // Memoized event handlers - defined after timer functions they reference
  const eventHandlers = useMemo(
    () => ({
      handleStateChange: (status) => {
        logger.trace('useCallManager', `Call state changed: ${status}`);
        setCallStatus(status);

        // Handle timer
        if (status === 'connected') {
          startCallTimer();
        } else if (status === 'disconnected' || status === 'idle') {
          stopCallTimer();
        }
      },
      handleIncomingCall: (callData) => {
        logger.incomingCall('useCallManager', callData.from || callData.targetCare4wId);
        setPhoneNumber(callData.from || callData.targetCare4wId);

        if (callData.mode === 'webrtc') {
          logger.debug('useCallManager', 'Pending WebRTC call setup');
          setPendingWebRTCCall({
            roomId: callData.roomId,
            offer: callData.offer,
            from: callData.from,
          });
        }

        setIncoming(callData.from || callData.targetCare4wId);
      },
      handleError: (error) => {
        const errorMessage = error?.message || error || 'An error occurred';
        logger.error('useCallManager', `Call manager error: ${errorMessage}`);
        setCallError(errorMessage);
        updateConnectionState({
          state: 'failed',
          message: errorMessage,
          error,
        });
      },
      handleCallEnded: () => {
        logger.debug('useCallManager', 'Call ended - cleaning up');
        setPendingWebRTCCall(null);
        stopCallTimer();
      },
      handleConnectionStateChange: (stateInfo) => {
        logger.trace('useCallManager', `Connection state: ${stateInfo.state}`);
        updateConnectionState({
          state: stateInfo.state,
          message: stateInfo.message,
        });
      },
      handleInitializationChange: (initInfo) => {
        logger.debug(
          'useCallManager',
          `Initialization: ${initInfo.initialized ? 'complete' : 'failed'}`
        );
        if (initInfo.initialized) {
          updateConnectionState({
            state: 'ready',
            message: `Ready - ${initInfo.mode} mode`,
          });
          // Update care4wId if provided from token response
          if (initInfo.care4wId) {
            setCare4wId(initInfo.care4wId);
          }
        } else if (initInfo.error) {
          updateConnectionState({
            state: 'failed',
            message: initInfo.error,
            error: new Error(initInfo.error),
          });
        }
      },
    }),
    [
      setCallStatus,
      setPhoneNumber,
      setPendingWebRTCCall,
      setIncoming,
      setCallError,
      startCallTimer,
      stopCallTimer,
      updateConnectionState,
      setCare4wId,
    ]
  );

  // Initialize call manager
  useEffect(() => {
    if (!token || !user) {
      logger.warn('useCallManager', 'No token or user - skipping initialization');
      updateConnectionState({
        state: 'idle',
        message: 'Not authenticated',
      });
      return;
    }

    if (initializedRef.current) {
      logger.debug('useCallManager', 'Already initialized - skipping');
      return;
    }

    // Mark as initialized immediately to prevent re-entry
    initializedRef.current = true;
    logger.init('useCallManager');

    const initialize = async () => {
      try {
        initAttemptRef.current++;
        logger.loading(`useCallManager`, `Initialization attempt ${initAttemptRef.current}...`);

        updateConnectionState({
          state: 'initializing',
          message: 'Initializing call system...',
          isInitializing: true,
        });

        // Set up timeout for initialization
        const timeoutPromise = new Promise((_, reject) => {
          initTimeoutRef.current = setTimeout(() => {
            reject(new Error(`Initialization timed out after ${INIT_TIMEOUT / 1000} seconds`));
          }, INIT_TIMEOUT);
        });

        // Race between initialization and timeout
        const { mode: callMode, care4wId: cfId } = await Promise.race([
          callManager.initialize(token, user.care4wId || null),
          timeoutPromise,
        ]);

        // Clear timeout on success
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }

        logger.success('useCallManager', `Mode determined: ${callMode}`);

        setMode(callMode);
        setCare4wId(cfId);

        // Update global auth state with care4wId (use ref to avoid re-initialization)
        if (cfId && updateUserCare4wIdRef.current) {
          updateUserCare4wIdRef.current(cfId);
        }

        setModeInfo(callManager.getModeInfo());

        // Register event listeners with memoized handlers
        logger.loading('useCallManager', 'Registering event listeners...');
        callManager.on('onCallStateChange', eventHandlers.handleStateChange);
        callManager.on('onIncomingCall', eventHandlers.handleIncomingCall);
        callManager.on('onError', eventHandlers.handleError);
        callManager.on('onCallEnded', eventHandlers.handleCallEnded);
        callManager.on('onConnectionStateChange', eventHandlers.handleConnectionStateChange);
        callManager.on('onInitializationChange', eventHandlers.handleInitializationChange);

        // Store listeners for cleanup
        eventListenersRef.current = {
          onCallStateChange: eventHandlers.handleStateChange,
          onIncomingCall: eventHandlers.handleIncomingCall,
          onError: eventHandlers.handleError,
          onCallEnded: eventHandlers.handleCallEnded,
          onConnectionStateChange: eventHandlers.handleConnectionStateChange,
          onInitializationChange: eventHandlers.handleInitializationChange,
        };

        initializedRef.current = true;

        updateConnectionState({
          state: 'ready',
          message: `Ready - ${callMode} mode`,
        });

        logger.ready('useCallManager', 'Initialization complete!');

        // Show browser notification for successful initialization
        showInitializationNotification(callMode);
      } catch (error) {
        const errorMessage = error?.message || 'Failed to initialize call system';
        logger.error('useCallManager', `Failed to initialize: ${errorMessage}`);

        // Clear timeout on error
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }

        setCallError(errorMessage);

        updateConnectionState({
          state: 'failed',
          message: errorMessage,
          error,
        });

        // Show browser notification for initialization failure
        showInitializationErrorNotification(errorMessage);
      }
    };

    initialize();

    // Cleanup function
    return () => {
      // Clear any pending timeout
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }

      if (initializedRef.current && eventListenersRef.current) {
        logger.loading('useCallManager', 'Cleaning up...');
        callManager.off('onCallStateChange');
        callManager.off('onIncomingCall');
        callManager.off('onError');
        callManager.off('onCallEnded');
        callManager.off('onConnectionStateChange');
        callManager.off('onInitializationChange');
        callManager.disconnect();
        initializedRef.current = false;
        eventListenersRef.current = null;
        stopCallTimer();
        logger.complete('useCallManager');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    token,
    user,
    setMode,
    setCare4wId,
    setModeInfo,
    setPhoneNumber,
    setCallError,
    setPendingWebRTCCall,
    setIncoming,
    setCallStatus,
    stopCallTimer,
    updateConnectionState,
  ]);

  // Retry initialization
  const retryInitialization = useCallback(async () => {
    if (!token || !user) {
      setCallError('Cannot retry: not authenticated');
      return;
    }

    logger.loading('useCallManager', 'Retrying initialization...');

    // Reset state
    initializedRef.current = false;
    setCallError(null);

    updateConnectionState({
      state: 'initializing',
      message: 'Retrying initialization...',
      isInitializing: true,
    });

    try {
      const { mode: callMode, care4wId: cfId } = await callManager.retryInitialization();

      setMode(callMode);
      setCare4wId(cfId);
      setModeInfo(callManager.getModeInfo());
      initializedRef.current = true;

      updateConnectionState({
        state: 'ready',
        message: `Ready - ${callMode} mode`,
      });

      logger.ready('useCallManager', 'Retry successful!');

      // Show browser notification for successful retry
      showInitializationNotification(callMode);
    } catch (error) {
      const errorMessage = error?.message || error || 'Failed to retry initialization';
      setCallError(errorMessage);

      updateConnectionState({
        state: 'failed',
        message: errorMessage,
        error,
      });

      // Show browser notification for retry failure
      showInitializationErrorNotification(errorMessage);
    }
  }, [token, user, setMode, setCare4wId, setModeInfo, setCallError, updateConnectionState]);

  // Call actions - memoized for stability
  const makeCall = useCallback(
    async (number) => {
      if (!number) {
        setCallError('Phone number is required');
        return;
      }

      setCallError(null);
      setCallStatus('connecting');

      // Wait for initialization if in progress
      if (callManager._initializationPromise) {
        try {
          await callManager._initializationPromise;
        } catch (initError) {
          const initErrorMsg = initError?.message || initError || 'Unknown initialization error';
          setCallError(`Cannot make call: ${initErrorMsg}`);
          setCallStatus('idle');
          return;
        }
      }

      // Check if initialized
      if (!callManager._initialized || !callManager.mode) {
        setCallError('Call system not initialized. Please wait a moment and try again.');
        setCallStatus('idle');
        return;
      }

      try {
        await callManager.makeCall(number);
      } catch (error) {
        console.error('Call failed:', error);
        setCallError(error?.message || error || 'Call failed');
        setCallStatus('idle');
        throw error;
      }
    },
    [setCallError, setCallStatus]
  );

  const hangupCall = useCallback(async () => {
    logger.debug('useCallManager', 'Hanging up call...');
    await callManager.endCall();
    resetCallState();
  }, [resetCallState]);

  const acceptCall = useCallback(async () => {
    // Check if this is a WebRTC incoming call
    if (pendingWebRTCCall && pendingWebRTCCall.roomId) {
      // Use WebRTC accept path
      try {
        logger.loading('useCallManager', 'Accepting WebRTC call...');
        await callManager.acceptWebRTCCall(pendingWebRTCCall.roomId, pendingWebRTCCall.offer);
        setPendingWebRTCCall(null);
        logger.callConnect('useCallManager');
        return;
      } catch (error) {
        const errorMsg = error?.message || error || 'WebRTC accept failed';
        logger.error('useCallManager', `WebRTC accept failed: ${errorMsg}`);
        setCallError(errorMsg);
        resetCallState();
        throw error;
      }
    }

    setCallStatus('connecting');

    try {
      logger.loading('useCallManager', 'Accepting call...');
      await callManager.acceptCall();
    } catch (error) {
      const errorMsg = error?.message || error || 'Accept failed';
      logger.error('useCallManager', `Accept failed: ${errorMsg}`);
      setCallError(errorMsg);
      resetCallState();
      throw error;
    }
  }, [setCallStatus, setCallError, resetCallState, pendingWebRTCCall, setPendingWebRTCCall]);

  const acceptWebRTCCall = useCallback(async () => {
    setCallStatus('connecting');

    try {
      await callManager.acceptWebRTCCall(pendingWebRTCCall.roomId, pendingWebRTCCall.offer);
      setPendingWebRTCCall(null);
    } catch (error) {
      console.error('Failed to accept WebRTC call:', error);
      setCallError(error?.message || error || 'Failed to accept WebRTC call');
      resetCallState();
      throw error;
    }
  }, [setCallStatus, setCallError, setPendingWebRTCCall, resetCallState, pendingWebRTCCall]);

  const rejectCall = useCallback(async () => {
    logger.warn('useCallManager', 'Rejecting call');
    await callManager.rejectCall();
    setPendingWebRTCCall(null);
    resetCallState();
  }, [resetCallState, setPendingWebRTCCall]);

  const toggleMute = useCallback(() => {
    const muted = callManager.toggleMute();
    logger.debug('useCallManager', `Mute toggled: ${muted}`);
    // Update the local muted state
    setIsMuted(muted);
    return muted;
  }, [setIsMuted]);

  const sendDigits = useCallback((digit) => {
    logger.debug('useCallManager', `Sending DTMF: ${digit}`);
    callManager.sendDigits(digit);
  }, []);

  // Expose the call manager instance for advanced use cases
  const getCallManager = useCallback(() => callManager, []);

  // Get state values from useCallState to expose
  const { callStatus, callDuration, phoneNumber, callError, isMuted, care4wId } = useCallState();

  return {
    // Actions
    makeCall,
    hangupCall,
    acceptCall,
    acceptWebRTCCall,
    rejectCall,
    toggleMute,
    sendDigits,
    retryInitialization,

    // Utilities
    startCallTimer,
    stopCallTimer,
    getCallManager,

    // Connection state
    connectionState,

    // Call state values (from useCallState)
    callStatus,
    callDuration,
    phoneNumber,
    callError,
    isMuted,
    care4wId,

    // Event triggers for external components
    triggerCallStateChange: (status) => setCallStatus(status),
  };
}

/**
 * useOutgoingCall Hook
 * Handles outgoing call logic
 */
export function useOutgoingCall() {
  const { _token } = useAuth();
  const { phoneNumber, setPhoneNumber, callStatus, setCallStatus, setCallError } = useCallState();

  const _callManagerRef = useRef(null);

  const dial = useCallback(
    async (number) => {
      if (!number) {
        setCallError('Phone number is required');
        return { success: false, error: 'Phone number is required' };
      }

      setPhoneNumber(number);
      setCallStatus('connecting');
      setCallError(null);

      try {
        await callManager.makeCall(number);
        return { success: true };
      } catch (error) {
        const errorMsg = error?.message || error || 'Call failed';
        setCallError(errorMsg);
        setCallStatus('idle');
        return { success: false, error: errorMsg };
      }
    },
    [setPhoneNumber, setCallStatus, setCallError]
  );

  const clearNumber = useCallback(() => {
    setPhoneNumber('');
  }, [setPhoneNumber]);

  const appendDigit = useCallback(
    (digit) => {
      setPhoneNumber((prev) => prev + digit);
    },
    [setPhoneNumber]
  );

  const backspace = useCallback(() => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  }, [setPhoneNumber]);

  return {
    phoneNumber,
    callStatus,
    dial,
    clearNumber,
    appendDigit,
    backspace,
    setPhoneNumber,
  };
}
