/**
 * Peer Connection Manager Module
 *
 * Wraps RTCPeerConnection and provides a clean interface for
 * connection management.
 */

import { logger } from '@/lib/logger';
import { getIceServers } from './config';

/**
 * Manages the RTCPeerConnection
 */
export class PeerConnectionManager {
  constructor() {
    this.peerConnection = null;
    this._connectionStateCallbacks = [];
    this._iceConnectionStateCallbacks = [];
    this._trackCallbacks = [];
    this._iceCandidateCallbacks = [];
  }

  /**
   * Create a new peer connection
   */
  async createConnection() {
    // Close existing connection if any
    if (this.peerConnection) {
      logger.warn('PeerConnection', 'Closing existing peer connection before creating new one');
      this.close();
    }

    try {
      logger.loading('PeerConnection', 'Creating peer connection...');

      this.peerConnection = new RTCPeerConnection({
        iceServers: getIceServers(),
      });

      this._setupEventHandlers();
      logger.success('PeerConnection', 'Peer connection created');

      return this.peerConnection;
    } catch (error) {
      logger.error('PeerConnection', `Failed to create peer connection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set up peer connection event handlers
   */
  _setupEventHandlers() {
    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      logger.trace('PeerConnection', `Connection state changed: ${state}`);

      const stateMessages = {
        new: 'New peer connection created',
        connecting: 'Establishing connection...',
        connected: 'Peer connection established',
        disconnected: 'Peer disconnected',
        failed: 'Connection failed',
        closed: 'Connection closed',
      };

      if (state === 'connected') {
        logger.success('PeerConnection', 'Call connected!');
      } else if (state === 'disconnected') {
        logger.warn('PeerConnection', 'Connection disconnected');
      } else if (state === 'failed') {
        logger.error('PeerConnection', 'Connection failed');
      } else if (state === 'closed') {
        logger.debug('PeerConnection', 'Connection closed');
      } else {
        logger.debug('PeerConnection', `Connection state: ${stateMessages[state] || state}`);
      }

      this._connectionStateCallbacks.forEach((callback) => {
        try {
          callback(state);
        } catch (error) {
          logger.error('PeerConnection', `Connection state callback error: ${error.message}`);
        }
      });
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      // DEBUG: Always log ICE state changes at info level for troubleshooting
      logger.info('PeerConnection', `ICE connection state changed: ${state}`);

      const iceStateMessages = {
        new: 'ICE checking',
        checking: 'Checking ICE candidates...',
        connected: 'ICE connection established',
        completed: 'ICE negotiation complete',
        disconnected: 'ICE disconnected',
        failed: 'ICE connection failed',
        closed: 'ICE closed',
      };

      if (state === 'failed') {
        logger.error('PeerConnection', `ICE connection failed: ${iceStateMessages[state]}`);
      } else if (state === 'connected' || state === 'completed') {
        logger.success('PeerConnection', `ICE connection established: ${iceStateMessages[state]}`);
      } else if (state === 'disconnected') {
        logger.warn('PeerConnection', 'ICE disconnected');
      } else {
        logger.debug('PeerConnection', `ICE state: ${iceStateMessages[state] || state}`);
      }

      this._iceConnectionStateCallbacks.forEach((callback) => {
        try {
          callback(state);
        } catch (error) {
          logger.error('PeerConnection', `ICE state callback error: ${error.message}`);
        }
      });
    };

    // Handle remote tracks
    this.peerConnection.ontrack = (event) => {
      logger.success(
        'PeerConnection',
        `Remote track received: kind=${event.track?.kind}, id=${event.track?.id}`
      );

      this._trackCallbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          logger.error('PeerConnection', `Track callback error: ${error.message}`);
        }
      });
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        logger.debug(
          'PeerConnection',
          `Local ICE candidate: ${event.candidate.candidate?.substring(0, 50)}...`
        );

        this._iceCandidateCallbacks.forEach((callback) => {
          try {
            callback(event.candidate);
          } catch (error) {
            logger.error('PeerConnection', `ICE candidate callback error: ${error.message}`);
          }
        });
      } else {
        logger.debug('PeerConnection', 'All local ICE candidates have been generated');
      }
    };
  }

  /**
   * Add a track to the connection
   */
  addTrack(track, stream) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    // Check if a sender for this track already exists
    const existingSenders = this.peerConnection.getSenders();
    const existingSender = existingSenders.find(
      (sender) => sender.track && sender.track.id === track.id
    );

    if (existingSender) {
      logger.debug('PeerConnection', `Track ${track.kind} (${track.id}) already has a sender`);
      return existingSender;
    }

    // Check if there's a sender with no track (can happen after track ended)
    // We can replace the track instead of adding a new one
    const emptySender = existingSenders.find(
      (sender) => sender.track === null && sender.kind === track.kind
    );

    if (emptySender) {
      logger.debug(
        'PeerConnection',
        `Replacing track in existing ${track.kind} sender: ${track.id}`
      );
      emptySender.replaceTrack(track);
      return emptySender;
    }

    const sender = this.peerConnection.addTrack(track, stream);
    logger.debug('PeerConnection', `Added ${track.kind} track: ${track.id}`);
    return sender;
  }

  /**
   * Create offer
   */
  async createOffer() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    logger.debug('PeerConnection', 'Creating SDP offer...');
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    logger.debug('PeerConnection', `Local SDP set: type=${offer.type}`);
    return offer;
  }

  /**
   * Create answer
   */
  async createAnswer() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    logger.debug('PeerConnection', 'Creating SDP answer...');
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    logger.debug('PeerConnection', `Local SDP set: type=${answer.type}`);
    return answer;
  }

  /**
   * Set local description
   */
  async setLocalDescription(description) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setLocalDescription(description);
    logger.debug('PeerConnection', 'Local description set');
  }

  /**
   * Set remote description
   */
  async setRemoteDescription(description) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    logger.debug('PeerConnection', `Setting remote description: type=${description.type}`);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    logger.debug('PeerConnection', 'Remote description set');
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    logger.debug('PeerConnection', 'ICE candidate added');
  }

  /**
   * Get connection statistics
   */
  async getStats() {
    if (!this.peerConnection) {
      return null;
    }

    try {
      const stats = await this.peerConnection.getStats();
      const report = {
        bytesReceived: 0,
        bytesSent: 0,
        packetsLost: 0,
        roundTripTime: 0,
        state: this.peerConnection.connectionState,
      };

      stats.forEach((stat) => {
        if (stat.type === 'inbound-rtp') {
          report.bytesReceived += stat.bytesReceived || 0;
          report.packetsLost += stat.packetsLost || 0;
        }
        if (stat.type === 'outbound-rtp') {
          report.bytesSent += stat.bytesSent || 0;
        }
        if (stat.type === 'candidate-pair' && stat.currentRoundTripTime) {
          report.roundTripTime = stat.currentRoundTripTime;
        }
      });

      return report;
    } catch (error) {
      logger.error('PeerConnection', `Failed to get stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    return this.peerConnection?.connectionState || 'closed';
  }

  /**
   * Get ICE connection state
   */
  getIceConnectionState() {
    return this.peerConnection?.iceConnectionState || 'closed';
  }

  /**
   * Register connection state change listener
   */
  onConnectionStateChange(callback) {
    this._connectionStateCallbacks.push(callback);
  }

  /**
   * Register ICE connection state change listener
   */
  onIceConnectionStateChange(callback) {
    this._iceConnectionStateCallbacks.push(callback);
  }

  /**
   * Register track listener
   */
  onTrack(callback) {
    this._trackCallbacks.push(callback);
  }

  /**
   * Register ICE candidate listener
   */
  onIceCandidate(callback) {
    this._iceCandidateCallbacks.push(callback);
  }

  /**
   * Close the connection
   */
  close() {
    if (this.peerConnection) {
      logger.debug('PeerConnection', 'Closing peer connection');
      this.peerConnection.close();
      this.peerConnection = null;
      logger.debug('PeerConnection', 'Peer connection closed');
    }
  }

  /**
   * Check if connection exists
   */
  hasConnection() {
    return !!this.peerConnection;
  }

  /**
   * Reset manager
   */
  reset() {
    this.close();
    this._connectionStateCallbacks = [];
    this._iceConnectionStateCallbacks = [];
    this._trackCallbacks = [];
    this._iceCandidateCallbacks = [];
  }
}

export default PeerConnectionManager;
