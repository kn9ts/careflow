/**
 * Calls API
 * Handles all call-related API calls
 */

/**
 * Fetch call history for the authenticated user
 * @param {string} authToken - Authentication token
 * @returns {Promise<Object>} Call history data
 */
export async function fetchCallHistory(authToken) {
  if (!authToken) {
    throw new Error('Authentication token is required');
  }

  const response = await fetch('/api/calls/history', {
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
