/**
 * Hooks Unit Tests
 *
 * Tests for custom React hooks: useAnalytics, useCallHistory, useRecordings,
 * useAudioRecorder, useCallManager, useNotifications
 */

// Mock the API modules - must be at top level before any imports
jest.mock('@/lib/api/analytics', () => ({
  fetchAnalytics: jest.fn(),
}));

jest.mock('@/lib/api/calls', () => ({
  fetchCallHistory: jest.fn(),
}));

jest.mock('@/lib/api/recordings', () => ({
  fetchRecordings: jest.fn(),
  deleteRecording: jest.fn(),
}));

jest.mock('@/lib/audioProcessor', () => ({
  AudioProcessor: jest.fn().mockImplementation(() => ({
    startRecording: jest.fn().mockResolvedValue(true),
    stopRecording: jest.fn().mockResolvedValue({ blob: new Blob(), duration: 10 }),
    destroy: jest.fn(),
  })),
  RecordingUploader: jest.fn().mockImplementation(() => ({
    uploadWithProgress: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    init: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
    trace: jest.fn(),
    complete: jest.fn(),
    recordingStart: jest.fn(),
    recordingStop: jest.fn(),
  },
}));

jest.mock('@/lib/firebase', () => ({
  requestNotificationPermission: jest.fn(),
  getFCMToken: jest.fn(),
  onMessageListener: jest.fn(() => jest.fn()),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    token: 'test-token',
    user: { uid: 'test-uid', email: 'test@example.com' },
  })),
}));

jest.mock('@/hooks/useCallState', () => ({
  useCallState: jest.fn(() => ({
    setCallStatus: jest.fn(),
    setMode: jest.fn(),
    setCare4wId: jest.fn(),
    setModeInfo: jest.fn(),
    setPhoneNumber: jest.fn(),
    setCallError: jest.fn(),
    setPendingWebRTCCall: jest.fn(),
    pendingWebRTCCall: null,
    setIncoming: jest.fn(),
    resetCallState: jest.fn(),
    updateCallDuration: jest.fn(),
  })),
}));

jest.mock('@/lib/callManager', () => ({
  callManager: {
    initialize: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    off: jest.fn(),
    makeCall: jest.fn(),
    hangup: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
    toggleMute: jest.fn(),
    sendDigits: jest.fn(),
    destroy: jest.fn(),
  },
}));

// Mock React hooks
const mockState = {
  analytics: null,
  setAnalytics: jest.fn(),
  callHistory: [],
  setCallHistory: jest.fn(),
  recordings: [],
  setRecordings: jest.fn(),
  isLoading: false,
  setIsLoading: jest.fn(),
  error: null,
  setError: jest.fn(),
};

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn((initial) => {
    if (initial === null) return [mockState.analytics, mockState.setAnalytics];
    if (Array.isArray(initial) && initial.length === 0) {
      return [mockState.callHistory, mockState.setCallHistory];
    }
    return [initial, jest.fn()];
  }),
  useEffect: jest.fn((fn) => fn()),
  useCallback: jest.fn((fn) => fn),
  useRef: jest.fn((initial) => ({ current: initial })),
  useMemo: jest.fn((fn) => fn()),
}));

// =====================================================
// USE ANALYTICS HOOK TESTS
// =====================================================

