import { connectDB } from "@/lib/db";
import Recording from "@/models/Recording";
import User from "@/models/User";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { sendVoicemailNotification } from "@/lib/notifications";

export async function POST(request) {
  try {
    // Connect to database
    await connectDB();

    // Parse form data from Twilio webhook
    const formData = await request.formData();
    const callSid = formData.get("CallSid");
    const recordingSid = formData.get("RecordingSid");
    const recordingUrl = formData.get("RecordingUrl");
    const recordingDuration = formData.get("RecordingDuration");
    const from = formData.get("From");
    const to = formData.get("To");
    const callerName = formData.get("CallerName");
    const transcriptionText = formData.get("TranscriptionText");

    console.log(`Voicemail received: ${callSid} from ${from}`);

    // Find the user associated with this voicemail
    const user = await User.findOne({ twilioPhoneNumber: to });

    if (!user) {
      console.error(`No user found for phone number: ${to}`);
      return successResponse({
        message: "Voicemail webhook processed (no user)",
      });
    }

    // Check if recording already exists
    const existingRecording = await Recording.findOne({
      sid: recordingSid || callSid,
    });

    if (existingRecording) {
      console.log(`Recording ${recordingSid || callSid} already exists`);
      return successResponse({
        message: "Voicemail webhook processed (recording exists)",
      });
    }

    // Create voicemail recording
    const voicemail = await Recording.create({
      userId: user._id,
      firebaseUid: user.firebaseUid,
      type: "voicemail",
      sid: recordingSid || callSid,
      callSid,
      from,
      to,
      direction: "inbound",
      s3Key: recordingSid || callSid,
      s3Bucket: "twilio",
      duration: parseInt(recordingDuration) || 0,
      recordedAt: new Date(),
      status: "active",
      format: "wav",
      transcription: transcriptionText || null,
      callerLocation: callerName || null,
    });

    console.log(`Voicemail created: ${voicemail._id}`);

    // Send voicemail notification asynchronously
    sendVoicemailNotification(user.firebaseUid, {
      recordingSid: recordingSid || callSid,
      callSid,
      from,
      to,
      duration: parseInt(recordingDuration) || 0,
    }).catch((error) => {
      console.error("Failed to send voicemail notification:", error);
    });

    return successResponse({
      message: "Voicemail webhook processed",
      voicemailId: voicemail._id,
    });
  } catch (error) {
    console.error("Voicemail webhook error:", error);
    return errorResponse("Webhook processing failed", {
      status: 500,
      code: "WEBHOOK_VOICEMAIL_FAILED",
    });
  }
}
