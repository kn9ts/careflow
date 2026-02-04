/**
 * Notification Service
 * Handles sending push notifications via Firebase Cloud Messaging (FCM)
 */

/**
 * Send a push notification to a user's registered devices
 * @param {string} firebaseUid - User's Firebase UID
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Result of notification sending
 */
export async function sendPushNotification(
  firebaseUid,
  notification,
  data = {},
) {
  try {
    const { connectDB } = await import("./db");
    const User = (await import("./models/User")).default;

    await connectDB();

    // Find user and get their FCM tokens
    const user = await User.findOne({ firebaseUid });

    if (
      !user ||
      !user.notificationTokens ||
      user.notificationTokens.length === 0
    ) {
      console.log(`No notification tokens found for user: ${firebaseUid}`);
      return {
        success: false,
        message: "No registered devices",
        tokensSent: 0,
      };
    }

    const fcmTokens = user.notificationTokens.map((t) => t.token);
    const results = [];

    // Send notification to each token
    for (const token of fcmTokens) {
      try {
        const result = await sendFCMMessage(token, notification, data);
        results.push({ token, success: result.success, error: result.error });
      } catch (error) {
        console.error(`Failed to send to token ${token}:`, error);
        results.push({ token, success: false, error: error.message });
      }
    }

    const successfulSends = results.filter((r) => r.success).length;

    return {
      success: successfulSends > 0,
      message: `Sent to ${successfulSends}/${fcmTokens.length} devices`,
      tokensSent: successfulSends,
      totalTokens: fcmTokens.length,
      results,
    };
  } catch (error) {
    console.error("Push notification error:", error);
    return {
      success: false,
      message: error.message,
      tokensSent: 0,
    };
  }
}

/**
 * Send a message via Firebase Cloud Messaging
 * @param {string} token - FCM device token
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Result of message sending
 */
async function sendFCMMessage(token, notification, data = {}) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!projectId) {
    throw new Error("Firebase project ID not configured");
  }

  // For server-side FCM, we need to use the Firebase Admin SDK
  // This is a simplified implementation using the FCM HTTP v1 API
  try {
    // Parse service account key if available
    let accessToken;
    if (serviceAccountKey) {
      accessToken = await getAccessToken(serviceAccountKey);
    } else {
      // Fallback: use a simpler approach for development
      console.warn(
        "Firebase service account key not configured, using fallback",
      );
      return await sendLegacyFCM(token, notification, data);
    }

    const message = {
      message: {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || "/icon-192.png",
          badge: notification.badge || "/badge-72.png",
          click_action: notification.clickAction || "/dashboard",
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: "high",
          notification: {
            channel_id: "incoming_calls",
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              sound: "default",
              badge: 1,
            },
          },
        },
        webpush: {
          headers: {
            Urgency: "high",
          },
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || "/icon-192.png",
            badge: notification.badge || "/badge-72.png",
            vibrate: [200, 100, 200],
            requireInteraction: true,
            actions: [
              {
                action: "answer",
                title: "Answer",
              },
              {
                action: "decline",
                title: "Decline",
              },
            ],
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "FCM send failed");
    }

    return { success: true, messageId: result.name };
  } catch (error) {
    console.error("FCM send error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Legacy FCM API fallback (for development without service account)
 * @param {string} token - FCM device token
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Result of message sending
 */
async function sendLegacyFCM(token, notification, data = {}) {
  const serverKey = process.env.FIREBASE_LEGACY_SERVER_KEY;

  if (!serverKey) {
    throw new Error("Firebase legacy server key not configured");
  }

  const message = {
    to: token,
    notification: {
      title: notification.title,
      body: notification.body,
      icon: notification.icon || "/icon-192.png",
      click_action: notification.clickAction || "/dashboard",
    },
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
    priority: "high",
    time_to_live: 3600, // 1 hour
  };

  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${serverKey}`,
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();

  if (!response.ok || result.failure === 1) {
    throw new Error(result.results?.[0]?.error || "FCM send failed");
  }

  return { success: true, messageId: result.message_id };
}

/**
 * Get OAuth2 access token for Firebase Admin SDK
 * @param {string} serviceAccountKey - Service account key JSON string
 * @returns {Promise<string>} Access token
 */
async function getAccessToken(serviceAccountKey) {
  const key = JSON.parse(serviceAccountKey);
  const now = Math.floor(Date.now() / 1000);

  // Create JWT
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  // This is a simplified version - in production, use a proper JWT library
  // For now, we'll use the legacy API as fallback
  throw new Error(
    "Use legacy FCM API - proper JWT signing requires crypto library",
  );
}

/**
 * Send an incoming call notification
 * @param {string} firebaseUid - User's Firebase UID
 * @param {Object} callData - Call information
 * @returns {Promise<Object>} Result of notification sending
 */
export async function sendIncomingCallNotification(firebaseUid, callData) {
  return sendPushNotification(
    firebaseUid,
    {
      title: "Incoming Call",
      body: `Call from ${callData.from}`,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      clickAction: "/dashboard",
    },
    {
      type: "incoming_call",
      callSid: callData.callSid,
      from: callData.from,
      to: callData.to,
      timestamp: new Date().toISOString(),
    },
  );
}

/**
 * Send a missed call notification
 * @param {string} firebaseUid - User's Firebase UID
 * @param {Object} callData - Call information
 * @returns {Promise<Object>} Result of notification sending
 */
export async function sendMissedCallNotification(firebaseUid, callData) {
  return sendPushNotification(
    firebaseUid,
    {
      title: "Missed Call",
      body: `You missed a call from ${callData.from}`,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      clickAction: "/dashboard?tab=history",
    },
    {
      type: "missed_call",
      callSid: callData.callSid,
      from: callData.from,
      to: callData.to,
      timestamp: new Date().toISOString(),
    },
  );
}

/**
 * Send a call status notification
 * @param {string} firebaseUid - User's Firebase UID
 * @param {string} status - Call status
 * @param {Object} callData - Call information
 * @returns {Promise<Object>} Result of notification sending
 */
export async function sendCallStatusNotification(
  firebaseUid,
  status,
  callData,
) {
  const statusMessages = {
    completed: "Call completed",
    failed: "Call failed",
    busy: "Line busy",
    "no-answer": "No answer",
  };

  return sendPushNotification(
    firebaseUid,
    {
      title: statusMessages[status] || "Call status update",
      body: `Call with ${callData.from} ${status}`,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      clickAction: "/dashboard?tab=history",
    },
    {
      type: "call_status",
      status,
      callSid: callData.callSid,
      from: callData.from,
      to: callData.to,
      timestamp: new Date().toISOString(),
    },
  );
}

/**
 * Send a voicemail notification
 * @param {string} firebaseUid - User's Firebase UID
 * @param {Object} voicemailData - Voicemail information
 * @returns {Promise<Object>} Result of notification sending
 */
export async function sendVoicemailNotification(firebaseUid, voicemailData) {
  return sendPushNotification(
    firebaseUid,
    {
      title: "New Voicemail",
      body: `New voicemail from ${voicemailData.from}`,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      clickAction: "/dashboard?tab=history",
    },
    {
      type: "voicemail",
      recordingSid: voicemailData.recordingSid,
      callSid: voicemailData.callSid,
      from: voicemailData.from,
      to: voicemailData.to,
      duration: voicemailData.duration,
      timestamp: new Date().toISOString(),
    },
  );
}

export default {
  sendPushNotification,
  sendIncomingCallNotification,
  sendMissedCallNotification,
  sendCallStatusNotification,
  sendVoicemailNotification,
};
