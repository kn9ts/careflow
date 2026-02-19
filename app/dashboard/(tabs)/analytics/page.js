/**
 * Analytics Tab Page (Server Component)
 *
 * Server-side rendered analytics page.
 * Data is fetched on the server and passed to the AnalyticsTab component.
 */

import Link from 'next/link';
import AnalyticsTab from '../AnalyticsTab';
import { getServerUser } from '@/lib/server-auth';
import { fetchAnalytics } from '@/lib/api/analytics';
import { getTokenFromCookies } from '@/lib/server-token';

export const revalidate = 60; // Revalidate every 60 seconds (ISR)

export default async function AnalyticsPage() {
  // Check authentication
  const user = await getServerUser();

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-navy-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-navy-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Authentication Required</h3>
          <p className="text-navy-300 mb-6">Please log in to view your analytics.</p>
          <Link
            href="/login"
            className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity inline-block"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Fetch analytics data on server
  const analyticsData = await fetchAnalyticsForUser();

  return (
    <AnalyticsTab
      analytics={analyticsData}
      analyticsLoading={false}
      analyticsError={null}
      displaySettings={{ timezone: 'UTC', dateFormat: 'MM/DD/YYYY' }}
    />
  );
}

/**
 * Fetch analytics for a user
 */
async function fetchAnalyticsForUser() {
  try {
    const token = await getTokenFromCookies();

    if (!token) {
      console.warn('No auth token found in cookies for analytics fetch');
      return null;
    }

    return await fetchAnalytics(token);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return null;
  }
}
