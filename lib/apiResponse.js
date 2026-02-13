/**
 * API Response Utilities
 *
 * Provides standardized response formatting for API endpoints.
 */

/**
 * Create a success response
 * @param {any} data - Response data
 * @param {object} options - Response options
 * @returns {Response} Next.js Response
 */
export function successResponse(data, options) {
  const status = options && options.status ? options.status : 200;
  const body = JSON.stringify({
    success: true,
    data: data || {},
    message: options && options.message ? options.message : null,
    meta: options && options.meta ? options.meta : null,
    timestamp: new Date().toISOString(),
  });
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create an error response
 * @param {string} message - Error message
 * @param {object} options - Response options
 * @returns {Response} Next.js Response
 */
export function errorResponse(message, options) {
  const status = options && options.status ? options.status : 500;
  const code = options && options.code ? options.code : 'ERROR';
  const body = JSON.stringify({
    success: false,
    error: {
      message,
      code,
      details: options && options.details ? options.details : null,
      timestamp: new Date().toISOString(),
    },
  });
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handle authentication result
 * @param {object} authResult - Authentication result
 * @returns {Response|null} Error response or null if successful
 */
export function handleAuthResult(authResult) {
  if (authResult && authResult.success) {
    return null;
  }
  const errorMsg = authResult && authResult.error ? authResult.error : 'Unauthorized';
  const errorStatus = authResult && authResult.status ? authResult.status : 401;
  return errorResponse(errorMsg, { status: errorStatus, code: 'UNAUTHORIZED' });
}

export default {
  successResponse,
  errorResponse,
  handleAuthResult,
};
