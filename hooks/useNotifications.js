import { useEffect, useState, useCallback } from 'react';
import { requestNotificationPermission, getFCMToken, onMessageListener } from '@/lib/firebase';

export function useNotifications({ token, onIncomingCall, onNotification }) {
  const [permission, setPermission] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

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
      const token = await getFCMToken(vapidKey);

      if (!token) {
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
          fcmToken: token,
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

      setFcmToken(token);
      console.log('FCM token registered successfully');
      return token;
    } catch (error) {
      console.error('Token registration error:', error);
      return null;
    }
  }, [isSupported, token]);

  // Listen for foreground messages
  useEffect(() => {
    if (!isSupported || permission !== 'granted') return;

    const unsubscribe = onMessageListener((payload) => {
      console.log('Foreground message received:', payload);

      const notificationData = payload.data || {};
      const notificationType = notificationData.type;

      // Handle different notification types
      if (notificationType === 'incoming_call' && onIncomingCall) {
        onIncomingCall({
          callSid: notificationData.callSid,
          from: notificationData.from,
          to: notificationData.to,
          timestamp: notificationData.timestamp,
        });
      }

      // Show browser notification for foreground messages
      if (payload.notification && 'Notification' in window) {
        const notification = new Notification(payload.notification.title || 'CareFlow', {
          body: payload.notification.body,
          icon: payload.notification.icon || '/icon-192.png',
          badge: payload.notification.badge || '/badge-72.png',
          tag: notificationData.callSid || notificationData.recordingSid || 'careflow-notification',
          requireInteraction: true,
          data: notificationData,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }

      if (onNotification) {
        onNotification(payload);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isSupported, permission, onIncomingCall, onNotification]);

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
  };
}
