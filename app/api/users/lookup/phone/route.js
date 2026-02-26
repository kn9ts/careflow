/**
 * User Lookup by Phone API
 *
 * GET: Look up a user by their personal phone number and return their care4wId
 * Used for WebRTC call routing when Twilio is not active
 */

import { connectDB } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { requireAuth } from '@/lib/auth';
import { parsePhoneNumber } from '@/lib/phoneUtils';
import User from '@/models/User';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/users/lookup/phone?phoneNumber=+254712345678
 * Look up a user by their personal phone number
 *
 * Query params:
 * - phoneNumber: Phone number to look up (any format)
 * - countryCode: Optional country code for parsing (default: 254)
 */
export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return auth.error ? errorResponse(auth.error, { status: auth.status || 401 }) : auth;
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');
    const countryCode = searchParams.get('countryCode') || '254';

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

    // Find user by national number (unique across all users)
    const user = await User.findOne({
      'personalPhoneNumber.national': parsed.national,
    }).select('care4wId displayName personalPhoneNumber firebaseUid');

    if (!user) {
      return successResponse({
        exists: false,
        phoneNumber: parsed.full,
        message: 'No user found with this phone number',
      });
    }

    // Don't allow looking up yourself
    if (user.care4wId === auth.user.care4wId) {
      return successResponse({
        exists: true,
        isSelf: true,
        care4wId: user.care4wId,
        firebaseUid: user.firebaseUid,
        displayName: user.displayName,
        message: 'This is your own phone number',
      });
    }

    return successResponse({
      exists: true,
      care4wId: user.care4wId,
      firebaseUid: user.firebaseUid,
      displayName: user.displayName,
      message: 'User found',
    });
  } catch (error) {
    console.error('Phone lookup error:', error);
    return errorResponse('Failed to look up phone number', {
      status: 500,
      code: 'LOOKUP_ERROR',
    });
  }
}
