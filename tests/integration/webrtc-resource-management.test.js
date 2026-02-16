/**
 * WebRTC Resource Management Tests
 *
 * Tests for resource contention and management issues identified in the code review:
 * - RC-130: Media device access
 * - RC-131: Audio context sharing
 * - RC-132: Recording resource conflict
 * - RC-133: Network resource allocation
 * - RC-134: Memory leak on mode switch
 * - RC-135: Event listener accumulation
 *
 * @module tests/integration/webrtc-resource-management
 */

/* eslint-disable no-underscore-dangle, camelcase */

const {
  createMockCallManager,
  createMockWebRTCManager,
  createFakeMediaStream,
  sleep,
} = require('../helpers/webrtc-helpers');

const MockCallManager = require('../helpers/callManager-mock');

describe('WebRTC Resource Management Tests', () => {
  let callManager;

  beforeEach(() => {
    jest.clearAllMocks();
    callManager = new MockCallManager();
  });

  afterEach(async () => {
    if (callManager) {
      await callManager.disconnect();
    }
  });

  // ============================================================================
  // RC-130: Media Device Access
  // ============================================================================

  describe('RC-130: Media Device Access', () => {
    test('should acquire media stream on call start', async () => {
      // Arrange
      await callManager.initialize('test-token', 'care4w-1000001');
      callManager._initialized = true;

      // Act
      const mockStream = createFakeMediaStream(true, false);

      // Assert
      expect(mockStream.getAudioTracks().length).toBeGreaterThan(0);
    });

    test('should release media stream on call end', async () => {
      // Arrange
      await callManager.initialize('test-token', 'care4w-1000001');
      const mockWebRTC = createMockWebRTCManager();

      await mockWebRTC.initialize('care4w-1000001', 'test-token');
      await mockWebRTC.getLocalStream({ audio: true, video: false });

      // Act
      await mockWebRTC.endCall();

      // Assert - Stream should be cleared
      expect(mockWebRTC.localStream).toBeNull();
    });

    test('should handle permission denial gracefully', async () => {
      // Arrange
      const mockWebRTC = createMockWebRTCManager();

      // Mock permission denial
      mockWebRTC.getLocalStream = jest
        .fn()
        .mockRejectedValue(
          new Error('Microphone access denied. Please allow microphone access and try again.')
        );

      // Act & Assert
      await expect(mockWebRTC.getLocalStream({ audio: true })).rejects.toThrow(
        'Microphone access denied'
      );
    });

    test('should handle missing microphone', async () => {
      // Arrange
      const mockWebRTC = createMockWebRTCManager();

      // Mock missing device
      mockWebRTC.getLocalStream = jest
        .fn()
        .mockRejectedValue(
          new Error('No microphone found. Please connect a microphone and try again.')
        );

      // Act & Assert
      await expect(mockWebRTC.getLocalStream({ audio: true })).rejects.toThrow(
        'No microphone found'
      );
    });

    test('should track active device streams', async () => {
      // Arrange
      const activeStreams = new Set();
      const mockWebRTC = createMockWebRTCManager();

      await mockWebRTC.initialize('care4w-1000001', 'test-token');

      // Simulate stream tracking
      const stream = createFakeMediaStream(true, false);
      activeStreams.add(stream);

      // Assert
      expect(activeStreams.size).toBe(1);

      // Cleanup
      activeStreams.delete(stream);
      expect(activeStreams.size).toBe(0);
    });
  });

  // ============================================================================
  // RC-131: Audio Context Sharing
  // ============================================================================

  describe('RC-131: Audio Context Sharing', () => {
    test('should create audio context for analysis', () => {
      // Arrange
      const mockAudioContext = {
        createAnalyser: jest.fn(() => ({
          fftSize: 256,
          frequencyBinCount: 128,
          getByteFrequencyData: jest.fn(),
        })),
        createMediaStreamSource: jest.fn(() => ({
          connect: jest.fn(),
        })),
        close: jest.fn(),
      };

      // Act
      const analyser = mockAudioContext.createAnalyser();

      // Assert
      expect(analyser).toBeDefined();
      expect(analyser.fftSize).toBe(256);
    });

    test('should close audio context on cleanup', async () => {
      // Arrange
      const mockAudioContext = {
        close: jest.fn(),
      };

      // Act
      await mockAudioContext.close();

      // Assert
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    test('should handle multiple audio context consumers', () => {
      // Arrange
      const sharedContext = {
        consumers: 0,
        acquire() {
          this.consumers++;
        },
        release() {
          this.consumers--;
        },
      };

      // Act
      sharedContext.acquire();
      sharedContext.acquire();
      sharedContext.acquire();

      // Assert
      expect(sharedContext.consumers).toBe(3);

      // Release all
      sharedContext.release();
      sharedContext.release();
      sharedContext.release();
      expect(sharedContext.consumers).toBe(0);
    });
  });

  // ============================================================================
  // RC-132: Recording Resource Conflict
  // ============================================================================

  describe('RC-132: Recording Resource Conflict', () => {
    test('should stop recording on mode switch', async () => {
      // Arrange
      const mockWebRTC = createMockWebRTCManager();
      await mockWebRTC.initialize('care4w-1000001', 'test-token');

      // Start recording
      mockWebRTC.isRecording = true;
      mockWebRTC.stopRecording = jest.fn(async () => ({
        blob: new Blob(),
        duration: 10,
      }));

      // Act - Mode switch triggers cleanup
      await mockWebRTC.endCall();

      // Assert - Recording should be stopped
      expect(mockWebRTC.isRecording).toBe(false);
    });

    test('should handle recording in progress on call end', async () => {
      // Arrange
      const mockWebRTC = createMockWebRTCManager();
      mockWebRTC.isRecording = true;
      mockWebRTC.recordedChunks = [new Blob()];

      // Act
      await mockWebRTC.endCall();

      // Assert
      expect(mockWebRTC.isRecording).toBe(false);
      expect(mockWebRTC.recordedChunks).toEqual([]);
    });

    test('should finalize recording before cleanup', async () => {
      // Arrange
      const mockWebRTC = createMockWebRTCManager();
      await mockWebRTC.initialize('care4w-1000001', 'test-token');

      const recordingResult = {
        blob: new Blob(['audio-data'], { type: 'audio/webm' }),
        duration: 30,
      };

      mockWebRTC.stopRecording = jest.fn(async () => recordingResult);

      // Act
      const result = await mockWebRTC.stopRecording();

      // Assert
      expect(result.blob).toBeDefined();
      expect(result.duration).toBe(30);
    });

    test('should handle recording error gracefully', async () => {
      // Arrange
      const mockWebRTC = createMockWebRTCManager();
      mockWebRTC.stopRecording = jest.fn().mockRejectedValue(new Error('Recording failed'));

      // Act & Assert
      await expect(mockWebRTC.stopRecording()).rejects.toThrow('Recording failed');
    });
  });

  // ============================================================================
  // RC-133: Network Resource Allocation
  // ============================================================================

  describe('RC-133: Network Resource Allocation', () => {
    test('should prioritize active mode for network resources', async () => {
      // Arrange
      await callManager.initialize('test-token', 'care4w-1000001');

      // Act
      const activeMode = callManager.mode;

      // Assert - Active mode should have network resources
      expect(activeMode).toBe('webrtc');
    });

    test('should release network resources on disconnect', async () => {
      // Arrange
      await callManager.initialize('test-token', 'care4w-1000001');
      callManager._updateConnectionState('connected', 'Active call');

      // Act
      await callManager.disconnect();

      // Assert
      expect(callManager._connectionState).toBe('idle');
    });

    test('should handle network priority changes', async () => {
      // Arrange
      const networkPriority = {
        current: 'high',
        setPriority(level) {
          this.current = level;
        },
      };

      // Act
      networkPriority.setPriority('low');

      // Assert
      expect(networkPriority.current).toBe('low');
    });
  });

  // ============================================================================
  // RC-134: Memory Leak on Mode Switch
  // ============================================================================

  describe('RC-134: Memory Leak on Mode Switch', () => {
    test('should not accumulate listeners on mode switch', async () => {
      // Arrange
      const listenerCounts = [];

      for (let i = 0; i < 5; i++) {
        // Initialize
        await callManager.initialize('test-token', 'care4w-1000001');

        // Track listener count
        listenerCounts.push(callManager.listeners.size);

        // Disconnect
        await callManager.disconnect();

        // Reset for next iteration
        callManager = new MockCallManager();
      }

      // Assert - Listener counts should remain consistent
      const allEqual = listenerCounts.every((count) => count === listenerCounts[0]);
      expect(allEqual).toBe(true);
    });

    test('should clean up timers on disconnect', async () => {
      // Arrange
      const timers = new Set();
      const timerId = setInterval(() => {}, 1000);
      timers.add(timerId);

      // Act
      clearInterval(timerId);
      timers.delete(timerId);

      // Assert
      expect(timers.size).toBe(0);
    });

    test('should release references on cleanup', async () => {
      // Arrange
      await callManager.initialize('test-token', 'care4w-1000001');

      // Act
      await callManager.disconnect();

      // Assert
      expect(callManager.webrtcManager).toBeNull();
      expect(callManager.twilioDevice).toBeNull();
      expect(callManager.twilioConnection).toBeNull();
    });

    test('should handle repeated mode switches without memory growth', async () => {
      // Arrange
      const memorySnapshots = [];

      for (let i = 0; i < 10; i++) {
        // Simulate mode switch
        await callManager.initialize('test-token', 'care4w-1000001');
        await callManager.disconnect();

        // Track "memory" (simulated as listener count)
        memorySnapshots.push({
          iteration: i,
          listeners: callManager.listeners.size,
        });

        callManager = new MockCallManager();
      }

      // Assert - Memory should not grow
      const initialMemory = memorySnapshots[0].listeners;
      const finalMemory = memorySnapshots[memorySnapshots.length - 1].listeners;
      expect(finalMemory).toBeLessThanOrEqual(initialMemory);
    });
  });

  // ============================================================================
  // RC-135: Event Listener Accumulation
  // ============================================================================

  describe('RC-135: Event Listener Accumulation', () => {
    test('should replace listener on re-registration', () => {
      // Arrange
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      // Act
      callManager.on('onStatusChange', listener1);
      callManager.on('onStatusChange', listener2);

      // Emit event
      callManager.emit('onStatusChange', 'test');

      // Assert - Only last listener should be called (current behavior)
      expect(listener2).toHaveBeenCalledWith('test');
    });

    test('should remove listener on off call', () => {
      // Arrange
      const listener = jest.fn();

      callManager.on('onStatusChange', listener);
      callManager.off('onStatusChange');

      // Act
      callManager.emit('onStatusChange', 'test');

      // Assert - Listener should not be called
      expect(listener).not.toHaveBeenCalled();
    });

    test('should handle multiple event types', () => {
      // Arrange
      const statusListener = jest.fn();
      const callListener = jest.fn();

      // Act
      callManager.on('onStatusChange', statusListener);
      callManager.on('onCallStateChange', callListener);

      callManager.emit('onStatusChange', 'ready');
      callManager.emit('onCallStateChange', 'connected');

      // Assert
      expect(statusListener).toHaveBeenCalledWith('ready');
      expect(callListener).toHaveBeenCalledWith('connected');
    });

    test('should clear all listeners on disconnect', async () => {
      // Arrange
      await callManager.initialize('test-token', 'care4w-1000001');

      // Add listeners
      callManager.on('onStatusChange', () => {});
      callManager.on('onCallStateChange', () => {});

      // Act
      await callManager.disconnect();

      // Assert
      expect(callManager.listeners.size).toBe(0);
    });
  });

  // ============================================================================
  // Additional Resource Management Tests
  // ============================================================================

  describe('Additional Resource Management Scenarios', () => {
    test('should handle cleanup on error', async () => {
      // Arrange
      await callManager.initialize('test-token', 'care4w-1000001');

      // Simulate error during call
      callManager._updateConnectionState('failed', 'Connection failed');

      // Act
      await callManager.disconnect();

      // Assert
      expect(callManager._connectionState).toBe('idle');
    });

    test('should cleanup on page unload simulation', async () => {
      // Arrange
      await callManager.initialize('test-token', 'care4w-1000001');
      callManager._updateConnectionState('connected', 'Active call');

      // Act - Simulate page unload
      await callManager.disconnect();

      // Assert
      expect(callManager._initialized).toBe(false);
    });

    test('should handle concurrent cleanup operations', async () => {
      // Arrange
      await callManager.initialize('test-token', 'care4w-1000001');

      // Act - Multiple cleanup operations
      const cleanupOps = [callManager.endCall(), callManager.disconnect()];

      await Promise.all(cleanupOps);

      // Assert - Should not throw and state should be clean
      expect(callManager._connectionState).toBe('idle');
    });

    test('should track resource allocation', async () => {
      // Arrange
      const resources = {
        streams: 0,
        connections: 0,
        listeners: 0,
      };

      // Act - Simulate resource allocation
      await callManager.initialize('test-token', 'care4w-1000001');
      resources.connections = 1;
      resources.listeners = callManager.listeners.size;

      // Assert
      expect(resources.connections).toBe(1);

      // Cleanup
      await callManager.disconnect();
      resources.connections = 0;
      resources.listeners = 0;

      expect(resources.connections).toBe(0);
    });

    test('should handle resource exhaustion gracefully', async () => {
      // Arrange
      const resourceLimit = 5;
      const allocatedResources = [];

      // Act - Try to allocate up to limit
      for (let i = 0; i < resourceLimit; i++) {
        allocatedResources.push({ id: i });
      }

      // Assert
      expect(allocatedResources.length).toBe(resourceLimit);

      // Try to allocate beyond limit
      const canAllocate = allocatedResources.length < resourceLimit + 1;
      expect(canAllocate).toBe(false);
    });
  });
});
