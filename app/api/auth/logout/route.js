import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(_request) {
  try {
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
