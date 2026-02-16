/**
 * Firebase Configuration Module
 *
 * FIXED: Uses lazy initialization with getter functions instead of direct exports
 * to prevent race conditions where exports are undefined at module load time.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, inMemoryPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Check if Firebase is configured
const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

// Singleton instances - initialized lazily
/* eslint-disable no-underscore-dangle */
let firebaseAppInstance = null;
let firebaseAuthInstance = null;
let firebaseStorageInstance = null;
let firebaseMessagingInstance = null;

/**
 * Check if running in browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get the Firebase app instance (initializes if needed)
 * @returns {import('firebase/app').FirebaseApp|null}
 */
export function getAppInstance() {
  if (!isBrowser) {
    return null; // SSR: Don't initialize on server
  }

  if (!firebaseAppInstance) {
    try {
      const apps = getApps();
      firebaseAppInstance = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    } catch (error) {
      console.error('Failed to initialize Firebase app:', error);
      return null;
    }
  }

  return firebaseAppInstance;
}

/**
 * Get the Firebase Auth instance (initializes if needed)
 * @returns {import('firebase/auth').Auth|null}
 */
export function getAuthInstance() {
  if (!isBrowser) {
    return null; // SSR: Don't initialize on server
  }

  if (!firebaseAuthInstance) {
    const app = getAppInstance();
    if (app) {
      try {
        firebaseAuthInstance = getAuth(app);
        // Use inMemoryPersistence for SSR compatibility
        firebaseAuthInstance.setPersistence(inMemoryPersistence).catch(() => {
          // Persistence setting failed, continue anyway
        });
      } catch (error) {
        console.error('Failed to initialize Firebase Auth:', error);
        return null;
      }
    }
  }

  return firebaseAuthInstance;
}

/**
 * Get the Firebase Storage instance
 * @returns {import('firebase/storage').FirebaseStorage|null}
 */
export function getStorageInstance() {
  if (!isBrowser) {
    return null;
  }

  if (!firebaseStorageInstance) {
    const app = getAppInstance();
    if (app) {
      try {
        firebaseStorageInstance = getStorage(app);
      } catch (error) {
        console.error('Failed to initialize Firebase Storage:', error);
        return null;
      }
    }
  }

  return firebaseStorageInstance;
}

/**
 * Get the Firebase Messaging instance (async)
 * @returns {Promise<import('firebase/messaging').Messaging|null>}
 */
export async function getMessagingInstance() {
  if (!isBrowser) {
    return null;
  }

  if (!firebaseMessagingInstance) {
    const supported = await isSupported().catch(() => false);
    if (supported) {
      const app = getAppInstance();
      if (app) {
        try {
          firebaseMessagingInstance = getMessaging(app);
        } catch (error) {
          console.error('Failed to initialize Firebase Messaging:', error);
          return null;
        }
      }
    }
  }

  return firebaseMessagingInstance;
}

/**
 * Reset all instances (useful for testing or logout)
 */
export function resetInstances() {
  firebaseAppInstance = null;
  firebaseAuthInstance = null;
  firebaseStorageInstance = null;
  firebaseMessagingInstance = null;
}

// Export configuration status
export { isConfigured };
export const configMessage = isConfigured
  ? 'Firebase configuration loaded successfully'
  : 'Firebase not configured - missing environment variables';

// Export the firebaseConfig for use in other modules
export { firebaseConfig };

// For backward compatibility - use lazy getters that evaluate at access time
// These use Object.defineProperty to ensure evaluation happens at access time, not export time
let cachedAuthExport = null;
let cachedStorageExport = null;
let cachedAppExport = null;

// Lazy getter for auth - evaluates on first access, not at module load time
export function getAuthLazy() {
  if (!isBrowser) return null;
  if (!cachedAuthExport) {
    cachedAuthExport = getAuthInstance();
  }
  return cachedAuthExport;
}

// Lazy getter for storage
export function getStorageLazy() {
  if (!isBrowser) return null;
  if (!cachedStorageExport) {
    cachedStorageExport = getStorageInstance();
  }
  return cachedStorageExport;
}

// Lazy getter for app
export function getAppLazy() {
  if (!isBrowser) return null;
  if (!cachedAppExport) {
    cachedAppExport = getAppInstance();
  }
  return cachedAppExport;
}

// Named exports for backward compatibility (call the lazy getters)
// These are functions that return the instances, ensuring lazy evaluation
export const auth = null; // Placeholder - use getAuthLazy() instead
export const storage = null; // Placeholder - use getStorageLazy() instead
export const firebaseApp = null; // Placeholder - use getAppLazy() instead

// Notification helper functions
export const requestNotificationPermission = async () => {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    console.warn('Firebase Messaging not available');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted' ? permission : null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

export const getFCMToken = async (vapidKey) => {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  try {
    const { getToken } = await import('firebase/messaging');
    return await getToken(messaging, { vapidKey });
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const onMessageListener = async (callback) => {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, callback);
};

// Default export
export default {
  getAppInstance,
  getAuthInstance,
  getStorageInstance,
  getMessagingInstance,
  isConfigured,
  firebaseConfig,
  resetInstances,
};
