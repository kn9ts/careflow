/**
 * Analytics API
 * Handles all analytics-related API calls
 */

/**
 * Get the base URL for API calls
 * In server components, we need an absolute URL for fetch
 * @returns {string} Base URL
 */
function getBaseUrl() {
  // In browser environment, use relative URLs
  if (typeof window !== 'undefined') {
    return '';
  }

  // In server environment, construct absolute URL
  // Use VERCEL_URL for Vercel deployments, otherwise localhost
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  // For local development or other environments
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}

/**
 * Fetch analytics data for the authenticated user
 * @param {string} authToken - Authentication token
 * @returns {Promise<Object>} Analytics data
 */
export async function fetchAnalytics(authToken) {
  if (!authToken) {
    throw new Error('Authentication token is required');
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/analytics`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || data.error || 'Failed to fetch analytics');
  }

  return data.data || data;
}
