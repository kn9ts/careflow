/**
 * User Lookup API for WebRTC Calls
 *
 * Validates CareFlow User IDs and returns user information for WebRTC calls.
 */

import { connectDB } from "@/lib/db";
import { lookupCare4wId } from "@/lib/careFlowIdGenerator";
import { isValidCare4wId } from "@/lib/careFlowIdValidator";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    const authError = auth.error;
    if (authError) return authError;

    // Get the care4wId from query params
    const { searchParams } = new URL(request.url);
    const care4wId = searchParams.get("care4wId");

    if (!care4wId) {
      return errorResponse("Missing required parameter: care4wId", {
        status: 400,
        code: "VALIDATION_ERROR",
      });
    }

    // Validate format
    if (!isValidCare4wId(care4wId)) {
      return errorResponse(
        "Invalid CareFlow User ID format. Expected: care4w-XXXXXXX",
        {
          status: 400,
          code: "INVALID_FORMAT",
        },
      );
    }

    // Look up the user
    await connectDB();
    const userResult = await lookupCare4wId(care4wId);

    if (!userResult.exists) {
      return successResponse({
        exists: false,
        care4wId,
        message: "User not found",
      });
    }

    return successResponse({
      exists: true,
      care4wId,
      displayName: userResult.displayName,
      message: "User found",
    });
  } catch (error) {
    console.error("User lookup error:", error);
    return errorResponse("Failed to look up user", {
      status: 500,
      code: "LOOKUP_ERROR",
    });
  }
}
