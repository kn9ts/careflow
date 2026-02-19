'use server';

import { setTokenCookie } from '@/lib/server-token';

/**
 * Set the authentication token cookie from the server
 * This is called after successful client-side login to establish
 * server-side session persistence.
 *
 * @param {string} token - Firebase ID token
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function setAuthCookie(token) {
  try {
    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    await setTokenCookie(token, {
      maxAge: 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to set auth cookie:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear the authentication token cookie
 * Called on logout
 *
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function clearAuthCookie() {
  try {
    await import('@/lib/server-token').then((mod) => mod.clearTokenCookie());
    return { success: true };
  } catch (error) {
    console.error('Failed to clear auth cookie:', error);
    return { success: false, error: error.message };
  }
}
