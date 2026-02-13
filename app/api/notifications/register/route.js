import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import User from '@/models/User';
import { successResponse, errorResponse, handleAuthResult } from '@/lib/apiResponse';

// Force dynamic rendering - this route uses request.headers for auth
export const dynamic = 'force-dynamic';

// POST /api/notifications/register - Register FCM token for push notifications
export async function POST(request) {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    const authError = handleAuthResult(auth);
    if (authError) return authError;

    // Connect to database
    await connectDB();

    const { fcmToken, deviceInfo } = await request.json();
    const { firebaseUid } = auth.user;

    if (!fcmToken) {
      return errorResponse('FCM token is required', {
        status: 400,
        code: 'MISSING_FCM_TOKEN',
      });
    }

    // Find user and update/add FCM token
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return errorResponse('User not found', {
        status: 404,
        code: 'USER_NOT_FOUND',
      });
    }

    // Initialize notificationTokens array if it doesn't exist
    if (!user.notificationTokens) {
      user.notificationTokens = [];
    }

    // Check if token already exists
    const existingTokenIndex = user.notificationTokens.findIndex((t) => t.token === fcmToken);

    const tokenData = {
      token: fcmToken,
      deviceInfo: deviceInfo || {
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date(),
      },
      registeredAt: new Date(),
    };

    if (existingTokenIndex >= 0) {
      // Update existing token
      user.notificationTokens[existingTokenIndex] = tokenData;
    } else {
      // Add new token
      user.notificationTokens.push(tokenData);
    }

    await user.save();

    return successResponse({
      message: 'Notification token registered successfully',
      tokenCount: user.notificationTokens.length,
    });
  } catch (error) {
    console.error('Notification registration error:', error);
    return errorResponse('Failed to register notification token', {
      status: 500,
      code: 'NOTIFICATION_REGISTRATION_FAILED',
    });
  }
}

// DELETE /api/notifications/unregister - Unregister FCM token
export async function DELETE(request) {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    const authError = handleAuthResult(auth);
    if (authError) return authError;

    // Connect to database
    await connectDB();

    const { fcmToken } = await request.json();
    const { firebaseUid } = auth.user;

    if (!fcmToken) {
      return errorResponse('FCM token is required', {
        status: 400,
        code: 'MISSING_FCM_TOKEN',
      });
    }

    // Find user and remove FCM token
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return errorResponse('User not found', {
        status: 404,
        code: 'USER_NOT_FOUND',
      });
    }

    if (user.notificationTokens) {
      user.notificationTokens = user.notificationTokens.filter((t) => t.token !== fcmToken);
      await user.save();
    }

    return successResponse({
      message: 'Notification token unregistered successfully',
      tokenCount: user.notificationTokens?.length || 0,
    });
  } catch (error) {
    console.error('Notification unregistration error:', error);
    return errorResponse('Failed to unregister notification token', {
      status: 500,
      code: 'NOTIFICATION_UNREGISTRATION_FAILED',
    });
  }
}
