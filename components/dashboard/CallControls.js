import React, { useMemo, useCallback, useState } from 'react';
import { Disc, Square, Mic, MicOff, Phone, PhoneOff, CircleDot, Grid3X3, X } from 'lucide-react';

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
  if (isCalling) return 'badge-info';
  return 'badge-neutral';
};

// Memoized help text
const getHelpText = (isIncomingCall, isCallActive) => {
  if (isIncomingCall) return 'Incoming call detected. Accept or reject.';
  if (isCallActive) return 'Use controls to manage your live call.';
  return 'Enter a number to start a call.';
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

  return (
    <div className="card">
      {/* Header with status */}
      <div className="card-header border-b-0 pb-0 mb-4">
        <h2 className="card-title">Quick Stats</h2>
        <div className="flex items-center gap-2">
          {/* Recording Status Indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-full animate-pulse">
              <CircleDot className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-400 font-medium">REC {formattedDuration}</span>
            </div>
          )}
          <span className={`badge ${statusBadgeClass}`}>{statusText}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Call Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Call Actions
          </h3>

          {isIncomingCall ? (
            <div className="space-y-3">
              <button
                onClick={handleAccept}
                className="btn-success flex items-center justify-center gap-2"
                aria-label="Accept incoming call"
              >
                <Phone className="w-5 h-5" />
                Accept Call
              </button>
              <button
                onClick={handleReject}
                className="btn-danger flex items-center justify-center gap-2"
                aria-label="Reject incoming call"
              >
                <PhoneOff className="w-5 h-5" />
                Reject Call
              </button>
            </div>
          ) : isCallActive ? (
            <button
              onClick={handleHangup}
              className="btn-danger flex items-center justify-center gap-2"
              aria-label="End current call"
            >
              <PhoneOff className="w-5 h-5" />
              End Call
            </button>
          ) : (
            <button
              onClick={handleCall}
              className="btn-primary flex items-center justify-center gap-2"
              disabled={isCalling}
              aria-label={isCalling ? 'Calling...' : 'Make a call'}
            >
              <Phone className="w-5 h-5" />
              {isCalling ? 'Calling...' : 'Make Call'}
            </button>
          )}
          <p className="text-xs text-gray-400 leading-relaxed">{helpText}</p>
        </div>

        {/* Call Features */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Call Features
          </h3>

          <div className="space-y-2">
            {/* Mute Button */}
            <button
              onClick={handleMute}
              className={`w-full px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
                ${
                  isMuted
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700 active:scale-[0.98]'
                    : 'bg-gray-600 text-white hover:bg-gray-700 active:scale-[0.98]'
                }
                focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-card`}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              aria-pressed={isMuted}
            >
              {isMuted ? (
                <>
                  <MicOff className="w-4 h-4" />
                  Unmute
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Mute
                </>
              )}
            </button>

            {/* Recording Controls */}
            {isRecordingSupported && (
              <>
                {isCallActive ? (
                  isRecording ? (
                    <button
                      onClick={handleStopRecording}
                      className="w-full px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-card"
                      aria-label="Stop recording"
                    >
                      <Square className="w-4 h-4" />
                      Stop Recording
                    </button>
                  ) : (
                    <button
                      onClick={handleStartRecording}
                      className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-card"
                      aria-label="Start recording"
                    >
                      <Disc className="w-4 h-4" />
                      Start Recording
                    </button>
                  )
                ) : (
                  <button
                    className="w-full px-4 py-2.5 bg-gray-600/50 text-gray-400 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                    disabled
                    aria-label="Recording requires active call"
                  >
                    <Disc className="w-4 h-4" />
                    {isRecording ? 'Recording...' : 'Recording (call required)'}
                  </button>
                )}
              </>
            )}

            {/* DTMF Keypad Toggle */}
            <button
              onClick={toggleDTMFKeypad}
              className={`w-full px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
                ${
                  showDTMFKeypad
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-600/80 text-white hover:bg-blue-700'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-card`}
              disabled={!isCallActive || disabled}
              aria-label={showDTMFKeypad ? 'Close DTMF keypad' : 'Open DTMF keypad'}
              aria-expanded={showDTMFKeypad}
            >
              {showDTMFKeypad ? (
                <>
                  <X className="w-4 h-4" />
                  Close Keypad
                </>
              ) : (
                <>
                  <Grid3X3 className="w-4 h-4" />
                  Keypad (DTMF)
                </>
              )}
            </button>

            {/* DTMF Keypad */}
            {showDTMFKeypad && isCallActive && (
              <div className="mt-2 p-4 bg-background-input rounded-xl border border-white/10">
                <p className="text-xs text-gray-400 mb-3 text-center">
                  Press digits to send DTMF tones
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {dtmfDigits.map((digit) => (
                    <button
                      key={digit}
                      onClick={() => handleDTMFPress(digit)}
                      className="aspect-square bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl flex items-center justify-center text-white text-lg font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-red focus-visible:ring-offset-2 focus-visible:ring-offset-background-input"
                      aria-label={`Send DTMF tone ${digit}`}
                    >
                      {digit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hold Button (placeholder) */}
            <button
              className="w-full px-4 py-2.5 bg-purple-600/50 text-gray-300 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
              disabled
              aria-label="Hold feature coming soon"
            >
              Hold (coming soon)
            </button>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
          {/* Line Active */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                isCallActive ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-gray-500'
              }`}
              aria-hidden="true"
            />
            <span>Line {isCallActive ? 'Active' : 'Inactive'}</span>
          </div>
          {/* Mute Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                isMuted ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' : 'bg-gray-500'
              }`}
              aria-hidden="true"
            />
            <span>{isMuted ? 'Muted' : 'Unmuted'}</span>
          </div>
          {/* Ready Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                isReady ? 'bg-blue-400 shadow-lg shadow-blue-400/50' : 'bg-gray-500'
              }`}
              aria-hidden="true"
            />
            <span>{isReady ? 'Ready' : 'Busy'}</span>
          </div>
          {/* Recording Status */}
          {isRecording && (
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50 animate-pulse"
                aria-hidden="true"
              />
              <span className="text-red-400 font-medium">Recording</span>
            </div>
          )}
        </div>

        {/* Recording Progress Bar */}
        {isRecording && (
          <div className="mt-4">
            <div className="h-1.5 bg-red-500/20 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 animate-pulse" style={{ width: '100%' }} />
            </div>
            <p className="text-xs text-center text-red-400 mt-2">
              Recording in progress... Click &quot;Stop Recording&quot; when done
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(CallControls);
