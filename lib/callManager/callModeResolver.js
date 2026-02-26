/**
 * Call Mode Resolver
 *
 * Determines the best call mode (Twilio or WebRTC) based on:
 * - Destination (phone number vs CareFlow ID)
 * - Available services
 * - Browser capabilities
 *
 * Features:
 * - Smart mode selection
 * - Fallback handling
 * - Phone number lookup for WebRTC calls
 */

import { isValidCare4wId } from '../careFlowIdValidator';
import { looksLikePhoneNumber } from '../phoneUtils';
import { logger } from '../logger';

/**
 * Call Mode enumeration
 */
export const CallMode = {
  TWILIO: 'twilio',
  WEBRTC: 'webrtc',
};

/**
 * Service availability snapshot
 * @typedef {Object} ServiceSnapshot
 * @property {boolean} webrtcReady - WebRTC is ready
 * @property {boolean} twilioReady - Twilio is ready
 * @property {string} webrtcState - WebRTC state
 * @property {string} twilioState - Twilio state
 * @property {string[]} activeModes - Active call modes
 */

/**
 * Call Mode Resolver class
 */
export class CallModeResolver {
  /**
   * Create a new CallModeResolver
   * @param {Object} options - Resolver options
   */
  constructor(options = {}) {
    this._phoneLookupFn = options.phoneLookupFn || null;
    this._isWebRTCSupportedFn = options.isWebRTCSupportedFn || (() => false);

    logger.init('CallModeResolver');
  }

  /**
   * Set phone lookup function (dependency injection)
   * @param {Function} fn - Phone lookup function
   */
  setPhoneLookupFn(fn) {
    this._phoneLookupFn = fn;
  }

  /**
   * Set WebRTC support check function (dependency injection)
   * @param {Function} fn - Function that returns true if WebRTC is supported
   */
  setIsWebRTCSupportedFn(fn) {
    this._isWebRTCSupportedFn = fn;
  }

  /**
   * Determine the best call mode for a destination
   * @param {string} destination - Phone number or CareFlow ID
   * @param {ServiceSnapshot} serviceSnapshot - Current service availability
   * @returns {Promise<string>} - 'twilio' or 'webrtc'
   */
  async determineCallMode(destination, serviceSnapshot) {
    const isCareFlowId = isValidCare4wId(destination);

    if (isCareFlowId) {
      return this._resolveCareFlowIdMode(destination, serviceSnapshot);
    }

    // Not a CareFlow ID - check if it's a phone number
    const isPhoneNumber = looksLikePhoneNumber(destination);

    if (isPhoneNumber) {
      return this._resolvePhoneNumberMode(destination, serviceSnapshot);
    }

    // Unknown destination type - try WebRTC as fallback
    return this._resolveUnknownMode(serviceSnapshot);
  }

  /**
   * Resolve mode for CareFlow ID destination
   * @param {string} care4wId - CareFlow ID
   * @param {ServiceSnapshot} snapshot - Service snapshot
   * @returns {Promise<string>} Resolved mode
   * @private
   */
  async _resolveCareFlowIdMode(care4wId, snapshot) {
    // For CareFlow IDs, prefer WebRTC (free peer-to-peer)
    if (snapshot.webrtcReady) {
      logger.debug('CallModeResolver', 'Using WebRTC for CareFlow ID call (free P2P)');
      return CallMode.WEBRTC;
    }

    // Fall back to Twilio if WebRTC not available
    if (snapshot.twilioReady) {
      logger.debug('CallModeResolver', 'Using Twilio for CareFlow ID call (WebRTC unavailable)');
      return CallMode.TWILIO;
    }

    // Check if WebRTC is initializing
    if (snapshot.webrtcState === 'initializing') {
      logger.warn('CallModeResolver', 'WebRTC still initializing, waiting for it...');
      // Wait briefly for WebRTC to become ready
      await this._waitForWebRTC();
      const newSnapshot = await this._getUpdatedSnapshot();
      if (newSnapshot?.webrtcReady) {
        return CallMode.WEBRTC;
      }
    }

    // Last resort: if WebRTC is supported in browser, try anyway
    if (this._isWebRTCSupportedFn()) {
      logger.warn(
        'CallModeResolver',
        'WebRTC state not ready but browser supports it, attempting WebRTC anyway'
      );
      return CallMode.WEBRTC;
    }

    throw new Error('No calling mode available for CareFlow ID');
  }

