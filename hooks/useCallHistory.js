/**
 * useCallHistory Hook
 * Manages call history data fetching and state
 * Following separation of concerns - data fetching only
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchCallHistory } from '@/lib/api/calls';

export function useCallHistory(authToken) {
  const [callHistory, setCallHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(
    async (token = authToken) => {
      if (!token) {
        setError('Authentication token is required');
        return [];
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchCallHistory(token);
        const calls = data.calls || [];
        setCallHistory(calls);
        return calls;
      } catch (err) {
        setError(err.message);
        return [];
      } finally {
        setIsLoading(false);
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

  // Refresh call history
  const refresh = useCallback(() => {
    fetch(authToken);
  }, [fetch, authToken]);

  // Add a call to the history (for optimistic updates)
  const addCall = useCallback((call) => {
    setCallHistory((prev) => [call, ...prev]);
  }, []);

  // Remove a call from history
  const removeCall = useCallback((callId) => {
    setCallHistory((prev) => prev.filter((c) => c._id !== callId));
  }, []);

  return {
    callHistory,
    isLoading,
    error,
    fetch,
    refresh,
    addCall,
    removeCall,
    setCallHistory,
  };
}

/**
 * Utility functions for call history
 */
export function formatCallType(type) {
  const typeMap = {
    incoming: 'Incoming',
    outgoing: 'Outgoing',
    missed: 'Missed',
    voicemail: 'Voicemail',
  };
  return typeMap[type] || type;
}

export function formatCallDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getCallIcon(type) {
  const iconMap = {
    incoming: '📥',
    outgoing: '📤',
    missed: '❌',
    voicemail: '📩',
  };
  return iconMap[type] || '📞';
}
