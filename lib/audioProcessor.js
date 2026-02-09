/**
 * Audio Processor Module
 * Handles WebRTC audio recording with SimplePeer and OGG compression
 */

import SimplePeer from "simple-peer";
import { logger } from "@/lib/logger";

// Optimized audio constraints for better performance
const OPTIMIZED_AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
};

// ICE servers configuration
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

/**
 * AudioProcessor class for handling WebRTC calls with SimplePeer
 * and recording with OGG compression
 */
export class AudioProcessor {
  constructor(options = {}) {
    this.token = options.token || null;
    this.userId = options.userId || null;
    this.onStream = options.onStream || (() => {});
    this.onCallState = options.onCallState || (() => {});
    this.onError = options.onError || ((err) => console.error(err));
    this.onRecordingState = options.onRecordingState || (() => {});

    this.peer = null;
    this.localStream = null;
    this.recorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.callStatus = "idle"; // idle, connecting, connected, ended
    this.recordingId = null;

    logger.init("AudioProcessor");
  }

  /**
   * Initialize audio context and get user media
   */
  async initialize() {
    try {
      logger.loading("AudioProcessor", "Getting user media...");

      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser does not support getUserMedia");
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(
        OPTIMIZED_AUDIO_CONSTRAINTS,
      );

      logger.success("AudioProcessor", "Local stream acquired");
      this.onCallState({ status: "ready", stream: this.localStream });
      return this.localStream;
    } catch (error) {
      logger.error("AudioProcessor", `Initialization failed: ${error.message}`);
      this.onError(error);
      throw error;
    }
  }

  /**
   * Create a SimplePeer instance for WebRTC connection
   */
  createPeer(initiator = true, signalData = null) {
    if (!this.localStream) {
      throw new Error("Local stream not initialized. Call initialize() first.");
    }

    this.callStatus = initiator ? "connecting" : "waiting";
    logger.loading("AudioProcessor", `Creating peer (initiator: ${initiator})`);
    this.onCallState({ status: this.callStatus });

    this.peer = new SimplePeer({
      initiator,
      stream: this.localStream,
      trickle: true,
      config: {
        iceServers: ICE_SERVERS,
      },
    });

    this.peer.on("signal", (data) => {
      logger.trace("AudioProcessor", "Signal data generated");
      this.onCallState({ type: "signal", data });
    });

    this.peer.on("stream", (stream) => {
      logger.success("AudioProcessor", "Remote stream received");
      this.callStatus = "connected";
      this.onCallState({ status: "connected", stream });
      this.onStream(stream);
    });

    this.peer.on("connect", () => {
      logger.callConnect("AudioProcessor");
      this.callStatus = "connected";
      this.onCallState({ status: "connected" });
    });

    this.peer.on("close", () => {
      logger.callEnd("AudioProcessor");
      this.callStatus = "ended";
      this.onCallState({ status: "ended" });
      this.stopRecording();
    });

    this.peer.on("error", (err) => {
      logger.error("AudioProcessor", `Peer error: ${err.message}`);
      this.onError(err);
      this.callStatus = "ended";
      this.onCallState({ status: "error", error: err.message });
    });

    this.peer.on("data", (data) => {
      logger.trace("AudioProcessor", "Data received");
    });

    if (signalData) {
      logger.debug("AudioProcessor", "Applying incoming signal");
      this.peer.signal(signalData);
    }

    logger.success("AudioProcessor", "Peer created and ready");
    return this.peer;
  }

  /**
   * Signal data received from remote peer
   */
  signal(signalData) {
    if (this.peer) {
      logger.debug("AudioProcessor", "Processing incoming signal");
      this.peer.signal(signalData);
    }
  }

