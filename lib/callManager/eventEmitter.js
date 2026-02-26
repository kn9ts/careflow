/**
 * Event Emitter Mixin
 *
 * Provides event subscription and emission functionality.
 * Can be mixed into classes or used standalone.
 *
 * Features:
 * - Event subscription with callback
 * - Event unsubscription
 * - One-time event handlers
 * - Event emission with data
 */

import { logger } from '../logger';

/**
 * Creates an EventEmitter instance
 * @param {string} name - Name for debugging
 * @returns {Object} EventEmitter interface
 */
export function createEventEmitter(name = 'EventEmitter') {
  const listeners = {};
  const onceListeners = {};

  return {
    /**
     * Register an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
      logger.debug(name, `Listener registered for: ${event}`);
    },

    /**
     * Register a one-time event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
      if (!onceListeners[event]) {
        onceListeners[event] = [];
      }
      onceListeners[event].push(callback);
      logger.debug(name, `One-time listener registered for: ${event}`);
    },

    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
      if (listeners[event]) {
        const index = listeners[event].indexOf(callback);
        if (index > -1) {
          listeners[event].splice(index, 1);
          logger.debug(name, `Listener removed for: ${event}`);
        }
      }
      if (onceListeners[event]) {
        const index = onceListeners[event].indexOf(callback);
        if (index > -1) {
          onceListeners[event].splice(index, 1);
          logger.debug(name, `One-time listener removed for: ${event}`);
        }
      }
    },

    /**
     * Emit an event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Data to pass to callbacks
     */
    emit(event, data) {
      // Call regular listeners
      if (listeners[event]) {
        listeners[event].forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            logger.error(name, `Error in event callback for ${event}: ${error.message}`);
          }
        });
      }

      // Call one-time listeners and remove them
      if (onceListeners[event]) {
        const toCall = [...onceListeners[event]];
        onceListeners[event] = [];
        toCall.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            logger.error(name, `Error in one-time event callback for ${event}: ${error.message}`);
          }
        });
      }
    },

    /**
     * Remove all listeners for a specific event or all events
     * @param {string} [event] - Optional event name
     */
    removeAllListeners(event) {
      if (event) {
        delete listeners[event];
        delete onceListeners[event];
        logger.debug(name, `All listeners removed for: ${event}`);
      } else {
        Object.keys(listeners).forEach((e) => delete listeners[e]);
        Object.keys(onceListeners).forEach((e) => delete onceListeners[e]);
        logger.debug(name, 'All listeners removed');
      }
    },

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
      const regular = listeners[event]?.length || 0;
      const once = onceListeners[event]?.length || 0;
      return regular + once;
    },

    /**
     * Check if event has listeners
     * @param {string} event - Event name
     * @returns {boolean} True if has listeners
     */
    hasListeners(event) {
      return this.listenerCount(event) > 0;
    },
  };
}

/**
 * EventEmitter class for use with ES6 classes
 * Mix this in or extend from it
 */
export class EventEmitter {
  constructor(name = 'EventEmitter') {
    this._eventEmitter = createEventEmitter(name);
  }

  on(event, callback) {
    this._eventEmitter.on(event, callback);
  }

  once(event, callback) {
    this._eventEmitter.once(event, callback);
  }

  off(event, callback) {
    this._eventEmitter.off(event, callback);
  }

  emit(event, data) {
    this._eventEmitter.emit(event, data);
  }

  removeAllListeners(event) {
    this._eventEmitter.removeAllListeners(event);
  }

  listenerCount(event) {
    return this._eventEmitter.listenerCount(event);
  }

  hasListeners(event) {
    return this._eventEmitter.hasListeners(event);
  }
}

/**
 * Standard CallManager events
 */
export const CallManagerEvents = {
  STATUS_CHANGE: 'onStatusChange',
  CALL_STATE_CHANGE: 'onCallStateChange',
  INCOMING_CALL: 'onIncomingCall',
  CALL_ENDED: 'onCallEnded',
  ERROR: 'onError',
  LOCAL_STREAM: 'onLocalStream',
  REMOTE_STREAM: 'onRemoteStream',
  RECORDING_STARTED: 'onRecordingStarted',
  RECORDING_STOPPED: 'onRecordingStopped',
  RECORDING_ERROR: 'onRecordingError',
  RECORDING_UPLOADED: 'onRecordingUploaded',
  CONNECTION_STATE_CHANGE: 'onConnectionStateChange',
  INITIALIZATION_CHANGE: 'onInitializationChange',
};

export default {
  createEventEmitter,
  EventEmitter,
  CallManagerEvents,
};
