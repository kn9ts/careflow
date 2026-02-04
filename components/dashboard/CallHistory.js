import React, { useState } from "react";

export default function CallHistory({ calls, onRefresh }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: "recordedAt",
    direction: "desc",
  });
  const itemsPerPage = 10;
  const totalCalls = calls.length;

  const filteredCalls = calls.filter((call) => {
    if (filter === "all") return true;
    if (filter === "incoming") return call.direction === "inbound";
    if (filter === "outgoing") return call.direction === "outbound";
    if (filter === "missed") return call.status === "no-answer";
    return true;
  });

  const sortedCalls = [...filteredCalls].sort((a, b) => {
    const { key, direction } = sortConfig;
    let aValue = a[key];
    let bValue = b[key];

    if (key === "caller") {
      aValue = a.direction === "inbound" ? a.from : a.to;
      bValue = b.direction === "inbound" ? b.from : b.to;
    }

    if (key === "recordedAt") {
      aValue = new Date(a.recordedAt).getTime();
      bValue = new Date(b.recordedAt).getTime();
    }

    if (key === "duration") {
      aValue = a.duration || 0;
      bValue = b.duration || 0;
    }

    if (key === "status") {
      aValue = a.status || "";
      bValue = b.status || "";
    }

    if (aValue < bValue) return direction === "asc" ? -1 : 1;
    if (aValue > bValue) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedCalls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCalls = sortedCalls.slice(startIndex, endIndex);

  const formatDuration = (seconds) => {
    if (!seconds) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const getStatusBadge = (call) => {
    if (call.status === "completed") {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
          Completed
        </span>
      );
    } else if (call.status === "no-answer") {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
          Missed
        </span>
      );
    } else if (call.status === "failed") {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
          Failed
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
        {call.status}
      </span>
    );
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  const sortIndicator = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  return (
    <div className="bg-background-card rounded-xl border border-white/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Call History</h2>
          <p className="text-sm text-gray-400">
            {totalCalls} total · {filteredCalls.length} filtered
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { key: "all", label: "All" },
          { key: "incoming", label: "Incoming" },
          { key: "outgoing", label: "Outgoing" },
          { key: "missed", label: "Missed" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setFilter(tab.key);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === tab.key
                ? "bg-primary-red text-white"
                : "bg-gray-600 text-white hover:bg-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Call List */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-300">
          <thead className="border-b border-white/10 text-xs uppercase text-gray-400">
            <tr>
              <th className="py-3 pr-4">
                <button
                  className="flex items-center gap-2 hover:text-white"
                  onClick={() => handleSort("recordedAt")}
                >
                  Date {sortIndicator("recordedAt")}
                </button>
              </th>
              <th className="py-3 pr-4">
                <button
                  className="flex items-center gap-2 hover:text-white"
                  onClick={() => handleSort("caller")}
                >
                  Caller {sortIndicator("caller")}
                </button>
              </th>
              <th className="py-3 pr-4">
                <button
                  className="flex items-center gap-2 hover:text-white"
                  onClick={() => handleSort("duration")}
                >
                  Duration {sortIndicator("duration")}
                </button>
              </th>
              <th className="py-3">
                <button
                  className="flex items-center gap-2 hover:text-white"
                  onClick={() => handleSort("status")}
                >
                  Status {sortIndicator("status")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentCalls.length > 0 ? (
              currentCalls.map((call, index) => (
                <tr
                  key={index}
                  className="border-b border-white/5 hover:bg-background-input/60 transition-colors"
                >
                  <td className="py-4 pr-4">
                    <div className="text-white">
                      {formatDate(call.recordedAt)}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {call.direction}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="text-white">
                      {call.direction === "inbound" ? call.from : call.to}
                    </div>
                    <div className="text-xs text-gray-500">
                      {call.from} → {call.to}
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-white">
                    {formatDuration(call.duration)}
                  </td>
                  <td className="py-4">{getStatusBadge(call)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-10 text-center text-gray-400" colSpan={4}>
                  No calls found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <span className="text-gray-400">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
