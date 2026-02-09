/**
 * Recordings API
 * Handles all recording-related API calls
 */

/**
 * Fetch all recordings for the authenticated user
 * @param {string} authToken - Authentication token
 * @returns {Promise<Array>} Array of recordings
 */
export async function fetchRecordings(authToken) {
  if (!authToken) {
    throw new Error("Authentication token is required");
  }

  const response = await fetch("/api/recordings", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to fetch recordings");
  }

  return data.data.recordings || [];
}

/**
 * Delete a recording by ID
 * @param {string} authToken - Authentication token
 * @param {string} recordingId - Recording ID to delete
 * @returns {Promise<Object>} Response data
 */
export async function deleteRecording(authToken, recordingId) {
  if (!authToken) {
    throw new Error("Authentication token is required");
  }

  const response = await fetch(`/api/recordings/${recordingId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to delete recording");
  }

  return data;
}

/**
 * Get a single recording by ID
 * @param {string} authToken - Authentication token
 * @param {string} recordingId - Recording ID
 * @returns {Promise<Object>} Recording data
 */
export async function getRecording(authToken, recordingId) {
  if (!authToken) {
    throw new Error("Authentication token is required");
  }

  const response = await fetch(`/api/recordings/${recordingId}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to fetch recording");
  }

  return data.data;
}
