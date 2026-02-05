/**
 * Firebase Client-Side Configuration
 *
 * Only initializes client-side Firebase SDK.
 * This file should NOT be imported in API routes (server-side).
 */

import {
  initializeApp,
  getApps,
  getAuth,
  getStorage,
  getMessaging,
} from "firebase/app";
import { isSupported } from "firebase/auth";

// Client-side Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app = null;
let auth = null;
let storage = null;
let messaging = null;
let initialized = false;

async function initializeFirebase() {
  if (initialized || typeof window === "undefined") {
    return { app, auth, storage, messaging };
  }

  try {
    // Validate config
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
      console.warn("Firebase config not complete");
      return { app: null, auth: null, storage: null, messaging: null };
    }

    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    auth = getAuth(app);
    storage = getStorage(app);

    // Check if messaging is supported
    const isMessagingSupported = await isSupported();
    if (isMessagingSupported) {
      try {
        messaging = getMessaging(app);
      } catch (error) {
        console.warn("Firebase Messaging not available:", error.message);
        messaging = null;
      }
    } else {
      console.warn("Firebase Messaging not supported in this browser");
      messaging = null;
    }

    initialized = true;
  } catch (error) {
    console.warn("Firebase initialization failed:", error.message);
  }

  return { app, auth, storage, messaging };
}

// Export functions and objects
export { initializeFirebase, app, auth, storage, messaging };

// Also export signOut for compatibility
export { signOut } from "firebase/auth";

// Notification helper functions
export const requestNotificationPermission = async () => {
  if (typeof window === "undefined" || !messaging) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      return permission;
    }
    return null;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return null;
  }
};

export const getFCMToken = async (vapidKey) => {
  if (typeof window === "undefined" || !messaging) {
    return null;
  }

  try {
    return await getToken(messaging, { vapidKey });
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

export const onMessageListener = (callback) => {
  if (typeof window === "undefined" || !messaging) {
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};
