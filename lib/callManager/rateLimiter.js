/**
 * Rate Limiter
 *
 * Provides rate limiting functionality for call operations.
 * Limits the number of calls and frequency to prevent abuse.
 *
 * Features:
 * - Configurable call limits per time window
 * - Minimum interval between calls
 * - Thread-safe state management
 */

import { logger } from '../logger';

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT_CONFIG = {
  maxCallsPerWindow: 10, // Maximum calls per window
  windowDuration: 60000, // Window duration in ms (1 minute)
  minIntervalBetweenCalls: 5000, // Minimum interval between calls in ms (5 seconds)
};

/**
 * Rate Limiter class for managing call frequency
 */
export class RateLimiter {
  /**
   * Create a new RateLimiter
   * @param {Object} config - Rate limit configuration
   */
  constructor(config = DEFAULT_RATE_LIMIT_CONFIG) {
    this._config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    this._lastCallTime = 0;
    this._callCount = 0;
    this._windowStartTime = Date.now();

    logger.init('RateLimiter');
  }

  /**
   * Check if a call is allowed under rate limits
   * @returns {{allowed: boolean, message: string}}
   */
  check() {
    const now = Date.now();

    // Reset counter if window has expired
    if (now - this._windowStartTime > this._config.windowDuration) {
      this._callCount = 0;
      this._windowStartTime = now;
      logger.debug('RateLimiter', 'Rate limit window reset');
    }

    // Check maximum calls per window
    if (this._callCount >= this._config.maxCallsPerWindow) {
      logger.warn('RateLimiter', 'Rate limit exceeded - too many calls');
      return {
        allowed: false,
        message: 'Too many calls. Please wait a moment.',
        reason: 'max_calls_exceeded',
        retryAfter: this._config.windowDuration - (now - this._windowStartTime),
      };
    }

    // Check minimum interval between calls
    if (now - this._lastCallTime < this._config.minIntervalBetweenCalls) {
      logger.warn('RateLimiter', 'Rate limit - call too soon');
      return {
        allowed: false,
        message: 'Please wait before making another call.',
        reason: 'interval_not_elapsed',
        retryAfter: this._config.minIntervalBetweenCalls - (now - this._lastCallTime),
      };
    }

    logger.debug('RateLimiter', 'Rate limit check passed');
    return { allowed: true, message: 'OK', reason: 'ok' };
  }

  /**
   * Record a call attempt (updates counters)
   * Should be called after a successful call initiation
   */
  recordCall() {
    this._lastCallTime = Date.now();
    this._callCount++;
    logger.debug('RateLimiter', `Rate limit updated - count: ${this._callCount}`);
  }

  /**
   * Reset the rate limiter state
   */
  reset() {
    this._lastCallTime = 0;
    this._callCount = 0;
    this._windowStartTime = Date.now();
    logger.debug('RateLimiter', 'Rate limiter reset');
  }

  /**
   * Get current state for debugging
   * @returns {Object} Current rate limit state
   */
  getState() {
    const now = Date.now();
    return {
      callCount: this._callCount,
      maxCallsPerWindow: this._config.maxCallsPerWindow,
      windowDuration: this._config.windowDuration,
      windowRemaining: Math.max(0, this._config.windowDuration - (now - this._windowStartTime)),
      lastCallTime: this._lastCallTime,
      minIntervalBetweenCalls: this._config.minIntervalBetweenCalls,
      intervalRemaining: Math.max(
        0,
        this._config.minIntervalBetweenCalls - (now - this._lastCallTime)
      ),
    };
  }

  /**
   * Update configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    this._config = { ...this._config, ...config };
    logger.debug('RateLimiter', 'Configuration updated', this._config);
  }
}

/**
 * Create a singleton RateLimiter instance
 */
let _rateLimiterInstance = null;

/**
 * Get the RateLimiter singleton instance
 * @param {Object} config - Optional configuration
 * @returns {RateLimiter} RateLimiter instance
 */
export function getRateLimiter(config) {
  if (!_rateLimiterInstance) {
    _rateLimiterInstance = new RateLimiter(config);
  }
  return _rateLimiterInstance;
}

/**
 * Reset the RateLimiter singleton (useful for testing)
 */
export function resetRateLimiter() {
  if (_rateLimiterInstance) {
    _rateLimiterInstance.reset();
  }
}

export default {
  RateLimiter,
  getRateLimiter,
  resetRateLimiter,
  DEFAULT_RATE_LIMIT_CONFIG,
};
