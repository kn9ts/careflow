/**
 * User Settings API
 *
 * GET: Retrieve current user settings
 * PATCH: Update user settings
 */

import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { requireAuth } from '@/lib/auth';
import User from '@/models/User';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Default settings for new users or reset
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
 * GET /api/users/settings
 * Retrieve current user settings
 */
export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return auth.error ? errorResponse(auth.error, { status: auth.status || 401 }) : auth;
    }

    await connectDB();
    const user = await User.findOne({ firebaseUid: auth.user.firebaseUid });

    if (!user) {
      return errorResponse('User not found', { status: 404, code: 'USER_NOT_FOUND' });
    }

    // Merge with defaults to ensure all fields are present
    const settings = {
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(user.notifications?.toObject?.() || user.notifications || {}),
      },
      audio: {
        ...DEFAULT_SETTINGS.audio,
        ...(user.audio?.toObject?.() || user.audio || {}),
      },
      display: {
        ...DEFAULT_SETTINGS.display,
        ...(user.display?.toObject?.() || user.display || {}),
      },
    };

    return successResponse({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return errorResponse('Failed to fetch settings', { status: 500, code: 'SETTINGS_FETCH_ERROR' });
  }
}

/**
 * PATCH /api/users/settings
 * Update user settings
 */
export async function PATCH(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return auth.error ? errorResponse(auth.error, { status: auth.status || 401 }) : auth;
    }

    const body = await request.json();
    const { notifications, audio, display } = body;

    // Validate settings
    const errors = [];

    // Validate notifications
    if (notifications) {
      if (notifications.soundVolume !== undefined) {
        const vol = Number(notifications.soundVolume);
        if (isNaN(vol) || vol < 0 || vol > 100) {
          errors.push('Sound volume must be between 0 and 100');
        }
      }
    }

    // Validate audio
    if (audio) {
      if (audio.inputDevice && typeof audio.inputDevice !== 'string') {
        errors.push('Invalid input device');
      }
      if (audio.outputDevice && typeof audio.outputDevice !== 'string') {
        errors.push('Invalid output device');
      }
    }

    // Validate display
    if (display) {
      const validDateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
      if (display.dateFormat && !validDateFormats.includes(display.dateFormat)) {
        errors.push('Invalid date format');
      }
      const validTimeFormats = ['12h', '24h'];
      if (display.timeFormat && !validTimeFormats.includes(display.timeFormat)) {
        errors.push('Invalid time format');
      }
      if (display.timezone && typeof display.timezone !== 'string') {
        errors.push('Invalid timezone');
      }
    }

    if (errors.length > 0) {
      return errorResponse('Validation failed', {
        status: 400,
        code: 'VALIDATION_ERROR',
        details: errors,
      });
    }

    await connectDB();
    const user = await User.findOne({ firebaseUid: auth.user.firebaseUid });

    if (!user) {
      return errorResponse('User not found', { status: 404, code: 'USER_NOT_FOUND' });
    }

    // Build update object - only update provided fields
    const updateData = { updatedAt: new Date() };

    if (notifications) {
      updateData.notifications = {
        ...(user.notifications?.toObject?.() ||
          user.notifications ||
          DEFAULT_SETTINGS.notifications),
        ...notifications,
      };
    }

    if (audio) {
      updateData.audio = {
        ...(user.audio?.toObject?.() || user.audio || DEFAULT_SETTINGS.audio),
        ...audio,
      };
    }

    if (display) {
      updateData.display = {
        ...(user.display?.toObject?.() || user.display || DEFAULT_SETTINGS.display),
        ...display,
      };
    }

    // Update user
    const updatedUser = await User.findOneAndUpdate(
      { firebaseUid: auth.user.firebaseUid },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Return updated settings
    const settings = {
      notifications: updatedUser.notifications,
      audio: updatedUser.audio,
      display: updatedUser.display,
    };

    return successResponse({
      settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return errorResponse('Failed to update settings', {
      status: 500,
      code: 'SETTINGS_UPDATE_ERROR',
    });
  }
}
