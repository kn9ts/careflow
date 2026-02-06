import { connectDB } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { generateCare4wId } from "@/lib/careFlowIdGenerator";

export async function POST(request) {
  try {
    // Connect to database
    await connectDB();

    // Get request body
    const body = await request.json();
    const { displayName, email, firebaseUid } = body;

    // Validate required fields
    if (!displayName || !email || !firebaseUid) {
      return errorResponse(
        "Missing required fields: displayName, email, firebaseUid",
        { status: 400, code: "VALIDATION_ERROR" },
      );
    }

    // Generate care4wId for WebRTC calls
    const { care4wId, sequenceNumber } = await generateCare4wId();

    // Create or get user with care4wId
    const user = await getOrCreateUser(firebaseUid, email, displayName, {
      care4wId,
      sequenceNumber,
    });

    return successResponse({
      message: "User profile created successfully",
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        care4wId: user.care4wId,
        twilioClientIdentity: user.twilioClientIdentity,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Auth register error:", error);
    return errorResponse("Failed to create user profile", {
      status: 500,
      code: "AUTH_REGISTER_FAILED",
    });
  }
}
