/**
 * useAnalytics Hook
 * Manages analytics data fetching and state
 * Following separation of concerns - data fetching only
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchAnalytics } from '@/lib/api/analytics';

export function useAnalytics(authToken) {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(
    async (token = authToken) => {
      if (!token) {
        setError('Authentication token is required');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchAnalytics(token);
        setAnalytics(data);
        return data;
      } catch (err) {
        setError(err.message);
        return null;
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

  // Refresh analytics
  const refresh = useCallback(() => {
    fetch(authToken);
  }, [fetch, authToken]);

  return {
    analytics,
    isLoading,
    error,
    fetch,
    refresh,
    setAnalytics,
  };
}
