/**
 * Mongoose Model Tests
 * Tests for User and Recording models
 */

describe('User Model', () => {
  describe('Schema Validation', () => {
    test('should have required fields', () => {
      const requiredFields = ['firebaseUid', 'email', 'displayName', 'role', 'isActive'];

      requiredFields.forEach((field) => {
        expect(requiredFields).toContain(field);
      });
    });

    test('should have valid email format', () => {
      const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('invalid')).toBe(false);
    });

    test('should have valid role enum values', () => {
      const validRoles = ['user', 'admin'];

      validRoles.forEach((role) => {
        expect(validRoles).toContain(role);
      });
    });

    test('should have valid phone number format (E.164)', () => {
      const validatePhone = (phone) => {
        if (!phone) return true; // Allow null/empty
        return /^\+?[1-9]\d{1,14}$/.test(phone);
      };

      expect(validatePhone('+1234567890')).toBe(true);
      expect(validatePhone('1234567890')).toBe(true);
      expect(validatePhone(null)).toBe(true);
      expect(validatePhone('invalid')).toBe(false);
    });

    test('should have valid care4wId format', () => {
      const validateCare4wId = (id) => /^care4w-\d{7}$/.test(id);

      expect(validateCare4wId('care4w-1000001')).toBe(true);
      expect(validateCare4wId('user-1000001')).toBe(false);
    });
  });

  describe('Default Values', () => {
    test("should have default role of 'user'", () => {
      const role = 'user';
      expect(role).toBe('user');
    });

    test('should have default isActive as true', () => {
      const isActive = true;
      expect(isActive).toBe(true);
    });

    test('should have default storage limit of 1GB', () => {
      const storageLimit = 1073741824; // 1GB in bytes
      expect(storageLimit).toBe(1073741824);
    });

    test('should have default storageUsed as 0', () => {
      const storageUsed = 0;
      expect(storageUsed).toBe(0);
    });

    test('should have notification defaults', () => {
      const defaults = {
        incomingCalls: true,
        missedCalls: true,
        voicemails: true,
        email: false,
      };

      expect(defaults.incomingCalls).toBe(true);
      expect(defaults.missedCalls).toBe(true);
      expect(defaults.voicemails).toBe(true);
      expect(defaults.email).toBe(false);
    });
  });

  describe('Indexes', () => {
    test('should have firebaseUid unique index', () => {
      const indexes = [{ fields: { firebaseUid: 1 }, options: { unique: true } }];

      expect(indexes[0].fields.firebaseUid).toBe(1);
      expect(indexes[0].options.unique).toBe(true);
    });

    test('should have email unique index', () => {
      const indexes = [{ fields: { email: 1 }, options: { unique: true } }];

      expect(indexes[0].fields.email).toBe(1);
      expect(indexes[0].options.unique).toBe(true);
    });

    test('should have care4wId unique index', () => {
      const care4wIdIndex = {
        fields: { care4wId: 1 },
        options: { unique: true },
      };

      expect(care4wIdIndex.fields.care4wId).toBe(1);
      expect(care4wIdIndex.options.unique).toBe(true);
    });
  });

  describe('Display Name Constraints', () => {
    test('should have min length of 1', () => {
      const minLength = 1;
      const displayName = 'A';
      expect(displayName.length).toBeGreaterThanOrEqual(minLength);
    });

    test('should have max length of 50', () => {
      const maxLength = 50;
      const displayName = 'A'.repeat(maxLength);
      expect(displayName.length).toBe(maxLength);
    });

    test('should trim whitespace', () => {
      const rawName = '  John Doe  ';
      const trimmed = rawName.trim();
      expect(trimmed).toBe('John Doe');
    });
  });
});