  /**
   * Resolve mode for phone number destination
   * @param {string} phoneNumber - Phone number
   * @param {ServiceSnapshot} snapshot - Service snapshot
   * @returns {Promise<string>} Resolved mode
   * @private
   */
  async _resolvePhoneNumberMode(phoneNumber, snapshot) {
    // For phone numbers, prefer Twilio if available
    if (snapshot.twilioReady) {
      logger.debug('CallModeResolver', 'Using Twilio for phone number call');
      return CallMode.TWILIO;
    }

    // Twilio not available - try phone lookup for WebRTC
    if (snapshot.webrtcReady && this._phoneLookupFn) {
      logger.debug('CallModeResolver', 'Looking up user by phone number for WebRTC call');
      const lookupResult = await this._phoneLookupFn(phoneNumber);

      if (lookupResult?.exists && lookupResult.care4wId) {
        logger.debug(
          'CallModeResolver',
          `Found user ${lookupResult.displayName} for phone number, using WebRTC`
        );
        return {
          mode: CallMode.WEBRTC,
          resolvedCare4wId: lookupResult.care4wId,
          resolvedFirebaseUid: lookupResult.firebaseUid,
        };
      }

      // User not found with this phone number
      throw new Error(
        'No CareFlow user found with this phone number. ' +
          'Ask them to add their phone number in CareFlow settings.'
      );
    }

    // Phone lookup failed or not available - try WebRTC anyway for browser support
    if (this._isWebRTCSupportedFn()) {
      logger.debug('CallModeResolver', 'Attempting phone lookup for WebRTC call');

      if (this._phoneLookupFn) {
        try {
          const lookupResult = await this._phoneLookupFn(phoneNumber);
          if (lookupResult?.exists && lookupResult.care4wId) {
            return {
              mode: CallMode.WEBRTC,
              resolvedCare4wId: lookupResult.care4wId,
              resolvedFirebaseUid: lookupResult.firebaseUid,
            };
          }
        } catch (e) {
          logger.warn('CallModeResolver', 'Phone lookup failed, continuing with fallback');
        }
      }

      throw new Error(
        'Phone calls require Twilio (not available). ' +
          'Use a CareFlow ID for free WebRTC calls, or ask the person to register their phone number.'
      );
    }

    throw new Error('No calling mode available for phone number');
  }

  /**
   * Resolve mode for unknown destination type
   * @param {ServiceSnapshot} snapshot - Service snapshot
   * @returns {Promise<string>} Resolved mode
   * @private
   */
  async _resolveUnknownMode(snapshot) {
    if (this._isWebRTCSupportedFn()) {
      logger.warn('CallModeResolver', 'Unknown destination type, attempting WebRTC as fallback');
      return CallMode.WEBRTC;
    }

    throw new Error('No calling mode available. Please check your connection and try again.');
  }

  /**
   * Wait briefly for WebRTC to become ready
   * @private
   */
  _waitForWebRTC() {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /**
   * Get updated service snapshot (placeholder for override)
   * @returns {Promise<ServiceSnapshot>} Service snapshot
   * @protected
   */
  async _getUpdatedSnapshot() {
    // Override in CallManager integration
    return null;
  }

  /**
   * Check if WebRTC is supported in the browser
   * @returns {boolean} True if WebRTC is supported
   */
  static isWebRTCSupportedInBrowser() {
    if (typeof window === 'undefined') return false;
    return !!(
      window.RTCPeerConnection &&
      window.RTCSessionDescription &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * Get capabilities for a mode
   * @param {string} mode - Call mode
   * @returns {Object} Mode capabilities
   */
  static getModeCapabilities(mode) {
    const capabilities = {
      [CallMode.TWILIO]: {
        outboundCalls: true,
        inboundCalls: true,
        recording: false,
        sms: false,
        hold: true,
        mute: true,
        transfer: false,
        dtmf: true,
      },
      [CallMode.WEBRTC]: {
        outboundCalls: true,
        inboundCalls: true,
        recording: true,
        sms: false,
        hold: false,
        mute: true,
        transfer: false,
        dtmf: false,
      },
    };

    return capabilities[mode] || {};
  }
}

export default {
  CallModeResolver,
  CallMode,
};
