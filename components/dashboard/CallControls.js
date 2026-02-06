import React from "react";
import {
  Disc,
  Square,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  CircleDot,
} from "lucide-react";

export default function CallControls({
  callStatus,
  onCall,
  onHangup,
  onAccept,
  onReject,
  onMute,
  onStartRecording,
  onStopRecording,
  isMuted,
  isRecording,
  isRecordingSupported,
  recordingDuration = 0,
}) {
  const isCallActive = callStatus === "connected";
  const isIncomingCall = callStatus === "incoming";
  const isCalling = callStatus === "connecting" || callStatus === "ringing";
  const isReady = callStatus === "ready" || callStatus === "idle";

  // Format recording duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-background-card rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Call Controls</h2>
        <div className="flex items-center gap-2">
          {/* Recording Status Indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full animate-pulse">
              <CircleDot className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-400 font-medium">
                REC {formatDuration(recordingDuration)}
              </span>
            </div>
          )}
          <span
            className={`text-xs px-2 py-1 rounded-full border ${
              isCallActive
                ? "border-green-400/40 text-green-300"
                : isIncomingCall
                  ? "border-yellow-400/40 text-yellow-300"
                  : isCalling
                    ? "border-blue-400/40 text-blue-300"
                    : "border-white/10 text-gray-400"
            }`}
          >
            {isCallActive
              ? "Live"
              : isIncomingCall
                ? "Incoming"
                : isCalling
                  ? "Connecting"
                  : isReady
                    ? "Ready"
                    : "Idle"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Call Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Call Actions
          </h3>

          {isIncomingCall ? (
            <div className="space-y-2">
              <button
                onClick={onAccept}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Accept Call
              </button>
              <button
                onClick={onReject}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                Reject Call
              </button>
            </div>
          ) : isCallActive ? (
            <button
              onClick={onHangup}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              End Call
            </button>
          ) : (
            <button
              onClick={onCall}
              className="w-full px-6 py-3 bg-primary-red text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isCalling}
            >
              <Phone className="w-5 h-5" />
              {isCalling ? "Calling..." : "Make Call"}
            </button>
          )}
          <p className="text-xs text-gray-400">
            {isIncomingCall
              ? "Incoming call detected. Accept or reject."
              : isCallActive
                ? "Use controls to manage your live call."
                : "Enter a number to start a call."}
          </p>
        </div>

        {/* Call Features */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Call Features
          </h3>

          <div className="space-y-2">
            <button
              onClick={onMute}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                isMuted
                  ? "bg-yellow-600 text-white hover:bg-yellow-700"
                  : "bg-gray-600 text-white hover:bg-gray-700"
              }`}
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
                      onClick={onStopRecording}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Stop Recording
                    </button>
                  ) : (
                    <button
                      onClick={onStartRecording}
                      className="w-full px-4 py-2 bg-purple-600/80 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Disc className="w-4 h-4" />
                      Start Recording
                    </button>
                  )
                ) : (
                  <button
                    className="w-full px-4 py-2 bg-gray-600/50 text-gray-400 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                    disabled
                  >
                    <Disc className="w-4 h-4" />
                    {isRecording ? "Recording..." : "Recording (call required)"}
                  </button>
                )}
              </>
            )}

            <button
              className="w-full px-4 py-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={!isCallActive}
            >
              Keypad (DTMF)
            </button>

            <button
              className="w-full px-4 py-2 bg-purple-600/80 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={!isCallActive}
            >
              Hold (soon)
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Status Indicators */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
          {/* Line Active */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isCallActive
                  ? "bg-green-400 shadow-lg shadow-green-400/50"
                  : "bg-gray-400"
              }`}
            />
            <span>Line Active</span>
          </div>
          {/* Mute Status */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isMuted
                  ? "bg-yellow-400 shadow-lg shadow-yellow-400/50"
                  : "bg-gray-400"
              }`}
            />
            <span>{isMuted ? "Muted" : "Unmuted"}</span>
          </div>
          {/* Ready Status */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isReady
                  ? "bg-blue-400 shadow-lg shadow-blue-400/50"
                  : "bg-gray-400"
              }`}
            />
            <span>{isReady ? "Ready" : "Busy"}</span>
          </div>
          {/* Recording Status */}
          {isRecording && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50 animate-pulse" />
              <span className="text-red-400 font-medium">Recording</span>
            </div>
          )}
        </div>

        {/* Recording Progress Bar (when recording) */}
        {isRecording && (
          <div className="mt-4">
            <div className="h-2 bg-red-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 animate-pulse"
                style={{ width: "100%" }}
              />
            </div>
            <p className="text-xs text-center text-red-400 mt-1">
              Recording in progress... Click "Stop Recording" when done
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
