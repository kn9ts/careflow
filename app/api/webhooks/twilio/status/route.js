import { connectDB } from "@/lib/db";
import Recording from "@/models/Recording";
import User from "@/models/User";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import {
  sendMissedCallNotification,
  sendCallStatusNotification,
} from "@/lib/notifications";

export async function POST(request) {
  try {
    // Connect to database
    await connectDB();

    // Parse form data from Twilio webhook
    const formData = await request.formData();
    const callSid = formData.get("CallSid");
    const callStatus = formData.get("CallStatus");
    const from = formData.get("From");
    const to = formData.get("To");
    const direction = formData.get("Direction");
    const duration = formData.get("CallDuration");
    const recordingSid = formData.get("RecordingSid");
    const recordingUrl = formData.get("RecordingUrl");

    console.log(`Call status update: ${callSid} - ${callStatus}`);

    // Find the user associated with this call
    const user = await User.findOne({ twilioPhoneNumber: to });

    // Handle different call statuses
    if (callStatus === "completed" && duration) {
      // Update existing recording or create new one
      const recording = await Recording.findOne({ sid: callSid });

      if (recording) {
        recording.duration = parseInt(duration);
        recording.status = "active";
        await recording.save();
      } else if (user) {
        await Recording.create({
          userId: user._id,
          firebaseUid: user.firebaseUid,
          type: "call",
          sid: callSid,
          callSid,
          from,
          to,
          direction: direction?.startsWith("inbound") ? "inbound" : "outbound",
          s3Key: recordingSid || callSid,
          s3Bucket: "twilio",
          duration: parseInt(duration),
          recordedAt: new Date(),
          status: "active",
          format: "wav",
          transcription: recordingUrl || null,
        });
      }

      // Send call status notification asynchronously
      if (user) {
        sendCallStatusNotification(user.firebaseUid, "completed", {
          callSid,
          from,
          to,
        }).catch((error) => {
          console.error("Failed to send call status notification:", error);
        });
      }
    } else if (callStatus === "no-answer") {
      console.log(`Call ${callSid} was not answered`);

      // Send missed call notification asynchronously
      if (user) {
        sendMissedCallNotification(user.firebaseUid, {
          callSid,
          from,
          to,
        }).catch((error) => {
          console.error("Failed to send missed call notification:", error);
        });
      }
    } else if (callStatus === "failed") {
      console.log(`Call ${callSid} failed`);

      // Send failed call notification asynchronously
      if (user) {
        sendCallStatusNotification(user.firebaseUid, "failed", {
          callSid,
          from,
          to,
        }).catch((error) => {
          console.error("Failed to send failed call notification:", error);
        });
      }
    } else if (callStatus === "busy") {
      console.log(`Call ${callSid} was busy`);

      // Send busy notification asynchronously
      if (user) {
        sendCallStatusNotification(user.firebaseUid, "busy", {
          callSid,
          from,
          to,
        }).catch((error) => {
          console.error("Failed to send busy call notification:", error);
        });
      }
    }

    return successResponse({
      message: "Status webhook processed",
    });
  } catch (error) {
    console.error("Status webhook error:", error);
    return errorResponse("Webhook processing failed", {
      status: 500,
      code: "WEBHOOK_STATUS_FAILED",
    });
  }
}
