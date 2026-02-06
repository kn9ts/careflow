/**
 * Recording Upload API Endpoint
 *
 * Handles uploading client-side WebRTC recordings to Backblaze B2 storage.
 * Includes authentication, validation, and retry logic.
 */

import { connectDB } from "@/lib/db";
import Recording from "@/models/Recording";
import backblazeStorage from "@/lib/backblaze";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { v4 as uuidv4 } from "uuid";

export async function POST(request) {
  try {
    // Authenticate user
    const auth = await requireAuth(request);
    if (auth.error) {
      return errorResponse("Unauthorized", { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Get user from database
    const User = (await import("@/models/User")).default;
    const user = await User.findOne({ firebaseUid: auth.user.uid });

    if (!user) {
      return errorResponse("User not found", { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const recording = formData.get("recording");
    const callId = formData.get("callId");
    const duration = parseInt(formData.get("duration") || "0");
    const from = formData.get("from");
    const to = formData.get("to");
    const direction = formData.get("direction");
    const recordedAt = formData.get("recordedAt");

    // Validate required fields
    if (!recording) {
      return errorResponse("Recording file is required", { status: 400 });
    }

    if (!callId) {
      return errorResponse("Call ID is required", { status: 400 });
    }

    if (!duration || duration <= 0) {
      return errorResponse("Valid duration is required", { status: 400 });
    }

    if (!from || !to || !direction) {
      return errorResponse("Call metadata (from, to, direction) is required", {
        status: 400,
      });
    }

    // Check if Backblaze is configured
    if (!backblazeStorage.isConfigured()) {
      return errorResponse("Storage service not configured", { status: 503 });
    }

    // Generate unique recording ID
    const recordingId = uuidv4();
    const filename = `${direction}-${callId}-${Date.now()}.webm`;

    // Convert file to buffer
    const arrayBuffer = await recording.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Backblaze B2
    const uploadResult = await backblazeStorage.uploadFile(
      `recordings/${user.care4wId || user._id}/${filename}`,
      buffer,
      "audio/webm",
    );

    // Create recording document
    const newRecording = await Recording.create({
      userId: user._id,
      firebaseUid: auth.user.uid,
      type: "call",
      callMode: "webrtc",
      webrtcCallId: callId,
      callSid: null, // No Twilio SID for WebRTC calls
      from,
      to,
      direction,
      storage: {
        provider: "backblaze",
        b2Key: uploadResult.key,
        b2Bucket: uploadResult.bucket,
      },
      duration,
      fileSize: buffer.length,
      format: "webm",
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      uploadedAt: new Date(),
      status: "active",
      createdBy: auth.user.uid,
    });

    console.log(
      `Recording uploaded: ${newRecording._id} for user ${auth.user.uid}`,
    );

    return successResponse({
      message: "Recording uploaded successfully",
      recording: {
        id: newRecording._id,
        callId: callId,
        duration,
        size: buffer.length,
        url: uploadResult.url,
      },
    });
  } catch (error) {
    console.error("Recording upload error:", error);
    return errorResponse("Failed to upload recording", {
      status: 500,
      code: "UPLOAD_FAILED",
      details: error.message,
    });
  }
}

/**
 * Get upload configuration and limits
 */
export async function GET(request) {
  try {
    // Authenticate user
    const auth = await requireAuth(request);
    if (auth.error) {
      return errorResponse("Unauthorized", { status: 401 });
    }

    // Get user's storage usage
    await connectDB();
    const User = (await import("@/models/User")).default;
    const Recording = (await import("@/models/Recording")).default;

    const user = await User.findOne({ firebaseUid: auth.user.uid });
    if (!user) {
      return errorResponse("User not found", { status: 404 });
    }

    // Calculate storage usage
    const totalSize = await Recording.aggregate([
      { $match: { firebaseUid: auth.user.uid, status: { $ne: "deleted" } } },
      { $group: { _id: null, total: { $sum: "$fileSize" } } },
    ]);

    const usedStorage = totalSize[0]?.total || 0;
    const storageLimit = user.storageLimit || 1073741824; // Default 1GB

    return successResponse({
      uploadConfig: {
        maxFileSize: 100 * 1024 * 1024, // 100MB max
        allowedFormats: ["audio/webm", "audio/wav", "audio/mp3"],
        maxDuration: 3600, // 1 hour max
      },
      storage: {
        used: usedStorage,
        limit: storageLimit,
        available: storageLimit - usedStorage,
        percentage: ((usedStorage / storageLimit) * 100).toFixed(2),
      },
    });
  } catch (error) {
    console.error("Error getting upload config:", error);
    return errorResponse("Failed to get upload configuration", { status: 500 });
  }
}
