'use client';

import { useEffect, useState, useCallback } from 'react';
import { requestNotificationPermission, getFCMToken, onMessageListener } from '@/lib/firebase';

// Default notification settings fallback
const DEFAULT_NOTIFICATION_SETTINGS = {
  incomingCalls: true,
  missedCalls: true,
  voicemails: true,
  email: false,
  soundEnabled: true,
  soundVolume: 80,
};

/**
 * Play a notification sound
 * @param {number} volume - Volume level (0-100)
 */
function playNotificationSound(volume = 80) {
  try {
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set volume (convert 0-100 to 0-1)
    gainNode.gain.value = (volume / 100) * 0.3;

    // Play a pleasant notification tone
    oscillator.frequency.value = 880; // A5 note
    oscillator.type = 'sine';

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15);

    // Play a second tone
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      gain2.gain.value = (volume / 100) * 0.3;
      osc2.frequency.value = 1100; // C#6 note
      osc2.type = 'sine';
      osc2.start();
      osc2.stop(audioContext.currentTime + 0.15);
    }, 150);
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
}

/**
 * useNotifications hook
 * @param {Object} options - Options object
 * @param {string} options.token - Authentication token
 * @param {Function} options.onIncomingCall - Callback for incoming calls
 * @param {Function} options.onNotification - Callback for notifications
 * @param {Object} options.notificationSettings - Notification settings from user preferences
 */

export function useNotifications({ token, onIncomingCall, onNotification, notificationSettings }) {
  const [permission, setPermission] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  // Use provided notification settings or defaults
  const settings = notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;

  // Check if notifications are supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);

      if (supported && 'Notification' in window) {
        setPermission(Notification.permission);
      }
    }
  }, []);

  // Register service worker
  useEffect(() => {
    if (!isSupported || !token) return;

    const registerServiceWorker = async () => {
      try {
        // Get Firebase config
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };

        // Register service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        console.log('Service Worker registered:', registration);

        // Send Firebase config to service worker
        registration.active?.postMessage({
          type: 'SET_FIREBASE_CONFIG',
          config: firebaseConfig,
        });

        setServiceWorkerReady(true);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerServiceWorker();
  }, [isSupported, token]);

  // Register FCM token
  const registerToken = useCallback(async () => {
    if (!isSupported || !token) return null;

    try {
      // Request permission
      const granted = await requestNotificationPermission();
      if (!granted) {
        setPermission('denied');
        return null;
      }

      setPermission('granted');

      // Get FCM token
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      const fcmTokenResult = await getFCMToken(vapidKey);

      if (!fcmTokenResult) {
        throw new Error('Failed to get FCM token');
      }

      // Register token with backend
      const response = await fetch('/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fcmToken: fcmTokenResult,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register token with backend');
      }

      setFcmToken(fcmTokenResult);
      console.log('FCM token registered successfully');
      return fcmTokenResult;
    } catch (error) {
      console.error('Token registration error:', error);
      return null;
    }
  }, [isSupported, token]);

  // Listen for foreground messages
  useEffect(() => {
    if (!isSupported || permission !== 'granted') return;

    let unsubscribe = null;

    const setupListener = async () => {
      try {
        // onMessageListener is async and returns a Promise that resolves to unsubscribe function
        unsubscribe = await onMessageListener((payload) => {
          console.log('Foreground message received:', payload);

          const notificationData = payload.data || {};
          const notificationType = notificationData.type;

          // Check if this notification type is enabled in settings
          let isNotificationEnabled = true;
          if (notificationType === 'incoming_call') {
            isNotificationEnabled = settings.incomingCalls;
          } else if (notificationType === 'missed_call') {
            isNotificationEnabled = settings.missedCalls;
          } else if (notificationType === 'voicemail') {
            isNotificationEnabled = settings.voicemails;
          }

          // Handle different notification types
          if (notificationType === 'incoming_call' && onIncomingCall && isNotificationEnabled) {
            onIncomingCall({
              callSid: notificationData.callSid,
              from: notificationData.from,
              to: notificationData.to,
              timestamp: notificationData.timestamp,
            });
          }

          // Show browser notification for foreground messages if enabled
          if (payload.notification && 'Notification' in window && isNotificationEnabled) {
            const notification = new Notification(payload.notification.title || 'CareFlow', {
              body: payload.notification.body,
              icon: payload.notification.icon || '/icon-192.png',
              badge: payload.notification.badge || '/badge-72.png',
              tag:
                notificationData.callSid ||
                notificationData.recordingSid ||
                'careflow-notification',
              requireInteraction: true,
              data: notificationData,
            });

            notification.onclick = () => {
              window.focus();
              notification.close();
            };

            // Play notification sound if enabled
            if (settings.soundEnabled) {
              playNotificationSound(settings.soundVolume);
            }
          }

          if (onNotification) {
            onNotification(payload);
          }
        });
      } catch (error) {
        console.error('Failed to setup message listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isSupported, permission, onIncomingCall, onNotification, settings]);

  // Unregister token on logout
  const unregisterToken = useCallback(async () => {
    if (!fcmToken || !token) return;

    try {
      await fetch('/api/notifications/register', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fcmToken }),
      });

      setFcmToken(null);
      console.log('FCM token unregistered');
    } catch (error) {
      console.error('Token unregistration error:', error);
    }
  }, [fcmToken, token]);

  return {
    isSupported,
    permission,
    fcmToken,
    serviceWorkerReady,
    registerToken,
    unregisterToken,
    notificationSettings: settings,
  };
}
