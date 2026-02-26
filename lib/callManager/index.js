/**
 * Call Manager Module Index
 *
 * Provides a unified interface for both Twilio Voice and WebRTC calls.
 * Automatically switches between modes based on available credentials.
 *
 * MODULAR ARCHITECTURE:
 * - callManager.js: Main CallManager class
 * - rateLimiter.js: Rate limiting functionality
 * - tokenService.js: Token fetching and management
 * - phoneLookupService.js: Phone number lookup
 * - callModeResolver.js: Call mode determination
 * - eventEmitter.js: Event handling utilities
 */

// Export main CallManager class
export { CallManager } from './callManager';

// Singleton instance
let _callManagerInstance = null;

/**
 * Get the singleton CallManager instance
 * @returns {CallManager} The singleton instance
 */
export function getCallManager() {
  if (!_callManagerInstance) {
    // Import dynamically to avoid circular dependencies
    const { CallManager } = require('./callManager');
    _callManagerInstance = new CallManager();
  }
  return _callManagerInstance;
}

// Export extracted modules for direct use and testing
export {
  RateLimiter,
  getRateLimiter,
  resetRateLimiter,
  DEFAULT_RATE_LIMIT_CONFIG,
} from './rateLimiter';

export { TokenService, createTokenService, TOKEN_FETCH_TIMEOUT } from './tokenService';

export { PhoneLookupService, createPhoneLookupService } from './phoneLookupService';

export { CallModeResolver, CallMode } from './callModeResolver';

export { createEventEmitter, EventEmitter, CallManagerEvents } from './eventEmitter';
