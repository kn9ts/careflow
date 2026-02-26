/**
 * ICE Manager Module
 *
 * Manages ICE candidate exchange, gathering, and troubleshooting.
 */

import { logger } from '@/lib/logger';
import { ICE_GATHERING_TIMEOUT, ICE_CONNECTION_TIMEOUT } from './config';

/**
 * Manages ICE candidate exchange and troubleshooting
 */
export class IceManager {
  constructor() {
    this.gatheringTimeout = ICE_GATHERING_TIMEOUT;
    this.connectionTimeout = ICE_CONNECTION_TIMEOUT;
    this._iceServers = [];
    this._localCandidates = [];
    this._remoteCandidates = [];
    this._candidateExchangeCallbacks = [];
    this._troubleshootingCallbacks = [];
  }

  /**
   * Configure ICE settings
   */
  configure(options = {}) {
    if (options.gatheringTimeout) {
      this.gatheringTimeout = options.gatheringTimeout;
    }
    if (options.connectionTimeout) {
      this.connectionTimeout = options.connectionTimeout;
    }
    if (options.iceServers) {
      this._iceServers = options.iceServers;
    }

    logger.debug(
      'IceManager',
      `Configured: gatheringTimeout=${this.gatheringTimeout}ms, connectionTimeout=${this.connectionTimeout}ms`
    );
  }

