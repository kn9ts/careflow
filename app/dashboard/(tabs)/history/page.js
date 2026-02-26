/**
 * History Tab Page (Server Component)
 *
 * Server-side rendered call history page.
 * Data is fetched on the server and passed to the HistoryTab component.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import HistoryTab from '../HistoryTab';
import { getServerUser } from '@/lib/server-auth';
import { fetchCallHistory } from '@/lib/api/calls';
import { getTokenFromCookies } from '@/lib/server-token';

export const dynamic = 'force-dynamic'; // Force dynamic rendering

export default async function HistoryPage() {
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Authentication Required</h3>
          <p className="text-navy-300 mb-6">Please log in to view your call history.</p>
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

  // Fetch call history data on server
  const callHistoryData = await fetchCallHistoryForUser();

  return (
    <HistoryTab
      callHistory={callHistoryData}
      historyLoading={false}
      historyError={null}
      displaySettings={{ timezone: 'UTC', dateFormat: 'MM/DD/YYYY' }}
    />
  );
}

/**
 * Fetch call history for a user
 */
async function fetchCallHistoryForUser() {
  try {
    const token = await getTokenFromCookies();

    if (!token) {
      console.warn('No auth token found in cookies for call history fetch');
      return [];
    }

    const result = await fetchCallHistory(token);
    return result.calls || [];
  } catch (error) {
    console.error('Error fetching call history:', error);
    return [];
  }
}
