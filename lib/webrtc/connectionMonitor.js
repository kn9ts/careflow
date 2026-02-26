/**
 * Connection Monitor Module
 *
 * Monitors WebRTC connection quality, tracks statistics,
 * and provides reconnection logic.
 *
 * Uses Firebase UID for connection tracking.
 */

import { logger } from '@/lib/logger';
import { RECONNECTION } from './config';

/**
 * Connection Monitor
 * Tracks connection health and provides reconnection capabilities
 */
export class ConnectionMonitor {
  constructor() {
    this.peerConnection = null;
    this.localFirebaseUid = null; // Primary identifier
    this.remoteFirebaseUid = null; // Primary identifier
    this._isMonitoring = false;
    this._monitorInterval = null;
    this._statsCallbacks = [];
    this._qualityCallbacks = [];
    this._reconnectionCallbacks = [];
    this._reconnectionAttempts = 0;
    this._lastStats = null;
    this._statsHistory = [];
    this._maxHistoryLength = 10;
  }

  /**
   * Start monitoring a connection
   * @param {RTCPeerConnection} peerConnection - The peer connection to monitor
   * @param {Object} options - Monitoring options
   * @param {string} options.localFirebaseUid - Local user's Firebase UID
   * @param {string} options.remoteFirebaseUid - Remote user's Firebase UID
   */
  startMonitoring(peerConnection, options = {}) {
    if (this._isMonitoring) {
      logger.warn('ConnectionMonitor', 'Already monitoring');
      return;
    }

    this.peerConnection = peerConnection;
    this.localFirebaseUid = options.localFirebaseUid;
    this.remoteFirebaseUid = options.remoteFirebaseUid;

    const intervalMs = options.intervalMs || 2000;

    logger.info(
      'ConnectionMonitor',
      `Starting monitoring: local=${this.localFirebaseUid}, remote=${this.remoteFirebaseUid}`
    );

    this._isMonitoring = true;
    this._monitorInterval = setInterval(() => {
      this._collectStats();
    }, intervalMs);

    // Collect initial stats
    this._collectStats();

    logger.debug('ConnectionMonitor', `Monitoring started with ${intervalMs}ms interval`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this._isMonitoring) {
      return;
    }

    logger.debug('ConnectionMonitor', 'Stopping monitoring');

    if (this._monitorInterval) {
      clearInterval(this._monitorInterval);
      this._monitorInterval = null;
    }

    this._isMonitoring = false;
    this._statsHistory = [];

    logger.debug('ConnectionMonitor', 'Monitoring stopped');
  }

  /**
   * Collect connection statistics
   */
  async _collectStats() {
    if (!this.peerConnection || !this._isMonitoring) {
      return;
    }

    try {
      const stats = await this.peerConnection.getStats();
      const report = this._parseStats(stats);

      this._lastStats = report;
      this._statsHistory.push({
        ...report,
        timestamp: Date.now(),
      });

      // Keep history limited
      if (this._statsHistory.length > this._maxHistoryLength) {
        this._statsHistory.shift();
      }

      // Notify callbacks
      this._notifyStats(report);
      this._evaluateQuality(report);
    } catch (error) {
      logger.error('ConnectionMonitor', `Failed to collect stats: ${error.message}`);
    }
  }