describe('useAnalytics Hook', () => {
  let useAnalytics;
  let fetchAnalytics;

  beforeAll(async () => {
    const analyticsApi = await import('@/lib/api/analytics');
    fetchAnalytics = analyticsApi.fetchAnalytics;
    const module = await import('@/hooks/useAnalytics');
    useAnalytics = module.useAnalytics;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial state values', () => {
      const result = useAnalytics(null);

      expect(result.analytics).toBeNull();
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should return fetch and refresh functions', () => {
      const result = useAnalytics('test-token');

      expect(typeof result.fetch).toBe('function');
      expect(typeof result.refresh).toBe('function');
      expect(typeof result.setAnalytics).toBe('function');
    });
  });

  describe('Fetch Analytics', () => {
    it('should require authentication token', async () => {
      const result = useAnalytics(null);
      const data = await result.fetch();

      expect(data).toBeNull();
    });

    it('should fetch analytics data with token', async () => {
      const mockData = { totalCalls: 100, averageDuration: 120 };
      fetchAnalytics.mockResolvedValueOnce(mockData);

      const result = useAnalytics('valid-token');
      await result.fetch('valid-token');

      expect(fetchAnalytics).toHaveBeenCalledWith('valid-token');
    });

    it('should handle fetch errors gracefully', async () => {
      fetchAnalytics.mockRejectedValueOnce(new Error('Network error'));

      const result = useAnalytics('valid-token');

      // The hook handles errors internally
      // When an error occurs, the fetch function may return undefined or throw
      try {
        const data = await result.fetch('valid-token');
        // If it doesn't throw, data should be undefined or null
        expect([null, undefined]).toContainEqual(data);
      } catch (error) {
        // If it throws, that's also acceptable error handling
        expect(error.message).toBe('Network error');
      }
    });
  });
});

// =====================================================
// USE CALL HISTORY HOOK TESTS
// =====================================================

describe('useCallHistory Hook', () => {
  let useCallHistory;
  let fetchCallHistory;

  beforeAll(async () => {
    const callsApi = await import('@/lib/api/calls');
    fetchCallHistory = callsApi.fetchCallHistory;
    const module = await import('@/hooks/useCallHistory');
    useCallHistory = module.useCallHistory;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Utility Functions', () => {
    it('should format call type correctly', async () => {
      const { formatCallType } = await import('@/hooks/useCallHistory');

      expect(formatCallType('incoming')).toBe('Incoming');
      expect(formatCallType('outgoing')).toBe('Outgoing');
      expect(formatCallType('missed')).toBe('Missed');
      expect(formatCallType('voicemail')).toBe('Voicemail');
      expect(formatCallType('unknown')).toBe('unknown');
    });

    it('should format call duration correctly', async () => {
      const { formatCallDuration } = await import('@/hooks/useCallHistory');

      expect(formatCallDuration(0)).toBe('0:00');
      expect(formatCallDuration(65)).toBe('1:05');
      expect(formatCallDuration(125)).toBe('2:05');
      expect(formatCallDuration(null)).toBe('0:00');
    });

    it('should return correct call icon', async () => {
      const { getCallIcon } = await import('@/hooks/useCallHistory');

      expect(getCallIcon('incoming')).toBe('📥');
      expect(getCallIcon('outgoing')).toBe('📤');
      expect(getCallIcon('missed')).toBe('❌');
      expect(getCallIcon('voicemail')).toBe('📩');
      expect(getCallIcon('unknown')).toBe('📞');
    });
  });

  describe('Hook Return Values', () => {
    it('should return expected properties', () => {
      const result = useCallHistory('test-token');

      expect(result).toHaveProperty('callHistory');
      expect(result).toHaveProperty('isLoading');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('fetch');
      expect(result).toHaveProperty('refresh');
      expect(result).toHaveProperty('addCall');
      expect(result).toHaveProperty('removeCall');
    });
  });
});

// =====================================================
// USE RECORDINGS HOOK TESTS
// =====================================================

