# Dashboard URL Navigation Implementation Plan

## Overview

This document outlines the implementation plan for client-side URL updating in the CareFlow dashboard. The goal is to update the browser address bar to reflect the active tab without triggering a full page reload, enabling users to bookmark specific tabs and use browser navigation.

## Current Implementation

### File Structure

```
app/dashboard/
├── page.js              # Main dashboard page with tab state
└── tabs/
    ├── DialerTab.jsx
    ├── HistoryTab.jsx
    ├── AnalyticsTab.jsx
    └── RecordingsTab.jsx
```

### Current Tab Configuration

```javascript
const TABS = [
  { id: 'dialer', label: 'Dialer', component: DialerTab },
  { id: 'history', label: 'Call History', component: HistoryTab },
  { id: 'analytics', label: 'Analytics', component: AnalyticsTab },
  { id: 'recordings', label: 'Recordings', component: RecordingsTab },
];
```

### Current State Management

- `activeTab` state is managed in `DashboardContent` component
- Tab changes via `handleTabChange` callback passed to `DashboardSidebar`
- URL remains `/dashboard` regardless of active tab

## Proposed URL Structure

| Tab          | URL Path                            |
| ------------ | ----------------------------------- |
| Dialer       | `/dashboard` or `/dashboard/dialer` |
| Call History | `/dashboard/history`                |
| Analytics    | `/dashboard/analytics`              |
| Recordings   | `/dashboard/recordings`             |
| Settings     | `/dashboard/settings`               |

## Implementation Approach

### Option A: Query Parameter Approach (Recommended for Minimal Changes)

Use query parameters to track tab state:

- `/dashboard?tab=dialer`
- `/dashboard?tab=history`
- `/dashboard?tab=analytics`
- `/dashboard?tab=recordings`

**Pros:**

- Minimal code changes
- No route restructuring needed
- Works with existing file structure

**Cons:**

- Less clean URLs
- Not as SEO-friendly

### Option B: Path-Based Routes (Recommended for Clean URLs)

Create nested routes under `/dashboard/`:

- `/dashboard/dialer`
- `/dashboard/history`
- `/dashboard/analytics`
- `/dashboard/recordings`

**Pros:**

- Clean, RESTful URLs
- Better UX and SEO
- Enables deep linking

**Cons:**

- Requires route restructuring
- More complex implementation

## Recommended Implementation: Hybrid Approach

Use `useRouter` from `next/navigation` with `useEffect` to update URLs client-side without full page reloads. This approach:

1. Uses `router.replace()` to update URL without adding to history stack
2. Reads initial tab from URL on component mount
3. Handles browser back/forward navigation via `popstate` listener

### Code Changes Required

#### 1. Update `app/dashboard/page.js`

```javascript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// ... existing imports ...

// Tab to URL path mapping
const TAB_ROUTES = {
  dialer: '/dashboard',
  history: '/dashboard/history',
  analytics: '/dashboard/analytics',
  recordings: '/dashboard/recordings',
  settings: '/dashboard/settings',
};

// URL path to tab mapping
const ROUTE_TO_TAB = {
  '/dashboard': 'dialer',
  '/dashboard/dialer': 'dialer',
  '/dashboard/history': 'history',
  '/dashboard/analytics': 'analytics',
  '/dashboard/recordings': 'recordings',
  '/dashboard/settings': 'settings',
};

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize activeTab from URL or default to 'dialer'
  const [activeTab, setActiveTab] = useState(() => {
    return ROUTE_TO_TAB[pathname] || 'dialer';
  });

  // ... existing state and hooks ...

  // Sync URL with activeTab changes
  useEffect(() => {
    const targetPath = TAB_ROUTES[activeTab];
    if (targetPath && pathname !== targetPath) {
      router.replace(targetPath, { scroll: false });
    }
  }, [activeTab, pathname, router]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const tab = ROUTE_TO_TAB[window.location.pathname];
      if (tab && tab !== activeTab) {
        setActiveTab(tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  // Handle tab change with URL update
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // ... rest of component ...
}
```

#### 2. Update `components/layout/DashboardSidebar.jsx`

Add `useRouter` integration for navigation:

```javascript
import { useRouter } from 'next/navigation';

export default function DashboardSidebar({ activeTab = 'dialer', onTabChange, className = '' }) {
  const router = useRouter();

  const handleTabClick = useCallback(
    (tabId) => {
      if (onTabChange) {
        onTabChange(tabId);
      }
    },
    [onTabChange]
  );

  // ... rest of component ...
}
```

#### 3. Create Optional Route Files for Deep Linking

For full deep linking support, create these optional route files:

**`app/dashboard/history/page.js`**

```javascript
import DashboardPage from '../page';
export default DashboardPage;
```

**`app/dashboard/analytics/page.js`**

```javascript
import DashboardPage from '../page';
export default DashboardPage;
```

**`app/dashboard/recordings/page.js`**

```javascript
import DashboardPage from '../page';
export default DashboardPage;
```

**`app/dashboard/dialer/page.js`**

```javascript
import DashboardPage from '../page';
export default DashboardPage;
```

## Implementation Checklist

- [ ] Update `app/dashboard/page.js` with URL sync logic
  - [ ] Add `useRouter`, `usePathname` imports
  - [ ] Create `TAB_ROUTES` and `ROUTE_TO_TAB` mappings
  - [ ] Add `useEffect` for URL sync on tab change
  - [ ] Add `useEffect` for popstate handling
  - [ ] Update `handleTabChange` callback

- [ ] Create route files for deep linking (optional)
  - [ ] `app/dashboard/dialer/page.js`
  - [ ] `app/dashboard/history/page.js`
  - [ ] `app/dashboard/analytics/page.js`
  - [ ] `app/dashboard/recordings/page.js`
  - [ ] `app/dashboard/settings/page.js`

- [ ] Update `DashboardSidebar.jsx` if needed

- [ ] Test navigation scenarios
  - [ ] Tab switching updates URL
  - [ ] Direct URL access loads correct tab
  - [ ] Browser back/forward works correctly
  - [ ] Bookmarks work correctly

## Technical Considerations

### `router.replace()` vs `router.push()`

- Use `router.replace()` to avoid cluttering browser history with every tab switch
- Users can still use back button to navigate between different sections

### `scroll: false` Option

- Prevents automatic scroll to top on URL change
- Maintains scroll position within the dashboard

### SSR Compatibility

- Initial tab state derived from `pathname` works with SSR
- Client-side hydration handles subsequent navigation

## Alternative: Query Parameter Implementation

If path-based routes are not desired, use query parameters instead:

```javascript
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read tab from query param
  const tabFromUrl = searchParams.get('tab') || 'dialer';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Update URL on tab change
  useEffect(() => {
    const currentTab = searchParams.get('tab') || 'dialer';
    if (activeTab !== currentTab) {
      const url = activeTab === 'dialer' ? '/dashboard' : `/dashboard?tab=${activeTab}`;
      router.replace(url, { scroll: false });
    }
  }, [activeTab, searchParams, router]);

  // ... rest of component ...
}
```

## Summary

The recommended implementation uses `useRouter` with `useEffect` to provide seamless URL-based navigation within the dashboard. This approach:

1. Updates the browser URL when switching tabs
2. Enables deep linking and bookmarking
3. Supports browser back/forward navigation
4. Maintains existing functionality without full page reloads
5. Is SSR-compatible and follows Next.js best practices
