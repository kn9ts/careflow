/**
 * Firebase Test Helper Utilities
 *
 * Provides utilities for testing Firebase Realtime Database operations
 * used in WebRTC signaling. Includes mock implementations and test data helpers.
 *
 * @module tests/helpers/firebase-helpers
 */

/* eslint-disable no-underscore-dangle, camelcase */

/**
 * Create a mock Firebase database reference
 * @param {string} path - Database path
 * @param {Object} data - Initial data at path
 * @returns {Object} Mock database reference
 */
function createMockDbRef(path, data = null) {
  const listeners = new Map();
  let currentData = data;

  return {
    path,
    key: path.split('/').pop(),
    data: currentData,

    set: jest.fn(async (value) => {
      currentData = value;
    }),

    get: jest.fn(async () => ({
      exists: () => currentData !== null,
      val: () => currentData,
      key: path.split('/').pop(),
    })),

    on: jest.fn((event, callback) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(callback);
      // Immediately call with current data
      if (event === 'value' && currentData !== null) {
        callback({
          exists: () => true,
          val: () => currentData,
          key: path.split('/').pop(),
        });
      }
      return () => {
        listeners.get(event)?.delete(callback);
      };
    }),

    off: jest.fn((event, callback) => {
      if (callback) {
        listeners.get(event)?.delete(callback);
      } else {
        listeners.delete(event);
      }
    }),

    remove: jest.fn(async () => {
      currentData = null;
    }),

    update: jest.fn(async (updates) => {
      currentData = { ...currentData, ...updates };
    }),

    push: jest.fn(() => ({
      key: `push-${Date.now()}`,
      set: jest.fn(async () => {}),
    })),

    // Test helper to simulate data change
    _setData: (newData) => {
      currentData = newData;
      listeners.get('value')?.forEach((callback) => {
        callback({
          exists: () => newData !== null,
          val: () => newData,
          key: path.split('/').pop(),
        });
      });
    },

    // Test helper to trigger event
    _trigger: (event, snapshot) => {
      listeners.get(event)?.forEach((callback) => callback(snapshot));
    },

    // Test helper to get current listeners
    _getListeners: () => listeners,
  };
}

/**
 * Create a mock Firebase database
 * @param {Object} initialData - Initial database state
 * @returns {Object} Mock database
 */
function createMockDatabase(initialData = {}) {
  const refs = new Map();
  const data = { ...initialData };

  return {
    ref: jest.fn((path) => {
      if (!refs.has(path)) {
        const pathData = getNestedValue(data, path);
        refs.set(path, createMockDbRef(path, pathData));
      }
      return refs.get(path);
    }),

    goOffline: jest.fn(),
    goOnline: jest.fn(),

    // Test helpers
    _getData: () => data,
    _setData: (newData) => Object.assign(data, newData),
    _getRef: (path) => refs.get(path),
    _getAllRefs: () => refs,
  };
}

/**
 * Get nested value from object using dot-separated path
 * @param {Object} obj - Object to search
 * @param {string} path - Dot-separated path
 * @returns {*} Value at path or null
 */
function getNestedValue(obj, path) {
  const parts = path.split('/').filter(Boolean);
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return null;
    }
    current = current[part];
  }

  return current ?? null;
}

/**
 * Create mock Firebase functions
 * @returns {Object} Mock Firebase functions
 */
function createMockFirebaseFns() {
  return {
    ref: jest.fn((db, path) => db.ref(path)),
    set: jest.fn(async (ref, value) => ref.set(value)),
    get: jest.fn(async (ref) => ref.get()),
    onValue: jest.fn((ref, callback) => ref.on('value', callback)),
    off: jest.fn((ref, event, callback) => ref.off(event, callback)),
    remove: jest.fn(async (ref) => ref.remove()),
    serverTimestamp: jest.fn(() => ({ '.sv': 'timestamp' })),
    push: jest.fn((ref, value) => ref.push(value)),
  };
}

/**
 * Create a mock Firebase app
 * @returns {Object} Mock Firebase app
 */
