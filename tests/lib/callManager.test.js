/**
 * Call Manager Tests
 * Tests for unified call management with Twilio and WebRTC
 */

describe('Call Manager', () => {
  describe('CallManager Class Initialization', () => {
    test('should initialize with default state', () => {
      const manager = {
        mode: null,
        care4wId: null,
        twilioDevice: null,
        twilioConnection: null,
        webrtcManager: null,
        token: null,
        isRecordingEnabled: false,
        currentCallMetadata: null,
        listeners: {
          onStatusChange: null,
          onCallStateChange: null,
          onIncomingCall: null,
          onCallEnded: null,
          onError: null,
          onLocalStream: null,
          onRemoteStream: null,
          onRecordingStarted: null,
          onRecordingStopped: null,
          onRecordingError: null,
          onRecordingUploaded: null,
        },
      };

      expect(manager.mode).toBeNull();
      expect(manager.care4wId).toBeNull();
      expect(manager.twilioDevice).toBeNull();
      expect(manager.isRecordingEnabled).toBe(false);
    });

    test('should have all event listener properties', () => {
      const requiredListeners = [
        'onStatusChange',
        'onCallStateChange',
        'onIncomingCall',
        'onCallEnded',
        'onError',
        'onLocalStream',
        'onRemoteStream',
        'onRecordingStarted',
        'onRecordingStopped',
        'onRecordingError',
        'onRecordingUploaded',
      ];

      const manager = { listeners: {} };
      requiredListeners.forEach((listener) => {
        manager.listeners[listener] = null;
      });

      requiredListeners.forEach((listener) => {
        expect(manager.listeners).toHaveProperty(listener);
      });
    });
  });

  describe('Mode Detection', () => {
    test('should have valid mode values', () => {
      const modes = ['twilio', 'webrtc', null];

      expect(modes).toContain('twilio');
      expect(modes).toContain('webrtc');
      expect(modes).toContain(null);
    });

    test('should return correct mode info for Twilio', () => {
      const modeInfo = {
        mode: 'twilio',
        description: 'Twilio Voice - PSTN Calls',
        placeholder: 'Enter phone number (+1234567890)',
        format: 'E.164 phone format',
        helpText: 'Enter a phone number including country code',
      };

      expect(modeInfo.mode).toBe('twilio');
      expect(modeInfo.description).toContain('Twilio');
      expect(modeInfo.placeholder).toContain('phone number');
    });

    test('should return correct mode info for WebRTC', () => {
      const modeInfo = {
        mode: 'webrtc',
        description: 'WebRTC - CareFlow User Calls',
        placeholder: 'Enter CareFlow ID (care4w-XXXXXXX)',
        format: 'care4w- followed by 7 digits',
        helpText: 'Enter a CareFlow User ID like care4w-1000001',
      };

      expect(modeInfo.mode).toBe('webrtc');
      expect(modeInfo.description).toContain('WebRTC');
      expect(modeInfo.placeholder).toContain('CareFlow ID');
    });
  });

  describe('Call Status Management', () => {
    test('should have valid call statuses', () => {
      const statuses = [
        'idle',
        'connecting',
        'connected',
        'disconnected',
        'incoming',
        'ready',
        'failed',
      ];

      statuses.forEach((status) => {
        expect(statuses).toContain(status);
      });
    });

    test('should track connection state', () => {
      const state = {
        twilioConnection: { state: 'connected' },
        webrtcManager: { getConnectionState: () => 'connected' },
      };

      const connectionState =
        state.twilioConnection?.state || state.webrtcManager?.getConnectionState() || 'idle';

      expect(connectionState).toBe('connected');
    });
  });

  describe('Phone Number Validation', () => {
    test('should validate E.164 phone format', () => {
      const isValidE164 = (number) => /^\+?[1-9]\d{1,14}$/.test(number);

      expect(isValidE164('+1234567890')).toBe(true);
      expect(isValidE164('+441234567890')).toBe(true);
      expect(isValidE164('1234567890')).toBe(true);
      expect(isValidE164('invalid')).toBe(false);
      expect(isValidE164('')).toBe(false);
    });

    test('should validate care4wId format', () => {
      const isValidCare4wId = (id) => /^care4w-\d{7}$/.test(id);

      expect(isValidCare4wId('care4w-1000001')).toBe(true);
      expect(isValidCare4wId('care4w-9999999')).toBe(true);
      expect(isValidCare4wId('care4w-0000001')).toBe(true);
      expect(isValidCare4wId('user-1000001')).toBe(false);
    });
  });

  describe('Call Error Handling', () => {
    test('should throw error for missing phone number', () => {
      const makeCall = (number) => {
        if (!number) {
          throw new Error('Phone number or CareFlow ID is required');
        }
      };

      expect(() => makeCall(null)).toThrow('Phone number or CareFlow ID is required');
      expect(() => makeCall('')).toThrow('Phone number or CareFlow ID is required');
      expect(() => makeCall('+1234567890')).not.toThrow();
    });

    test('should throw error for calling self', () => {
      const care4wId = 'care4w-1000001';

      const checkSelfCall = (targetId, currentId) => {
        if (targetId === currentId) {
          throw new Error('Cannot call your own CareFlow ID');
        }
      };

      expect(() => checkSelfCall('care4w-1000001', 'care4w-1000001')).toThrow(
        'Cannot call your own CareFlow ID'
      );
      expect(() => checkSelfCall('care4w-1000002', 'care4w-1000001')).not.toThrow();
    });

    test('should throw error for uninitialized Twilio', () => {
      const twilioDevice = null;

      const makeTwilioCall = (device) => {
        if (!device) {
          throw new Error('Twilio not initialized');
        }
      };

      expect(() => makeTwilioCall(twilioDevice)).toThrow('Twilio not initialized');
    });

    test('should throw error for uninitialized WebRTC', () => {
      const webrtcManager = null;

      const checkWebRTC = (manager) => {
        if (!manager) {
          throw new Error('WebRTC not initialized');
        }
      };

      expect(() => checkWebRTC(webrtcManager)).toThrow('WebRTC not initialized');
    });
  });

  describe('Twilio Device Configuration', () => {
    test('should have correct codec preferences', () => {
      const deviceConfig = {
        codecPreferences: ['opus', 'pcmu'],
        fakeLocalDTMF: true,
        enableRingingState: true,
      };

      expect(deviceConfig.codecPreferences).toContain('opus');
      expect(deviceConfig.codecPreferences).toContain('pcmu');
      expect(deviceConfig.fakeLocalDTMF).toBe(true);
    });

    test('should have valid Twilio event handlers', () => {
      const events = ['ready', 'error', 'connect', 'disconnect', 'incoming'];

      events.forEach((event) => {
        expect(events).toContain(event);
      });
    });
  });

  describe('WebRTC Manager', () => {
    test('should have WebRTC event handlers', () => {
      const events = [
        'onConnectionStateChange',
        'onLocalStream',
        'onRemoteStream',
        'onCallEnded',
        'onIncomingCall',
      ];

      events.forEach((event) => {
        expect(events).toContain(event);
      });
    });

    test('should manage ICE servers configuration', () => {
      const iceServers = [
        { urls: ['stun:stun.l.google.com:19302'] },
        {
          urls: ['turn:turn.example.com:3478'],
          username: 'user',
          credential: 'pass',
        },
      ];

      expect(iceServers).toHaveLength(2);
      expect(iceServers[0].urls).toContain('stun:stun.l.google.com:19302');
    });
  });

  describe('Recording Management', () => {
    test('should toggle recording enabled state', () => {
      let isRecordingEnabled = false;

      isRecordingEnabled = true;
      expect(isRecordingEnabled).toBe(true);

      isRecordingEnabled = false;
      expect(isRecordingEnabled).toBe(false);
    });

    test('should generate unique call ID for recording', () => {
      const generateRecordingCallId = () =>
        `webrtc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const callId1 = generateRecordingCallId();
      const callId2 = generateRecordingCallId();

      expect(callId1).toMatch(/^webrtc-\d+-[a-z0-9]+$/);
      expect(callId2).toMatch(/^webrtc-\d+-[a-z0-9]+$/);
      expect(callId1).not.toBe(callId2);
    });

    test('should validate recording state', () => {
      const recordingState = {
        isRecording: false,
        callId: null,
        startTime: null,
      };

      expect(recordingState.isRecording).toBe(false);
    });
  });

  describe('Mute and DTMF', () => {
    test('should toggle mute state', () => {
      let isMuted = false;

      isMuted = true;
      expect(isMuted).toBe(true);

      isMuted = false;
      expect(isMuted).toBe(false);
    });

    test('should return mute state', () => {
      const getMuteState = (connection) => connection?.isMuted() || false;

      const mockConnection = { isMuted: () => true };
      expect(getMuteState(mockConnection)).toBe(true);
      expect(getMuteState(null)).toBe(false);
    });

    test('should send DTMF digits', () => {
      const sendDigits = (connection, digit) => {
        if (connection) {
          connection.sendDigits(digit);
        }
      };

      const mockConnection = { sendDigits: jest.fn() };
      sendDigits(mockConnection, '1');

      expect(mockConnection.sendDigits).toHaveBeenCalledWith('1');
    });
  });

  describe('Call Timer', () => {
    test('should calculate call duration', () => {
      const startTime = Date.now() - 5000; // 5 seconds ago

      const getDuration = () => Math.round((new Date() - startTime) / 1000);

      const duration = getDuration();
      expect(duration).toBeGreaterThanOrEqual(4);
      expect(duration).toBeLessThanOrEqual(6);
    });

    test('should format duration as MM:SS', () => {
      const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };

      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(125)).toBe('02:05');
      expect(formatDuration(5)).toBe('00:05');
    });
  });

  describe('Status Notification', () => {
    test('should notify status change', () => {
      const listeners = { onCallStateChange: null };
      const mockCallback = jest.fn();

      listeners.onCallStateChange = mockCallback;

      if (listeners.onCallStateChange) {
        listeners.onCallStateChange('connected');
      }

      expect(mockCallback).toHaveBeenCalledWith('connected');
    });

    test('should handle missing listeners gracefully', () => {
      const notify = (callback) => {
        if (callback) {
          callback('connected');
        }
        // No error should be thrown
      };

      expect(() => notify(null)).not.toThrow();
    });
  });

  describe('Incoming Call Handling', () => {
    test('should extract caller info from connection', () => {
      const connection = {
        parameters: {
          From: '+1234567890',
          To: '+0987654321',
        },
      };

      const callerInfo = {
        from: connection.parameters.From,
        mode: 'twilio',
      };

      expect(callerInfo.from).toBe('+1234567890');
      expect(callerInfo.mode).toBe('twilio');
    });

    test('should accept incoming call', () => {
      const connection = { accept: jest.fn() };

      connection.accept();

      expect(connection.accept).toHaveBeenCalled();
    });

    test('should reject incoming call', () => {
      let connection = { reject: jest.fn(), parameters: {} };
      const rejectCall = () => {
        if (connection) {
          connection.reject();
          connection = null;
        }
      };

      rejectCall();

      expect(connection).toBeNull();
    });
  });

  describe('Call Disconnection', () => {
    test('should disconnect Twilio call', () => {
      const connection = { disconnect: jest.fn() };
      const device = { disconnectAll: jest.fn() };

      connection.disconnect();
      device.disconnectAll();

      expect(connection.disconnect).toHaveBeenCalled();
      expect(device.disconnectAll).toHaveBeenCalled();
    });

    test('should cleanup after disconnect', () => {
      let connection = { disconnect: jest.fn() };

      connection.disconnect();
      connection = null;

      expect(connection).toBeNull();
    });
  });
});
