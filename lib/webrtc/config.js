/**
 * WebRTC Configuration Module
 *
 * Centralizes all configuration values for the WebRTC implementation.
 * Includes ICE servers, timeouts, and connection limits.
 */

import { logger } from '@/lib/logger';

// ICE Servers Configuration - STUN + TURN for NAT traversal
const ICE_SERVERS = [
  // Public STUN servers (free)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

/**
 * Get ICE servers configuration with TURN support
 * Falls back gracefully if TURN credentials not configured
 */
export function getIceServers() {
  const turnUrl = process.env.NEXT_PUBLIC_TURN_SERVER_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    logger.info('WebRTCConfig', 'TURN server configured - enabling relay mode');
    return [
      ...ICE_SERVERS,
      {
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      },
    ];
  }

  logger.debug('WebRTCConfig', 'Using STUN servers only (no TURN configured)');
  return ICE_SERVERS;
}

/**
 * Timeout configurations in milliseconds
 */
export const TIMEOUTS = {
  // Firebase initialization timeout
  FIREBASE_INIT: 20000,
  // Peer connection setup timeout
  PEER_CONNECTION: 15000,
  // Call connection timeout (stuck calls)
  CONNECTION: 30000,
  // ICE gathering timeout
  ICE_GATHERING: 5000,
  // Initialization timeout
  INITIALIZATION: 45000,
  // Token fetch timeout
  TOKEN_FETCH: 30000,
};

// Direct exports for convenience
export const ICE_GATHERING_TIMEOUT = TIMEOUTS.ICE_GATHERING;
export const ICE_CONNECTION_TIMEOUT = TIMEOUTS.CONNECTION;
export const CALL_TIMEOUTS = TIMEOUTS;

/**
 * Reconnection configuration
 */
export const RECONNECTION = {
  MAX_ATTEMPTS: 5,
  BASE_DELAY_MS: 1000,
};

/**
 * Recording configuration
 */
export const RECORDING = {
  // Audio bitrate for recording (128 kbps)
  AUDIO_BITRATE: 128000,
  // Supported MIME types in preference order
  SUPPORTED_MIME_TYPES: [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ],
};

/**
 * Get supported MIME type for recording
 */
export function getSupportedMimeType() {
  for (const mimeType of RECORDING.SUPPORTED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      logger.debug('WebRTCConfig', `Using MIME type: ${mimeType}`);
      return mimeType;
    }
  }

  logger.warn('WebRTCConfig', 'No preferred MIME type supported, using audio/webm');
  return 'audio/webm';
}

/**
 * WebRTC Configuration Object
 */
export const config = {
  iceServers: getIceServers,
  timeouts: TIMEOUTS,
  reconnection: RECONNECTION,
  recording: RECORDING,
};

export default config;
