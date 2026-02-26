/**
 * Connection State Manager Module
 *
 * Manages WebRTC connection state transitions and timeout handling.
 * Provides a state machine for connection lifecycle.
 */

import { logger } from '@/lib/logger';
import { TIMEOUTS } from './config';

// Connection states
export const ConnectionState = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  READY: 'ready',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  FAILED: 'failed',
};

/**
 * Manages connection state and timeouts
 */
export class StateManager {
  constructor() {
    this._state = ConnectionState.IDLE;
    this._message = '';
    this._connectionTimeout = null;
    this._stateChangeCallbacks = [];
    this._connectionStateChangeCallbacks = [];
  }

  /**
   * Get current state
   */
  getState() {
    return this._state;
  }

  /**
   * Get current message
   */
  getMessage() {
    return this._message;
  }

  /**
   * Get full state object
   */
  getStateInfo() {
    return {
      state: this._state,
      message: this._message,
    };
  }

  /**
   * Set state and notify listeners
   */
  setState(state, message = '') {
    const previousState = this._state;
    this._state = state;
    this._message = message;

    logger.debug(
      'StateManager',
      `State: ${previousState} -> ${state}${message ? ` (${message})` : ''}`
    );

    // Clear timeout when connected
    if (state === ConnectionState.CONNECTED) {
      this._clearConnectionTimeout();
    }

    // Notify state change listeners
    this._stateChangeCallbacks.forEach((callback) => {
      try {
        callback({ previousState, state, message });
      } catch (error) {
        logger.error('StateManager', `State change callback error: ${error.message}`);
      }
    });

    // Notify connection state listeners
    this._connectionStateChangeCallbacks.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        logger.error('StateManager', `Connection state callback error: ${error.message}`);
      }
    });
  }

  /**
   * Set connection timeout to detect stuck calls
   */
  setConnectionTimeout(callback) {
    this._clearConnectionTimeout();

    logger.debug('StateManager', `Setting connection timeout: ${TIMEOUTS.CONNECTION}ms`);

    this._connectionTimeout = setTimeout(() => {
      if (this._state === ConnectionState.CONNECTING) {
        logger.error('StateManager', 'Connection timeout - call stuck in connecting state');
        if (callback && typeof callback === 'function') {
          callback();
        }
      }
    }, TIMEOUTS.CONNECTION);
  }

  /**
   * Clear connection timeout
   */
  _clearConnectionTimeout() {
    if (this._connectionTimeout) {
      clearTimeout(this._connectionTimeout);
      this._connectionTimeout = null;
      logger.debug('StateManager', 'Connection timeout cleared');
    }
  }

  /**
   * Register state change listener
   */
  onStateChange(callback) {
    if (typeof callback === 'function') {
      this._stateChangeCallbacks.push(callback);
    }
  }

  /**
   * Register connection state change listener
   */
  onConnectionStateChange(callback) {
    if (typeof callback === 'function') {
      this._connectionStateChangeCallbacks.push(callback);
    }
  }

  /**
   * Remove state change listener
   */
  offStateChange(callback) {
    const index = this._stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this._stateChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Remove connection state change listener
   */
  offConnectionStateChange(callback) {
    const index = this._connectionStateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this._connectionStateChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Reset state to idle
   */
  reset() {
    this._clearConnectionTimeout();
    this._state = ConnectionState.IDLE;
    this._message = '';
    this._stateChangeCallbacks = [];
    this._connectionStateChangeCallbacks = [];
  }

  /**
   * Check if currently in a connecting state
   */
  isConnecting() {
    return this._state === ConnectionState.CONNECTING;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this._state === ConnectionState.CONNECTED;
  }

  /**
   * Check if ready (can make/receive calls)
   */
  isReady() {
    return this._state === ConnectionState.READY;
  }
}

export default StateManager;
