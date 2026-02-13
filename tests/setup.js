/**
 * Jest Setup File
 * Global test configuration and mocks
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JEST_WORKER_ID = '1';

// Mock timers
jest.useFakeTimers();

// Suppress console logs during tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console logs in tests unless DEBUG=true
  if (!process.env.DEBUG) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    // Keep error and debug
    console.error = console.error;
  }
});

afterAll(() => {
  // Restore console
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Global test utilities
global.testUtils = {
  /**
   * Create mock user object
   */
  createMockUser: (overrides = {}) => ({
    firebaseUid: 'test-uid-123',
    email: 'test@example.com',
    displayName: 'Test User',
    care4wId: 'care4w-1000001',
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    ...overrides,
  }),

  /**
   * Create mock recording object
   */
  createMockRecording: (overrides = {}) => ({
    _id: 'rec-123',
    firebaseUid: 'test-uid-123',
    userId: { _id: 'user-123' },
    type: 'call',
    sid: 'CA123456789',
    from: '+1234567890',
    to: '+0987654321',
    direction: 'outbound',
    storageKey: 'recordings/CA123/1701234567-recording.webm',
    storageBucket: 'careflow-recordings',
    duration: 120,
    recordedAt: new Date(),
    status: 'active',
    isListened: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Create mock API response
   */
  createApiResponse: (data = {}, options = {}) => ({
    success: true,
    data,
    ...options,
  }),

  /**
   * Create mock error
   */
  createMockError: (message = 'Test error', code = 'TEST_ERROR', status = 500) => ({
    message,
    code,
    status,
    stack: expect.stringContaining('Test error'),
  }),
};

/**
 * Mock Next.js router
 */
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * Mock Firebase Auth
 */
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
    onAuthStateChanged: jest.fn(),
  })),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
  getIdToken: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

/**
 * Mock Firebase App
 */
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

/**
 * Mock Firebase Database
 */
jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(),
  ref: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  onValue: jest.fn(),
  push: jest.fn(),
  remove: jest.fn(),
  serverTimestamp: jest.fn(() => Date.now()),
}));

/**
 * Mock MongoDB
 */
jest.mock('mongoose', () => {
  const mockConnection = {
    readyState: 1,
    collection: jest.fn(),
    on: jest.fn(),
  };

  return {
    connect: jest.fn().mockResolvedValue(mockConnection),
    connection: mockConnection,
    models: {},
    model: jest.fn((name, schema) => {
      const Model = function (data) {
        return {
          ...data,
          _id: `mock-${name}-${Date.now()}`,
          save: jest.fn().mockResolvedValue(data),
        };
      };
      Model.findOne = jest.fn();
      Model.find = jest.fn();
      Model.create = jest.fn();
      return Model;
    }),
    Schema: class Schema {
      constructor(definition, options) {
        this.definition = definition;
        this.options = options;
        this.indexes = [];
      }

      index(fields, options) {
        this.indexes.push({ fields, options });
        return this;
      }

      pre(method, fn) {
        return this;
      }
    },
    Types: {
      ObjectId: String,
    },
  };
});
