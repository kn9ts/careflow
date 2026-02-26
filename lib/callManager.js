/**
 * Unified Call Manager - Backward Compatibility Layer
 *
 * This file now re-exports from the modular callManager module.
 * The main implementation is in lib/callManager/
 *
 * IMPROVEMENTS (in modular version):
 * - Modular architecture with separated concerns
 * - Extracted RateLimiter, TokenService, PhoneLookupService, CallModeResolver
 * - Dependency injection for testability
 * - Improved event handling with EventEmitter
 * - Better error recovery and state management
 */

import {
  getCallManager,
  CallManager,
  RateLimiter,
  getRateLimiter,
  TokenService,
  createTokenService,
  PhoneLookupService,
  createPhoneLookupService,
  CallModeResolver,
  CallMode,
  createEventEmitter,
  EventEmitter,
  CallManagerEvents,
} from './callManager/index';

// Re-export all modules for direct access
export {
  // Main class
  CallManager,
  getCallManager,

  // Extracted modules
  RateLimiter,
  getRateLimiter,
  TokenService,
  createTokenService,
  PhoneLookupService,
  createPhoneLookupService,
  CallModeResolver,
  CallMode,
  createEventEmitter,
  EventEmitter,
  CallManagerEvents,
};

// For backward compatibility: create singleton instance using the getter
const callManager = getCallManager();

// Default export for backward compatibility
export { callManager };

export default callManager;
