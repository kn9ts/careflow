/**
 * Phone Lookup Service
 *
 * Handles looking up users by their phone numbers.
 * Used to enable WebRTC calls to phone numbers by finding
 * the associated CareFlow user.
 *
 * Features:
 * - Phone number to CareFlow ID lookup
 * - Cached results
 * - Error handling
 */

import { logger } from '../logger';

/**
 * Phone Lookup Service class
 */
export class PhoneLookupService {
  /**
   * Create a new PhoneLookupService
   * @param {Object} options - Service options
   */
  constructor(options = {}) {
    this._token = options.token || null;
    this._apiEndpoint = options.apiEndpoint || '/api/users/lookup/phone';
    this._cache = new Map();
    this._cacheTimeout = options.cacheTimeout || 5 * 60 * 1000; // 5 minutes default
    this._lookupPromise = null; // Deduplication

    logger.init('PhoneLookupService');
  }

  /**
   * Set authentication token
   * @param {string} token - Authentication token
   */
  setToken(token) {
    this._token = token;
    logger.debug('PhoneLookupService', 'Token set');
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this._cache.clear();
    logger.debug('PhoneLookupService', 'Cache cleared');
  }

  /**
   * Look up a user by phone number
   * @param {string} phoneNumber - Phone number to look up
   * @returns {Promise<{
   *   exists: boolean,
   *   care4wId?: string,
   *   firebaseUid?: string,
   *   displayName?: string
   * }>}
   */
  async lookupByPhone(phoneNumber) {
    if (!phoneNumber) {
      return { exists: false };
    }

    // Check cache first
    const cached = this._getCachedResult(phoneNumber);
    if (cached) {
      logger.debug('PhoneLookupService', `Cache hit for ${phoneNumber}`);
      return cached;
    }

    // Deduplicate concurrent lookups
    if (this._lookupPromise) {
      return this._lookupPromise.then(
        () => this._getCachedResult(phoneNumber) || { exists: false }
      );
    }

    this._lookupPromise = this._doLookup(phoneNumber);

    try {
      const result = await this._lookupPromise;
      this._setCachedResult(phoneNumber, result);
      return result;
    } finally {
      this._lookupPromise = null;
    }
  }

  /**
   * Internal lookup implementation
   * @param {string} phoneNumber - Phone number to look up
   * @returns {Promise<Object>} Lookup result
   * @private
   */
  async _doLookup(phoneNumber) {
    if (!this._token) {
      logger.error('PhoneLookupService', 'No token available for lookup');
      return { exists: false };
    }

    try {
      const response = await fetch(
        `${this._apiEndpoint}?phoneNumber=${encodeURIComponent(phoneNumber)}`,
        {
          headers: {
            Authorization: `Bearer ${this._token}`,
          },
        }
      );

      if (!response.ok) {
        logger.error('PhoneLookupService', `Phone lookup failed: ${response.status}`);
        return { exists: false };
      }

      const data = await response.json();
      return data.success ? data.data : { exists: false };
    } catch (error) {
      logger.error('PhoneLookupService', `Phone lookup error: ${error.message}`);
      return { exists: false };
    }
  }

  /**
   * Get cached result if valid
   * @param {string} phoneNumber - Phone number
   * @returns {Object|null} Cached result or null
   * @private
   */
  _getCachedResult(phoneNumber) {
    const cached = this._cache.get(phoneNumber);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this._cacheTimeout) {
      this._cache.delete(phoneNumber);
      return null;
    }

    return cached.result;
  }

  /**
   * Set cached result
   * @param {string} phoneNumber - Phone number
   * @param {Object} result - Lookup result
   * @private
   */
  _setCachedResult(phoneNumber, result) {
    this._cache.set(phoneNumber, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Look up a user by CareFlow ID
   * @param {string} care4wId - CareFlow ID to look up
   * @returns {Promise<Object>} User data
   */
  async lookupByCare4wId(care4wId) {
    if (!care4wId || !this._token) {
      return null;
    }

    try {
      const response = await fetch(`/api/users/lookup?care4wId=${encodeURIComponent(care4wId)}`);

      if (!response.ok) {
        logger.error('PhoneLookupService', `User lookup failed: ${response.status}`);
        return null;
      }

      const userData = await response.json();
      return userData.success ? userData.data : null;
    } catch (error) {
      logger.error('PhoneLookupService', `User lookup error: ${error.message}`);
      return null;
    }
  }

  /**
   * Reset the service
   */
  reset() {
    this._token = null;
    this.clearCache();
    this._lookupPromise = null;
    logger.debug('PhoneLookupService', 'Service reset');
  }
}

/**
 * Create a PhoneLookupService instance with dependency injection
 * @param {Object} deps - Dependencies
 * @param {string} deps.token - Authentication token
 * @param {string} deps.apiEndpoint - API endpoint
 * @returns {PhoneLookupService} Configured service
 */
export function createPhoneLookupService(deps = {}) {
  return new PhoneLookupService({
    token: deps.token,
    apiEndpoint: deps.apiEndpoint,
    cacheTimeout: deps.cacheTimeout,
  });
}

export default {
  PhoneLookupService,
  createPhoneLookupService,
};
