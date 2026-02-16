/**
 * Dashboard Page - Refactored with Separation of Concerns
 *
 * This page follows separation of concerns principles:
 * - State management: useCallState hook
 * - Data fetching: useRecordings, useAnalytics, useCallHistory hooks
 * - Side effects: useCallManager, useAudioRecorder hooks
 * - Layout: DashboardHeader, DashboardSidebar components
 * - Error handling: ErrorBoundary component
 */

'use client';

import { useState, useCallback } from 'react';

// Context Providers
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CallStateProvider, useCallState } from '@/hooks/useCallState';
import { SettingsProvider, useSettings } from '@/hooks/useSettings';

// Components
import ProtectedRoute from '@/components/ProtectedRoute/ProtectedRoute';
import ErrorBoundary, { ErrorDisplay } from '@/components/common/ErrorBoundary/ErrorBoundary';
import DashboardHeader from '@/components/layout/DashboardHeader';
import DashboardSidebar, { SidebarTabContent } from '@/components/layout/DashboardSidebar';

// Dashboard Components
import DialPadModal from '@/components/dashboard/DialPadModal';
import NotificationPermission from '@/components/NotificationPermission';

// Hooks
import { useRecordings } from '@/hooks/useRecordings';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCallHistory } from '@/hooks/useCallHistory';
import { useCallManager } from '@/hooks/useCallManager';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useNotifications } from '@/hooks/useNotifications';

// Tab Content Components
import DialerTab from './tabs/DialerTab';
import HistoryTab from './tabs/HistoryTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import RecordingsTab from './tabs/RecordingsTab';
import SettingsTab from './tabs/SettingsTab';

// Tab configurations
const TABS = [
  { id: 'dialer', label: 'Dialer', component: DialerTab },
  { id: 'history', label: 'Call History', component: HistoryTab },
  { id: 'analytics', label: 'Analytics', component: AnalyticsTab },
  { id: 'recordings', label: 'Recordings', component: RecordingsTab },
  { id: 'settings', label: 'Settings', component: SettingsTab },
];

// Dashboard content component
function DashboardContent() {
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dialer');
  const [isDialPadOpen, setIsDialPadOpen] = useState(false);

  // Get settings from context
  const { settings } = useSettings();

  // Call state from useCallState hook
  const { phoneNumber, callStatus, callDuration, callError, isMuted, setPhoneNumber } =
    useCallState();

  // Data hooks - only run if we have a token
  const {
    recordings,
    isLoading: recordingsLoading,
    error: recordingsError,
    refresh: refreshRecordings,
  } = useRecordings(token);
  const {
    analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refresh: refreshAnalytics,
  } = useAnalytics(token);
  const {
    callHistory,
    isLoading: historyLoading,
    error: historyError,
    refresh: refreshHistory,
  } = useCallHistory(token);

  // Call manager hook (handles initialization, events, actions)
  const callManager = useCallManager();

  // Audio recorder hook - pass audio settings from context
  const audioRecorder = useAudioRecorder(token, { audioSettings: settings.audio });

  // Notifications hook - pass notification settings from context
  const notifications = useNotifications({
    token,
    notificationSettings: settings.notifications,
    onIncomingCall: (callData) => {
      console.log('Incoming call notification:', callData);
    },
  });

  // Handle tab change
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // Handle dial pad
  const handleOpenDialPad = useCallback(() => {
    setIsDialPadOpen(true);
  }, []);

  const handleCloseDialPad = useCallback(() => {
    console.log('Closing dial pad...');
    setIsDialPadOpen(false);
  }, []);

  // Render active tab component
  const ActiveTabComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <div className="dashboard-layout">
      {/* Notifications Permission */}
      {notifications.isSupported && notifications.permission === 'default' && (
        <NotificationPermission onTokenRegistered={notifications.registerToken} />
      )}

      {/* Header */}
      <DashboardHeader onOpenDialPad={handleOpenDialPad} />

      {/* Main Layout */}
      <div className="dashboard-body">
        {/* Sidebar */}
        <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Tab Content */}
        <main className="dashboard-main">
          <SidebarTabContent>
            {ActiveTabComponent && (
              <ActiveTabComponent
                // Common props
                user={user}
                token={token}
                authLoading={authLoading}
                // Call manager props
                callManager={callManager}
                // Audio recorder props
                audioRecorder={audioRecorder}
                // Data props
                recordings={recordings}
                analytics={analytics}
                callHistory={callHistory}
                // Error props
                recordingsError={recordingsError}
                analyticsError={analyticsError}
                historyError={historyError}
                // Loading props
                recordingsLoading={recordingsLoading}
                analyticsLoading={analyticsLoading}
                historyLoading={historyLoading}
                // Refresh functions
                onRefreshRecordings={refreshRecordings}
                onRefreshAnalytics={refreshAnalytics}
                onRefreshHistory={refreshHistory}
                // Display settings for formatting
                displaySettings={settings.display}
              />
            )}
          </SidebarTabContent>
        </main>
      </div>

      {/* Dial Pad Modal */}
      <DialPadModal
        isOpen={isDialPadOpen}
        onClose={handleCloseDialPad}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        onMakeCall={callManager.makeCall}
        callStatus={callStatus}
        callDuration={callDuration}
        callError={callError}
        isMuted={isMuted}
        onCall={callManager.makeCall}
        onHangup={callManager.hangupCall}
        onAccept={callManager.acceptCall}
        onReject={callManager.rejectCall}
        onMute={callManager.toggleMute}
        onDTMF={callManager.sendDigits}
        audioRecorder={audioRecorder}
      />
    </div>
  );
}

// Main page component wrapped with providers
export default function DashboardPage() {
  return (
    <AuthProvider>
      <CallStateProvider>
        <SettingsProvider>
          <ErrorBoundary
            fallback={(error, retry) => (
              <div className="error-page">
                <ErrorDisplay error={error} onRetry={retry} />
              </div>
            )}
          >
            <ProtectedRoute>
              <DashboardContent />
            </ProtectedRoute>
          </ErrorBoundary>
        </SettingsProvider>
      </CallStateProvider>
    </AuthProvider>
  );
}