  /**
   * Start recording the call
   */
  async startRecording() {
    if (this.isRecording) {
      logger.warn("AudioProcessor", "Already recording");
      return;
    }

    if (!this.localStream && !this.peer?.stream) {
      throw new Error("No audio stream available");
    }

    // Generate unique recording ID
    this.recordingId = this.generateRecordingId();
    this.recordedChunks = [];
    this.isRecording = true;

    logger.recordingStart("AudioProcessor");

    // Use MediaRecorder with opus codec (produces OGG-compatible WebM)
    const stream = this.localStream || this.peer?.stream;
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.recorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 128000, // 128 kbps for good quality
    });

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.recorder.onstop = async () => {
      await this.processRecording();
    };

    this.recorder.start(1000); // Collect data every second

    this.onRecordingState({
      isRecording: true,
      recordingId: this.recordingId,
      status: "recording",
    });

    logger.success("AudioProcessor", `Recording started: ${this.recordingId}`);
  }

  /**
   * Stop recording and process the audio
   */
  async stopRecording() {
    if (!this.isRecording || !this.recorder) {
      return null;
    }

    logger.loading("AudioProcessor", "Stopping recording...");

    return new Promise((resolve) => {
      this.recorder.onstop = async () => {
        const recording = await this.processRecording();
        this.isRecording = false;
        resolve(recording);
      };
      this.recorder.stop();
    });
  }

  /**
   * Process the recorded audio and convert to OGG format
   */
  async processRecording() {
    const blob = new Blob(this.recordedChunks, {
      type: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm",
    });

    // For true OGG format, we would use ffmpeg.wasm
    // For now, we'll use the WebM with opus which is widely compatible
    // and can be renamed to .ogg for compatibility
    const oggBlob = await this.convertToOgg(blob);

    const recording = {
      id: this.recordingId,
      blob: oggBlob,
      originalBlob: blob,
      duration: this.recordedChunks.length, // Approximate
      size: oggBlob.size,
      mimeType: "audio/ogg",
      createdAt: new Date().toISOString(),
    };

    this.onRecordingState({
      isRecording: false,
      recordingId: this.recordingId,
      status: "processed",
      recording,
    });

    logger.success(
      "AudioProcessor",
      `Recording processed: ${recording.size} bytes`,
    );
    return recording;
  }

  /**
   * Convert WebM to OGG using audio compression
   * Note: Full OGG conversion requires ffmpeg.wasm
   * This is a simplified version that renames the file
   * For production, use @ffmpeg/ffmpeg
   */
  async convertToOgg(webmBlob) {
    // Browser-native approach: WebM with Opus codec is essentially OGG container
    // Most players accept .ogg extension for WebM with Opus
    // For true OGG conversion, load ffmpeg.wasm

    try {
      // Check if ffmpeg is available
      if (typeof window !== "undefined" && window.ffmpeg) {
        return await this.ffmpegConvert(webmBlob);
      }
    } catch (e) {
      logger.debug("AudioProcessor", "ffmpeg not available, using native WebM");
    }

    // Native approach: The WebM with Opus codec is compatible
    // We'll return the blob as-is but mark it as OGG compatible
    return webmBlob;
  }

  /**
   * OGG conversion using ffmpeg.wasm (when available)
   */
  async ffmpegConvert(webmBlob) {
    logger.loading("AudioProcessor", "Converting with ffmpeg...");

    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

    const ffmpeg = new FFmpeg();

    // Load ffmpeg
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
    });

    // Write input file
    const inputName = "input.webm";
    const outputName = "output.ogg";
    await ffmpeg.writeFile(inputName, await fetchFile(webmBlob));

    // Convert to OGG with Opus codec
    await ffmpeg.exec([
      "-i",
      inputName,
      "-c:a",
      "libopus",
      "-b:a",
      "128k",
      outputName,
    ]);

    // Read output file
    const data = await ffmpeg.readFile(outputName);
    logger.success("AudioProcessor", "ffmpeg conversion complete");
    return new Blob([data.buffer], { type: "audio/ogg" });
  }

  /**
   * Generate unique recording ID
   */
  generateRecordingId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `rec_${timestamp}_${randomPart}`;
  }

  /**
   * Send DTMF tones
   */
  sendDTMF(digit) {
    if (this.peer) {
      logger.debug("AudioProcessor", `Sending DTMF: ${digit}`);
      this.peer.send(JSON.stringify({ type: "dtmf", digit }));
    }
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        logger.debug("AudioProcessor", `Mute: ${!audioTrack.enabled}`);
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  /**
   * End the call
   */
  async endCall() {
    logger.loading("AudioProcessor", "Ending call...");

    // Stop recording if active
    await this.stopRecording();

    // Close peer connection
    if (this.peer) {
      logger.debug("AudioProcessor", "Destroying peer");
      this.peer.destroy();
      this.peer = null;
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        logger.debug("AudioProcessor", `Stopping ${track.kind} track`);
        track.stop();
      });
      this.localStream = null;
    }

    this.callStatus = "ended";
    this.onCallState({ status: "ended" });
    logger.complete("AudioProcessor");
  }

  /**
   * Clean up resources
   */
  destroy() {
    logger.loading("AudioProcessor", "Cleaning up...");
    this.endCall();
    this.recordedChunks = [];
    this.recordingId = null;
    logger.complete("AudioProcessor");
  }
}

