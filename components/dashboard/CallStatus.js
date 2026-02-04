import React from "react";

export default function CallStatus({ status, duration, phoneNumber }) {
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getStatusText = (status) => {
    switch (status) {
      case "idle":
        return "Ready to make calls";
      case "connecting":
        return "Connecting...";
      case "ringing":
        return "Ringing...";
      case "connected":
        return "Connected";
      case "disconnected":
        return "Call ended";
      case "incoming":
        return "Incoming call";
      default:
        return "Status unknown";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "idle":
        return "text-green-400";
      case "connecting":
        return "text-yellow-400";
      case "ringing":
        return "text-blue-400";
      case "connected":
        return "text-green-400";
      case "disconnected":
        return "text-gray-400";
      case "incoming":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="bg-background-card rounded-xl border border-white/10 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Call Status</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Status</span>
          <span className={`font-medium ${getStatusColor(status)}`}>
            {getStatusText(status)}
          </span>
        </div>

        {phoneNumber && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Phone Number</span>
            <span className="font-medium text-white">{phoneNumber}</span>
          </div>
        )}

        {status === "connected" && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Duration</span>
            <span className="font-medium text-white">
              {formatDuration(duration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
