/**
 * useAudioRecorder Hook
 * Manages audio recording functionality
 * Following separation of concerns - side effects and business logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioProcessor, RecordingUploader } from '@/lib/audioProcessor';
import { logger } from '@/lib/logger';

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
  const initializedRef = useRef(false);

  // Initialize audio processor
  useEffect(() => {
    if (!authToken) {
      logger.warn('useAudioRecorder', 'No auth token - skipping initialization');
      return;
    }

    // Prevent re-initialization
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    logger.init('useAudioRecorder');
    logger.loading('useAudioRecorder', 'Initializing audio processor...');

    audioProcessorRef.current = new AudioProcessor({
      token: authToken,
      onCallState: (state) => {
        logger.trace('useAudioRecorder', `Call state: ${state.status}`);
        if (state.status === 'connected') {
          setIsRecording(false);
        } else if (state.status === 'ended') {
          stopRecordingTimer();
          setIsRecording(false);
        } else if (state.status === 'error') {
          logger.error('useAudioRecorder', `Error: ${state.error}`);
          setRecordingError(state.error);
          setIsRecording(false);
        }
      },
      onRecordingState: async (state) => {
        logger.trace('useAudioRecorder', `Recording state: ${state.status}`);
        setIsRecording(state.isRecording);

        if (state.isRecording) {
          logger.recordingStart('useAudioRecorder');
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
        logger.error('useAudioRecorder', `Processor error: ${error.message}`);
        setRecordingError(error.message);
        setIsRecording(false);
      },
    });

    recordingUploaderRef.current = new RecordingUploader({
      token: authToken,
      onProgress: (progress) => {
        logger.trace('useAudioRecorder', `Upload progress: ${progress}%`);
        setUploadProgress(progress);
      },
      onError: (error) => {
        logger.error('useAudioRecorder', `Upload error: ${error.message}`);
        setRecordingError(error.message);
        setIsUploading(false);
      },
      onSuccess: (data) => {
        logger.success('useAudioRecorder', 'Upload successful!');
        setIsUploading(false);
        setUploadProgress(100);
      },
    });

    // Check recording support
    checkRecordingSupport();

    return () => {
      if (audioProcessorRef.current) {
        logger.loading('useAudioRecorder', 'Cleaning up...');
        audioProcessorRef.current.destroy();
      }
      stopRecordingTimer();
      initializedRef.current = false;
      logger.complete('useAudioRecorder');
    };
  }, [authToken]);

  const checkRecordingSupport = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      logger.success('useAudioRecorder', 'Recording is supported');
      setRecordingSupported(true);
    } catch (error) {
      logger.warn('useAudioRecorder', 'Recording not supported');
      setRecordingSupported(false);
    }
  }, []);

  const startRecordingTimer = useCallback(() => {
    logger.debug('useAudioRecorder', 'Starting timer');
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

    logger.loading('useAudioRecorder', 'Uploading recording...');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      await recordingUploaderRef.current.uploadWithProgress(recording, (progress) => {
        setUploadProgress(progress);
      });
      return true;
    } catch (error) {
      logger.error('useAudioRecorder', `Upload failed: ${error.message}`);
      setRecordingError('Recording upload failed');
      return false;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!audioProcessorRef.current) {
      logger.error('useAudioRecorder', 'Audio processor not initialized');
      setRecordingError('Audio processor not initialized');
      return false;
    }

    try {
      logger.loading('useAudioRecorder', 'Starting recording...');
      await audioProcessorRef.current.startRecording();
      return true;
    } catch (error) {
      logger.error('useAudioRecorder', `Failed to start: ${error.message}`);
      setRecordingError(`Failed to start recording: ${error.message}`);
      return false;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!audioProcessorRef.current) {
      return null;
    }

    try {
      logger.loading('useAudioRecorder', 'Stopping recording...');
      const recording = await audioProcessorRef.current.stopRecording();
      logger.success('useAudioRecorder', 'Recording stopped');
      return recording;
    } catch (error) {
      logger.error('useAudioRecorder', `Failed to stop: ${error.message}`);
      setRecordingError('Failed to stop recording');
      return null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    logger.debug('useAudioRecorder', 'Resetting');
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
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    clearError: () => {
      logger.debug('useAudioRecorder', 'Clearing error');
      setRecordingError(null);
    },
  };
}
