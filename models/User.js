import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  // Firebase Auth ID (primary identifier)
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Profile Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: "Invalid email format",
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
    default: "",
  },

  // Role & Permissions
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
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
      validator: function (v) {
        if (!v) return true; // Allow null/empty
        return /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message:
        "Invalid phone number format. Use E.164 format (e.g., +1234567890)",
    },
  },
  twilioClientIdentity: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
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

  // Notification Preferences
  notifications: {
    incomingCalls: { type: Boolean, default: true },
    missedCalls: { type: Boolean, default: true },
    voicemails: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
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
userSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Compound indexes
userSchema.index({ firebaseUid: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ twilioClientIdentity: 1 }, { sparse: true });
userSchema.index({ care4wId: 1 }, { unique: true });
userSchema.index({ sequenceNumber: 1 }, { unique: true });
userSchema.index({ isActive: 1, lastLoginAt: -1 }); // For finding active users sorted by last login
userSchema.index({ role: 1, isActive: 1 }); // For filtering users by role and status
userSchema.index({ createdAt: -1 }); // For sorting users by creation date

export default mongoose.models.User || mongoose.model("User", userSchema);
