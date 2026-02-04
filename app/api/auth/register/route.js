import { connectDB } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";

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

    // Create or get user
    const user = await getOrCreateUser(firebaseUid, email, displayName);

    return successResponse({
      message: "User profile created successfully",
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
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
