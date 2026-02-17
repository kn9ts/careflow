/**
 * useRecordings Hook
 * Manages recordings data fetching and state
 * Following separation of concerns - data fetching only
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchRecordings, deleteRecording } from '@/lib/api/recordings';

export function useRecordings(authToken) {
  const [recordings, setRecordings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch recordings
  const fetch = useCallback(
    async (token = authToken) => {
      if (!token) {
        setError('Authentication token is required');
        return [];
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchRecordings(token);
        setRecordings(data);
        return data;
      } catch (err) {
        setError(err?.message || err || 'Unknown error');
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [authToken]
  );

  // Delete recording
  const remove = useCallback(
    async (recordingId) => {
      if (!authToken) {
        setError('Authentication token is required');
        return false;
      }

      try {
        await deleteRecording(authToken, recordingId);
        setRecordings((prev) => prev.filter((r) => r._id !== recordingId));
        return true;
      } catch (err) {
        setError(err?.message || err || 'Unknown error');
        return false;
      }
    },
    [authToken]
  );

  // Initial fetch
  useEffect(() => {
    if (authToken) {
      fetch(authToken);
    }
  }, [authToken, fetch]);

  // Refresh recordings
  const refresh = useCallback(() => {
    fetch(authToken);
  }, [fetch, authToken]);

  return {
    recordings,
    isLoading,
    error,
    fetch,
    remove,
    refresh,
    setRecordings,
  };
}

/**
 * useRecordingUpload Hook
 * Manages recording upload state and operations
 */
export function useRecordingUpload(_authToken) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const resetUpload = useCallback(() => {
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
  }, []);

  return {
    uploadProgress,
    setUploadProgress,
    isUploading,
    setIsUploading,
    uploadError,
    setUploadError,
    resetUpload,
  };
}
