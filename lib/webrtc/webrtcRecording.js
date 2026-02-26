/**
 * WebRTC Recording Module
 *
 * Handles call recording using MediaRecorder API.
 * Records audio from WebRTC streams and manages recordings.
 */

import { logger } from '@/lib/logger';
import { RECORDING, getSupportedMimeType } from './config';

/**
 * WebRTC Recording Manager
 * Handles audio recording for WebRTC calls
 */
export class WebRTCRecording {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this._stream = null;
    this._isRecording = false;
    this._startTime = null;
    this._mimeType = null;
    this._dataCallbacks = [];
    this._stopCallbacks = [];
    this._errorCallbacks = [];
  }

  /**
   * Initialize recording with a stream
   */
  initialize(stream) {
    this._stream = stream;
    this._mimeType = getSupportedMimeType();

    logger.info('WebRTCRecording', `Initialized with MIME type: ${this._mimeType}`);
  }

  /**
   * Start recording
   */
  start() {
    if (this._isRecording) {
      logger.warn('WebRTCRecording', 'Already recording');
      return;
    }

    if (!this._stream) {
      logger.error('WebRTCRecording', 'No stream to record');
      throw new Error('No stream initialized');
    }

    this.recordedChunks = [];

    try {
      const options = {
        mimeType: this._mimeType,
        audioBitsPerSecond: RECORDING.AUDIO_BITRATE,
      };

      // Check if MIME type is supported
      if (!MediaRecorder.isTypeSupported(this._mimeType)) {
        logger.warn(
          'WebRTCRecording',
          `MIME type not supported: ${this._mimeType}, trying default`
        );
        this._mimeType = 'audio/webm';
        options.mimeType = this._mimeType;
      }

      this.mediaRecorder = new MediaRecorder(this._stream, options);

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          logger.debug('WebRTCRecording', `Data available: ${event.data.size} bytes`);

          // Notify data callbacks
          this._dataCallbacks.forEach((callback) => {
            try {
              callback(event.data);
            } catch (error) {
              logger.error('WebRTCRecording', `Data callback error: ${error.message}`);
            }
          });
        }
      };

      this.mediaRecorder.onstop = () => {
        logger.info('WebRTCRecording', 'Recording stopped');
        this._isRecording = false;

        // Notify stop callbacks
        this._stopCallbacks.forEach((callback) => {
          try {
            callback(this.getRecording());
          } catch (error) {
            logger.error('WebRTCRecording', `Stop callback error: ${error.message}`);
          }
        });
      };

      this.mediaRecorder.onerror = (event) => {
        logger.error('WebRTCRecording', `Recording error: ${event.error}`);
        this._errorCallbacks.forEach((callback) => {
          try {
            callback(event.error);
          } catch (error) {
            logger.error('WebRTCRecording', `Error callback error: ${error.message}`);
          }
        });
      };

      // Start recording with 1-second timeslice
      this.mediaRecorder.start(1000);

      this._isRecording = true;
      this._startTime = Date.now();

      logger.success('WebRTCRecording', 'Recording started');
    } catch (error) {
      logger.error('WebRTCRecording', `Failed to start recording: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  stop() {
    if (!this._isRecording || !this.mediaRecorder) {
      logger.warn('WebRTCRecording', 'Not currently recording');
      return;
    }

    logger.debug('WebRTCRecording', 'Stopping recording');

    this.mediaRecorder.stop();
    this._isRecording = false;
  }

  /**
   * Pause recording
   */
  pause() {
    if (!this._isRecording || !this.mediaRecorder) {
      logger.warn('WebRTCRecording', 'Not currently recording');
      return;
    }

    if (this.mediaRecorder.state === 'paused') {
      logger.debug('WebRTCRecording', 'Already paused');
      return;
    }

    this.mediaRecorder.pause();
    logger.debug('WebRTCRecording', 'Recording paused');
  }

  /**
   * Resume recording
   */
  resume() {
    if (!this._isRecording || !this.mediaRecorder) {
      logger.warn('WebRTCRecording', 'Not currently recording');
      return;
    }

    if (this.mediaRecorder.state === 'recording') {
      logger.debug('WebRTCRecording', 'Already recording');
      return;
    }

    this.mediaRecorder.resume();
    logger.debug('WebRTCRecording', 'Recording resumed');
  }

  /**
   * Get the current recording as a Blob
   */
  getRecording() {
    if (this.recordedChunks.length === 0) {
      return null;
    }

    return new Blob(this.recordedChunks, {
      type: this._mimeType,
    });
  }

  /**
   * Get recording as URL for playback
   */
  getRecordingURL() {
    const recording = this.getRecording();

    if (!recording) {
      return null;
    }

    return URL.createObjectURL(recording);
  }

  /**
   * Get recording duration in milliseconds
   */
  getDuration() {
    if (!this._startTime) {
      return 0;
    }

    return Date.now() - this._startTime;
  }

  /**
   * Check if currently recording
   */
  isRecording() {
    return this._isRecording;
  }

  /**
   * Check if recording is paused
   */
  isPaused() {
    return this.mediaRecorder?.state === 'paused';
  }

  /**
   * Register data available callback
   */
  onDataAvailable(callback) {
    this._dataCallbacks.push(callback);
  }

  /**
   * Register recording stop callback
   */
  onStop(callback) {
    this._stopCallbacks.push(callback);
  }

  /**
   * Register error callback
   */
  onError(callback) {
    this._errorCallbacks.push(callback);
  }

  /**
   * Save recording to server
   */
  async saveRecording(metadata = {}) {
    const recording = this.getRecording();

    if (!recording) {
      logger.error('WebRTCRecording', 'No recording to save');
      throw new Error('No recording available');
    }

    const formData = new FormData();
    formData.append('audio', recording, `recording_${Date.now()}.webm`);
    formData.append('duration', this.getDuration());
    formData.append('mimeType', this._mimeType);

    // Add metadata
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(key, value);
    });

    logger.info('WebRTCRecording', 'Saving recording to server...');

    try {
      const response = await fetch('/api/recordings/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();
      logger.success('WebRTCRecording', `Recording saved: ${result.id}`);

      return result;
    } catch (error) {
      logger.error('WebRTCRecording', `Failed to save recording: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download recording locally
   */
  downloadRecording(filename = 'recording.webm') {
    const recording = this.getRecording();

    if (!recording) {
      logger.error('WebRTCRecording', 'No recording to download');
      return;
    }

    const url = URL.createObjectURL(recording);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logger.info('WebRTCRecording', `Recording downloaded: ${filename}`);
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this._isRecording) {
      this.stop();
    }

    this._stream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this._dataCallbacks = [];
    this._stopCallbacks = [];
    this._errorCallbacks = [];

    logger.debug('WebRTCRecording', 'Disposed');
  }

  /**
   * Reset for new recording
   */
  reset() {
    this.dispose();
    logger.debug('WebRTCRecording', 'Reset complete');
  }
}

export default WebRTCRecording;
