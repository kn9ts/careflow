'use client';

/**
 * Dashboard Layout
 *
 * Client component that provides the shared dashboard structure:
 * - Header with user menu, notifications, and quick dial
 * - Sidebar with navigation tabs
 * - Provider boundary for authentication and state
 *
 * This layout wraps all dashboard routes and provides the persistent UI.
 */

import { Suspense, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardHeader from '@/components/layout/DashboardHeader';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
import { CallStateProvider } from '@/hooks/useCallState';
import { SettingsProvider } from '@/hooks/useSettings';
import ErrorBoundary from '@/components/common/ErrorBoundary/ErrorBoundary';
import { fetchTodayStats } from '@/lib/api/calls';

export const dynamic = 'force-dynamic';

// Tab routes mapping
const TAB_ROUTES = {
  '/dashboard/overview': 'dialer', // Default tab
  '/dashboard/history': 'history',
  '/dashboard/analytics': 'analytics',
  '/dashboard/recordings': 'recordings',
  '/dashboard/settings': 'settings',
};

const REVERSE_TAB_ROUTES = {
  dialer: '/dashboard/overview',
  history: '/dashboard/history',
  analytics: '/dashboard/analytics',
  recordings: '/dashboard/recordings',
  settings: '/dashboard/settings',
};

/**
 * Internal DashboardContent component that has access to Auth context
 */
function DashboardContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, isInitialized } = useAuth();
  const [activeTab, setActiveTab] = useState('dialer');
  const [todayStats, setTodayStats] = useState(null);

  // Determine active tab from current path
  useEffect(() => {
    const tab = TAB_ROUTES[pathname] || 'dialer';
    setActiveTab(tab);
  }, [pathname]);

  // Fetch today's stats when token is available
  const fetchTodayStatsData = useCallback(async () => {
    if (token && isInitialized) {
      try {
        const stats = await fetchTodayStats(token);
        setTodayStats(stats);
      } catch (error) {
        console.error("Failed to fetch today's stats:", error);
        // Keep the default values (0) on error
        setTodayStats({ totalCalls: 0, totalTalkTime: 0 });
      }
    }
  }, [token, isInitialized]);

  // Fetch stats on mount and when token changes
  useEffect(() => {
    if (isInitialized) {
      fetchTodayStatsData();
    }
  }, [isInitialized, fetchTodayStatsData]);

  // Handle tab change
  const handleTabChange = (tabId) => {
    const targetPath = REVERSE_TAB_ROUTES[tabId];
    if (targetPath && targetPath !== pathname) {
      router.push(targetPath);
    }
  };

  return (
    <ErrorBoundary
      fallback={(error, retry) => (
        <div className="error-page min-h-screen flex items-center justify-center">
          <div className="error-card p-8 bg-navy-800/50 rounded-xl border border-navy-700/50 text-center">
            <h2 className="text-2xl font-bold text-error-400 mb-4">Dashboard Error</h2>
            <p className="text-navy-300 mb-6">{error?.message || 'Unknown error'}</p>
            <button onClick={retry} className="btn-primary px-6 py-3">
              Retry
            </button>
          </div>
        </div>
      )}
    >
      <div className="dashboard-layout min-h-screen flex flex-col">
        {/* Header - always visible */}
        <DashboardHeader />

        {/* Main content area with sidebar */}
        <div className="dashboard-body flex flex-1 overflow-hidden">
          {/* Sidebar - always visible */}
          <DashboardSidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            todayStats={todayStats}
          />

          {/* Main content with Suspense boundary for streaming */}
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<DashboardContentFallback />}>{children}</Suspense>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <AuthProvider>
      <CallStateProvider>
        <SettingsProvider>
          <DashboardContent>{children}</DashboardContent>
        </SettingsProvider>
      </CallStateProvider>
    </AuthProvider>
  );
}

/**
 * Fallback UI for Suspense boundary
 * Shows while tab content is loading
 */
function DashboardContentFallback() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="animate-pulse space-y-6">
        {/* Header skeleton */}
        <div className="h-8 bg-navy-800/50 rounded-lg w-1/3" />
        <div className="h-4 bg-navy-800/30 rounded w-1/2" />

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-navy-800/50 rounded-xl" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="h-96 bg-navy-800/50 rounded-xl" />
      </div>
    </div>
  );
}
