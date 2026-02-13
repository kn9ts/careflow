'use client';

import React, { useState } from 'react';
import { Play, Trash2, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import RecordingPlayer from './RecordingPlayer';

export default function CallHistory({ calls, onRefresh }) {
  const { token } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({
    key: 'recordedAt',
    direction: 'desc',
  });
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const itemsPerPage = 10;
  const totalCalls = calls.length;

  const filteredCalls = calls.filter((call) => {
    if (filter === 'all') return true;
    if (filter === 'incoming') return call.direction === 'inbound';
    if (filter === 'outgoing') return call.direction === 'outbound';
    if (filter === 'missed') return call.status === 'no-answer';
    return true;
  });

  const sortedCalls = [...filteredCalls].sort((a, b) => {
    const { key, direction } = sortConfig;
    let aValue = a[key];
    let bValue = b[key];

    if (key === 'caller') {
      aValue = a.direction === 'inbound' ? a.from : a.to;
      bValue = b.direction === 'inbound' ? b.from : b.to;
    }

    if (key === 'recordedAt') {
      aValue = new Date(a.recordedAt).getTime();
      bValue = new Date(b.recordedAt).getTime();
    }

    if (key === 'duration') {
      aValue = a.duration || 0;
      bValue = b.duration || 0;
    }

    if (key === 'status') {
      aValue = a.status || '';
      bValue = b.status || '';
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedCalls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCalls = sortedCalls.slice(startIndex, endIndex);

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date) => new Date(date).toLocaleString();

  const getStatusBadge = (call) => {
    // Derive call status from duration and existing status
    const callStatus =
      call.callStatus ||
      (call.duration > 0
        ? 'completed'
        : call.status === 'no-answer'
          ? 'no-answer'
          : call.status === 'failed'
            ? 'failed'
            : call.status);

    if (callStatus === 'completed') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
          Completed
        </span>
      );
    }
    if (callStatus === 'no-answer' || callStatus === 'missed') {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Missed</span>;
    }
    if (callStatus === 'failed') {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Failed</span>
      );
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">{callStatus}</span>
    );
  };

  const hasRecording = (call) => {
    // Check if call has a recording (callSid exists and duration > 0)
    // Support both `callSid` (from API) and `sid` (legacy)
    const callIdentifier = call.callSid || call.sid;
    return callIdentifier && call.duration > 0;
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const sortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  const openRecording = (call) => {
    setSelectedRecording(call);
    setIsPlayerOpen(true);
  };

  const closeRecording = () => {
    setIsPlayerOpen(false);
    setSelectedRecording(null);
  };

  const handleDeleteRecording = async (recordingId) => {
    if (!token) return;

    setDeletingId(recordingId);
    try {
      const response = await fetch(`/api/calls/${recordingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete recording');
      }

      // Refresh call history after deletion
      onRefresh();
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Failed to delete recording. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadRecording = (recording) => {
    // Support both `callSid` (from API) and `sid` (legacy)
    const recordingSid = recording.callSid || recording.sid;

    // Construct the download URL
    const downloadUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}.mp3`;

    // Create a temporary anchor element for download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `recording-${recordingSid}.mp3`;
    link.setAttribute('Authorization', `Bearer ${token}`);

    // For authenticated downloads, we need to fetch and blob
    fetch(downloadUrl, {
      headers: {
        Authorization: `Basic ${btoa(`${process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`)}`,
      },
    })
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recording-${recordingSid}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((error) => {
        console.error('Error downloading recording:', error);
        alert('Failed to download recording. Please try again.');
      });
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
          { key: 'all', label: 'All' },
          { key: 'incoming', label: 'Incoming' },
          { key: 'outgoing', label: 'Outgoing' },
          { key: 'missed', label: 'Missed' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setFilter(tab.key);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === tab.key
                ? 'bg-primary-red text-white'
                : 'bg-gray-600 text-white hover:bg-gray-700'
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
                  onClick={() => handleSort('recordedAt')}
                >
                  Date {sortIndicator('recordedAt')}
                </button>
              </th>
              <th className="py-3 pr-4">
                <button
                  className="flex items-center gap-2 hover:text-white"
                  onClick={() => handleSort('caller')}
                >
                  Caller {sortIndicator('caller')}
                </button>
              </th>
              <th className="py-3 pr-4">
                <button
                  className="flex items-center gap-2 hover:text-white"
                  onClick={() => handleSort('duration')}
                >
                  Duration {sortIndicator('duration')}
                </button>
              </th>
              <th className="py-3 pr-4">
                <button
                  className="flex items-center gap-2 hover:text-white"
                  onClick={() => handleSort('status')}
                >
                  Status {sortIndicator('status')}
                </button>
              </th>
              <th className="py-3">Actions</th>
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
                    <div className="text-white">{formatDate(call.recordedAt)}</div>
                    <div className="text-xs text-gray-500 capitalize">{call.direction}</div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="text-white">
                      {call.direction === 'inbound' ? call.from : call.to}
                    </div>
                    <div className="text-xs text-gray-500">
                      {call.from} → {call.to}
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-white">{formatDuration(call.duration)}</td>
                  <td className="py-4 pr-4">{getStatusBadge(call)}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      {/* Play Button - Only for calls with recordings */}
                      {hasRecording(call) && (
                        <button
                          onClick={() => openRecording(call)}
                          className="p-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
                          title="Play recording"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}

                      {/* Download Button - Only for calls with recordings */}
                      {hasRecording(call) && (
                        <button
                          onClick={() => handleDownloadRecording(call)}
                          className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                          title="Download recording"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteRecording(call._id || call.sid)}
                        disabled={deletingId === (call._id || call.sid)}
                        className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
                        title="Delete recording"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-10 text-center text-gray-400" colSpan={5}>
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
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Recording Player Modal */}
      <RecordingPlayer
        recording={selectedRecording}
        isOpen={isPlayerOpen}
        onClose={closeRecording}
        onDelete={handleDeleteRecording}
        onDownload={handleDownloadRecording}
      />
    </div>
  );
}
