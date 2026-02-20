/**
 * GlobalDialerModal Component
 *
 * A persistent dialer modal overlay that can be accessed from anywhere in the dashboard.
 * Uses the DialerModalContext for open/close state and connects to the CallState context
 * for call management functionality.
 *
 * Features:
 * - Accessible from any dashboard page without affecting current route
 * - Full dial pad functionality with call controls
 * - Call status display and management
 * - Audio recording support
 */

'use client';

import { useCallback, useState } from 'react';
import DialPadModal from './DialPadModal';
import { useDialerModal } from '@/context/DialerModalContext';
import { useCallState } from '@/hooks/useCallState';
import { useCallManager } from '@/hooks/useCallManager';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

export default function GlobalDialerModal() {
  const { isModalOpen, closeModal } = useDialerModal();
  const callManager = useCallManager();
  const audioRecorder = useAudioRecorder();
  const {
    phoneNumber: contextPhoneNumber,
    setPhoneNumber,
    callStatus,
    callDuration,
    callError,
    isMuted,
  } = useCallState();

  // Local state for the phone number input in the modal
  const [localPhoneNumber, setLocalPhoneNumber] = useState('');

  // Use either the context phone number or local state
  const phoneNumber = localPhoneNumber || contextPhoneNumber;

  // Handle phone number changes
  const handlePhoneNumberChange = useCallback(
    (newNumber) => {
      setLocalPhoneNumber(newNumber);
      setPhoneNumber(newNumber);
    },
    [setPhoneNumber]
  );

  // Handle making a call
  const handleMakeCall = useCallback(
    (number) => {
      if (callManager?.makeCall) {
        callManager.makeCall(number);
      }
    },
    [callManager]
  );

  // Handle closing the modal
  const handleClose = useCallback(() => {
    // Only close if not in an active call
    if (callStatus !== 'connected' && callStatus !== 'connecting' && callStatus !== 'ringing') {
      closeModal();
    }
  }, [closeModal, callStatus]);

  return (
    <DialPadModal
      isOpen={isModalOpen}
      onClose={handleClose}
      phoneNumber={phoneNumber}
      setPhoneNumber={handlePhoneNumberChange}
      onMakeCall={handleMakeCall}
      callStatus={callStatus}
      callDuration={callDuration}
      callError={callError}
      isMuted={isMuted}
      onCall={() => handleMakeCall(phoneNumber)}
      onHangup={callManager?.hangup}
      onAccept={callManager?.accept}
      onReject={callManager?.reject}
      onMute={callManager?.toggleMute}
      onDTMF={callManager?.sendDTMF}
      audioRecorder={audioRecorder}
    />
  );
}
