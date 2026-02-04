/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications for CareFlow
 */

// Import Firebase messaging scripts dynamically
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js",
);

// Firebase configuration will be injected by the app
let firebaseConfig = null;

// Listen for messages from the main thread to set config
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_FIREBASE_CONFIG") {
    firebaseConfig = event.data.config;
    initializeFirebase();
  }
});

// Initialize Firebase with the provided config
function initializeFirebase() {
  if (!firebaseConfig) {
    console.warn("Firebase config not received yet");
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
      console.log("Received background message:", payload);

      const notificationTitle = payload.notification?.title || "CareFlow";
      const notificationOptions = {
        body: payload.notification?.body || "",
        icon: payload.notification?.icon || "/icon-192.png",
        badge: payload.notification?.badge || "/badge-72.png",
        vibrate: [200, 100, 200],
        data: payload.data || {},
        requireInteraction: true,
        tag:
          payload.data?.callSid ||
          payload.data?.recordingSid ||
          "careflow-notification",
        actions:
          payload.data?.type === "incoming_call"
            ? [
                {
                  action: "answer",
                  title: "Answer",
                  icon: "/icon-192.png",
                },
                {
                  action: "decline",
                  title: "Decline",
                  icon: "/icon-192.png",
                },
              ]
            : [],
      };

      // Show notification
      return self.registration.showNotification(
        notificationTitle,
        notificationOptions,
      );
    });
  } catch (error) {
    console.error("Firebase initialization error in service worker:", error);
  }
}

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  // Handle different actions
  if (action === "answer") {
    // Open dashboard and trigger answer action
    event.waitUntil(
      clients.openWindow(
        "/dashboard?action=answer&callSid=" + notificationData.callSid,
      ),
    );
  } else if (action === "decline") {
    // Open dashboard and trigger decline action
    event.waitUntil(
      clients.openWindow(
        "/dashboard?action=decline&callSid=" + notificationData.callSid,
      ),
    );
  } else {
    // Default: open dashboard
    let url = "/dashboard";

    // Add query parameters based on notification type
    if (
      notificationData.type === "missed_call" ||
      notificationData.type === "voicemail"
    ) {
      url += "?tab=history";
    } else if (notificationData.callSid) {
      url += "?callSid=" + notificationData.callSid;
    }

    event.waitUntil(clients.openWindow(url));
  }
});

// Handle push events (fallback for browsers that don't support FCM properly)
self.addEventListener("push", (event) => {
  console.log("Push event received:", event);

  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const notificationTitle = data.notification?.title || "CareFlow";
    const notificationOptions = {
      body: data.notification?.body || "",
      icon: data.notification?.icon || "/icon-192.png",
      badge: data.notification?.badge || "/badge-72.png",
      vibrate: [200, 100, 200],
      data: data.data || {},
      requireInteraction: true,
      tag:
        data.data?.callSid ||
        data.data?.recordingSid ||
        "careflow-notification",
      actions:
        data.data?.type === "incoming_call"
          ? [
              {
                action: "answer",
                title: "Answer",
                icon: "/icon-192.png",
              },
              {
                action: "decline",
                title: "Decline",
                icon: "/icon-192.png",
              },
            ]
          : [],
    };

    event.waitUntil(
      self.registration.showNotification(
        notificationTitle,
        notificationOptions,
      ),
    );
  } catch (error) {
    console.error("Error handling push event:", error);
  }
});

// Handle service worker installation
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(self.clients.claim());
});

// Handle fetch events (optional, for offline support)
self.addEventListener("fetch", (event) => {
  // You can add offline support here if needed
  event.respondWith(
    fetch(event.request).catch(() => {
      // Return a cached response or offline page
      return new Response("Offline - No network connection", {
        status: 503,
        statusText: "Service Unavailable",
        headers: new Headers({
          "Content-Type": "text/plain",
        }),
      });
    }),
  );
});
