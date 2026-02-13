import React from 'react';

export default function Analytics({ data, onRefresh }) {
  if (!data) {
    return (
      <div className="bg-background-card rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Analytics</h2>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-background-input rounded-lg p-6 animate-pulse">
              <div className="h-3 w-20 bg-white/10 rounded mb-3" />
              <div className="h-6 w-14 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const analytics = data.analytics || data;

  return (
    <div className="bg-background-card rounded-xl border border-white/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Analytics</h2>
          <p className="text-sm text-gray-400">Updated from server-side aggregates</p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-background-input rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Calls</p>
              <p className="text-2xl font-bold text-white">{analytics.totalCalls}</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-background-input rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Voicemails</p>
              <p className="text-2xl font-bold text-white">{analytics.totalVoicemails}</p>
            </div>
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-background-input rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Duration</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(analytics.totalDuration / 60)} min
              </p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-background-input rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Success Rate</p>
              <p className="text-2xl font-bold text-white">{analytics.successRate}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-background-input rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Today's Calls</h3>
          <div className="text-3xl font-bold text-white">{analytics.todayCalls}</div>
          <p className="text-gray-400 text-sm mt-2">Calls made today</p>
        </div>

        <div className="bg-background-input rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Average Duration</h3>
          <div className="text-3xl font-bold text-white">{analytics.averageCallDuration} sec</div>
          <p className="text-gray-400 text-sm mt-2">Per call average</p>
        </div>
      </div>

      {/* Recent Calls */}
      {analytics.recentCalls && analytics.recentCalls.length > 0 ? (
        <div className="bg-background-input rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Calls</h3>
          <div className="space-y-3">
            {analytics.recentCalls.slice(0, 5).map((call, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-3 bg-background-card rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-red rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {call.direction === 'inbound' ? 'IN' : 'OUT'}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {call.from} → {call.to}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {new Date(call.recordedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">
                    {Math.floor(call.duration / 60)}:
                    {(call.duration % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-gray-400 text-sm capitalize">
                    {call.callStatus || (call.duration > 0 ? 'completed' : 'missed')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-background-input rounded-lg p-6 text-gray-400">No recent calls yet.</div>
      )}
    </div>
  );
}