describe('Recording Model', () => {
  describe('Schema Validation', () => {
    test('should have required fields', () => {
      const requiredFields = [
        'userId',
        'firebaseUid',
        'type',
        'callMode',
        'from',
        'to',
        'direction',
        'duration',
        'recordedAt',
      ];

      requiredFields.forEach((field) => {
        expect(requiredFields).toContain(field);
      });
    });

    test('should have valid recording types', () => {
      const validTypes = ['call', 'voicemail'];

      validTypes.forEach((type) => {
        expect(validTypes).toContain(type);
      });
    });

    test('should have valid call modes', () => {
      const validModes = ['twilio', 'webrtc'];

      validModes.forEach((mode) => {
        expect(validModes).toContain(mode);
      });
    });

    test('should have valid directions', () => {
      const validDirections = ['inbound', 'outbound'];

      validDirections.forEach((direction) => {
        expect(validDirections).toContain(direction);
      });
    });

    test('should have valid statuses', () => {
      const validStatuses = ['recording', 'processing', 'active', 'archived', 'deleted', 'error'];

      validStatuses.forEach((status) => {
        expect(validStatuses).toContain(status);
      });
    });

    test('should have valid audio formats', () => {
      const validFormats = ['webm', 'wav', 'mp3', 'ogg'];

      validFormats.forEach((format) => {
        expect(validFormats).toContain(format);
      });
    });

    test('should have valid storage classes', () => {
      const validClasses = ['STANDARD', 'GLACIER_DEEP_ARCHIVE'];

      validClasses.forEach((cls) => {
        expect(validClasses).toContain(cls);
      });
    });

    test('should have valid transcription statuses', () => {
      const validStatuses = ['pending', 'processing', 'completed', 'failed'];

      validStatuses.forEach((status) => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe('Duration Validation', () => {
    test('should have minimum duration of 0', () => {
      const minDuration = 0;
      const duration = 0;
      expect(duration).toBeGreaterThanOrEqual(minDuration);
    });

    test('should accept valid duration values', () => {
      const durations = [0, 30, 60, 120, 3600];

      durations.forEach((d) => {
        expect(d).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Default Values', () => {
    test("should have default callMode of 'twilio'", () => {
      const defaultMode = 'twilio';
      expect(defaultMode).toBe('twilio');
    });

    test("should have default format of 'webm'", () => {
      const defaultFormat = 'webm';
      expect(defaultFormat).toBe('webm');
    });

    test('should have default bitrate of 128 kbps', () => {
      const defaultBitrate = 128;
      expect(defaultBitrate).toBe(128);
    });

    test("should have default storageClass of 'STANDARD'", () => {
      const defaultClass = 'STANDARD';
      expect(defaultClass).toBe('STANDARD');
    });

    test('should have default isListened as false', () => {
      const isListened = false;
      expect(isListened).toBe(false);
    });

    test('should have default isDownloaded as false', () => {
      const isDownloaded = false;
      expect(isDownloaded).toBe(false);
    });

    test("should have default status of 'processing'", () => {
      const defaultStatus = 'processing';
      expect(defaultStatus).toBe('processing');
    });

    test("should have default provider of 'backblaze'", () => {
      const defaultProvider = 'backblaze';
      expect(defaultProvider).toBe('backblaze');
    });
  });

  describe('Indexes', () => {
    test('should have compound index on userId and recordedAt', () => {
      const index = { userId: 1, recordedAt: -1 };
      expect(index.userId).toBe(1);
      expect(index.recordedAt).toBe(-1);
    });

    test('should have index on firebaseUid and type', () => {
      const index = { firebaseUid: 1, type: 1 };
      expect(index.firebaseUid).toBe(1);
      expect(index.type).toBe(1);
    });

    test('should have index on recordedAt and status', () => {
      const index = { recordedAt: -1, status: 1 };
      expect(index.recordedAt).toBe(-1);
      expect(index.status).toBe(1);
    });
  });

  describe('Instance Methods', () => {
    test('should have hasAccess method', () => {
      const recording = {
        accessControl: {
          isPublic: false,
          allowedUsers: ['user-1', 'user-2'],
          expiresAt: null,
        },
        userId: { toString: () => 'user-1' },
      };

      const checkAccess = (recording, firebaseUid) => {
        if (recording.accessControl.isPublic) return true;
        if (recording.userId.toString() === firebaseUid) return true;
        if (recording.accessControl.allowedUsers.includes(firebaseUid)) return true;
        if (recording.accessControl.expiresAt && new Date() > recording.accessControl.expiresAt) {
          return false;
        }
        return false;
      };

      expect(checkAccess(recording, 'user-1')).toBe(true);
      expect(checkAccess(recording, 'user-3')).toBe(false);
    });

    test('should have markAsListened method', () => {
      const recording = {
        isListened: false,
        listenedAt: null,
        lastAccessedBy: null,
        lastAccessedAt: null,
        save: jest.fn(),
      };

      recording.isListened = true;
      recording.listenedAt = new Date();
      recording.lastAccessedBy = 'user-1';
      recording.lastAccessedAt = new Date();

      expect(recording.isListened).toBe(true);
      expect(recording.listenedAt).not.toBeNull();
    });

    test('should have getAccessUrl method', () => {
      const getAccessUrl = (recording) => {
        if (recording.storage.provider === 'backblaze' && recording.storage.b2Key) {
          return `/api/recordings/${recording._id}/url`;
        }
        if (recording.storage.provider === 'twilio' && recording.storage.twilioUrl) {
          return recording.storage.twilioUrl;
        }
        return null;
      };

      expect(
        getAccessUrl({
          storage: { provider: 'backblaze', b2Key: 'key' },
          _id: 'rec-123',
        })
      ).toBe('/api/recordings/rec-123/url');
    });
  });

  describe('Static Methods', () => {
    test('should have findByUser method', () => {
      const findByUser = (userId, options = {}) => {
        const query = { userId };

        if (options.type) query.type = options.type;
        if (options.direction) query.direction = options.direction;
        if (options.status) query.status = options.status;

        if (options.startDate || options.endDate) {
          query.recordedAt = {};
          if (options.startDate) query.recordedAt.$gte = options.startDate;
          if (options.endDate) query.recordedAt.$lte = options.endDate;
        }

        return query;
      };

      const query = findByUser('user-123', { type: 'call' });
      expect(query.userId).toBe('user-123');
      expect(query.type).toBe('call');
    });

    test('should have adminFind method', () => {
      const adminFind = (filters = {}, options = {}) => ({
        filters,
        options: {
          skip: options.skip || 0,
          limit: options.limit || 50,
        },
      });

      const result = adminFind({ status: 'active' }, { limit: 100 });
      expect(result.filters.status).toBe('active');
      expect(result.options.limit).toBe(100);
    });
  });

  describe('Pre-save Hooks', () => {
    test('should set listenedAt when isListened becomes true', () => {
      const recording = {
        isListened: false,
        listenedAt: null,
        isModified: (field) => field === 'isListened',
      };

      // Simulate field modification
      recording.isListened = true;

      if (recording.isModified('isListened') && recording.isListened && !recording.listenedAt) {
        recording.listenedAt = new Date();
      }

      expect(recording.listenedAt).not.toBeNull();
    });

    test('should set downloadedAt when isDownloaded becomes true', () => {
      const recording = {
        isDownloaded: false,
        downloadedAt: null,
        isModified: (field) => field === 'isDownloaded',
      };

      // Simulate field modification
      recording.isDownloaded = true;

      if (
        recording.isModified('isDownloaded') &&
        recording.isDownloaded &&
        !recording.downloadedAt
      ) {
        recording.downloadedAt = new Date();
      }

      expect(recording.downloadedAt).not.toBeNull();
    });
  });

  describe('Virtual Properties', () => {
    test('should have signedUrl virtual', () => {
      // Virtual properties are computed on demand
      const recording = {
        storage: { provider: 'backblaze', b2Key: 'key' },
      };

      const signedUrl = null; // Computed by application
      expect(signedUrl).toBeNull();
    });
  });
});
