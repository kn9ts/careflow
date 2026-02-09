/**
 * Analytics API
 * Handles all analytics-related API calls
 */

/**
 * Fetch analytics data for the authenticated user
 * @param {string} authToken - Authentication token
 * @returns {Promise<Object>} Analytics data
 */
export async function fetchAnalytics(authToken) {
  if (!authToken) {
    throw new Error("Authentication token is required");
  }

  const response = await fetch("/api/analytics", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || data.error || "Failed to fetch analytics",
    );
  }

  return data.data || data;
}
