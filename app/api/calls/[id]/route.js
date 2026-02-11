import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import Recording from "@/models/Recording";
import {
  successResponse,
  errorResponse,
  handleAuthResult,
} from "@/lib/apiResponse";

// Force dynamic rendering - this route uses request.headers for auth
export const dynamic = "force-dynamic";

/**
 * DELETE /api/calls/[id]
 * Delete a recording by ID
 */
export async function DELETE(request, { params }) {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    const authError = handleAuthResult(auth);
    if (authError) return authError;

    // Connect to database
    await connectDB();

    const { id } = params;
    const firebaseUid = auth.user.firebaseUid;

    // Find the recording
    const recording = await Recording.findOne({
      $or: [{ _id: id }, { sid: id }],
      firebaseUid,
    });

    if (!recording) {
      return errorResponse("Recording not found", {
        status: 404,
        code: "RECORDING_NOT_FOUND",
      });
    }

    // Delete the recording from database
    await Recording.deleteOne({ _id: recording._id });

    // Note: The actual file in S3/Twilio is not deleted
    // as Twilio retains recordings according to their retention policy
    // If you need to delete from S3, you would need to add that logic here

    return successResponse({
      message: "Recording deleted successfully",
      deletedId: recording._id,
    });
  } catch (error) {
    console.error("Delete recording error:", error);
    return errorResponse("Failed to delete recording", {
      status: 500,
      code: "DELETE_RECORDING_FAILED",
    });
  }
}

/**
 * GET /api/calls/[id]
 * Get a single recording by ID
 */
export async function GET(request, { params }) {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    const authError = handleAuthResult(auth);
    if (authError) return authError;

    // Connect to database
    await connectDB();

    const { id } = params;
    const firebaseUid = auth.user.firebaseUid;

    // Find the recording
    const recording = await Recording.findOne({
      $or: [{ _id: id }, { sid: id }],
      firebaseUid,
    });

    if (!recording) {
      return errorResponse("Recording not found", {
        status: 404,
        code: "RECORDING_NOT_FOUND",
      });
    }

    // Generate recording URL (if available)
    let recordingUrl = null;
    if (recording.sid) {
      // In a real implementation, you might need to generate a signed URL
      // or use Twilio's API to get the recording URL
      recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${recording.sid}.mp3`;
    }

    return successResponse({
      recording: {
        ...recording.toObject(),
        recordingUrl,
      },
    });
  } catch (error) {
    console.error("Get recording error:", error);
    return errorResponse("Failed to fetch recording", {
      status: 500,
      code: "GET_RECORDING_FAILED",
    });
  }
}
