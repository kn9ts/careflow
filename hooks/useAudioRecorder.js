/**
 * useAudioRecorder Hook
 * Manages audio recording functionality
 * Following separation of concerns - side effects and business logic
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { AudioProcessor, RecordingUploader } from "@/lib/audioProcessor";

export function useAudioRecorder(authToken, options = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingSupported, setRecordingSupported] = useState(false);
  const [recordingError, setRecordingError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const audioProcessorRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingUploaderRef = useRef(null);

  // Initialize audio processor
  useEffect(() => {
    if (!authToken) return;

    audioProcessorRef.current = new AudioProcessor({
      token: authToken,
      onCallState: (state) => {
        console.log("Audio processor call state:", state);
        if (state.status === "connected") {
          setIsRecording(false);
        } else if (state.status === "ended") {
          stopRecordingTimer();
          setIsRecording(false);
        } else if (state.status === "error") {
          setRecordingError(state.error);
          setIsRecording(false);
        }
      },
      onRecordingState: async (state) => {
        console.log("Recording state:", state);
        setIsRecording(state.isRecording);

        if (state.isRecording) {
          startRecordingTimer();
        } else {
          stopRecordingTimer();

          // Upload recording if available
          if (state.recording && recordingUploaderRef.current) {
            await uploadRecording(state.recording);
          }
        }
      },
      onError: (error) => {
        console.error("Audio processor error:", error);
        setRecordingError(error.message);
        setIsRecording(false);
      },
    });

    recordingUploaderRef.current = new RecordingUploader({
      token: authToken,
      onProgress: (progress) => {
        console.log("Upload progress:", progress);
        setUploadProgress(progress);
      },
      onError: (error) => {
        console.error("Upload error:", error);
        setRecordingError(error.message);
        setIsUploading(false);
      },
      onSuccess: (data) => {
        console.log("Upload success:", data);
        setIsUploading(false);
        setUploadProgress(100);
      },
    });

    // Check recording support
    checkRecordingSupport();

    return () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.destroy();
      }
      stopRecordingTimer();
    };
  }, [authToken]);

  const checkRecordingSupport = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setRecordingSupported(true);
    } catch (error) {
      console.error("Recording not supported:", error);
      setRecordingSupported(false);
    }
  }, []);

  const startRecordingTimer = useCallback(() => {
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingDuration(0);
  }, []);

  const uploadRecording = useCallback(async (recording) => {
    if (!recordingUploaderRef.current) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await recordingUploaderRef.current.uploadWithProgress(
        recording,
        (progress) => {
          setUploadProgress(progress);
        },
      );
      return true;
    } catch (error) {
      console.error("Upload failed:", error);
      setRecordingError("Recording upload failed");
      return false;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!audioProcessorRef.current) {
      setRecordingError("Audio processor not initialized");
      return false;
    }

    try {
      await audioProcessorRef.current.startRecording();
      return true;
    } catch (error) {
      console.error("Failed to start recording:", error);
      setRecordingError("Failed to start recording: " + error.message);
      return false;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!audioProcessorRef.current) {
      return null;
    }

    try {
      const recording = await audioProcessorRef.current.stopRecording();
      return recording;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setRecordingError("Failed to stop recording");
      return null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    setIsRecording(false);
    setRecordingDuration(0);
    setRecordingError(null);
    setUploadProgress(0);
    setIsUploading(false);
    stopRecordingTimer();
  }, [stopRecordingTimer]);

  // Format recording duration
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    // State
    isRecording,
    recordingDuration,
    recordingSupported,
    recordingError,
    uploadProgress,
    isUploading,

    // Actions
    startRecording,
    stopRecording,
    uploadRecording,
    resetRecording,
    checkRecordingSupport,

    // Utilities
    formatDuration,
    clearError: () => setRecordingError(null),
  };
}
