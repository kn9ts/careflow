import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Import validation utilities
import { isValidEmail, isValidDisplayName, isValidCare4wId } from './careFlowIdValidator';
import { generateCare4wId } from './careFlowIdGenerator';

// Re-export comprehensive auth error messages
export {
  AUTH_ERROR_MESSAGES,
  DEFAULT_AUTH_ERROR,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
  AUTH_ERROR_HTTP_STATUS,
  getAuthErrorMessage,
  getAuthErrorMessageString,
  getAuthErrorShortMessage,
  isAuthErrorRetryable,
  doesAuthErrorRequireUserAction,
  getAuthErrorNextSteps,
  getAuthErrorHttpStatus,
} from './authErrorMessages';

// Lazy initialization for Firebase Admin
let adminAuth = null;

/**
 * Error codes for authentication operations
 * @deprecated Use AUTH_ERROR_MESSAGES from './authErrorMessages' instead
 */
export const AUTH_ERROR_CODES = {
  USER_NOT_FOUND: 'auth/user-not-found',
  WRONG_PASSWORD: 'auth/wrong-password',
  INVALID_EMAIL: 'auth/invalid-email',
  EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',
  WEAK_PASSWORD: 'auth/weak-password',
  OPERATION_NOT_ALLOWED: 'auth/operation-not-allowed',
  REQUIRES_RECENT_LOGIN: 'auth/requires-recent-login',
  UID_ALREADY_EXISTS: 'auth/uid-already-exists',
};

/**
 * Validate user registration input
 */
export function validateRegistrationInput(data) {
  const errors = [];

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.displayName || !isValidDisplayName(data.displayName)) {
    errors.push('Display name must be between 2 and 50 characters');
  }

  if (!data.password || data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (data.care4wId && !isValidCare4wId(data.care4wId)) {
    errors.push('Invalid care4wId format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function getAdminAuth() {
  if (!adminAuth) {
    // Check if environment variables are available
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase Admin credentials not configured. Please set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY environment variables.'
      );
    }

    // Format private key properly
    const formattedKey = privateKey.includes('-----BEGIN PRIVATE KEY-----')
      ? privateKey
      : privateKey.replace(/\\n/g, '\n');

    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
      });
    }

    adminAuth = getAuth();
  }

  return adminAuth;
}

/**
 * Verify Firebase ID token and return user info
 */
export async function verifyAuthToken(request) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Unauthorized - No token provided', status: 401 };
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
      success: true,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return { error: 'Invalid or expired token', status: 401 };
  }
}

/**
 * Get or create user in database
 */
export async function getOrCreateUser(firebaseUid, email, displayName, options = {}) {
  try {
    const { connectDB } = await import('@/lib/db');
    await connectDB();

    const User = (await import('@/models/User')).default;

    let user = await User.findOne({ firebaseUid });

    if (!user) {
      // Generate unique Twilio client identity
      const twilioClientIdentity = `user-${firebaseUid.slice(0, 8)}-${Date.now()}`;

      // Use provided care4wId or generate one using the proper generator
      let care4wId = options.care4wId;
      let sequenceNumber = options.sequenceNumber;

      if (!care4wId) {
        try {
          const generated = await generateCare4wId();
          care4wId = generated.care4wId;
          sequenceNumber = generated.sequenceNumber;
        } catch (genError) {
          // Fallback to timestamp-based generation if generator fails
          console.warn('Failed to generate care4wId, using fallback:', genError.message);
          care4wId = `care4w-${Date.now().toString().slice(-7)}`;
          sequenceNumber = Date.now();
        }
      }

      user = await User.create({
        firebaseUid,
        email,
        displayName: displayName || email.split('@')[0],
        twilioClientIdentity,
        care4wId,
        sequenceNumber,
        role: 'user',
        isActive: true,
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user profile');
  }
}

/**
 * Check if user is authenticated and active
 */
export async function requireAuth(request) {
  const auth = await verifyAuthToken(request);

  if (!auth.success) {
    return { error: auth.error, status: auth.status };
  }

  try {
    const { connectDB } = await import('@/lib/db');
    await connectDB();

    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ firebaseUid: auth.uid });

    if (!user) {
      return { error: 'User not found', status: 404 };
    }

    if (!user.isActive) {
      return { error: 'Account is deactivated', status: 403 };
    }

    return {
      success: true,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        care4wId: user.care4wId,
        role: user.role,
        twilioClientIdentity: user.twilioClientIdentity,
      },
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return { error: 'Authentication failed', status: 500 };
  }
}

/**
 * Check if user has admin role
 */
export async function requireAdmin(request) {
  const authResult = await requireAuth(request);

  if (!authResult.success) {
    return authResult;
  }

  if (authResult.user.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return authResult;
}
