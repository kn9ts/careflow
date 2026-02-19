/**
 * Dashboard Tabs Layout
 *
 * Client component that provides tab navigation for dashboard sub-pages.
 * This layout wraps all tab pages and handles tab state management.
 *
 * The layout uses Next.js navigation for route-based tab switching.
 * Note: The sidebar is rendered in the parent layout (app/dashboard/layout.js)
 * to avoid duplicate rendering.
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

export default function TabsLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dialer');

  // Determine active tab from current path
  useEffect(() => {
    const tab = TAB_ROUTES[pathname] || 'dialer';
    setActiveTab(tab);
  }, [pathname]);

  // Handle tab change
  const handleTabChange = (tabId) => {
    const targetPath = REVERSE_TAB_ROUTES[tabId];
    if (targetPath && targetPath !== pathname) {
      router.push(targetPath);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab content - Sidebar is rendered in parent layout */}
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
