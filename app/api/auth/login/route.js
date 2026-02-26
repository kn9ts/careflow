import { signInWithEmailAndPassword } from 'firebase/auth';
import { getAuthInstance } from '@/lib/firebase';
import { connectDB } from '@/lib/db';
import { getOrCreateUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { rateLimitAuth } from '@/lib/rateLimiter';
import { getAuthErrorMessageString } from '@/lib/authErrorMessages';

async function loginHandler(request) {
  try {
    // Connect to database
    await connectDB();

    // Get request body
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return errorResponse('Missing required fields: email and password', {
        status: 400,
        code: 'VALIDATION_ERROR',
      });
    }

    // Get Firebase auth instance - use getAuthInstance() for proper lazy initialization
    const auth = getAuthInstance();
    if (!auth) {
      return errorResponse(
        'Authentication service not available. Please ensure Firebase is properly configured.',
        {
          status: 500,
          code: 'AUTH_NOT_AVAILABLE',
        }
      );
    }

    // Authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    const { user } = userCredential;

    // Get or create user in database
    const dbUser = await getOrCreateUser(user.uid, user.email, user.displayName);

    return successResponse({
      message: 'Login successful',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: dbUser.role,
        twilioClientIdentity: dbUser.twilioClientIdentity,
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    // Use user-friendly error messages from authErrorMessages
    const userFriendlyError = getAuthErrorMessageString(error.code || 'unknown', error.message);

    // Determine status code based on error type
    let statusCode = 401;
    if (error.code?.includes('invalid') || error.code?.includes('missing')) {
      statusCode = 400; // Bad request for validation errors
    } else if (error.code?.includes('disabled') || error.code?.includes('deactivated')) {
      statusCode = 403; // Forbidden
    } else if (error.code?.includes('too-many-requests')) {
      statusCode = 429; // Too many requests
    } else if (error.code?.includes('not-available') || error.code?.includes('internal')) {
      statusCode = 500; // Internal server error
    }

    return errorResponse(userFriendlyError, {
      status: statusCode,
      code: error.code || 'AUTH_LOGIN_FAILED',
    });
  }
}

export const POST = rateLimitAuth(loginHandler);
