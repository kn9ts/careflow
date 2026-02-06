import mongoose from "mongoose";

/**
 * Recording Schema
 *
 * Stores both Twilio and WebRTC call recordings.
 * Supports multiple storage backends (Twilio, Backblaze B2).
 */

const recordingSchema = new mongoose.Schema({
  // Association with User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  firebaseUid: {
    type: String,
    required: true,
    index: true,
  },

  // Recording Type
  type: {
    type: String,
    enum: ["call", "voicemail"],
    required: true,
    index: true,
  },

  // Call Mode (Twilio or WebRTC)
  callMode: {
    type: String,
    enum: ["twilio", "webrtc"],
    required: true,
    default: "twilio",
  },

  // Call Information
  callSid: {
    type: String,
    unique: true,
    sparse: true, // Allows null for WebRTC recordings
  },
  webrtcCallId: {
    type: String, // Unique ID for WebRTC calls
    sparse: true,
  },
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  direction: {
    type: String,
    enum: ["inbound", "outbound"],
    required: true,
    index: true,
  },

  // Storage Information
  storage: {
    // Storage provider
    provider: {
      type: String,
      enum: ["twilio", "backblaze", "local"],
      required: true,
      default: "backblaze",
    },
    // Backblaze B2 storage
    b2Key: {
      type: String,
    },
    b2Bucket: {
      type: String,
    },
    // Twilio storage
    twilioUrl: {
      type: String,
    },
    // Local storage (for development)
    localPath: {
      type: String,
    },
  },

  // Metadata
  duration: {
    type: Number,
    required: true,
    min: 0,
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  format: {
    type: String,
    enum: ["webm", "wav", "mp3", "ogg"],
    default: "webm",
  },
  bitrate: {
    type: Number, // Audio bitrate in kbps
    default: 128,
  },

  // Timestamps
  recordedAt: {
    type: Date,
    required: true,
    index: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  listenedAt: {
    type: Date,
  },
  archivedAt: {
    type: Date,
  },

  // Status
  status: {
    type: String,
    enum: ["recording", "processing", "active", "archived", "deleted", "error"],
    default: "processing",
    index: true,
  },
  storageClass: {
    type: String,
    enum: ["STANDARD", "GLACIER_DEEP_ARCHIVE"],
    default: "STANDARD",
  },
  isListened: {
    type: Boolean,
    default: false,
  },
  isDownloaded: {
    type: Boolean,
    default: false,
  },
  downloadedAt: {
    type: Date,
  },

  // Access Control
  accessControl: {
    isPublic: {
      type: Boolean,
      default: false,
    },
    allowedUsers: [
      {
        type: String, // Firebase UIDs
      },
    ],
    expiresAt: {
      type: Date,
    },
  },

  // Optional Features
  transcription: {
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
    },
    text: {
      type: String,
    },
    confidence: {
      type: Number, // 0-1 confidence score
    },
    language: {
      type: String,
      default: "en",
    },
  },
  notes: [
    {
      author: String,
      content: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  callerLocation: {
    type: String,
  },

  // Audit Trail
  createdBy: {
    type: String, // Firebase UID
  },
  lastAccessedBy: {
    type: String, // Firebase UID
  },
  lastAccessedAt: {
    type: Date,
  },
  deletionRequest: {
    requestedBy: String,
    requestedAt: Date,
    reason: String,
  },
});

// Compound Indexes
recordingSchema.index({ userId: 1, recordedAt: -1 });
recordingSchema.index({ firebaseUid: 1, type: 1 });
recordingSchema.index({ userId: 1, isListened: 1 });
recordingSchema.index({ userId: 1, status: 1 });
recordingSchema.index({ userId: 1, direction: 1 });
recordingSchema.index({ recordedAt: -1, status: 1 });
recordingSchema.index({ "transcription.status": 1 });

// Virtual for getting signed URL (computed on demand)
recordingSchema.virtual("signedUrl").get(function () {
  // This would be computed by the application
  return null;
});

// Instance method to check if user has access
recordingSchema.methods.hasAccess = function (firebaseUid) {
  if (this.accessControl.isPublic) return true;
  if (this.userId.toString() === firebaseUid) return true;
  if (this.accessControl.allowedUsers.includes(firebaseUid)) return true;
  if (
    this.accessControl.expiresAt &&
    new Date() > this.accessControl.expiresAt
  ) {
    return false;
  }
  return false;
};

// Instance method to mark as listened
recordingSchema.methods.markAsListened = async function (firebaseUid) {
  this.isListened = true;
  this.listenedAt = new Date();
  this.lastAccessedBy = firebaseUid;
  this.lastAccessedAt = new Date();
  return this.save();
};

// Instance method to get access URL
recordingSchema.methods.getAccessUrl = async function () {
  if (this.storage.provider === "backblaze" && this.storage.b2Key) {
    // Return signed URL from Backblaze
    return `/api/recordings/${this._id}/url`;
  }
  if (this.storage.provider === "twilio" && this.storage.twilioUrl) {
    return this.storage.twilioUrl;
  }
  return null;
};

// Pre-save hook for auto-updates
recordingSchema.pre("save", function (next) {
  if (this.isModified("isListened") && this.isListened && !this.listenedAt) {
    this.listenedAt = new Date();
  }
  if (
    this.isModified("isDownloaded") &&
    this.isDownloaded &&
    !this.downloadedAt
  ) {
    this.downloadedAt = new Date();
  }
  next();
});

// Static method to find recordings for user
recordingSchema.statics.findByUser = function (userId, options = {}) {
  const query = { userId };

  if (options.type) query.type = options.type;
  if (options.direction) query.direction = options.direction;
  if (options.status) query.status = options.status;
  if (options.startDate || options.endDate) {
    query.recordedAt = {};
    if (options.startDate) query.recordedAt.$gte = options.startDate;
    if (options.endDate) query.recordedAt.$lte = options.endDate;
  }

  return this.find(query)
    .sort({ recordedAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

// Static method for admin queries
recordingSchema.statics.adminFind = function (filters = {}, options = {}) {
  return this.find(filters)
    .populate("userId", "email displayName")
    .sort({ recordedAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 50);
};

export default mongoose.models.Recording ||
  mongoose.model("Recording", recordingSchema);
