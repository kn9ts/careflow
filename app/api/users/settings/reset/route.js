/**
 * User Settings Reset API
 *
 * POST: Reset user settings to defaults
 */

import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { requireAuth } from '@/lib/auth';
import User from '@/models/User';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Default settings
const DEFAULT_SETTINGS = {
  notifications: {
    incomingCalls: true,
    missedCalls: true,
    voicemails: true,
    email: false,
    soundEnabled: true,
    soundVolume: 80,
  },
  audio: {
    inputDevice: 'default',
    outputDevice: 'default',
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  display: {
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
};

/**
 * POST /api/users/settings/reset
 * Reset user settings to defaults
 */
export async function POST(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return auth.error ? errorResponse(auth.error, { status: auth.status || 401 }) : auth;
    }

    // Optional: allow resetting specific categories
    let categoriesToReset = ['notifications', 'audio', 'display'];

    try {
      const body = await request.json();
      if (body.categories && Array.isArray(body.categories)) {
        categoriesToReset = body.categories.filter((c) =>
          ['notifications', 'audio', 'display'].includes(c)
        );
      }
    } catch {
      // No body provided, reset all
    }

    await connectDB();

    const updateData = { updatedAt: new Date() };

    if (categoriesToReset.includes('notifications')) {
      updateData.notifications = DEFAULT_SETTINGS.notifications;
    }
    if (categoriesToReset.includes('audio')) {
      updateData.audio = DEFAULT_SETTINGS.audio;
    }
    if (categoriesToReset.includes('display')) {
      updateData.display = DEFAULT_SETTINGS.display;
    }

    const updatedUser = await User.findOneAndUpdate(
      { firebaseUid: auth.user.firebaseUid },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return errorResponse('User not found', { status: 404, code: 'USER_NOT_FOUND' });
    }

    const settings = {
      notifications: updatedUser.notifications,
      audio: updatedUser.audio,
      display: updatedUser.display,
    };

    return successResponse({
      settings,
      message: 'Settings reset to defaults',
      resetCategories: categoriesToReset,
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    return errorResponse('Failed to reset settings', { status: 500, code: 'SETTINGS_RESET_ERROR' });
  }
}
