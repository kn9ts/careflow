"use client";

import React, { useEffect, useCallback } from "react";
import { X, Phone } from "lucide-react";
import DialPad from "./DialPad";
import CallStatus from "./CallStatus";
import CallControls from "./CallControls";

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
  audioRecorder,
}) {
  // Handle escape key to close modal
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  // Add/remove event listener for keyboard navigation
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
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
    if (phoneNumber && callStatus !== "connected") {
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

      {/* Modal container - removed border */}
      <div
        className="relative z-10 w-full max-w-4xl mx-4 bg-background-card rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-red/20 rounded-lg">
              <Phone className="w-5 h-5 text-primary-red" />
            </div>
            <h2 className="text-lg font-semibold text-white">Dial Pad</h2>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              console.log("Close button clicked");
              onClose();
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dial pad"
          >
            <X className="w-5 h-5 text-white transition-colors" />
          </button>
        </div>

        {/* Two column layout: DialPad on left, CallStatus + CallControls on right */}
        <div className="flex">
          {/* Left: DialPad */}
          <div className="w-1/2 p-6 border-r border-white/10">
            <DialPad
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              disabled={callStatus === "connected"}
              placeholder="Enter phone number or CareFlow ID"
              helpText="Tip: include country code"
            />

            {/* Call button */}
            <div className="mt-4">
              <button
                onClick={handleCall}
                disabled={
                  !phoneNumber ||
                  callStatus === "connected" ||
                  callStatus === "connecting"
                }
                className="w-full py-4 bg-gradient-to-r from-primary-red to-primary-blue text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {callStatus === "connecting" ? "Calling..." : "Call"}
              </button>
            </div>
          </div>

          {/* Right: Call Status + Quick Stats */}
          <div className="w-1/2 p-6 space-y-6">
            <CallStatus
              status={callStatus}
              duration={callDuration}
              phoneNumber={phoneNumber}
              error={callError}
            />

            <CallControls
              callStatus={callStatus}
              onCall={onCall}
              onHangup={onHangup}
              onAccept={onAccept}
              onReject={onReject}
              onMute={onMute}
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

      {/* Inline styles for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