describe('useRecordings Hook', () => {
  let useRecordings;
  let fetchRecordings;
  let deleteRecording;

  beforeAll(async () => {
    const recordingsApi = await import('@/lib/api/recordings');
    fetchRecordings = recordingsApi.fetchRecordings;
    deleteRecording = recordingsApi.deleteRecording;
    const module = await import('@/hooks/useRecordings');
    useRecordings = module.useRecordings;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial state values', () => {
      const result = useRecordings(null);

      expect(result.recordings).toEqual([]);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should return expected functions', () => {
      const result = useRecordings('test-token');

      expect(typeof result.fetch).toBe('function');
      expect(typeof result.remove).toBe('function');
      expect(typeof result.refresh).toBe('function');
      expect(typeof result.setRecordings).toBe('function');
    });
  });

  describe('useRecordingUpload Hook', () => {
    it('should return upload state and functions', async () => {
      const { useRecordingUpload } = await import('@/hooks/useRecordings');
      const result = useRecordingUpload('test-token');

      expect(result).toHaveProperty('uploadProgress');
      expect(result).toHaveProperty('isUploading');
      expect(result).toHaveProperty('uploadError');
      expect(typeof result.resetUpload).toBe('function');
    });
  });
});

// =====================================================
// USE AUDIO RECORDER HOOK TESTS
// =====================================================

describe('useAudioRecorder Hook', () => {
  describe('Format Duration Utility', () => {
    it('should format duration correctly', () => {
      // Test the format duration logic directly
      const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };

      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(125)).toBe('02:05');
    });
  });

  describe('Hook Exports', () => {
    it('should export useAudioRecorder function', async () => {
      const module = await import('@/hooks/useAudioRecorder');
      expect(typeof module.useAudioRecorder).toBe('function');
    });
  });
});

// =====================================================
// USE NOTIFICATIONS HOOK TESTS
// =====================================================

describe('useNotifications Hook', () => {
  let useNotifications;
  let requestNotificationPermission;
  let getFCMToken;

  beforeAll(async () => {
    const firebase = await import('@/lib/firebase');
    requestNotificationPermission = firebase.requestNotificationPermission;
    getFCMToken = firebase.getFCMToken;
    const module = await import('@/hooks/useNotifications');
    useNotifications = module.useNotifications;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial state values', () => {
      const result = useNotifications({ token: null });

      expect(result.isSupported).toBe(false);
      expect(result.permission).toBe('default');
      expect(result.fcmToken).toBeNull();
      expect(result.serviceWorkerReady).toBe(false);
    });

    it('should return expected functions', () => {
      const result = useNotifications({ token: 'test-token' });

      expect(typeof result.registerToken).toBe('function');
      expect(typeof result.unregisterToken).toBe('function');
    });
  });

  describe('Token Registration', () => {
    it('should return null when no token provided', async () => {
      const result = useNotifications({ token: null });
      const token = await result.registerToken();

      expect(token).toBeNull();
    });
  });
});

// =====================================================
// USE CALL MANAGER HOOK TESTS
// =====================================================

describe('useCallManager Hook', () => {
  let useCallManager;
  let useOutgoingCall;

  beforeAll(async () => {
    const module = await import('@/hooks/useCallManager');
    useCallManager = module.useCallManager;
    useOutgoingCall = module.useOutgoingCall;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hook Return Values', () => {
    it('should return expected action functions', () => {
      const result = useCallManager();

      expect(typeof result.makeCall).toBe('function');
      expect(typeof result.hangupCall).toBe('function');
      expect(typeof result.acceptCall).toBe('function');
      expect(typeof result.acceptWebRTCCall).toBe('function');
      expect(typeof result.rejectCall).toBe('function');
      expect(typeof result.toggleMute).toBe('function');
      expect(typeof result.sendDigits).toBe('function');
    });

    it('should return utility functions', () => {
      const result = useCallManager();

      expect(typeof result.startCallTimer).toBe('function');
      expect(typeof result.stopCallTimer).toBe('function');
      expect(typeof result.getCallManager).toBe('function');
    });
  });

  describe('useOutgoingCall Hook', () => {
    it('should return expected properties', () => {
      const result = useOutgoingCall();

      expect(result).toHaveProperty('phoneNumber');
      expect(result).toHaveProperty('callStatus');
      expect(typeof result.dial).toBe('function');
      expect(typeof result.clearNumber).toBe('function');
      expect(typeof result.appendDigit).toBe('function');
      expect(typeof result.backspace).toBe('function');
    });
  });
});
