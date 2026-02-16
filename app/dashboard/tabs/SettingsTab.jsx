/**
 * Settings Tab Component
 * Displays user settings with horizontal tabs for different categories
 *
 * Phase 1 MVP Categories:
 * - Notifications: Push and sound notification preferences
 * - Audio: Device selection and audio processing
 * - Display: Timezone and formatting preferences
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Volume2, Monitor, RotateCcw, Save, Check } from 'lucide-react';
import { useSettings, DEFAULT_SETTINGS } from '@/hooks/useSettings';
import NotificationSettingsPanel from '@/components/settings/NotificationSettingsPanel';
import AudioSettingsPanel from '@/components/settings/AudioSettingsPanel';
import DisplaySettingsPanel from '@/components/settings/DisplaySettingsPanel';

// Tab configuration
const SETTINGS_TABS = [
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Push notifications and sound alerts',
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: Volume2,
    description: 'Microphone, speaker, and audio processing',
  },
  {
    id: 'display',
    label: 'Display',
    icon: Monitor,
    description: 'Timezone and formatting preferences',
  },
];

export default function SettingsTab() {
  const {
    settings,
    isLoading,
    error: settingsError,
    updateAllSettings,
    resetSettings,
  } = useSettings();

  const [activeTab, setActiveTab] = useState('notifications');
  const [localSettings, setLocalSettings] = useState(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local settings with context settings
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(localSettings) !== JSON.stringify(settings);
    setHasChanges(changed);
  }, [localSettings, settings]);

  // Update a specific setting
  const updateSetting = useCallback((category, key, value) => {
    setLocalSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setSaveSuccess(false);
  }, []);

  // Update entire category
  const updateCategory = useCallback((category, values) => {
    setLocalSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        ...values,
      },
    }));
    setSaveSuccess(false);
  }, []);

  // Save settings
  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setError(null);

    const result = await updateAllSettings(localSettings);

    if (result.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setError(result.error || 'Failed to save settings');
    }

    setIsSaving(false);
  };

  // Reset to defaults
  const handleReset = async () => {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await resetSettings();

    if (result.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setError(result.error || 'Failed to reset settings');
    }

    setIsSaving(false);
  };

  // Get active tab info
  const activeTabInfo = SETTINGS_TABS.find((t) => t.id === activeTab);

  return (
    <div className="settings-tab">
      {/* Header */}
      <div className="settings-header">
        <div>
          <h2 className="settings-title">Settings</h2>
          <p className="settings-subtitle">
            {activeTabInfo?.description || 'Manage your preferences'}
          </p>
        </div>
        <div className="settings-actions">
          <button
            onClick={handleReset}
            disabled={isSaving || isLoading}
            className="btn btn-secondary"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || isLoading}
            className={`btn ${saveSuccess ? 'btn-success' : 'btn-primary'}`}
          >
            {saveSuccess ? (
              <>
                <Check size={16} />
                Saved!
              </>
            ) : (
              <>
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {(error || settingsError) && <div className="error-message">{error || settingsError}</div>}

      {/* Horizontal Tabs */}
      <div className="settings-tabs">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="settings-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading settings...</p>
          </div>
        ) : (
          <>
            {activeTab === 'notifications' && (
              <NotificationSettingsPanel
                settings={localSettings.notifications}
                onUpdate={(key, value) => updateSetting('notifications', key, value)}
                onUpdateAll={(values) => updateCategory('notifications', values)}
              />
            )}
            {activeTab === 'audio' && (
              <AudioSettingsPanel
                settings={localSettings.audio}
                onUpdate={(key, value) => updateSetting('audio', key, value)}
                onUpdateAll={(values) => updateCategory('audio', values)}
              />
            )}
            {activeTab === 'display' && (
              <DisplaySettingsPanel
                settings={localSettings.display}
                onUpdate={(key, value) => updateSetting('display', key, value)}
                onUpdateAll={(values) => updateCategory('display', values)}
              />
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .settings-tab {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1rem;
        }

        .settings-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .settings-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #f8fafc;
          margin: 0;
        }

        .settings-subtitle {
          font-size: 0.875rem;
          color: #94a3b8;
          margin: 0.25rem 0 0 0;
        }

        .settings-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-secondary {
          background: #334155;
          color: #f8fafc;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #475569;
        }

        .btn-success {
          background: #22c55e;
          color: white;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.5rem;
          color: #f87171;
          font-size: 0.875rem;
        }

        .settings-tabs {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid #334155;
          padding-bottom: 0;
          overflow-x: auto;
        }

        .settings-tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #94a3b8;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .settings-tab-btn:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.05);
        }

        .settings-tab-btn.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .settings-content {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.5rem;
          min-height: 300px;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #94a3b8;
          gap: 1rem;
        }

        .spinner {
          width: 2rem;
          height: 2rem;
          border: 2px solid #334155;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
