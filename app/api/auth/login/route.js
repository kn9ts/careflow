import { signInWithEmailAndPassword } from 'firebase/auth';
import { getAuthInstance } from '@/lib/firebase';
import { connectDB } from '@/lib/db';
import { getOrCreateUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(request) {
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

    // Handle specific Firebase auth errors
    let errorMessage = 'Login failed';
    const statusCode = 401;

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email address';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled';
    } else if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'An account with this email already exists. Please try logging in instead.';
    }

    return errorResponse(errorMessage, {
      status: statusCode,
      code: 'AUTH_LOGIN_FAILED',
    });
  }
}
