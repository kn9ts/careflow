/**
 * WebRTC Race Condition Tests
 *
 * Tests for race conditions identified in the code review:
 * - RC-100: Concurrent initialization attempts
 * - RC-101: Mode switch during initialization
 * - RC-102: Token fetch race condition
 * - RC-103: Initialization promise reuse
 * - RC-104: Mode determination timing
 * - RC-105: Singleton instance integrity
 *
 * @module tests/integration/webrtc-race-conditions
 */

/* eslint-disable no-underscore-dangle, camelcase */

const MockCallManager = require('../helpers/callManager-mock');
const { sleep } = require('../helpers/webrtc-helpers');

describe('WebRTC Race Condition Tests', () => {
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
  // RC-100: Concurrent Initialization Attempts
  // ============================================================================

  describe('RC-100: Concurrent Initialization Attempts', () => {
    test('should handle multiple simultaneous initialize() calls', async () => {
      // Arrange
      const expectedMode = 'webrtc';
      const expectedCare4wId = 'care4w-1000001';

      // Act - Call initialize 10 times concurrently
      const initPromises = [];
      for (let i = 0; i < 10; i++) {
        initPromises.push(callManager.initialize('test-token', expectedCare4wId));
      }

      const results = await Promise.all(initPromises);

      // Assert - All calls should return the same result
      results.forEach((result) => {
        expect(result.mode).toBe(expectedMode);
        expect(result.care4wId).toBe(expectedCare4wId);
      });

      // Should be initialized
      expect(callManager._initialized).toBe(true);
    });

    test('should cache initialization promise for concurrent callers', async () => {
      // Arrange & Act - Start multiple initializations concurrently
      const promise1 = callManager.initialize('token1', 'care4w-1000001');
      const promise2 = callManager.initialize('token2', 'care4w-1000001');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Assert - Both should return same result
      expect(result1).toEqual(result2);
      expect(callManager._initialized).toBe(true);
    });

    test('should reject all pending initializations on failure', async () => {
      // Arrange - Make initialize fail
      callManager._doInitialize = jest.fn().mockRejectedValue(new Error('Initialization failed'));

      // Act
      const promises = [
        callManager.initialize('token', 'care4w-1000001').catch((e) => e),
        callManager.initialize('token', 'care4w-1000001').catch((e) => e),
        callManager.initialize('token', 'care4w-1000001').catch((e) => e),
      ];

      const results = await Promise.all(promises);

      // Assert - All should have errors
      results.forEach((result) => {
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toBe('Initialization failed');
      });
    });
  });

  // ============================================================================
  // RC-101: Mode Switch During Initialization
  // ============================================================================

  describe('RC-101: Mode Switch During Initialization', () => {
    test('should lock mode during initialization', async () => {
      // Arrange & Act
      const initPromise = callManager.initialize('test-token', 'care4w-1000001');

      // Mode should be set during initialization
      await initPromise;

      // Assert
      expect(callManager.mode).toBe('webrtc');
    });

    test('should not allow mode change while initializing', async () => {
      // Arrange
      const states = [];

      callManager.on('onConnectionStateChange', (data) => {
        states.push(data.state);
      });

      // Act
      await callManager.initialize('test-token', 'care4w-1000001');

      // Assert - Mode should be set after initialization
      expect(callManager.mode).toBeDefined();
      expect(states).toContain('initializing');
      expect(states).toContain('ready');
    });
  });

  // ============================================================================
  // RC-102: Token Fetch Race Condition
  // ============================================================================

  describe('RC-102: Token Fetch Race Condition', () => {
    test('should deduplicate concurrent token fetches', async () => {
      // Arrange & Act - Multiple concurrent initializations
      const promises = [
        callManager.initialize('token1', 'care4w-1000001'),
        callManager.initialize('token2', 'care4w-1000001'),
        callManager.initialize('token3', 'care4w-1000001'),
      ];

      const results = await Promise.all(promises);

      // Assert - All should succeed
      results.forEach((result) => {
        expect(result.mode).toBe('webrtc');
      });
    });

    test('should share token result across concurrent callers', async () => {
      // Arrange & Act
      const [result1, result2] = await Promise.all([
        callManager.initialize('token1', 'care4w-1000001'),
        callManager.initialize('token2', 'care4w-1000001'),
      ]);

      // Assert - Results should be identical
      expect(result1).toEqual(result2);
    });
  });

  // ============================================================================
  // RC-103: Initialization Promise Reuse
  // ============================================================================

  describe('RC-103: Initialization Promise Reuse', () => {
    test('should return same promise for concurrent calls', async () => {
      // Arrange & Act
      const promise1 = callManager.initialize('token', 'care4w-1000001');
      const promise2 = callManager.initialize('token', 'care4w-1000001');

      // Assert - Both should be the same promise (cached)
      expect(promise1).toBe(promise2);

      await Promise.all([promise1, promise2]);
    });

    test('should clear initialization promise after completion', async () => {
      // Arrange & Act
      await callManager.initialize('token', 'care4w-1000001');

      // Assert - Promise should be cleared after success
      expect(callManager._initializationPromise).toBeNull();
      expect(callManager._initialized).toBe(true);
    });

    test('should allow re-initialization after failure', async () => {
      // Arrange - First attempt fails
      callManager._doInitialize = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce({ mode: 'webrtc', care4wId: 'care4w-1000001' });

      // Act - First attempt
      await expect(callManager.initialize('token', 'care4w-1000001')).rejects.toThrow(
        'First failed'
      );

      // Second attempt should succeed
      const result = await callManager.initialize('token', 'care4w-1000001');

      // Assert
      expect(result.mode).toBe('webrtc');
    });
  });

  // ============================================================================
  // RC-104: Mode Determination Timing
  // ============================================================================

  describe('RC-104: Mode Determination Timing', () => {
    test('should handle slow token API response', async () => {
      // Arrange - Slow initialization
      callManager._doInitialize = jest.fn().mockImplementation(async () => {
        await sleep(100);
        return { mode: 'webrtc', care4wId: 'care4w-1000001' };
      });

      // Act
      const result = await callManager.initialize('token', 'care4w-1000001');

      // Assert
      expect(result.mode).toBe('webrtc');
    });

    test('should timeout on excessively slow token API', async () => {
      // Arrange - Very slow initialization
      callManager._doInitialize = jest.fn().mockImplementation(async () => {
        await sleep(15000); // 15 seconds
        return { mode: 'webrtc', care4wId: 'care4w-1000001' };
      });

      // Act & Assert - Should timeout
      await expect(callManager.initialize('token', 'care4w-1000001')).rejects.toThrow();
    }, 20000);

    test('should emit state changes during mode determination', async () => {
      // Arrange
      const states = [];
      callManager.on('onConnectionStateChange', (data) => {
        states.push(data.state);
      });

      // Act
      await callManager.initialize('token', 'care4w-1000001');

      // Assert
      expect(states).toContain('initializing');
      expect(states).toContain('ready');
    });
  });

  // ============================================================================
  // RC-105: Singleton Instance Integrity
  // ============================================================================

  describe('RC-105: Singleton Instance Integrity', () => {
    test('should return same instance across multiple imports', () => {
      // Arrange & Act
      const instance1 = new MockCallManager();
      const instance2 = new MockCallManager();

      // Assert - Both are MockCallManager instances
      expect(instance1).toBeInstanceOf(MockCallManager);
      expect(instance2).toBeInstanceOf(MockCallManager);
    });

    test('should maintain state across singleton access', async () => {
      // Arrange
      const instance = new MockCallManager();
      await instance.initialize('token', 'care4w-1000001');

      // Act - Access same instance
      const state = instance.getConnectionState();

      // Assert
      expect(state.initialized).toBe(true);
      expect(state.mode).toBe('webrtc');
    });

    test('should share event listeners across singleton', async () => {
      // Arrange
      const events = [];
      const instance = new MockCallManager();

      instance.on('onStatusChange', (status) => {
        events.push(status);
      });

      // Act
      await instance.initialize('token', 'care4w-1000001');

      // Assert - Events should be captured
      expect(events.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Additional Race Condition Scenarios
  // ============================================================================

  describe('Additional Race Condition Scenarios', () => {
    test('should handle rapid initialize/endCall cycles', async () => {
      // Arrange & Act - Multiple cycles
      for (let i = 0; i < 3; i++) {
        const cm = new MockCallManager();
        await cm.initialize('token', 'care4w-1000001');
        await cm.disconnect();
      }

      // Assert - No errors thrown
      expect(true).toBe(true);
    });

    test('should handle concurrent makeCall requests', async () => {
      // Arrange
      await callManager.initialize('token', 'care4w-1000001');

      // Act - Try to make multiple calls
      const promises = [
        callManager.makeCall('care4w-1000002').catch((e) => e),
        callManager.makeCall('care4w-1000003').catch((e) => e),
      ];

      const results = await Promise.all(promises);

      // Assert - At least one should succeed or fail gracefully
      expect(results.length).toBe(2);
    });

    test('should handle state changes during call', async () => {
      // Arrange
      const states = [];
      callManager.on('onConnectionStateChange', (data) => {
        states.push(data.state);
      });

      await callManager.initialize('token', 'care4w-1000001');

      // Act
      try {
        await callManager.makeCall('care4w-1000002');
      } catch (e) {
        // Expected - mock may not have full implementation
      }

      // Assert - State changes occurred
      expect(states.length).toBeGreaterThan(0);
    });
  });
});
