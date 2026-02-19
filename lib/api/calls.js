/**
 * Calls API
 * Handles all call-related API calls
 */

/**
 * Fetch call history for the authenticated user
 * @param {string} authToken - Authentication token
 * @param {Object} options - Options for filtering
 * @param {string} options.startDate - Start date filter (ISO string)
 * @param {string} options.endDate - End date filter (ISO string)
 * @param {string} options.type - Type filter ('call' or 'voicemail')
 * @param {number} options.page - Page number
 * @param {number} options.limit - Results per page
 * @returns {Promise<Object>} Call history data
 */
export async function fetchCallHistory(authToken, options = {}) {
  if (!authToken) {
    throw new Error('Authentication token is required');
  }

  const params = new URLSearchParams();
  if (options.startDate) params.set('startDate', options.startDate);
  if (options.endDate) params.set('endDate', options.endDate);
  if (options.type) params.set('type', options.type);
  if (options.page) params.set('page', options.page.toString());
  if (options.limit) params.set('limit', options.limit.toString());

  const queryString = params.toString();
  const url = queryString ? `/api/calls/history?${queryString}` : '/api/calls/history';

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || data.error || 'Failed to fetch call history');
  }

  return data.data || data;
}

/**
 * Fetch today's call statistics
 * @param {string} authToken - Authentication token
 * @returns {Promise<Object>} Today's stats with total calls and talk time
 */
export async function fetchTodayStats(authToken) {
  if (!authToken) {
    throw new Error('Authentication token is required');
  }

  // Get start of today in local timezone
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const response = await fetch(
    `/api/calls/history?startDate=${encodeURIComponent(startOfToday)}&endDate=${encodeURIComponent(endOfToday)}&limit=1000`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || data.error || "Failed to fetch today's stats");
  }

  const calls = data.data?.calls || data.data || [];

  // Calculate total talk time (sum of durations)
  const totalTalkTime = calls.reduce((total, call) => total + (call.duration || 0), 0);

  // Return the stats
  return {
    totalCalls: calls.length,
    totalTalkTime: Math.round(totalTalkTime / 60), // Convert seconds to minutes
  };
}

/**
 * Fetch a specific call by ID
 * @param {string} authToken - Authentication token
 * @param {string} callId - Call ID
 * @returns {Promise<Object>} Call data
 */
export async function fetchCallById(authToken, callId) {
  if (!authToken) {
    throw new Error('Authentication token is required');
  }

  const response = await fetch(`/api/calls/${callId}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to fetch call');
  }

  return data.data;
}