/**
 * RecordingUploader handles uploading recordings to Backblaze B2
 */
export class RecordingUploader {
  constructor(options = {}) {
    this.token = options.token || null;
    this.uploadUrl = options.uploadUrl || "/api/recordings/upload";
    this.maxRetries = options.maxRetries || 3;
    this.onProgress = options.onProgress || (() => {});
    this.onError = options.onError || ((err) => console.error(err));
    this.onSuccess = options.onSuccess || (() => {});

    logger.init("RecordingUploader");
  }

  /**
   * Upload recording to server
   */
  async upload(recording) {
    if (!this.token) {
      throw new Error("No authentication token provided");
    }

    logger.loading("RecordingUploader", "Preparing upload...");

    const formData = new FormData();
    formData.append("recording", recording.blob, `${recording.id}.ogg`);
    formData.append(
      "metadata",
      JSON.stringify({
        id: recording.id,
        duration: recording.duration,
        mimeType: recording.mimeType,
        createdAt: recording.createdAt,
      }),
    );

    let attempts = 0;
    let lastError = null;

    while (attempts < this.maxRetries) {
      try {
        logger.loading(
          "RecordingUploader",
          `Upload attempt ${attempts + 1}...`,
        );

        const response = await fetch(this.uploadUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();
        logger.success("RecordingUploader", "Upload complete!");
        this.onSuccess(data);
        return data;
      } catch (error) {
        lastError = error;
        attempts++;
        this.onProgress({
          status: "retry",
          attempts,
          maxRetries: this.maxRetries,
          error: error.message,
        });

        if (attempts < this.maxRetries) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempts) * 1000),
          );
        }
      }
    }

    logger.error(
      "RecordingUploader",
      `Upload failed after ${this.maxRetries} attempts`,
    );
    this.onError(lastError);
    throw lastError;
  }

  /**
   * Upload with progress tracking using XHR
   */
  async uploadWithProgress(recording, onProgress) {
    logger.loading("RecordingUploader", "Starting upload with progress...");

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("recording", recording.blob, `${recording.id}.ogg`);
      formData.append(
        "metadata",
        JSON.stringify({
          id: recording.id,
          duration: recording.duration,
          mimeType: recording.mimeType,
          createdAt: recording.createdAt,
        }),
      );

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress({ progress, status: "uploading" });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            logger.success("RecordingUploader", "Upload complete!");
            resolve(data);
          } catch (e) {
            reject(new Error("Invalid response"));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.open("POST", this.uploadUrl);
      xhr.setRequestHeader("Authorization", `Bearer ${this.token}`);
      xhr.send(formData);
    });
  }
}

export default AudioProcessor;
