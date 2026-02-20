/**
 * Phone Number Check API
 *
 * POST: Check if a phone number is unique and available
 */

import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { requireAuth } from '@/lib/auth';
import { parsePhoneNumber } from '@/lib/phoneUtils';
import User from '@/models/User';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/users/phone/check
 * Check if a phone number is unique and available for use
 *
 * Request body:
 * - phoneNumber: Phone number to check (any format)
 * - countryCode: Optional country code for parsing (default: 254)
 */
export async function POST(request) {
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

    // Check if the national number already exists
    const existingUser = await User.findOne({
      'personalPhoneNumber.national': parsed.national,
    });

    // If the number belongs to the current user, it's available (for updates)
    if (existingUser && existingUser.firebaseUid !== auth.user.firebaseUid) {
      return successResponse({
        available: false,
        message: 'This phone number is already registered by another user',
        parsed: {
          full: parsed.full,
          national: parsed.national,
          countryCode: parsed.countryCode,
        },
      });
    }

    return successResponse({
      available: true,
      message: 'Phone number is available',
      parsed: {
        full: parsed.full,
        national: parsed.national,
        countryCode: parsed.countryCode,
      },
    });
  } catch (error) {
    console.error('Phone check error:', error);
    return errorResponse('Failed to check phone number', {
      status: 500,
      code: 'PHONE_CHECK_ERROR',
    });
  }
}
