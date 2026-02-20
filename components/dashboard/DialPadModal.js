'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { X, Phone } from 'lucide-react';
import DialPad from './DialPad';
import CallStatus from './CallStatus';
import CallControls from './CallControls';

export default function DialPadModal({
  isOpen,
  onClose,
  phoneNumber,
  setPhoneNumber,
  onMakeCall,
  callStatus,
  callDuration,
  callError,
  isMuted,
  onCall,
  onHangup,
  onAccept,
  onReject,
  onMute,
  onDTMF,
  audioRecorder,
  // Additional props for enhanced CallStatus
  connectionState,
  onRetry,
  care4Id,
  isAuthenticated,
  authLoading,
  serviceStatus,
}) {
  const closeButtonRef = useRef(null);
  const modalRef = useRef(null);

  // Handle escape key to close modal
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Add/remove event listener for keyboard navigation
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Focus the close button when modal opens for accessibility
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  // Don't render if not open
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCall = () => {
    if (phoneNumber && callStatus !== 'connected') {
      onMakeCall(phoneNumber);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Dial Pad"
      onClick={handleBackdropClick}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Modal container - removed overflow-hidden to prevent clipping */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-4xl mx-4 bg-background-card rounded-2xl shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with proper z-index for close button */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 relative z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-red/20 rounded-lg">
              <Phone className="w-5 h-5 text-primary-red" />
            </div>
            <h2 className="text-lg font-semibold text-white">Dial Pad</h2>
          </div>
          {/* Enhanced close button with better visibility and accessibility */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="
              group
              relative
              flex items-center justify-center
              w-10 h-10
              bg-white/5
              hover:bg-red-500/20
              active:bg-red-500/30
              border border-white/10
              hover:border-red-500/50
              rounded-xl
              transition-all duration-200
              cursor-pointer
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-red-500
              focus-visible:ring-offset-2
              focus-visible:ring-offset-background-card
            "
            aria-label="Close dial pad"
            title="Close (Esc)"
          >
            <X
              className="
                w-5 h-5
                text-gray-400
                group-hover:text-red-400
                group-focus-visible:text-red-400
                transition-colors duration-200
              "
            />
            {/* Tooltip for better UX */}
            <span
              className="
                absolute -bottom-8 left-1/2 -translate-x-1/2
                px-2 py-1
                bg-gray-900 text-white text-xs
                rounded opacity-0
                group-hover:opacity-100
                transition-opacity duration-200
                pointer-events-none
                whitespace-nowrap
              "
            >
              Press Esc to close
            </span>
          </button>
        </div>

        {/* Two column layout: DialPad on left, CallStatus + CallControls on right */}
        <div className="flex flex-col md:flex-row max-h-[calc(90vh-80px)] overflow-y-auto">
          {/* Left: DialPad */}
          <div className="w-full md:w-1/2 p-4 md:p-6 md:border-r border-white/10">
            <DialPad
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              disabled={callStatus === 'connected'}
              placeholder="Enter phone number or CareFlow ID"
              helpText="Tip: include country code"
            />

            {/* Call button */}
            <div className="mt-4">
              <button
                onClick={handleCall}
                disabled={!phoneNumber || callStatus === 'connected' || callStatus === 'connecting'}
                className="w-full py-4 bg-gradient-to-r from-primary-red to-primary-blue text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-red focus-visible:ring-offset-2 focus-visible:ring-offset-background-card"
              >
                {callStatus === 'connecting' ? 'Calling...' : 'Call'}
              </button>
            </div>
          </div>

          {/* Right: Call Status + Quick Stats */}
          <div className="w-full md:w-1/2 p-4 md:p-6 space-y-6">
            <CallStatus
              status={callStatus}
              duration={callDuration}
              phoneNumber={phoneNumber}
              error={callError}
              connectionState={connectionState}
              onRetry={onRetry}
              care4Id={care4Id}
              isAuthenticated={isAuthenticated}
              authLoading={authLoading}
              serviceStatus={serviceStatus}
            />

            <CallControls
              callStatus={callStatus}
              onCall={onCall}
              onHangup={onHangup}
              onAccept={onAccept}
              onReject={onReject}
              onMute={onMute}
              onDTMF={onDTMF}
              isMuted={isMuted}
              isRecording={audioRecorder?.isRecording}
              isRecordingSupported={audioRecorder?.recordingSupported}
              recordingDuration={audioRecorder?.recordingDuration}
              onStartRecording={audioRecorder?.startRecording}
              onStopRecording={audioRecorder?.stopRecording}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
