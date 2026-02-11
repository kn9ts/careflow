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

export async function GET(request) {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    const authError = handleAuthResult(auth);
    if (authError) return authError;

    // Connect to database
    await connectDB();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const type = searchParams.get("type"); // 'call' or 'voicemail'

    // Build query (only user's own recordings)
    const query = { firebaseUid: auth.user.firebaseUid };
    if (type) query.type = type;

    // Fetch recordings with pagination
    const recordings = await Recording.find(query)
      .sort({ recordedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Recording.countDocuments(query);

    return successResponse({
      calls: recordings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Calls history error:", error);
    return errorResponse("Failed to fetch call history", {
      status: 500,
      code: "CALL_HISTORY_FAILED",
    });
  }
}
