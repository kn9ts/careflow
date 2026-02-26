/**
 * Media Manager Module
 *
 * Handles all media stream operations including getUserMedia,
 * track management, and device handling.
 */

import { logger } from '@/lib/logger';

/**
 * Default media constraints for audio calls
 */
export const DEFAULT_CONSTRAINTS = {
  audio: true,
  video: false,
};

/**
 * Manages local media streams and tracks
 */
export class MediaManager {
  constructor() {
    this.localStream = null;
    this._activeTracks = new Set();
  }

  /**
   * Check if browser supports getUserMedia
   */
  static isSupported() {
    if (typeof window === 'undefined') return false;
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Get local stream
   */
  getLocalStream() {
    return this.localStream;
  }

  /**
   * Check if has local stream
   */
  hasLocalStream() {
    return !!this.localStream;
  }

  /**
   * Request user media (microphone)
   */
  async getUserMedia(constraints = DEFAULT_CONSTRAINTS) {
    // If we have an existing stream, check if tracks are still valid
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      // If track is still active and not ended, reuse the stream
      if (audioTrack && audioTrack.readyState === 'live') {
        logger.debug('MediaManager', 'Using existing local stream');
        return this.localStream;
      }
      // Track ended, stop and get new stream
      logger.debug('MediaManager', 'Existing stream tracks ended, getting new stream');
      this.stopTracks();
    }

    try {
      logger.loading('MediaManager', 'Requesting local audio stream...');
      logger.debug('MediaManager', `Media constraints: ${JSON.stringify(constraints)}`);

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      const audioTrack = this.localStream.getAudioTracks()[0];
      logger.success('MediaManager', `Local stream acquired: ${this.localStream.id}`);
      logger.debug(
        'MediaManager',
        `Audio track: ${audioTrack?.id}, enabled: ${audioTrack?.enabled}, muted: ${audioTrack?.muted}`
      );

      // Track active tracks
      this.localStream.getTracks().forEach((track) => {
        this._activeTracks.add(track.id);
        logger.debug(
          'MediaManager',
          `Tracking ${track.kind} track: ${track.id}, label: ${track.label}`
        );
      });

      return this.localStream;
    } catch (error) {
      logger.error(
        'MediaManager',
        `Failed to get local stream: ${error?.message || error || 'Unknown error'}`
      );

      // Provide helpful error messages
      if (error.name === 'NotAllowedError') {
        logger.error('MediaManager', 'Microphone access denied by user');
        throw new Error('Microphone access denied. Please allow microphone access and try again.');
      } else if (error.name === 'NotFoundError') {
        logger.error('MediaManager', 'No microphone found on device');
        throw new Error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        logger.error('MediaManager', 'Microphone already in use');
        throw new Error('Microphone is already in use by another application.');
      }

      throw error;
    }
  }

  /**
   * Add track to peer connection
   */
  addTrackToPeerConnection(peerConnection, stream) {
    if (!stream || !peerConnection) {
      logger.warn('MediaManager', 'Cannot add track - missing stream or peer connection');
      return;
    }

    stream.getTracks().forEach((track) => {
      logger.debug('MediaManager', `Adding ${track.kind} track to peer connection: ${track.id}`);
      peerConnection.addTrack(track, stream);
    });
  }

  /**
   * Mute audio track
   */
  muteAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
        logger.debug('MediaManager', 'Audio muted');
        return true;
      }
    }
    return false;
  }

  /**
   * Unmute audio track
   */
  unmuteAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        logger.debug('MediaManager', 'Audio unmuted');
        return true;
      }
    }
    return false;
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        logger.debug('MediaManager', `Mute toggled: ${!audioTrack.enabled}`);
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  /**
   * Check if audio is muted
   */
  isMuted() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      return audioTrack ? !audioTrack.enabled : true;
    }
    return true;
  }

  /**
   * Stop all tracks in local stream
   */
  stopTracks() {
    if (this.localStream) {
      logger.debug('MediaManager', `Stopping local stream: ${this.localStream.id}`);
      this.localStream.getTracks().forEach((track) => {
        logger.debug('MediaManager', `Stopping ${track.kind} track: ${track.id}`);
        track.stop();
        this._activeTracks.delete(track.id);
      });
      this.localStream = null;
      this._activeTracks.clear();
      logger.debug('MediaManager', 'All tracks stopped and stream cleared');
    }
  }

  /**
   * Stop local stream (alias for stopTracks)
   */
  stopLocalStream() {
    this.stopTracks();
  }

  /**
   * Get supported MIME types for recording
   */
  getSupportedMimeTypes() {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    const supported = [];
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        supported.push(mimeType);
      }
    }

    return supported;
  }

  /**
   * Get active track IDs
   */
  getActiveTracks() {
    return Array.from(this._activeTracks);
  }

  /**
   * Reset manager state
   */
  reset() {
    this.stopTracks();
    this._activeTracks.clear();
  }
}

export default MediaManager;
