import { signOut } from 'firebase/auth';
import { getAuthInstance } from '@/lib/firebase';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(_request) {
  try {
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

    // Sign out from Firebase
    await signOut(auth);

    return successResponse({
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse('Failed to logout', {
      status: 500,
      code: 'AUTH_LOGOUT_FAILED',
    });
  }
}
