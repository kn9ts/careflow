import { Twilio } from "twilio";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleAuthResult,
} from "@/lib/apiResponse";
import { lookupCare4wId } from "@/lib/careFlowIdGenerator";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

// Force dynamic rendering - this route uses request.headers for auth
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    const authError = handleAuthResult(auth);
    if (authError) return authError;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

    // Check if Twilio credentials are available
    const twilioAvailable = !!(
      accountSid &&
      apiKey &&
      apiSecret &&
      twimlAppSid
    );

    // Get user's care4wId from database
    await connectDB();
    const user = await User.findOne({ firebaseUid: auth.user.uid });
    const care4wId = user?.care4wId || null;

    // If Twilio is available, return Twilio token
    if (twilioAvailable) {
      const client = new Twilio(apiKey, apiSecret, { accountSid });
      const identity = auth.user.twilioClientIdentity;

      const token = new client.jwt.AccessToken(accountSid, apiKey, apiSecret, {
        identity,
      });

      const voiceGrant = new client.jwt.AccessToken.VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: true,
      });

      token.addGrant(voiceGrant);

      return successResponse({
        token: token.toJwt(),
        identity,
        mode: "twilio",
        care4wId,
      });
    }

    // WebRTC fallback mode
    // Return minimal data for WebRTC mode (no Twilio token needed)
    return successResponse({
      token: null,
      identity: null,
      mode: "webrtc",
      care4wId,
      message: "WebRTC mode active - use care4w- IDs for calls",
    });
  } catch (error) {
    console.error("Error in token endpoint:", error);
    return errorResponse("Failed to generate token", {
      status: 500,
      code: "TOKEN_ERROR",
    });
  }
}
