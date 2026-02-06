/**
 * Recording Detail API
 *
 * Endpoints for individual recording operations:
 * - GET /api/recordings/[id] - Get recording details
 * - GET /api/recordings/[id]/url - Get signed playback URL
 * - DELETE /api/recordings/[id] - Soft delete recording
 * - PATCH /api/recordings/[id] - Update recording metadata
 */

import { connectDB } from "@/lib/db";
import Recording from "@/models/Recording";
import backblazeStorage from "@/lib/backblaze";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const includeSignedUrl = searchParams.get("includeUrl") === "true";

    // Authenticate user
    const auth = await requireAuth(request);
    if (auth.error) {
      return errorResponse("Unauthorized", { status: 401 });
    }

    await connectDB();

    // Find recording
    const recording = await Recording.findOne({
      _id: id,
      firebaseUid: auth.user.uid,
    }).populate("userId", "email displayName care4wId");

    if (!recording) {
      return errorResponse("Recording not found", { status: 404 });
    }

    // Check if user has access
    if (!recording.hasAccess(auth.user.uid)) {
      return errorResponse("Access denied", { status: 403 });
    }

    // Mark as accessed
    recording.lastAccessedBy = auth.user.uid;
    recording.lastAccessedAt = new Date();

    // Generate signed URL if requested
    let signedUrl = null;
    let downloadUrl = null;

    if (
      includeSignedUrl &&
      recording.storage.provider === "backblaze" &&
      recording.storage.b2Key
    ) {
      try {
        signedUrl = await backblazeStorage.getSignedUrl(
          recording.storage.b2Key,
          3600,
        );
        downloadUrl = await backblazeStorage.getSignedUrl(
          recording.storage.b2Key,
          86400,
        ); // 24 hours for download
      } catch (err) {
        console.error("Failed to generate signed URL:", err);
      }
    }

    return successResponse({
      recording: {
        id: recording._id,
        type: recording.type,
        callMode: recording.callMode,
        webrtcCallId: recording.webrtcCallId,
        callSid: recording.callSid,
        from: recording.from,
        to: recording.to,
        direction: recording.direction,
        duration: recording.duration,
        fileSize: recording.fileSize,
        format: recording.format,
        recordedAt: recording.recordedAt,
        uploadedAt: recording.uploadedAt,
        status: recording.status,
        isListened: recording.isListened,
        listenedAt: recording.listenedAt,
        transcription: recording.transcription,
        tags: recording.tags,
        notes: recording.notes,
        accessUrl: signedUrl,
        downloadUrl: downloadUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching recording:", error);
    return errorResponse("Failed to fetch recording", { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // Authenticate user
    const auth = await requireAuth(request);
    if (auth.error) {
      return errorResponse("Unauthorized", { status: 401 });
    }

    await connectDB();

    // Find and soft-delete recording
    const recording = await Recording.findOneAndUpdate(
      {
        _id: id,
        firebaseUid: auth.user.uid,
        status: { $ne: "deleted" },
      },
      {
        status: "deleted",
        deletionRequest: {
          requestedBy: auth.user.uid,
          requestedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!recording) {
      return errorResponse("Recording not found or already deleted", {
        status: 404,
      });
    }

    return successResponse({
      message: "Recording deleted successfully",
      id: recording._id,
    });
  } catch (error) {
    console.error("Error deleting recording:", error);
    return errorResponse("Failed to delete recording", { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    // Authenticate user
    const auth = await requireAuth(request);
    if (auth.error) {
      return errorResponse("Unauthorized", { status: 401 });
    }

    await connectDB();

    // Find recording
    const recording = await Recording.findOne({
      _id: id,
      firebaseUid: auth.user.uid,
    });

    if (!recording) {
      return errorResponse("Recording not found", { status: 404 });
    }

    // Update allowed fields
    const allowedUpdates = ["tags", "notes", "accessControl"];
    for (const key of Object.keys(body)) {
      if (allowedUpdates.includes(key)) {
        if (key === "notes") {
          // Add new note
          recording.notes.push({
            author: auth.user.uid,
            content: body.notes,
            createdAt: new Date(),
          });
        } else if (key === "accessControl") {
          recording.accessControl = {
            ...recording.accessControl,
            ...body.accessControl,
          };
        } else {
          recording[key] = body[key];
        }
      }
    }

    await recording.save();

    return successResponse({
      message: "Recording updated successfully",
      recording: {
        id: recording._id,
        tags: recording.tags,
        notes: recording.notes,
        accessControl: recording.accessControl,
      },
    });
  } catch (error) {
    console.error("Error updating recording:", error);
    return errorResponse("Failed to update recording", { status: 500 });
  }
}
