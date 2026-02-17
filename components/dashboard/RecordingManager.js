'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import RecordingPlayer from './RecordingPlayer';
import { ErrorToast } from '@/components/common';

/**
 * Recording Manager Component
 *
 * Provides UI for managing call recordings:
 * - List all recordings with filters
 * - Play recordings
 * - Download recordings
 * - Delete recordings
 * - View recording metadata
 */

export default function RecordingManager({
  recordings: propRecordings,
  _currentRecording,
  _isRecording,
  _onRefresh,
  recordingsLoading: propLoading,
}) {
  const router = useRouter();
  const { token } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    direction: '',
    status: '',
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [toast, setToast] = useState({ visible: false, message: '' });

  // Use prop recordings if provided, otherwise use internal state
  const effectiveRecordings = propRecordings !== undefined ? propRecordings : recordings;
  const effectiveLoading = propLoading !== undefined ? propLoading : loading;

  // Update internal state from props
  useEffect(() => {
    if (propRecordings !== undefined) {
      setRecordings(propRecordings);
    }
  }, [propRecordings]);

  // Fetch recordings if no prop recordings
  const fetchRecordings = useCallback(async () => {
    // Don't fetch if we have prop recordings or loading is controlled by parent
    if (propRecordings !== undefined || propLoading !== undefined) return;

    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.direction) params.append('direction', filters.direction);
      if (filters.status) params.append('status', filters.status);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await fetch(`/api/recordings?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle unauthorized - redirect to login
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to fetch recordings');
      }

      setRecordings(data.data.recordings || []);
      setPagination(
        data.data.pagination || {
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        }
      );
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError(err?.message || err || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [token, filters, propRecordings, propLoading, router]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  // Handle delete recording
  const handleDelete = async (recordingId) => {
    if (!confirm('Are you sure you want to delete this recording?')) {
      return;
    }

    try {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete recording');
      }

      // Refresh list
      fetchRecordings();
    } catch (err) {
      console.error('Error deleting recording:', err);
      setToast({
        visible: true,
        message: `Failed to delete recording: ${err?.message || err || 'Unknown error'}`,
      });
    }
  };

  // Handle download recording
  const handleDownload = async (recording) => {
    try {
      // Get signed URL for download
      const response = await fetch(`/api/recordings/${recording.id}?includeUrl=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      // Download the file
      if (data.data.recording.downloadUrl) {
        const link = document.createElement('a');
        link.href = data.data.recording.downloadUrl;
        link.download = `recording-${recording.id}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Error downloading recording:', err);
      setToast({
        visible: true,
        message: `Failed to download recording: ${err?.message || err || 'Unknown error'}`,
      });
    }
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString) => new Date(dateString).toLocaleString();

  return (
    <div className="bg-background-card rounded-xl border border-white/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Recordings</h2>
          <p className="text-sm text-gray-400">Manage your WebRTC call recordings</p>
        </div>
        <button
          onClick={fetchRecordings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
          className="px-4 py-2 bg-background-input border border-white/10 rounded-lg text-white"
        >
          <option value="">All Types</option>
          <option value="call">Calls</option>
          <option value="voicemail">Voicemails</option>
        </select>

        <select
          value={filters.direction}
          onChange={(e) => setFilters({ ...filters, direction: e.target.value, page: 1 })}
          className="px-4 py-2 bg-background-input border border-white/10 rounded-lg text-white"
        >
          <option value="">All Directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="px-4 py-2 bg-background-input border border-white/10 rounded-lg text-white"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Recordings List */}
      <div className="space-y-4">
        {effectiveLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-red" />
          </div>
        ) : effectiveRecordings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No recordings found</div>
        ) : (
          effectiveRecordings.map((recording) => (
            <div
              key={recording.id}
              className="flex items-center justify-between bg-background-input/50 rounded-lg p-4 border border-white/5"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      recording.direction === 'inbound'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {recording.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                  </span>
                  <span className="text-sm text-gray-400">{formatDate(recording.recordedAt)}</span>
                  {recording.isListened && (
                    <span className="text-xs text-gray-500">(Listened)</span>
                  )}
                </div>
                <div className="text-white">
                  <span className="text-gray-400">From: </span>
                  {recording.from}
                  <span className="mx-2 text-gray-500">→</span>
                  <span className="text-gray-400">To: </span>
                  {recording.to}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Duration: {formatDuration(recording.duration)} | Size:{' '}
                  {(recording.fileSize / 1024 / 1024).toFixed(2)} MB | Format:{' '}
                  {recording.format.toUpperCase()}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => {
                    setSelectedRecording(recording);
                    setIsPlayerOpen(true);
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  disabled={!recording.accessUrl}
                >
                  Play
                </button>

                <button
                  onClick={() => handleDownload(recording)}
                  className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors text-sm"
                  disabled={!recording.accessUrl}
                >
                  Download
                </button>

                <button
                  onClick={() => handleDelete(recording.id)}
                  className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={!pagination.hasPrevPage}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-400">
            Page {filters.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={!pagination.hasNextPage}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Recording Player Modal */}
      <RecordingPlayer
        recording={selectedRecording}
        isOpen={isPlayerOpen}
        onClose={() => {
          setIsPlayerOpen(false);
          setSelectedRecording(null);
        }}
        onDelete={handleDelete}
        onDownload={handleDownload}
      />

      {/* Error Toast Notification */}
      <ErrorToast
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast({ visible: false, message: '' })}
      />
    </div>
  );
}
