import { Twilio } from "twilio";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleAuthResult,
} from "@/lib/apiResponse";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    const authError = handleAuthResult(auth);
    if (authError) return authError;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      return errorResponse("Missing Twilio environment variables", {
        status: 500,
        code: "TWILIO_CONFIG_MISSING",
      });
    }

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
    });
  } catch (error) {
    console.error("Error generating Twilio token:", error);
    return errorResponse("Failed to generate token", {
      status: 500,
      code: "TWILIO_TOKEN_ERROR",
    });
  }
}