  /**
   * Parse stats into a readable report
   */
  _parseStats(stats) {
    const report = {
      timestamp: Date.now(),
      bytesReceived: 0,
      bytesSent: 0,
      packetsLost: 0,
      packetsReceived: 0,
      packetsSent: 0,
      roundTripTime: null,
      jitter: null,
      audioLevel: null,
      connectionState: this.peerConnection?.connectionState || 'unknown',
      iceConnectionState: this.peerConnection?.iceConnectionState || 'unknown',
    };

    stats.forEach((stat) => {
      // Inbound RTP stats
      if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
        report.bytesReceived += stat.bytesReceived || 0;
        report.packetsReceived += stat.packetsReceived || 0;
        report.packetsLost += stat.packetsLost || 0;
        report.jitter = stat.jitter || null;

        if (stat.audioLevel !== undefined) {
          report.audioLevel = stat.audioLevel;
        }
      }

      // Outbound RTP stats
      if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
        report.bytesSent += stat.bytesSent || 0;
        report.packetsSent += stat.packetsSent || 0;
      }

      // Candidate pair stats
      if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
        report.roundTripTime = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : null;
      }
    });

    return report;
  }

  /**
   * Evaluate connection quality
   */
  _evaluateQuality(report) {
    const quality = {
      level: 'unknown',
      rtt: report.roundTripTime,
      packetLoss: this._calculatePacketLoss(),
      jitter: report.jitter,
      isGood: false,
    };

    // Determine quality level based on RTT
    if (report.roundTripTime !== null) {
      if (report.roundTripTime < 100) {
        quality.level = 'excellent';
        quality.isGood = true;
      } else if (report.roundTripTime < 200) {
        quality.level = 'good';
        quality.isGood = true;
      } else if (report.roundTripTime < 400) {
        quality.level = 'fair';
        quality.isGood = true;
      } else {
        quality.level = 'poor';
        quality.isGood = false;
      }
    }

    // Check for connection issues
    if (report.connectionState === 'disconnected') {
      logger.warn('ConnectionMonitor', 'Connection disconnected');
      quality.level = 'disconnected';
      quality.isGood = false;
    } else if (report.connectionState === 'failed') {
      logger.error('ConnectionMonitor', 'Connection failed');
      quality.level = 'failed';
      quality.isGood = false;
    }

    // Log quality changes
    if (quality.level !== 'unknown') {
      logger.debug(
        'ConnectionMonitor',
        `Quality: ${quality.level}, RTT: ${report.roundTripTime}ms`
      );
    }

    // Notify quality callbacks
    this._qualityCallbacks.forEach((callback) => {
      try {
        callback(quality, report);
      } catch (error) {
        logger.error('ConnectionMonitor', `Quality callback error: ${error.message}`);
      }
    });

    return quality;
  }

  /**
   * Calculate packet loss percentage
   */
  _calculatePacketLoss() {
    if (this._statsHistory.length < 2) {
      return 0;
    }

    const oldest = this._statsHistory[0];
    const latest = this._statsHistory[this._statsHistory.length - 1];

    const totalReceived = latest.packetsReceived - oldest.packetsReceived;
    const totalLost = latest.packetsLost - oldest.packetsLost;

    if (totalReceived + totalLost === 0) {
      return 0;
    }

    return (totalLost / (totalReceived + totalLost)) * 100;
  }

  /**
   * Get current connection stats
   */
  getCurrentStats() {
    return this._lastStats;
  }

  /**
   * Get stats history
   */
  getStatsHistory() {
    return [...this._statsHistory];
  }

  /**
   * Get average stats over time
   */
  getAverageStats() {
    if (this._statsHistory.length === 0) {
      return null;
    }

    const sum = this._statsHistory.reduce(
      (acc, stat) => ({
        bytesReceived: acc.bytesReceived + stat.bytesReceived,
        bytesSent: acc.bytesSent + stat.bytesSent,
        packetsLost: acc.packetsLost + stat.packetsLost,
        roundTripTime: acc.roundTripTime + (stat.roundTripTime || 0),
        jitter: acc.jitter + (stat.jitter || 0),
      }),
      {
        bytesReceived: 0,
        bytesSent: 0,
        packetsLost: 0,
        roundTripTime: 0,
        jitter: 0,
      }
    );

    const count = this._statsHistory.length;

    return {
      avgBytesReceived: sum.bytesReceived / count,
      avgBytesSent: sum.bytesSent / count,
      avgPacketLoss: sum.packetsLost / count,
      avgRoundTripTime: sum.roundTripTime / count,
      avgJitter: sum.jitter / count,
      sampleCount: count,
    };
  }

  /**
   * Attempt reconnection
   */
  async attemptReconnection() {
    if (this._reconnectionAttempts >= RECONNECTION.MAX_ATTEMPTS) {
      logger.error(
        'ConnectionMonitor',
        `Max reconnection attempts (${RECONNECTION.MAX_ATTEMPTS}) reached`
      );
      return false;
    }

    this._reconnectionAttempts++;

    const delay = RECONNECTION.BASE_DELAY_MS * 2 ** (this._reconnectionAttempts - 1);

    logger.info(
      'ConnectionMonitor',
      `Attempting reconnection ${this._reconnectionAttempts}/${RECONNECTION.MAX_ATTEMPTS} in ${delay}ms`
    );

    // Notify reconnection callbacks
    this._reconnectionCallbacks.forEach((callback) => {
      try {
        callback({
          attempt: this._reconnectionAttempts,
          maxAttempts: RECONNECTION.MAX_ATTEMPTS,
          delay,
        });
      } catch (error) {
        logger.error('ConnectionMonitor', `Reconnection callback error: ${error.message}`);
      }
    });

    return true;
  }

  /**
   * Reset reconnection counter
   */
  resetReconnection() {
    this._reconnectionAttempts = 0;
    logger.debug('ConnectionMonitor', 'Reconnection counter reset');
  }

  /**
   * Register stats callback
   */
  onStats(callback) {
    this._statsCallbacks.push(callback);
  }

  /**
   * Register quality callback
   */
  onQualityChange(callback) {
    this._qualityCallbacks.push(callback);
  }

  /**
   * Register reconnection callback
   */
  onReconnection(callback) {
    this._reconnectionCallbacks.push(callback);
  }

  /**
   * Notify stats callbacks
   */
  _notifyStats(report) {
    this._statsCallbacks.forEach((callback) => {
      try {
        callback(report);
      } catch (error) {
        logger.error('ConnectionMonitor', `Stats callback error: ${error.message}`);
      }
    });
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring() {
    return this._isMonitoring;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stopMonitoring();
    this.peerConnection = null;
    this._statsCallbacks = [];
    this._qualityCallbacks = [];
    this._reconnectionCallbacks = [];
    this._statsHistory = [];
    this._lastStats = null;

    logger.debug('ConnectionMonitor', 'Disposed');
  }
}

export default ConnectionMonitor;