function createMockFirebaseApp() {
  return {
    name: '[DEFAULT]',
    options: {},
    delete: jest.fn(async () => {}),
  };
}

/**
 * Create complete mock Firebase initialization result
 * @param {Object} options - Mock options
 * @returns {Object} Mock initialization result
 */
function createMockFirebaseInit(options = {}) {
  const { initialData = {} } = options;
  const db = createMockDatabase(initialData);
  const firebaseFns = createMockFirebaseFns();
  const app = createMockFirebaseApp();

  return {
    app,
    db,
    firebaseFns,
    setAuthToken: jest.fn(),
  };
}

/**
 * Create test call room data
 * @param {Object} options - Room options
 * @returns {Object} Call room data
 */
function createTestCallRoom(options = {}) {
  const {
    callerId = 'care4w-1000001',
    calleeId = 'care4w-1000002',
    roomId = `${callerId}-${calleeId}-${Date.now()}`,
    hasOffer = true,
    hasAnswer = false,
    hasIce = false,
  } = options;

  const room = {
    offer: hasOffer
      ? {
          sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=rtpmap:111 opus/48000/2\r\n',
          type: 'offer',
          from: callerId,
          to: calleeId,
          timestamp: Date.now(),
        }
      : null,
    answer: hasAnswer
      ? {
          sdp: 'v=0\r\no=- 123457 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=rtpmap:111 opus/48000/2\r\n',
          type: 'answer',
          from: calleeId,
          timestamp: Date.now(),
        }
      : null,
  };

  if (hasIce) {
    room.ice = {
      [`${Date.now()}-1`]: {
        candidate: 'candidate:1 1 udp 2113937151 192.168.1.100 54321 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0,
        from: callerId,
        timestamp: Date.now(),
      },
      [`${Date.now()}-2`]: {
        candidate: 'candidate:2 1 udp 1677729535 54.202.20.2 443 typ relay',
        sdpMid: '0',
        sdpMLineIndex: 0,
        from: calleeId,
        timestamp: Date.now(),
      },
    };
  }

  return { roomId, room };
}

/**
 * Seed test data into mock database
 * @param {Object} db - Mock database
 * @param {Object} data - Data to seed
 */
function seedDatabase(db, data) {
  db._setData(data);
}

/**
 * Wait for a specific value in Firebase
 * @param {Object} ref - Database reference
 * @param {Function} predicate - Function to check if value matches
 * @param {number} timeout - Maximum wait time in milliseconds
 * @returns {Promise<any>} Value when predicate returns true
 */
async function waitForFirebaseValue(ref, predicate, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      ref.off('value', handler);
      reject(new Error('Timeout waiting for Firebase value'));
    }, timeout);

    const handler = (snapshot) => {
      const value = snapshot.val();
      if (predicate(value)) {
        clearTimeout(timeoutId);
        ref.off('value', handler);
        resolve(value);
      }
    };

    ref.on('value', handler);
  });
}

/**
 * Simulate Firebase disconnect
 * @param {Object} db - Mock database
 */
function simulateFirebaseDisconnect(db) {
  db.goOffline();
}

/**
 * Simulate Firebase reconnect
 * @param {Object} db - Mock database
 */
function simulateFirebaseReconnect(db) {
  db.goOnline();
}

/**
 * Create a test offer for Firebase storage
 * @param {Object} options - Offer options
 * @returns {Object} Offer data structure
 */
function createFirebaseOffer(options = {}) {
  const {
    from = 'care4w-1000001',
    to = 'care4w-1000002',
    sdp = 'test-sdp-content',
    type = 'offer',
  } = options;

  return {
    sdp,
    type,
    from,
    to,
    timestamp: { '.sv': 'timestamp' },
  };
}

/**
 * Create a test answer for Firebase storage
 * @param {Object} options - Answer options
 * @returns {Object} Answer data structure
 */
