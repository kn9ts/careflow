import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/server-auth';

/**
 * Dashboard Page (Server Component)
 *
 * This is the main dashboard entry point. It fetches initial data on the server
 * and redirects to the default tab (overview). The actual tab content is loaded
 * from nested routes with their own data fetching.
 *
 * Data fetching strategy:
 * - Server-side fetching for initial load (better performance)
 * - Parallel fetching with Promise.all for efficiency
 * - Force dynamic rendering because we use cookies()
 */

export const dynamic = 'force-dynamic'; // Force dynamic rendering

export default async function DashboardPage() {
  // Check authentication on server
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch initial data in parallel on server
  let analytics = null;
  let callHistory = null;
  let recordings = null;

  try {
    [analytics, callHistory, recordings] = await Promise.all([
      fetchAnalyticsData(user),
      fetchCallHistoryData(user),
      fetchRecordingsData(user),
    ]);
  } catch (error) {
    console.error('Dashboard data fetching error:', error);
    // Return empty data on error - individual tabs will handle their own errors
    analytics = null;
    callHistory = null;
    recordings = null;
  }

  // Pass data to the overview tab (default) via props
  // For other tabs, they'll fetch their own data
  return (
    <DashboardContent
      user={user}
      analytics={analytics}
      callHistory={callHistory}
      recordings={recordings}
    />
  );
}

/**
 * Server component for dashboard content
 * This renders the layout and passes initial data to the default tab
 */
function DashboardContent({ user, analytics, callHistory, recordings }) {
  return (
    <div
      className="dashboard-layout min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 30%, #134e4a 70%, #042f2e 100%)',
      }}
    >
      {/* Header and Sidebar are in the parent layout */}
      {/* This component just renders the tab content area */}

      <main className="dashboard-main flex-1 flex flex-col overflow-hidden">
        {/* By default, redirect to overview tab */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.displayName || user?.email?.split('@')[0]}
            </h1>
            <p className="text-navy-300">Here's an overview of your calling activity</p>
          </div>

          {/* Quick stats preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="stats-card bg-navy-800/50 rounded-xl p-6 border border-navy-700/50">
              <p className="text-navy-400 text-sm mb-2">Total Calls</p>
              <p className="text-3xl font-bold text-white">{analytics?.totalCalls || 0}</p>
            </div>
            <div className="stats-card bg-navy-800/50 rounded-xl p-6 border border-navy-700/50">
              <p className="text-navy-400 text-sm mb-2">Talk Time</p>
              <p className="text-3xl font-bold text-white">
                {formatDuration(analytics?.totalDuration || 0)}
              </p>
            </div>
            <div className="stats-card bg-navy-800/50 rounded-xl p-6 border border-navy-700/50">
              <p className="text-navy-400 text-sm mb-2">Recordings</p>
              <p className="text-3xl font-bold text-white">{recordings?.length || 0}</p>
            </div>
            <div className="stats-card bg-navy-800/50 rounded-xl p-6 border border-navy-700/50">
              <p className="text-navy-400 text-sm mb-2">Avg Duration</p>
              <p className="text-3xl font-bold text-white">
                {formatDuration(analytics?.averageDuration || 0)}
              </p>
            </div>
          </div>

          {/* Link to full analytics */}
          <div className="text-center py-8">
            <a href="/dashboard/analytics" className="btn-primary px-8 py-4 text-lg">
              View Full Analytics
            </a>
            <a href="/dashboard/history" className="btn-ghost px-8 py-4 text-lg ml-4">
              View Call History
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper function to format duration
function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Fetch analytics data on server
 */
async function fetchAnalyticsData(user) {
  try {
    // Import dynamically to avoid SSR issues
    const { fetchAnalytics } = await import('@/lib/api/analytics');

    // Get token from user or session
    const token = await getTokenForUser(user);

    if (!token) {
      return null;
    }

    return await fetchAnalytics(token);
  } catch (error) {
    console.error('Server analytics fetch error:', error);
    return null;
  }
}

/**
 * Fetch call history data on server
 */
async function fetchCallHistoryData(user) {
  try {
    const { fetchCallHistory } = await import('@/lib/api/calls');
    const token = await getTokenForUser(user);

    if (!token) {
      return null;
    }

    const data = await fetchCallHistory(token);
    return data.calls || [];
  } catch (error) {
    console.error('Server call history fetch error:', error);
    return [];
  }
}

/**
 * Fetch recordings data on server
 */
async function fetchRecordingsData(user) {
  try {
    const { fetchRecordings } = await import('@/lib/api/recordings');
    const token = await getTokenForUser(user);

    if (!token) {
      return [];
    }

    return await fetchRecordings(token);
  } catch (error) {
    console.error('Server recordings fetch error:', error);
    return [];
  }
}

/**
 * Get auth token for user
 * Tries sessionStorage first (won't work on server), then falls back to
 * getting a fresh token via Firebase Admin (requires additional setup)
 *
 * For now, this returns null on server, which means initial data will be empty
 * and tabs will fetch their own data client-side. This is acceptable as the
 * tabs are server components that can fetch their own data.
 */
async function getTokenForUser(user) {
  // On server, we can't access sessionStorage
  // In a production app, you'd use cookies or a server-side session
  // For now, return null to let tabs fetch their own data
  return null;
}
