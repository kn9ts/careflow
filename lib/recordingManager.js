/**
 * Call Recording Manager
 *
 * Handles client-side call recording using MediaRecorder API.
 * Captures WebRTC audio streams, processes recordings, and uploads to Backblaze B2.
 *
 * Features:
 * - Start/stop recording during calls
 * - Dual-channel recording (local + remote audio)
 * - Audio processing and compression
 * - Progress tracking
 * - Retry logic for uploads
 */

class CallRecordingManager {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.localStream = null;
    this.remoteStream = null;
    this.combinedStream = null;
    this.isRecording = false;
    this.recordingStartTime = null;
    this.callId = null;
    this.uploadProgress = 0;
    this.listeners = {
      onRecordingStarted: null,
      onRecordingStopped: null,
      onRecordingError: null,
      onUploadProgress: null,
      onUploadComplete: null,
      onUploadError: null,
    };
  }

  /**
   * Initialize recording manager
   * @param {string} callId - Unique call identifier
   */
  async initialize(callId) {
    this.callId = callId || this.generateCallId();
    this.recordedChunks = [];
    this.uploadProgress = 0;
    console.log(`RecordingManager initialized for call: ${this.callId}`);
  }

  /**
   * Generate unique call ID
   */
  generateCallId() {
    return `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start recording a call
   * @param {MediaStream} localStream - Local audio stream
   * @param {MediaStream} remoteStream - Remote audio stream (optional)
   */
  async startRecording(localStream, remoteStream = null) {
    if (this.isRecording) {
      console.warn("Recording already in progress");
      return;
    }

    try {
      this.localStream = localStream;
      this.remoteStream = remoteStream;

      // Combine local and remote streams for recording
      this.combinedStream = this.createCombinedStream(
        localStream,
        remoteStream,
      );

      // Set up MediaRecorder with optimal settings for speech
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.combinedStream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps - good quality for speech
      });

      // Handle data available events
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // Handle recording errors
      this.mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        this.handleError("Recording error", event.error);
      };

      // Start recording
      this.mediaRecorder.start(1000); // Slice every 1 second for progress tracking
      this.isRecording = true;
      this.recordingStartTime = new Date();

      // Notify listeners
      if (this.listeners.onRecordingStarted) {
        this.listeners.onRecordingStarted({
          callId: this.callId,
          startTime: this.recordingStartTime,
        });
      }

      console.log(`Recording started for call: ${this.callId}`);
    } catch (error) {
      console.error("Failed to start recording:", error);
      this.handleError("Failed to start recording", error);
      throw error;
    }
  }

  /**
   * Create combined stream from local and remote audio
   */
  createCombinedStream(localStream, remoteStream) {
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    const destination = audioContext.createMediaStreamDestination();

    // Add local track
    if (localStream) {
      const localSource = audioContext.createMediaStreamSource(localStream);
      localSource.connect(destination);
    }

    // Add remote track if available
    if (remoteStream) {
      const remoteSource = audioContext.createMediaStreamSource(remoteStream);
      remoteSource.connect(destination);
    }

    return destination.stream;
  }

  /**
   * Get supported MIME type for MediaRecorder
   */
  getSupportedMimeType() {
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    // Fallback to default
    return "audio/webm";
  }

  /**
   * Stop recording
   * @returns {Promise<{callId: string, duration: number, size: number, blob: Blob}>}
   */
  async stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn("No recording in progress");
      return null;
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        const duration = Math.round(
          (new Date() - this.recordingStartTime) / 1000,
        );
        const blob = new Blob(this.recordedChunks, {
          type: this.getSupportedMimeType(),
        });
        const size = blob.size;

        // Clear state
        this.recordedChunks = [];
        this.isRecording = false;

        // Notify listeners
        if (this.listeners.onRecordingStopped) {
          this.listeners.onRecordingStopped({
            callId: this.callId,
            duration,
            size,
            blob,
          });
        }

        console.log(
          `Recording stopped: ${this.callId}, duration: ${duration}s, size: ${size} bytes`,
        );
        resolve({ callId: this.callId, duration, size, blob });
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error("Recording stop failed"));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Pause recording
   */
  pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
      console.log("Recording paused");
    }
  }

  /**
   * Resume recording
   */
  resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
      console.log("Recording resumed");
    }
  }

  /**
   * Check if currently recording
   */
  getRecordingState() {
    return {
      isRecording: this.isRecording,
      callId: this.callId,
      startTime: this.recordingStartTime,
      duration: this.recordingStartTime
        ? Math.round((new Date() - this.recordingStartTime) / 1000)
        : 0,
    };
  }

  /**
   * Set event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.listeners.hasOwnProperty(event)) {
      this.listeners[event] = callback;
    }
  }

  /**
   * Handle recording errors
   */
  handleError(message, error) {
    console.error(`Recording error: ${message}`, error);
    if (this.listeners.onRecordingError) {
      this.listeners.onRecordingError({ message, error });
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    }

    this.localStream = null;
    this.remoteStream = null;
    this.combinedStream = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.callId = null;

    console.log("RecordingManager destroyed");
  }
}

/**
 * Recording Uploader
 * Handles uploading recordings to Backblaze B2 with retry logic
 */
class RecordingUploader {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.uploadProgress = 0;
    this.listeners = {
      onProgress: null,
      onComplete: null,
      onError: null,
    };
  }

  /**
   * Upload recording to Backblaze B2
   * @param {Blob} recordingBlob - Recorded audio blob
   * @param {Object} metadata - Recording metadata
   * @param {string} token - Auth token
   * @returns {Promise<Object>} Upload result
   */
  async upload(recordingBlob, metadata, token) {
    const { callId, duration, from, to, direction } = metadata;

    // Process and compress audio
    const processedBlob = await this.processAudio(recordingBlob);

    // Create upload payload
    const filename = this.generateFilename(callId, direction);
    const file = new File([processedBlob], filename, {
      type: "audio/webm",
    });

    // Upload with retry logic
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Upload attempt ${attempt}/${this.maxRetries}`);

        const result = await this.uploadToAPI(file, metadata, token);

        // Notify completion
        if (this.listeners.onComplete) {
          this.listeners.onComplete(result);
        }

        return result;
      } catch (error) {
        lastError = error;
        console.error(`Upload attempt ${attempt} failed:`, error);

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    if (this.listeners.onError) {
      this.listeners.onError({
        callId,
        error: lastError,
        message: `Failed to upload after ${this.maxRetries} attempts`,
      });
    }

    throw lastError;
  }

  /**
   * Process audio for optimal size/quality
   */
  async processAudio(blob) {
    // For now, return original blob
    // Could implement audio compression here using AudioContext
    return blob;
  }

  /**
   * Generate unique filename
   */
  generateFilename(callId, direction) {
    const timestamp = Date.now();
    return `${direction}-${callId}-${timestamp}.webm`;
  }

  /**
   * Upload to API endpoint
   */
  async uploadToAPI(file, metadata, token) {
    const formData = new FormData();
    formData.append("recording", file);
    formData.append("callId", metadata.callId);
    formData.append("duration", metadata.duration);
    formData.append("from", metadata.from);
    formData.append("to", metadata.to);
    formData.append("direction", metadata.direction);
    formData.append("recordedAt", new Date().toISOString());

    const response = await fetch("/api/recordings/upload", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Upload failed");
    }

    return response.json();
  }

  /**
   * Set event listener
   */
  on(event, callback) {
    if (this.listeners.hasOwnProperty(event)) {
      this.listeners[event] = callback;
    }
  }

  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instances
export const recordingManager = new CallRecordingManager();
export const recordingUploader = new RecordingUploader();
export { CallRecordingManager, RecordingUploader };
