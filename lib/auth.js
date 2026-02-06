import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin (server-side only)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

/**
 * Verify Firebase ID token and return user info
 */
export async function verifyAuthToken(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { error: "Unauthorized - No token provided", status: 401 };
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
      success: true,
    };
  } catch (error) {
    console.error("Token verification error:", error);
    return { error: "Invalid or expired token", status: 401 };
  }
}

/**
 * Get or create user in database
 */
export async function getOrCreateUser(
  firebaseUid,
  email,
  displayName,
  options = {},
) {
  try {
    const { connectDB } = await import("@/lib/db");
    await connectDB();

    const User = (await import("@/models/User")).default;

    let user = await User.findOne({ firebaseUid });

    if (!user) {
      // Generate unique Twilio client identity
      const twilioClientIdentity = `user-${firebaseUid.slice(0, 8)}-${Date.now()}`;

      // Use provided care4wId or generate one
      const care4wId =
        options.care4wId || `care4w-${Date.now().toString().slice(-7)}`;
      const sequenceNumber = options.sequenceNumber || Date.now();

      user = await User.create({
        firebaseUid,
        email,
        displayName: displayName || email.split("@")[0],
        twilioClientIdentity,
        care4wId,
        sequenceNumber,
        role: "user",
        isActive: true,
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Failed to create user profile");
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
    const { connectDB } = await import("@/lib/db");
    await connectDB();

    const User = (await import("@/models/User")).default;
    const user = await User.findOne({ firebaseUid: auth.uid });

    if (!user) {
      return { error: "User not found", status: 404 };
    }

    if (!user.isActive) {
      return { error: "Account is deactivated", status: 403 };
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
    console.error("Auth check error:", error);
    return { error: "Authentication failed", status: 500 };
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

  if (authResult.user.role !== "admin") {
    return { error: "Admin access required", status: 403 };
  }

  return authResult;
}
