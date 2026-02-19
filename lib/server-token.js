/**
 * Server-side Token Management
 *
 * Utilities for retrieving and managing auth tokens in server components
 * and API routes using cookies.
 */

import { cookies } from 'next/headers';

const TOKEN_COOKIE_NAME = 'careflow_token';

/**
 * Get auth token from cookies (server-side)
 * Works in Server Components, Server Actions, and API Routes
 *
 * @returns {Promise<string|null>} Auth token or null if not present
 */
export async function getTokenFromCookies() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(TOKEN_COOKIE_NAME);

    if (tokenCookie && tokenCookie.value) {
      return tokenCookie.value;
    }

    return null;
  } catch (error) {
    console.error('Error getting token from cookies:', error);
    return null;
  }
}

/**
 * Set auth token cookie (server-side)
 * Should be called after successful login
 *
 * @param {string} token - Auth token to set
 * @param {Object} options - Cookie options
 * @returns {Promise<Response>} Response from setting cookie
 */
export async function setTokenCookie(token, options = {}) {
  const {
    maxAge = 60 * 60 * 24 * 7, // 1 week
    httpOnly = true,
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'lax',
    path = '/',
  } = options;

  const cookieStore = await cookies();

  return cookieStore.set(TOKEN_COOKIE_NAME, token, {
    maxAge,
    httpOnly,
    secure,
    sameSite,
    path,
  });
}

/**
 * Clear auth token cookie (server-side)
 * Should be called on logout
 *
 * @returns {Promise<Response>} Response from clearing cookie
 */
export async function clearTokenCookie() {
  const cookieStore = await cookies();

  return cookieStore.delete(TOKEN_COOKIE_NAME, {
    path: '/',
  });
}

/**
 * Check if user is authenticated via cookie
 *
 * @returns {Promise<boolean>} True if authenticated
 */
export async function isAuthenticated() {
  const token = await getTokenFromCookies();
  return !!token;
}
