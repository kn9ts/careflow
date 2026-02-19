/**
 * useSettings Hook
 *
 * Manages user settings with real-time sync and caching.
 * Provides settings state, loading/error states, and update functions.
 */

'use client';

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { useAuth } from '@/context/AuthContext';

// Default settings structure
export const DEFAULT_SETTINGS = {
  notifications: {
    incomingCalls: true,
    missedCalls: true,
    voicemails: true,
    email: false,
    soundEnabled: true,
    soundVolume: 80,
  },
  audio: {
    inputDevice: 'default',
    outputDevice: 'default',
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  display: {
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
};

// Settings Context for global state
export const SettingsContext = createContext(null);

/**
 * Settings Provider Component
 * Wrap your app with this to provide settings context
 */
export function SettingsProvider({ children }) {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Fetch settings from server
  const fetchSettings = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch settings');
      }

      const fetchedSettings = {
        notifications: {
          ...DEFAULT_SETTINGS.notifications,
          ...(data.data?.settings?.notifications || {}),
        },
        audio: {
          ...DEFAULT_SETTINGS.audio,
          ...(data.data?.settings?.audio || {}),
        },
        display: {
          ...DEFAULT_SETTINGS.display,
          ...(data.data?.settings?.display || {}),
        },
      };

      setSettings(fetchedSettings);
      setLastFetched(new Date());

      // Store in localStorage for quick access
      if (typeof window !== 'undefined') {
        localStorage.setItem('careflow_settings', JSON.stringify(fetchedSettings));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err?.message || err || 'Unknown error');

      // Try to load from localStorage as fallback
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('careflow_settings');
        if (cached) {
          try {
            setSettings(JSON.parse(cached));
          } catch {
            // Invalid cache, use defaults
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load settings on mount or when token changes
  useEffect(() => {
    if (token && user) {
      fetchSettings();
    } else {
      // Reset to defaults when logged out
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('careflow_settings');
      }
    }
  }, [token, user, fetchSettings]);

  // Update a specific setting
  const updateSetting = useCallback(
    async (category, key, value) => {
      const newSettings = {
        ...settings,
        [category]: {
          ...settings[category],
          [key]: value,
        },
      };

      // Optimistic update
      setSettings(newSettings);

      try {
        const response = await fetch('/api/users/settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            [category]: {
              ...settings[category],
              [key]: value,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Revert on error
          setSettings(settings);
          throw new Error(data.error || 'Failed to update settings');
        }

        // Update with server response
        setSettings(data.data.settings);

        // Update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('careflow_settings', JSON.stringify(data.data.settings));
        }

        return { success: true };
      } catch (err) {
        console.error('Error updating setting:', err);
        return { success: false, error: err?.message || err || 'Unknown error' };
      }
    },
    [settings, token]
  );

  // Update entire category
  const updateCategory = useCallback(
    async (category, values) => {
      const newSettings = {
        ...settings,
        [category]: {
          ...settings[category],
          ...values,
        },
      };

      // Optimistic update
      setSettings(newSettings);

      try {
        const response = await fetch('/api/users/settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ [category]: values }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Revert on error
          setSettings(settings);
          throw new Error(data.error || 'Failed to update settings');
        }

        // Update with server response
        setSettings(data.data.settings);

        // Update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('careflow_settings', JSON.stringify(data.data.settings));
        }

        return { success: true };
      } catch (err) {
        console.error('Error updating category:', err);
        return { success: false, error: err?.message || err || 'Unknown error' };
      }
    },
    [settings, token]
  );

  // Update all settings at once
  const updateAllSettings = useCallback(
    async (newSettings) => {
      // Optimistic update
      setSettings(newSettings);

      try {
        const response = await fetch('/api/users/settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newSettings),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update settings');
        }

        setSettings(data.data.settings);

        // Update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('careflow_settings', JSON.stringify(data.data.settings));
        }

        return { success: true };
      } catch (err) {
        console.error('Error updating all settings:', err);
        return { success: false, error: err?.message || err || 'Unknown error' };
      }
    },
    [token]
  );

  // Reset settings to defaults
  const resetSettings = useCallback(
    async (categories = null) => {
      try {
        const response = await fetch('/api/users/settings/reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ categories }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to reset settings');
        }

        setSettings(data.data.settings);

        // Update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('careflow_settings', JSON.stringify(data.data.settings));
        }

        return { success: true };
      } catch (err) {
        console.error('Error resetting settings:', err);
        return { success: false, error: err?.message || err || 'Unknown error' };
      }
    },
    [token]
  );

  // Refresh settings from server
  const refresh = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  const value = {
    settings,
    isLoading,
    error,
    lastFetched,
    updateSetting,
    updateCategory,
    updateAllSettings,
    resetSettings,
    refresh,
    // Convenience getters
    notifications: settings.notifications,
    audio: settings.audio,
    display: settings.display,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/**
 * useSettings Hook
 * Access settings from context
 */
export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return context;
}

/**
 * useNotificationSettings Hook
 * Convenience hook for notification settings only
 */
export function useNotificationSettings() {
  const { notifications, updateSetting, updateCategory, isLoading, error } = useSettings();

  return {
    settings: notifications,
    update: (key, value) => updateSetting('notifications', key, value),
    updateAll: (values) => updateCategory('notifications', values),
    isLoading,
    error,
  };
}

/**
 * useAudioSettings Hook
 * Convenience hook for audio settings only
 */
export function useAudioSettings() {
  const { audio, updateSetting, updateCategory, isLoading, error } = useSettings();

  return {
    settings: audio,
    update: (key, value) => updateSetting('audio', key, value),
    updateAll: (values) => updateCategory('audio', values),
    isLoading,
    error,
  };
}

/**
 * useDisplaySettings Hook
 * Convenience hook for display settings only
 */
export function useDisplaySettings() {
  const { display, updateSetting, updateCategory, isLoading, error } = useSettings();

  return {
    settings: display,
    update: (key, value) => updateSetting('display', key, value),
    updateAll: (values) => updateCategory('display', values),
    isLoading,
    error,
  };
}

export default useSettings;
