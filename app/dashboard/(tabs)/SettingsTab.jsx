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
import { Bell, Volume2, Monitor, RotateCcw, Save, Check, AlertCircle } from 'lucide-react';
import { useSettings, DEFAULT_SETTINGS } from '@/hooks/useSettings';
import NotificationSettingsPanel from '@/components/settings/NotificationSettingsPanel';
import AudioSettingsPanel from '@/components/settings/AudioSettingsPanel';
import DisplaySettingsPanel from '@/components/settings/DisplaySettingsPanel';
import styles from './SettingsTab.module.css';

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
    <div className={styles.settingsTab}>
      {/* Header */}
      <div className={styles.settingsHeader}>
        <div>
          <h2 className={styles.settingsTitle}>Settings</h2>
          <p className={styles.settingsSubtitle}>
            {activeTabInfo?.description || 'Manage your preferences'}
          </p>
        </div>
        <div className={styles.settingsActions}>
          {/* Unsaved changes indicator */}
          {hasChanges && !saveSuccess && (
            <div className={styles.unsavedIndicator}>
              <AlertCircle className="w-4 h-4" />
              <span>Unsaved changes</span>
            </div>
          )}

          {/* Success indicator */}
          {saveSuccess && (
            <div className={styles.successIndicator}>
              <Check className="w-4 h-4" />
              <span>Saved!</span>
            </div>
          )}

          <button
            onClick={handleReset}
            disabled={isSaving || isLoading}
            className={styles.btnSecondary}
            aria-label="Reset to defaults"
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || isLoading}
            className={saveSuccess ? styles.btnSuccess : styles.btnPrimary}
            aria-label="Save changes"
          >
            {saveSuccess ? (
              <>
                <Check size={16} />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {(error || settingsError) && (
        <div className={styles.errorMessage}>
          <AlertCircle className={styles.errorIcon} />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-error-400/80 text-sm mt-1">{error || settingsError}</p>
          </div>
        </div>
      )}

      {/* Horizontal Tabs */}
      <div className={styles.settingsTabs} role="tablist">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.settingsTabBtn} ${activeTab === tab.id ? styles.settingsTabBtnActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${tab.id}-panel`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        className={styles.settingsContent}
        role="tabpanel"
        id={`${activeTab}-panel`}
        aria-labelledby={activeTab}
      >
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
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
    </div>
  );
}