function createFirebaseAnswer(options = {}) {
  const { from = 'care4w-1000002', sdp = 'test-sdp-content', type = 'answer' } = options;

  return {
    sdp,
    type,
    from,
    timestamp: { '.sv': 'timestamp' },
  };
}

/**
 * Create a test ICE candidate for Firebase storage
 * @param {Object} options - ICE candidate options
 * @returns {Object} ICE candidate data structure
 */
function createFirebaseIceCandidate(options = {}) {
  const {
    from = 'care4w-1000001',
    candidate = 'candidate:1 1 udp 2113937151 192.168.1.100 54321 typ host',
    sdpMid = '0',
    sdpMLineIndex = 0,
  } = options;

  return {
    candidate,
    sdpMid,
    sdpMLineIndex,
    from,
    timestamp: { '.sv': 'timestamp' },
  };
}

/**
 * Verify Firebase path structure
 * @param {string} path - Path to verify
 * @param {string} expectedPattern - Expected path pattern
 * @returns {boolean} True if path matches pattern
 */
function verifyFirebasePath(path, expectedPattern) {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = expectedPattern.split('/').filter(Boolean);

  if (pathParts.length !== patternParts.length) {
    return false;
  }

  return patternParts.every((part, index) => {
    if (part.startsWith('{') && part.endsWith('}')) {
      // This is a placeholder, any value is acceptable
      return pathParts[index] !== '';
    }
    return part === pathParts[index];
  });
}

/**
 * Extract room ID from Firebase path
 * @param {string} path - Firebase path
 * @returns {string|null} Room ID or null
 */
function extractRoomId(path) {
  const match = path.match(/calls\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Create a mock Firebase snapshot
 * @param {any} value - Snapshot value
 * @param {string} key - Snapshot key
 * @returns {Object} Mock snapshot
 */
function createMockSnapshot(value, key = null) {
  return {
    exists: () => value !== null,
    val: () => value,
    key,
    child: jest.fn((childPath) => {
      const childValue = value?.[childPath] ?? null;
      return createMockSnapshot(childValue, childPath);
    }),
    forEach: jest.fn((callback) => {
      if (value && typeof value === 'object') {
        Object.entries(value).forEach(([k, v]) => {
          callback(createMockSnapshot(v, k));
        });
      }
    }),
    hasChild: jest.fn((childPath) => value?.hasOwnProperty?.(childPath) ?? false),
    hasChildren: jest.fn(() => value && typeof value === 'object' && Object.keys(value).length > 0),
    numChildren: jest.fn(() =>
      value && typeof value === 'object' ? Object.keys(value).length : 0
    ),
    toJSON: jest.fn(() => value),
  };
}

/**
 * Setup mock Firebase module for testing
 * @returns {Object} Mock Firebase module
 */
function setupMockFirebase() {
  const mockDb = createMockDatabase();
  const mockApp = createMockFirebaseApp();
  const mockFns = createMockFirebaseFns();

  return {
    initializeApp: jest.fn(() => mockApp),
    getApps: jest.fn(() => [mockApp]),
    getDatabase: jest.fn(() => mockDb),
    ref: mockFns.ref,
    set: mockFns.set,
    get: mockFns.get,
    onValue: mockFns.onValue,
    off: mockFns.off,
    remove: mockFns.remove,
    serverTimestamp: mockFns.serverTimestamp,
    push: mockFns.push,

    // Test helpers
    _mockDb: mockDb,
    _mockApp: mockApp,
    _mockFns: mockFns,
  };
}

module.exports = {
  createMockDbRef,
  createMockDatabase,
  createMockFirebaseFns,
  createMockFirebaseApp,
  createMockFirebaseInit,
  createTestCallRoom,
  seedDatabase,
  waitForFirebaseValue,
  simulateFirebaseDisconnect,
  simulateFirebaseReconnect,
  createFirebaseOffer,
  createFirebaseAnswer,
  createFirebaseIceCandidate,
  verifyFirebasePath,
  extractRoomId,
  createMockSnapshot,
  setupMockFirebase,
  getNestedValue,
};
