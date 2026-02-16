/**
 * Token Generation API Route
 *
 * Generates Twilio access tokens for authenticated users or returns
 * WebRTC mode configuration when Twilio is not available.
 *
 * IMPROVEMENTS:
 * - Better error handling with specific error messages
 * - Graceful fallback to WebRTC mode
 * - Environment variable validation
 * - Detailed logging for debugging
 */

import AccessToken from 'twilio/lib/jwt/AccessToken';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse, handleAuthResult } from '@/lib/apiResponse';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { logger } from '@/lib/logger';

// Force dynamic rendering - this route uses request.headers for auth
export const dynamic = 'force-dynamic';

/**
 * Check if Twilio credentials are properly configured
 * @returns {{available: boolean, missing: string[]}}
 */
function checkTwilioCredentials() {
  const required = [
    { key: 'TWILIO_ACCOUNT_SID', value: process.env.TWILIO_ACCOUNT_SID },
    { key: 'TWILIO_API_KEY', value: process.env.TWILIO_API_KEY },
    { key: 'TWILIO_API_SECRET', value: process.env.TWILIO_API_SECRET },
    { key: 'TWILIO_TWIML_APP_SID', value: process.env.TWILIO_TWIML_APP_SID },
  ];

  const missing = required.filter(({ value }) => !value || value.includes('your_'));

  return {
    available: missing.length === 0,
    missing: missing.map(({ key }) => key),
  };
}

/**
 * Validate Twilio credentials format
 * @param {Object} credentials - Twilio credentials object
 * @returns {{valid: boolean, error?: string}}
 */
function validateTwilioCredentials(credentials) {
  const { accountSid, apiKey, apiSecret, twimlAppSid } = credentials;

  // Validate Account SID format
  if (accountSid && !accountSid.startsWith('AC')) {
    return { valid: false, error: 'Invalid TWILIO_ACCOUNT_SID format' };
  }

  // Validate API Key format
  if (apiKey && !apiKey.startsWith('SK')) {
    return { valid: false, error: 'Invalid TWILIO_API_KEY format' };
  }

  // Validate TwiML App SID format
  if (twimlAppSid && !twimlAppSid.startsWith('AP')) {
    return { valid: false, error: 'Invalid TWILIO_TWIML_APP_SID format' };
  }

  return { valid: true };
}

/**
 * Generate Twilio access token
 * @param {Object} options - Token generation options
 * @returns {{token: string, identity: string}}
 */
function generateTwilioToken(options) {
  const { accountSid, apiKey, apiSecret, twimlAppSid, identity } = options;

  // Create AccessToken directly using the imported class
  const token = new AccessToken(accountSid, apiKey, apiSecret, {
    identity,
    ttl: 3600, // 1 hour
  });

  // Create Voice grant
  const VoiceGrant = AccessToken.VoiceGrant;
  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: true,
  });

  token.addGrant(voiceGrant);

  return {
    token: token.toJwt(),
    identity,
  };
}

/**
 * GET /api/token
 * Returns token info for call mode determination
 */
export async function GET(request) {
  const requestId = `token-${Date.now()}`;
  logger.loading('TokenAPI', `[${requestId}] Processing token request...`);

  try {
    // Step 1: Authenticate the request
    const auth = await requireAuth(request);
    const authError = handleAuthResult(auth);

    if (authError) {
      logger.warn('TokenAPI', `[${requestId}] Authentication failed`);
      return authError;
    }

    logger.success('TokenAPI', `[${requestId}] User authenticated: ${auth.user.uid}`);

    // Step 2: Check Twilio credentials
    const { available: twilioAvailable, missing: missingCredentials } = checkTwilioCredentials();

    if (!twilioAvailable) {
      logger.warn(
        'TokenAPI',
        `[${requestId}] Twilio not available, missing: ${missingCredentials.join(', ')}`
      );
    }

    // Step 3: Get user's care4wId from database
    let care4wId = null;
    try {
      await connectDB();
      const user = await User.findOne({ firebaseUid: auth.user.uid });
      care4wId = user?.care4wId || null;

      if (care4wId) {
        logger.success('TokenAPI', `[${requestId}] Found care4wId: ${care4wId}`);
      } else {
        // Generate care4wId if not exists
        logger.warn('TokenAPI', `[${requestId}] No care4wId found, generating one...`);
        const { generateCare4wId } = await import('@/lib/careFlowIdGenerator');
        const generated = await generateCare4wId();
        care4wId = generated.care4wId;

        // Update user with new care4wId
        if (user) {
          user.care4wId = care4wId;
          user.sequenceNumber = generated.sequenceNumber;
          await user.save();
          logger.success('TokenAPI', `[${requestId}] Generated and saved care4wId: ${care4wId}`);
        }
      }
    } catch (dbError) {
      logger.error('TokenAPI', `[${requestId}] Database error: ${dbError.message}`);
      // Continue without care4wId - not a fatal error
    }

    // Step 4: Handle Twilio mode
    if (twilioAvailable) {
      const credentials = {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        apiKey: process.env.TWILIO_API_KEY,
        apiSecret: process.env.TWILIO_API_SECRET,
        twimlAppSid: process.env.TWILIO_TWIML_APP_SID,
      };

      // Validate credentials format
      const validation = validateTwilioCredentials(credentials);
      if (!validation.valid) {
        logger.error(
          'TokenAPI',
          `[${requestId}] Credential validation failed: ${validation.error}`
        );
        // Fall back to WebRTC mode
        return successResponse({
          token: null,
          identity: null,
          mode: 'webrtc',
          care4wId,
          message: 'Twilio credentials invalid. Using WebRTC mode.',
          warning: validation.error,
        });
      }

      try {
        const identity = auth.user.twilioClientIdentity || auth.user.uid;

        const { token, identity: tokenIdentity } = generateTwilioToken({
          ...credentials,
          identity,
        });

        logger.success('TokenAPI', `[${requestId}] Twilio token generated for: ${tokenIdentity}`);

        return successResponse({
          token,
          identity: tokenIdentity,
          mode: 'twilio',
          care4wId,
        });
      } catch (tokenError) {
        logger.error('TokenAPI', `[${requestId}] Token generation failed: ${tokenError.message}`);

        // Fall back to WebRTC mode
        return successResponse({
          token: null,
          identity: null,
          mode: 'webrtc',
          care4wId,
          message: 'Twilio token generation failed. Using WebRTC mode.',
          warning: tokenError.message,
        });
      }
    }

    // Step 5: WebRTC fallback mode
    logger.info('TokenAPI', `[${requestId}] Using WebRTC mode`);

    return successResponse({
      token: null,
      identity: null,
      mode: 'webrtc',
      care4wId,
      message: 'WebRTC mode active - use care4w- IDs for calls',
    });
  } catch (error) {
    logger.error('TokenAPI', `[${requestId}] Unexpected error: ${error.message}`);
    console.error('Error in token endpoint:', error);

    // Determine appropriate error response
    let statusCode = 500;
    let errorCode = 'TOKEN_ERROR';
    let errorMessage = 'Failed to generate token';

    if (error.message.includes('authentication') || error.message.includes('auth')) {
      statusCode = 401;
      errorCode = 'AUTH_ERROR';
      errorMessage = 'Authentication failed';
    } else if (error.message.includes('database') || error.message.includes('mongo')) {
      statusCode = 503;
      errorCode = 'DATABASE_ERROR';
      errorMessage = 'Database temporarily unavailable';
    }

    return errorResponse(errorMessage, {
      status: statusCode,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