  /**
   * Wait for ICE gathering to complete
   */
  async waitForGatheringComplete(pc) {
    if (!pc) {
      throw new Error('PeerConnection required');
    }

    logger.debug('IceManager', 'Waiting for ICE gathering to complete...');

    // If already complete, return immediately
    if (pc.iceGatheringState === 'complete') {
      logger.debug('IceManager', 'ICE gathering already complete');
      return this._localCandidates;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        logger.warn('IceManager', `ICE gathering timeout after ${this.gatheringTimeout}ms`);
        resolve(this._localCandidates);
      }, this.gatheringTimeout);

      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          pc.removeEventListener('icegatheringstatechange', checkState);
          logger.success(
            'IceManager',
            `ICE gathering complete. Collected ${this._localCandidates.length} candidates`
          );
          resolve(this._localCandidates);
        }
      };

      pc.addEventListener('icegatheringstatechange', checkState);
    });
  }

  /**
   * Wait for ICE connection
   */
  async waitForConnection(pc) {
    if (!pc) {
      throw new Error('PeerConnection required');
    }

    logger.debug('IceManager', 'Waiting for ICE connection...');

    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      logger.debug('IceManager', 'ICE already connected');
      return true;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        logger.error('IceManager', `ICE connection timeout after ${this.connectionTimeout}ms`);
        reject(new Error(`ICE connection timeout after ${this.connectionTimeout}ms`));
      }, this.connectionTimeout);

      const checkState = () => {
        const state = pc.iceConnectionState;

        if (state === 'connected' || state === 'completed') {
          clearTimeout(timeout);
          pc.removeEventListener('iceconnectionstatechange', checkState);
          logger.success('IceManager', 'ICE connection established');
          resolve(true);
        } else if (state === 'failed' || state === 'disconnected') {
          clearTimeout(timeout);
          pc.removeEventListener('iceconnectionstatechange', checkState);
          const error = new Error(`ICE connection ${state}`);
          logger.error('IceManager', `ICE connection failed: ${state}`);
          reject(error);
        }
      };

      pc.addEventListener('iceconnectionstatechange', checkState);
    });
  }

  /**
   * Collect local candidate
   */
  collectLocalCandidate(candidate) {
    this._localCandidates.push({
      ...candidate,
      timestamp: Date.now(),
    });

    // Extract candidate type from the candidate string if available
    const candidateStr = candidate?.candidate || '';
    const typeMatch = candidateStr.match(/typ\s+(\w+)/);
    const candidateType = typeMatch ? typeMatch[1] : 'unknown';
    logger.debug('IceManager', `Local candidate collected: ${candidateType}`);

    this._candidateExchangeCallbacks.forEach((callback) => {
      try {
        callback('local', candidate);
      } catch (error) {
        logger.error('IceManager', `Callback error: ${error.message}`);
      }
    });

    return candidate;
  }

  /**
   * Queue remote candidate for addition
   */
  queueRemoteCandidate(candidate) {
    // DEBUG: Log the full candidate structure to diagnose null sdpMid/sdpMLineIndex issue
    logger.debug(
      'IceManager',
      `Candidate received: ${JSON.stringify({
        hasCandidate: !!candidate?.candidate,
        sdpMid: candidate?.sdpMid,
        sdpMLineIndex: candidate?.sdpMLineIndex,
        candidatePreview: candidate?.candidate?.substring(0, 50),
      })}`
    );

    // Skip end-of-candidates marker (both sdpMid and sdpMLineIndex are null)
    // This is a special signal that ICE gathering is complete, not a real candidate
    if (candidate?.sdpMid === null && candidate?.sdpMLineIndex === null) {
      logger.debug(
        'IceManager',
        'Skipping end-of-candidates marker (sdpMid and sdpMLineIndex both null)'
      );
      return;
    }

    // Skip candidates with missing required fields
    if (!candidate?.candidate) {
      logger.warn('IceManager', 'Skipping candidate with missing candidate string');
      return;
    }

    this._remoteCandidates.push({
      ...candidate,
      timestamp: Date.now(),
    });

    // Extract candidate type from the candidate string if available
    const candidateStr = candidate?.candidate || '';
    const typeMatch = candidateStr.match(/typ\s+(\w+)/);
    const candidateType = typeMatch ? typeMatch[1] : 'unknown';
    logger.debug('IceManager', `Remote candidate queued: ${candidateType}`);
  }

  /**
   * Add queued remote candidates to connection
   */
  async addQueuedCandidates(pc) {
    if (!pc) {
      throw new Error('PeerConnection required');
    }

    const count = this._remoteCandidates.length;
    if (count === 0) {
      return;
    }

    logger.debug('IceManager', `Adding ${count} queued remote candidates...`);

    for (const candidate of this._remoteCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        logger.trace(
          'IceManager',
          `Added queued candidate: ${candidate.candidate?.substring(0, 30)}...`
        );
      } catch (error) {
        logger.error('IceManager', `Failed to add queued candidate: ${error.message}`);
      }
    }

    this._remoteCandidates = [];
    logger.debug('IceManager', 'All queued candidates added');
  }

  /**
   * Get local candidates
   */
  getLocalCandidates() {
    return [...this._localCandidates];
  }

  /**
   * Get remote candidates
   */
  getRemoteCandidates() {
    return [...this._remoteCandidates];
  }

  /**
   * Register candidate exchange listener
   */
  onCandidateExchange(callback) {
    this._candidateExchangeCallbacks.push(callback);
  }

  /**
   * Perform ICE troubleshooting
   */
  async troubleshoot(pc) {
    logger.debug('IceManager', 'Starting ICE troubleshooting...');

    const issues = [];
    const recommendations = [];

    // Check ICE gathering state
    const gatheringState = pc.iceGatheringState;
    logger.debug('IceManager', `ICE gathering state: ${gatheringState}`);

    if (gatheringState === 'gathering') {
      issues.push('ICE gathering still in progress');
      recommendations.push('Wait for gathering to complete or check network connectivity');
    } else if (gatheringState === 'failed') {
      issues.push('ICE gathering failed');
      recommendations.push('Check STUN/TURN server configuration and network connectivity');
    }

    // Check ICE connection state
    const iceState = pc.iceConnectionState;
    logger.debug('IceManager', `ICE connection state: ${iceState}`);

    if (iceState === 'failed') {
      issues.push('ICE connection failed');
      recommendations.push('Check STUN/TURN server credentials and ensure UDP/TCP ports are open');
    } else if (iceState === 'disconnected') {
      issues.push('ICE connection disconnected');
      recommendations.push('Network connectivity issue detected');
    }

    // Check candidate count
    const localCount = this._localCandidates.length;
    const remoteCount = this._remoteCandidates.length;

    logger.debug('IceManager', `Candidates: local=${localCount}, remote=${remoteCount}`);

    if (localCount === 0) {
      issues.push('No local ICE candidates collected');
      recommendations.push('Check network connectivity and STUN/TURN server configuration');
    }

    if (remoteCount === 0 && iceState !== 'new') {
      issues.push('No remote ICE candidates received');
      recommendations.push('Check signaling connection and peer connectivity');
    }

    // Get stats for more detailed analysis
    try {
      const stats = await pc.getStats();
      let hasValidCandidatePair = false;
      let roundTripTime = null;

      stats.forEach((stat) => {
        if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
          hasValidCandidatePair = true;
          roundTripTime = stat.currentRoundTripTime;
        }
      });

      if (!hasValidCandidatePair) {
        issues.push('No successful candidate pair found');
        recommendations.push('Check NAT/firewall configuration');
      }

      if (roundTripTime !== null) {
        logger.debug('IceManager', `ICE round-trip time: ${roundTripTime * 1000}ms`);

        if (roundTripTime > 1) {
          recommendations.push('High latency detected - consider using TURN server');
        }
      }
    } catch (error) {
      logger.error('IceManager', `Failed to get stats for troubleshooting: ${error.message}`);
    }

    const result = {
      issues,
      recommendations,
      candidates: {
        local: localCount,
        remote: remoteCount,
      },
      states: {
        gathering: gatheringState,
        connection: iceState,
      },
    };

    if (issues.length > 0) {
      logger.warn('IceManager', `ICE troubleshooting found ${issues.length} issues`);
      issues.forEach((issue) => logger.warn('IceManager', `  - ${issue}`));
    } else {
      logger.success('IceManager', 'ICE troubleshooting: No issues found');
    }

    this._troubleshootingCallbacks.forEach((callback) => {
      try {
        callback(result);
      } catch (error) {
        logger.error('IceManager', `Troubleshooting callback error: ${error.message}`);
      }
    });

    return result;
  }

  /**
   * Register troubleshooting listener
   */
  onTroubleshoot(callback) {
    this._troubleshootingCallbacks.push(callback);
  }

  /**
   * Reset manager state
   */
  reset() {
    this._localCandidates = [];
    this._remoteCandidates = [];
    logger.debug('IceManager', 'Manager reset');
  }

  /**
   * Create ICE candidate for testing
   */
  createTestCandidate() {
    return new RTCIceCandidate({
      candidate: 'candidate:1 1 UDP 2130706435 192.168.1.1 12345 typ host',
      sdpMid: '0',
      sdpMLineIndex: 0,
    });
  }
}

export default IceManager;
