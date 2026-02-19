/**
 * Recordings Tab Page (Server Component)
 *
 * Server-side rendered recordings page.
 * Data is fetched on the server and passed to the RecordingsTab component.
 */

import Link from 'next/link';
import RecordingsTab from '../RecordingsTab';
import { getServerUser } from '@/lib/server-auth';
import { fetchRecordings } from '@/lib/api/recordings';
import { getTokenFromCookies } from '@/lib/server-token';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function RecordingsPage() {
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
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Authentication Required</h3>
          <p className="text-navy-300 mb-6">Please log in to view your recordings.</p>
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

  // Fetch recordings data on server
  const recordingsData = await fetchRecordingsForUser();

  return (
    <RecordingsTab
      recordings={recordingsData}
      recordingsLoading={false}
      recordingsError={null}
      audioRecorder={null}
    />
  );
}

/**
 * Fetch recordings for a user
 */
async function fetchRecordingsForUser() {
  try {
    const token = await getTokenFromCookies();

    if (!token) {
      console.warn('No auth token found in cookies for recordings fetch');
      return [];
    }

    return await fetchRecordings(token);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    return [];
  }
}
