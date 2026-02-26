/**
 * Token Service
 *
 * Handles token fetching and management for call authentication.
 * Includes deduplication to prevent multiple concurrent requests.
 *
 * Features:
 * - Token fetching with deduplication
 * - Timeout handling
 * - Error mapping
 * - Configurable API endpoint
 */

import { logger } from '../logger';

export const TOKEN_FETCH_TIMEOUT = 30000; // 30 seconds

/**
 * Create a promise that rejects after a timeout
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Error message
 * @returns {Promise} - Promise that rejects after timeout
 */
const timeout = (ms, message) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));

/**
 * Wrap a promise with a timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Error message
 * @returns {Promise} - Promise that rejects after timeout
 */
const withTimeout = (promise, ms, message) => Promise.race([promise, timeout(ms, message)]);

/**
 * Token Service class for managing authentication tokens
 */
export class TokenService {
  /**
   * Create a new TokenService
   * @param {Object} options - Service options
   */
  constructor(options = {}) {
    this._token = options.token || null;
    this._apiEndpoint = options.apiEndpoint || '/api/token';
    this._fetchPromise = null;
    this._timeout = options.timeout || TOKEN_FETCH_TIMEOUT;

    logger.init('TokenService');
  }

  /**
   * Set the authentication token
   * @param {string} token - Authentication token
   */
  setToken(token) {
    this._token = token;
    logger.debug('TokenService', 'Token set');
  }

  /**
   * Get the current token
   * @returns {string|null} Current token
   */
  getToken() {
    return this._token;
  }

  /**
   * Check if token is available
   * @returns {boolean} True if token is set
   */
  hasToken() {
    return !!this._token;
  }

  /**
   * Fetch token info from API with deduplication
   * Uses singleton pattern to prevent concurrent requests
   * @returns {Promise<Object>} Token info from API
   */
  async fetchTokenInfoDeduplicated() {
    if (!this._fetchPromise) {
      this._fetchPromise = this._doFetchTokenInfo();
    }

    try {
      return await withTimeout(
        this._fetchPromise,
        this._timeout,
        `Token fetch timed out after ${this._timeout / 1000} seconds`
      );
    } finally {
      this._fetchPromise = null;
    }
  }

  /**
   * Internal token fetch implementation
   * @returns {Promise<Object>} Token info from API
   * @private
   */
  async _doFetchTokenInfo() {
    if (!this._token) {
      throw new Error('No authentication token available');
    }

    logger.trace('TokenService', `Fetching token info from ${this._apiEndpoint}`);

    let response;
    try {
      response = await fetch(this._apiEndpoint, {
        headers: {
          Authorization: `Bearer ${this._token}`,
        },
      });
    } catch (networkError) {
      logger.error('TokenService', `Network error: ${networkError.message}`);
      throw new Error(`Network error: Unable to reach server. Please check your connection.`);
    }

    // Handle HTTP errors
    if (!response.ok) {
      let errorMessage = 'Failed to fetch token info';

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Response body not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      // Specific error handling
      if (response.status === 401) {
        errorMessage = 'Authentication expired. Please log in again.';
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Please check your permissions.';
      } else if (response.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      logger.error('TokenService', `Token fetch failed: ${errorMessage}`);
      throw error;
    }

    const tokenInfo = await response.json();

    // Extract data from success response wrapper
    const data = tokenInfo.data || tokenInfo;

    // Validate token info structure
    if (!data.mode) {
      throw new Error('Invalid token response: missing mode');
    }

    logger.success('TokenService', 'Token info fetched successfully');
    return data;
  }

  /**
   * Map error to error code for initialization state manager
   * @param {Error} error - Error to map
   * @returns {string} Error code
   */
  static mapErrorToCode(error) {
    const errorMessage = error?.message || error || '';

    if (errorMessage.includes('token')) {
      return 'init/token-fetch-failed';
    } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
      return 'init/network-error';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      return 'init/timeout';
    }

    return 'init/unknown';
  }

  /**
   * Reset the service (clear token and state)
   */
  reset() {
    this._token = null;
    this._fetchPromise = null;
    logger.debug('TokenService', 'Service reset');
  }
}

/**
 * Create a TokenService instance with dependency injection
 * @param {Object} deps - Dependencies
 * @param {string} deps.token - Authentication token
 * @param {string} deps.apiEndpoint - API endpoint
 * @returns {TokenService} Configured service
 */
export function createTokenService(deps = {}) {
  return new TokenService({
    token: deps.token,
    apiEndpoint: deps.apiEndpoint,
    timeout: deps.timeout,
  });
}

export default {
  TokenService,
  createTokenService,
  TOKEN_FETCH_TIMEOUT,
};
