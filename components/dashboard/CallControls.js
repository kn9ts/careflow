import React from "react";

export default function CallControls({
  callStatus,
  onCall,
  onHangup,
  onAccept,
  onReject,
  onMute,
  isMuted,
}) {
  const isCallActive = callStatus === "connected";
  const isIncomingCall = callStatus === "incoming";
  const isCalling = callStatus === "connecting" || callStatus === "ringing";
  const isReady = callStatus === "ready" || callStatus === "idle";

  return (
    <div className="bg-background-card rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Call Controls</h2>
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
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Accept Call
              </button>
              <button
                onClick={onReject}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Reject Call
              </button>
            </div>
          ) : isCallActive ? (
            <button
              onClick={onHangup}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              End Call
            </button>
          ) : (
            <button
              onClick={onCall}
              className="w-full px-6 py-3 bg-primary-red text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isCalling}
            >
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
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isMuted
                  ? "bg-yellow-600 text-white hover:bg-yellow-700"
                  : "bg-gray-600 text-white hover:bg-gray-700"
              }`}
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>

            <button
              className="w-full px-4 py-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isCallActive}
            >
              Keypad (DTMF)
            </button>

            <button
              className="w-full px-4 py-2 bg-purple-600/80 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isCallActive}
            >
              Hold (soon)
            </button>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isCallActive ? "bg-green-400" : "bg-gray-400"
              }`}
            />
            <span>Line Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isMuted ? "bg-yellow-400" : "bg-gray-400"
              }`}
            />
            <span>{isMuted ? "Muted" : "Unmuted"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isReady ? "bg-blue-400" : "bg-gray-400"
              }`}
            />
            <span>{isReady ? "Ready" : "Busy"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
