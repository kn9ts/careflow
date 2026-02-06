import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from "firebase/messaging";

// Firebase configuration - using process.env directly to avoid initialization dependency issues
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app;
let authInstance;
let storageInstance;
let messagingInstance;

// Initialize Firebase services
async function initializeFirebaseServices() {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  storageInstance = getStorage(app);

  // Initialize messaging (will be null in non-browser environments or unsupported browsers)
  let messagingSupported = false;
  try {
    messagingSupported = await isSupported();
  } catch (e) {
    console.warn("Firebase Messaging not supported in this browser");
  }

  if (messagingSupported) {
    try {
      messagingInstance = getMessaging(app);
    } catch (error) {
      console.warn("Firebase Messaging initialization failed:", error.message);
      messagingInstance = null;
    }
  } else {
    messagingInstance = null;
  }

  // Set persistence to local storage for better session management
  setPersistence(authInstance, browserLocalPersistence)
    .then(() => {
      console.log("Firebase authentication persistence set to local storage");
    })
    .catch((error) => {
      console.warn("Failed to set Firebase persistence:", error);
    });
}

// Start initialization immediately
initializeFirebaseServices().catch(console.error);

// Export the services (will be populated after initialization)
export const auth = authInstance;
export const storage = storageInstance;
export const messaging = messagingInstance;

// Export additional utilities
export const firebaseApp = app;
export const isConfigured = !!(firebaseConfig && firebaseConfig.apiKey);
export const configMessage = "Firebase configuration loaded successfully";

// Notification helper functions
export const requestNotificationPermission = async () => {
  if (!messagingInstance) {
    console.warn("Firebase Messaging not available");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted");
      return permission;
    } else {
      console.warn("Notification permission denied");
      return null;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return null;
  }
};

export const getFCMToken = async (vapidKey) => {
  if (!messagingInstance) {
    console.warn("Firebase Messaging not available");
    return null;
  }

  try {
    const token = await getToken(messagingInstance, { vapidKey });
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

export const onMessageListener = (callback) => {
  if (!messagingInstance) {
    console.warn("Firebase Messaging not available");
    return () => {};
  }

  return onMessage(messagingInstance, (payload) => {
    console.log("Message received:", payload);
    callback(payload);
  });
};

export default app;
