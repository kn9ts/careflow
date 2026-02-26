/**
 * WebRTC Module Index
 *
 * Modular WebRTC implementation for CareFlow audio calling.
 * This module provides a clean, separated architecture for
 * peer-to-peer real-time communication.
 */

// Re-export all modules
import { StateManager } from './stateManager';
import { MediaManager } from './mediaManager';
import { PeerConnectionManager } from './peerConnection';
import { IceManager } from './iceManager';
import { SessionManager } from './sessionManager';
import { FirebaseSignaling } from './firebaseSignaling';
import { ConnectionMonitor } from './connectionMonitor';
import { WebRTCRecording } from './webrtcRecording';
import { WebRTCManager } from './webrtcManager';
import {
  getIceServers,
  getSupportedMimeType,
  TIMEOUTS,
  RECONNECTION,
  RECORDING,
  config,
  ICE_GATHERING_TIMEOUT,
  ICE_CONNECTION_TIMEOUT,
  CALL_TIMEOUTS,
} from './config';

/**
 * Factory function for creating WebRTC manager
 * Returns a single WebRTCManager instance that encapsulates all functionality
 */
function createWebRTCManager() {
  return new WebRTCManager();
}

// Export all modules - named exports only to avoid duplicates
export {
  // Configuration
  getIceServers,
  getSupportedMimeType,
  TIMEOUTS,
  RECONNECTION,
  RECORDING,
  config,
  ICE_GATHERING_TIMEOUT,
  ICE_CONNECTION_TIMEOUT,
  CALL_TIMEOUTS,
  // Core Managers
  StateManager,
  MediaManager,
  PeerConnectionManager,
  IceManager,
  SessionManager,
  // Signaling & Monitoring
  FirebaseSignaling,
  ConnectionMonitor,
  // Recording
  WebRTCRecording,
  // Main Manager
  WebRTCManager,
  // Factory
  createWebRTCManager,
};
