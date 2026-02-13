import React, { useState, useEffect } from 'react';
import { requestNotificationPermission, getFCMToken } from '@/lib/firebase';

export default function NotificationPermission({ onTokenRegistered }) {
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check current permission status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    setLoading(true);
    setError(null);

    try {
      // Request notification permission
      const granted = await requestNotificationPermission();

      if (granted) {
        setPermission('granted');

        // Get FCM token
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        const token = await getFCMToken(vapidKey);

        if (token) {
          // Register token with backend
          const response = await fetch('/api/notifications/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
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

          if (response.ok) {
            console.log('Notification token registered successfully');
            if (onTokenRegistered) {
              onTokenRegistered(token);
            }
          } else {
            throw new Error('Failed to register notification token');
          }
        } else {
          throw new Error('Failed to get FCM token');
        }
      } else {
        setPermission('denied');
        setError('Notification permission was denied');
      }
    } catch (err) {
      console.error('Notification permission error:', err);
      setError(err.message || 'Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  // Don't show if:
  // - Already granted
  // - Permanently denied
  // - Dismissed by user
  // - Not supported
  if (
    permission === 'granted' ||
    permission === 'denied' ||
    dismissed ||
    typeof window === 'undefined' ||
    !('Notification' in window)
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-background-card border border-white/10 rounded-xl shadow-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Enable Notifications</h3>
            <p className="text-gray-400 text-sm mb-4">
              Get notified about incoming calls even when your browser is closed. Stay connected
              with CareFlow.
            </p>
            {error && (
              <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleRequestPermission}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enabling...' : 'Enable Notifications'}
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-4 py-2 bg-background-input text-gray-400 rounded-lg hover:text-white transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
