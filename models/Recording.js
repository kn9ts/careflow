import mongoose from "mongoose";

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
  },

  // Call Information
  sid: {
    type: String,
    required: true,
    unique: true,
  },
  callSid: {
    type: String,
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
  },

  // Storage
  s3Key: {
    type: String,
    required: true,
  },
  s3Bucket: {
    type: String,
    required: true,
  },

  // Metadata
  duration: {
    type: Number,
    required: true,
  },
  fileSize: {
    type: Number,
  },
  format: {
    type: String,
    default: "wav",
  },

  // Timestamps
  recordedAt: {
    type: Date,
    required: true,
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
    enum: ["active", "archived", "deleted"],
    default: "active",
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

  // Optional
  transcription: {
    type: String,
  },
  callerLocation: {
    type: String,
  },
});

// Compound indexes
recordingSchema.index({ userId: 1, recordedAt: -1 });
recordingSchema.index({ firebaseUid: 1, type: 1 });
recordingSchema.index({ userId: 1, isListened: 1 });
recordingSchema.index({ sid: 1 });

// Update listenedAt when isListened is set to true
recordingSchema.pre("save", function (next) {
  if (this.isModified("isListened") && this.isListened) {
    this.listenedAt = new Date();
  }
  next();
});

export default mongoose.models.Recording ||
  mongoose.model("Recording", recordingSchema);
