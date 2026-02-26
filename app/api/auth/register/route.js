import { connectDB } from '@/lib/db';
import { getOrCreateUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { generateCare4wId } from '@/lib/careFlowIdGenerator';
import { rateLimitAuth } from '@/lib/rateLimiter';
import { getAuthErrorMessageString } from '@/lib/authErrorMessages';

async function registerHandler(request) {
  try {
    // Connect to database
    await connectDB();

    // Get request body
    const body = await request.json();
    const { displayName, email, firebaseUid } = body;

    // Validate required fields
    if (!displayName || !email || !firebaseUid) {
      return errorResponse('Missing required fields: displayName, email, firebaseUid', {
        status: 400,
        code: 'VALIDATION_ERROR',
      });
    }

    // Generate care4wId for WebRTC calls
    const { care4wId, sequenceNumber } = await generateCare4wId();

    // Create or get user with care4wId
    const user = await getOrCreateUser(firebaseUid, email, displayName, {
      care4wId,
      sequenceNumber,
    });

    return successResponse({
      message: 'User profile created successfully',
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
    console.error('Auth register error:', error);

    // Use user-friendly error messages from authErrorMessages
    const userFriendlyError = getAuthErrorMessageString(error.code || 'unknown', error.message);

    // Determine status code based on error type
    let statusCode = 500;
    if (
      error.code?.includes('invalid') ||
      error.code?.includes('missing') ||
      error.code?.includes('weak')
    ) {
      statusCode = 400; // Bad request for validation errors
    } else if (error.code?.includes('already-in-use') || error.code?.includes('already-exists')) {
      statusCode = 409; // Conflict
    }

    return errorResponse(userFriendlyError, {
      status: statusCode,
      code: error.code || 'AUTH_REGISTER_FAILED',
    });
  }
}

export const POST = rateLimitAuth(registerHandler);
