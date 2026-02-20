import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Firebase Auth ID (primary identifier)
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
  },

  // Profile Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format',
    },
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50,
  },
  photoURL: {
    type: String,
    default: '',
  },

  // Role & Permissions
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    required: true,
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true,
  },

  // Phone Configuration
  twilioPhoneNumber: {
    type: String,
    default: null,
    validate: {
      validator(v) {
        if (!v) return true; // Allow null/empty
        return /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
    },
  },
  twilioClientIdentity: {
    type: String,
    sparse: true,
    trim: true,
  },

  // Personal Phone Number for identity/lookup (user's actual phone number)
  // Used to map to care4wId for WebRTC calls when Twilio is not active
  personalPhoneNumber: {
    full: {
      // Full phone number in E.164 format (e.g., +254712345678)
      type: String,
      sparse: true,
      trim: true,
      validate: {
        validator(v) {
          if (!v) return true; // Allow null/empty
          return /^\+[1-9]\d{1,14}$/.test(v);
        },
        message: 'Invalid phone number format. Use E.164 format (e.g., +254712345678)',
      },
    },
    national: {
      // National number without country code (e.g., 712345678)
      // Used for uniqueness check - must be unique across all users
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    countryCode: {
      // Country calling code (e.g., 254 for Kenya)
      type: String,
      sparse: true,
      trim: true,
    },
  },

  // CareFlow User ID for WebRTC calls (care4w-XXXXXXX)
  care4wId: {
    type: String,
    unique: true,
    immutable: true, // Cannot be changed after creation
    trim: true,
  },
  sequenceNumber: {
    type: Number,
    unique: true,
    immutable: true, // Cannot be changed after creation
  },

  // Notification Preferences (Phase 1 - Extended)
  notifications: {
    incomingCalls: { type: Boolean, default: true },
    missedCalls: { type: Boolean, default: true },
    voicemails: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    soundEnabled: { type: Boolean, default: true },
    soundVolume: { type: Number, default: 80, min: 0, max: 100 },
  },

  // Audio Settings (Phase 1)
  audio: {
    inputDevice: { type: String, default: 'default' },
    outputDevice: { type: String, default: 'default' },
    echoCancellation: { type: Boolean, default: true },
    noiseSuppression: { type: Boolean, default: true },
    autoGainControl: { type: Boolean, default: true },
  },

  // Display Settings (Phase 1)
  display: {
    timezone: { type: String, default: 'UTC' },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY',
      enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
    },
    timeFormat: {
      type: String,
      default: '12h',
      enum: ['12h', '24h'],
    },
  },

  // Push Notification Tokens (FCM)
  notificationTokens: [
    {
      token: {
        type: String,
        required: true,
      },
      deviceInfo: {
        userAgent: String,
        platform: String,
        language: String,
      },
      registeredAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  // Storage Quota
  storageUsed: {
    type: Number,
    default: 0, // in bytes
  },
  storageLimit: {
    type: Number,
    default: 1073741824, // 1GB default
  },

  // Metadata
  lastLoginAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt before saving
userSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Compound indexes (only non-duplicate ones)
// Note: firebaseUid, email, care4wId, sequenceNumber already have unique indexes from schema
// twilioClientIdentity already has sparse index from schema definition
userSchema.index({ isActive: 1, lastLoginAt: -1 }); // For finding active users sorted by last login
userSchema.index({ role: 1, isActive: 1 }); // For filtering users by role and status
userSchema.index({ createdAt: -1 }); // For sorting users by creation date

export default mongoose.models.User || mongoose.model('User', userSchema);
