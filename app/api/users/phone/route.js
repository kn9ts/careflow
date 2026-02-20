/**
 * User Phone Number API
 *
 * GET: Get current user's phone number
 * PATCH: Update user's personal phone number
 */

import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { requireAuth } from '@/lib/auth';
import { parsePhoneNumber } from '@/lib/phoneUtils';
import User from '@/models/User';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/users/phone
 * Get current user's phone number status
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

    return successResponse({
      hasPhoneNumber: !!user.personalPhoneNumber?.full,
      phoneNumber: user.personalPhoneNumber?.full || null,
      national: user.personalPhoneNumber?.national || null,
      countryCode: user.personalPhoneNumber?.countryCode || null,
    });
  } catch (error) {
    console.error('Phone fetch error:', error);
    return errorResponse('Failed to fetch phone number', {
      status: 500,
      code: 'PHONE_FETCH_ERROR',
    });
  }
}

/**
 * PATCH /api/users/phone
 * Update user's personal phone number
 *
 * Request body:
 * - phoneNumber: Phone number to set (any format)
 * - countryCode: Optional country code for parsing (default: 254)
 */
export async function PATCH(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return auth.error ? errorResponse(auth.error, { status: auth.status || 401 }) : auth;
    }

    const body = await request.json();
    const { phoneNumber, countryCode = '254' } = body;

    if (!phoneNumber) {
      return errorResponse('Phone number is required', {
        status: 400,
        code: 'VALIDATION_ERROR',
      });
    }

    // Parse and validate the phone number
    const parsed = parsePhoneNumber(phoneNumber, countryCode);

    if (!parsed.valid) {
      return errorResponse(parsed.error || 'Invalid phone number format', {
        status: 400,
        code: 'INVALID_PHONE',
      });
    }

    await connectDB();

    // Check if the national number already exists for another user
    const existingUser = await User.findOne({
      'personalPhoneNumber.national': parsed.national,
      firebaseUid: { $ne: auth.user.firebaseUid },
    });

    if (existingUser) {
      return errorResponse('This phone number is already registered by another user', {
        status: 409,
        code: 'PHONE_ALREADY_EXISTS',
      });
    }

    // Update the user's phone number
    const updatedUser = await User.findOneAndUpdate(
      { firebaseUid: auth.user.firebaseUid },
      {
        $set: {
          'personalPhoneNumber.full': parsed.full,
          'personalPhoneNumber.national': parsed.national,
          'personalPhoneNumber.countryCode': parsed.countryCode,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return errorResponse('User not found', { status: 404, code: 'USER_NOT_FOUND' });
    }

    return successResponse({
      message: 'Phone number updated successfully',
      phoneNumber: {
        full: updatedUser.personalPhoneNumber.full,
        national: updatedUser.personalPhoneNumber.national,
        countryCode: updatedUser.personalPhoneNumber.countryCode,
      },
    });
  } catch (error) {
    console.error('Phone update error:', error);

    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      return errorResponse('This phone number is already registered by another user', {
        status: 409,
        code: 'PHONE_ALREADY_EXISTS',
      });
    }

    return errorResponse('Failed to update phone number', {
      status: 500,
      code: 'PHONE_UPDATE_ERROR',
    });
  }
}

/**
 * DELETE /api/users/phone
 * Remove user's personal phone number
 */
export async function DELETE(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return auth.error ? errorResponse(auth.error, { status: auth.status || 401 }) : auth;
    }

    await connectDB();

    const updatedUser = await User.findOneAndUpdate(
      { firebaseUid: auth.user.firebaseUid },
      {
        $unset: {
          'personalPhoneNumber.full': '',
          'personalPhoneNumber.national': '',
          'personalPhoneNumber.countryCode': '',
        },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );

    if (!updatedUser) {
      return errorResponse('User not found', { status: 404, code: 'USER_NOT_FOUND' });
    }

    return successResponse({
      message: 'Phone number removed successfully',
    });
  } catch (error) {
    console.error('Phone delete error:', error);
    return errorResponse('Failed to remove phone number', {
      status: 500,
      code: 'PHONE_DELETE_ERROR',
    });
  }
}
