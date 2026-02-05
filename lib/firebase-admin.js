/**
 * Firebase Client-Side Configuration
 *
 * Only initializes client-side Firebase SDK.
 * This file should NOT be imported in server-side code.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { getMessaging } from "firebase-admin/messaging";

let adminApp = null;
let adminAuth = null;
let adminStorage = null;
let adminMessaging = null;
let initialized = false;

function initializeFirebaseAdmin() {
  if (initialized) {
    return {
      app: adminApp,
      auth: adminAuth,
      storage: adminStorage,
      messaging: adminMessaging,
    };
  }

  // Skip if not on server
  if (typeof window !== "undefined") {
    return { app: null, auth: null, storage: null, messaging: null };
  }

  try {
    if (
      !process.env.FIREBASE_ADMIN_PROJECT_ID ||
      !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
      !process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ) {
      console.warn("Firebase Admin SDK credentials not configured");
      return { app: null, auth: null, storage: null, messaging: null };
    }

    if (!getApps().length) {
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
            /\\n/g,
            "\n",
          ),
        }),
      });
    } else {
      adminApp = getApps()[0];
    }
    adminAuth = getAuth(adminApp);
    adminStorage = getStorage(adminApp);

    try {
      adminMessaging = getMessaging(adminApp);
    } catch (error) {
      console.warn("Firebase Admin Messaging not available:", error.message);
      adminMessaging = null;
    }

    initialized = true;
  } catch (error) {
    console.warn("Firebase Admin SDK initialization failed:", error.message);
  }

  return {
    app: adminApp,
    auth: adminAuth,
    storage: adminStorage,
    messaging: adminMessaging,
  };
}

export {
  initializeFirebaseAdmin,
  adminApp,
  adminAuth,
  adminStorage,
  adminMessaging,
};
