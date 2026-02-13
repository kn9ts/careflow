# Separation of Concerns in page.js: A Comprehensive Guide

This guide provides a structured approach to implementing separation of concerns in Next.js page components, following modern React/Next.js best practices and architectural principles.

## Table of Contents

1. [Understanding Separation of Concerns](#understanding-separation-of-concerns)
2. [State Management Strategy](#state-management-strategy)
3. [Separating Data Fetching from Presentation](#separating-data-fetching-from-presentation)
4. [Isolating Side Effects and Async Operations](#isolating-side-effects-and-async-operations)
5. [Extracting UI Components from Business Logic](#extracting-ui-components-from-business-logic)
6. [Building Self-Contained Layout Components](#building-self-contained-layout-components)
7. [Authentication and Authorization Patterns](#authentication-and-authorization-patterns)
8. [Error Boundaries and Loading States](#error-boundaries-and-loading-states)
9. [Custom Hooks Architecture](#custom-hooks-architecture)
10. [Refactoring Patterns: Before and After](#refactoring-patterns-before-and-after)
11. [Decision Matrix: When to Use What](#decision-matrix-when-to-use-what)
12. [Page.js Thickness Guidelines](#pagejs-thickness-guidelines)
13. [Import/Export Best Practices](#importexport-best-practices)

---

## Understanding Separation of Concerns

Separation of concerns is a design principle that states each part of software should address a separate concern. In the context of a React/Next.js page component, this means:

- **Presentation**: What the user sees (JSX, styling)
- **State**: Data that drives the UI
- **Logic**: Business rules and operations
- **Side Effects**: Async operations, subscriptions, DOM manipulation
- **Data Fetching**: Loading and caching server data

### Current Dashboard Analysis

The current [`app/dashboard/page.js`](app/dashboard/page.js) demonstrates common anti-patterns:

```javascript
// ❌ PROBLEMS:
// - 200+ lines of mixed concerns
// - Multiple useEffect hooks for different purposes
// - Business logic intertwined with UI
// - No clear separation between data and presentation
// - Hard to test individual functionality
// - Difficult to reuse logic
```

---

## State Management Strategy

### The Three-Tier State Model

Organize state into three distinct categories:

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│   LOCAL STATE   │  GLOBAL STATE   │     SERVER STATE        │
├─────────────────┼─────────────────┼─────────────────────────┤
│ UI state        │ Auth state      │ Cached API responses    │
│ Ephemeral data  │ User preferences│ Data requiring sync     │
│ Form inputs     │ Global configs  │ Server-derived data     │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Where Each State Should Reside

#### 1. Local Component State (`useState`, `useReducer`)

**Use for:**

- UI state (modals, tabs, dropdowns)
- Ephemeral data (form inputs, temporary selections)
- Component-specific concerns

```javascript
// ✅ GOOD: Local state for UI concerns
function DialPad() {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeKey, setActiveKey] = useState(null);

  return <div>...</div>;
}
```

#### 2. Global State (`Context`, Zustand, Redux)

**Use for:**

- Authentication/user data
- Cross-component communication
- Truly global concerns

```javascript
// ✅ GOOD: Global auth state via Context
const { user, token, logout } = useAuth();

// ✅ GOOD: Zustand for complex global state
const useCallStore = create((set) => ({
  callStatus: 'idle',
  setCallStatus: (status) => set({ callStatus: status }),
}));
```

#### 3. Server State (`React Query, SWR, useSWR`)

**Use for:**

- API data that needs caching
- Data requiring background updates
- Optimistic updates
- Loading/error states

```javascript
// ✅ GOOD: Server state with React Query
const {
  data: recordings,
  isLoading,
  error,
} = useQuery({
  queryKey: ['recordings'],
  queryFn: fetchRecordings,
});
```

### State Migration Example

**Before (mixed state in page.js):**

```javascript
// app/dashboard/page.js (current - problematic)
export default function Dashboard() {
  const [callStatus, setCallStatus] = useState('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [mode, setMode] = useState(null);
  const [care4wId, setCare4wId] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callError, setCallError] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  // ... 15+ more state variables
}
```

**After (separated state concerns):**

```javascript
// hooks/useCallState.js
import { create } from 'zustand';

export const useCallState = create((set) => ({
  callStatus: 'idle',
  callDuration: 0,
  isMuted: false,
  mode: null,
  care4wId: null,
  phoneNumber: '',
  callError: null,

  // Actions
  setCallStatus: (status) => set({ callStatus: status }),
  setCallDuration: (duration) => set({ callDuration: duration }),
  toggleMuted: () => set((state) => ({ isMuted: !state.isMuted })),
  setMode: (mode) => set({ mode }),
  setCare4wId: (id) => set({ care4wId: id }),
  setPhoneNumber: (number) => set({ phoneNumber: number }),
  setCallError: (error) => set({ callError: error }),
  resetCallState: () =>
    set({
      callStatus: 'idle',
      callDuration: 0,
      isMuted: false,
      phoneNumber: '',
      callError: null,
    }),
}));

// hooks/useRecordings.js (server state)
import useSWR from 'swr';

const fetcher = (url, token) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.json())
    .then((data) => data.data.recordings);

export function useRecordings(token) {
  const { data, error, isLoading, mutate } = useSWR(
    token ? ['/api/recordings', token] : null,
    ([url, token]) => fetcher(url, token)
  );

  return {
    recordings: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}
```

---

## Separating Data Fetching from Presentation

### The Data Fetching Layer Pattern

Create dedicated hooks/files for data fetching:

```
lib/
├── api/
│   ├── recordings.js
│   ├── analytics.js
│   └── calls.js
hooks/
├── useRecordings.js
├── useAnalytics.js
└── useCallHistory.js
```

### Implementation

**Before (data fetching mixed with UI):**

```javascript
// app/dashboard/page.js - mixed concerns
export default function Dashboard() {
  const [recordings, setRecordings] = useState([]);
  const [recordingError, setRecordingError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ❌ Data fetching logic in component
  const fetchRecordings = async () => {
    setIsLoading(true);
    try {
      const authToken = token || localStorage.getItem('careflow_token');
      const response = await fetch('/api/recordings', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (data.success) {
        setRecordings(data.data.recordings);
      }
    } catch (error) {
      setRecordingError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, [token]);

  return <RecordingsList recordings={recordings} isLoading={isLoading} />;
}
```

**After (separated data fetching):**

```javascript
// lib/api/recordings.js
export async function fetchRecordings(authToken) {
  const response = await fetch('/api/recordings', {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch recordings');
  }

  const data = await response.json();
  return data.data.recordings;
}

// lib/api/analytics.js
export async function fetchAnalytics(authToken) {
  const response = await fetch('/api/analytics', {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  const data = await response.json();
  return data.data;
}

// hooks/useRecordings.js
import { useCallback } from 'react';
import useSWR from 'swr';
import { fetchRecordings } from '@/lib/api/recordings';

export function useRecordings(authToken) {
  const { data, error, isLoading, mutate } = useSWR(
    authToken ? ['recordings', authToken] : null,
    async ([_, token]) => fetchRecordings(token),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = useCallback(() => mutate(), [mutate]);

  return {
    recordings: data || [],
    isLoading,
    error,
    refresh,
  };
}

// hooks/useAnalytics.js
import useSWR from 'swr';
import { fetchAnalytics } from '@/lib/api/analytics';

export function useAnalytics(authToken, options = {}) {
  return useSWR(
    authToken ? ['analytics', authToken] : null,
    async ([_, token]) => fetchAnalytics(token),
    {
      revalidateOnFocus: true,
      refreshInterval: 300000, // 5 minutes
      ...options,
    }
  );
}

// app/dashboard/page.js - presentation only
export default function Dashboard() {
  const { token, user } = useAuth();
  const { recordings, isLoading: recordingsLoading } = useRecordings(token);
  const { analytics, isLoading: analyticsLoading } = useAnalytics(token);

  if (recordingsLoading) return <LoadingSkeleton />;

  return (
    <div className="dashboard">
      <AnalyticsSection data={analytics} />
      <RecordingsSection recordings={recordings} />
    </div>
  );
}
```

---

## Isolating Side Effects and Async Operations

### Side Effect Categories

| Category     | Examples                       | Isolation Strategy             |
| ------------ | ------------------------------ | ------------------------------ |
| **Data**     | API calls, subscriptions       | Custom hooks or data libraries |
| **DOM**      | Window resize, scroll position | useEffect with cleanup         |
| **External** | WebSocket, EventSource         | Dedicated connection hooks     |
| **Timing**   | setInterval, setTimeout        | Custom timer hooks             |

### Implementation Pattern

```javascript
// hooks/useCallManager.js
import { useEffect, useCallback, useRef } from 'react';
import { useCallState } from './useCallState';
import { useAuth } from '@/context/AuthContext';
import { callManager } from '@/lib/callManager';

export function useCallManager() {
  const { token, user } = useAuth();
  const { setCallStatus, setMode, setCare4wId, setPhoneNumber, setCallError } = useCallState();

  const initialized = useRef(false);

  // Initialize call manager (side effect)
  useEffect(() => {
    if (!token || !user || initialized.current) return;

    const initialize = async () => {
      try {
        const { mode: callMode, care4wId: cfId } = await callManager.initialize(
          token,
          user.care4wId
        );

        setMode(callMode);
        setCare4wId(cfId);

        // Set up event listeners (more side effects)
        callManager.on('onCallStateChange', (status) => {
          setCallStatus(status);
        });

        callManager.on('onIncomingCall', (callData) => {
          setPhoneNumber(callData.from || callData.targetCare4wId);
          setCallStatus('incoming');
        });

        callManager.on('onError', (error) => {
          setCallError(error.message);
        });

        initialized.current = true;
      } catch (error) {
        setCallError(error.message);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      if (initialized.current) {
        callManager.disconnect();
        initialized.current = false;
      }
    };
  }, [token, user, setCallStatus, setMode, setCare4wId, setPhoneNumber, setCallError]);

  // Action methods (pure functions that trigger side effects)
  const makeCall = useCallback(
    async (phoneNumber) => {
      setCallError(null);
      try {
        await callManager.makeCall(phoneNumber);
      } catch (error) {
        setCallError(error.message);
        throw error;
      }
    },
    [setCallError]
  );

  const endCall = useCallback(() => {
    callManager.endCall();
  }, []);

  const muteCall = useCallback((shouldMute) => {
    callManager.mute(shouldMute);
  }, []);

  return {
    makeCall,
    endCall,
    muteCall,
  };
}
```

---

## Extracting UI Components from Business Logic

### Component Extraction Guidelines

```
components/
├── dashboard/
│   ├── DialPad/
│   │   ├── DialPad.jsx       # Pure UI
│   │   ├── DialPad.module.css
│   │   └── index.js
│   ├── CallHistory/
│   │   ├── CallHistory.jsx   # Pure UI
│   │   ├── CallHistoryItem.jsx
│   │   └── index.js
│   ├── Analytics/
│   │   ├── Analytics.jsx
│   │   ├── Charts.jsx
│   │   └── index.js
│   └── RecordingManager/
│       ├── RecordingManager.jsx
│       ├── RecordingList.jsx
│       └── index.js
├── common/
│   ├── Loading/
│   ├── ErrorBoundary/
│   └── Modal/
```

### Pure UI Component Pattern

**Before (business logic in UI):**

```javascript
// components/dashboard/DialPad.jsx - mixed concerns
export default function DialPad({ onCall }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const { makeCall, endCall } = useCallLogic(); // Business logic

  const handleCall = async () => {
    if (!phoneNumber) return;
    setIsCallActive(true);
    await makeCall(phoneNumber);
  };

  return (
    <div className="dial-pad">
      <input
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder="Enter number"
      />
      <button onClick={handleCall}>{isCallActive ? 'Calling...' : 'Call'}</button>
      {/* 100+ lines of UI code */}
    </div>
  );
}
```

**After (pure UI, logic extracted):**

```javascript
// components/dashboard/DialPad/DialPad.jsx - pure presentation
import { useState, useCallback } from 'react';
import { Phone, Mic, MicOff, PhoneOff } from 'lucide-react';
import { useDialPad } from './useDialPad';

export default function DialPad() {
  const [phoneNumber, setPhoneNumber] = useState("");

  const {
    isCalling,
    canCall,
    dial,
    hangup
  } = useDialPad();

  const handleDigitPress = useCallback((digit) => {
    setPhoneNumber((prev) => prev + digit);
  }, []);

  const handleBackspace = useCallback(() => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPhoneNumber("");
  }, []);

  const handleCall = useCallback(() => {
    if (phoneNumber && canCall) {
      dial(phoneNumber);
    }
  }, [phoneNumber, canCall, dial]);

  return (
    <div className="dial-pad">
      {/* Phone Number Display */}
      <div className="phone-display">
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter Care4W ID or phone number"
          className="phone-input"
          disabled={isCalling}
        />
      </div>

      {/* Dial Pad Grid */}
      <div className="dial-pad-grid">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigitPress(digit)}
            className="dial-button"
            disabled={isCalling}
          >
            {digit}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="dial-actions">
        <button
          onClick={handleCall}
          disabled={!canCall || isCalling}
          className="call-button"
        >
          <Phone className="icon" />
          {isCalling ? 'Calling...' : 'Call'}
        </button>

        <button
          onClick={handleBackspace}
          disabled={isCalling || !phoneNumber}
          className="action-button"
        >
          ←
        </button>

        <button
          onClick={handleClear}
          disabled={isCalling || !phoneNumber}
          className="action-button"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// components/dashboard/DialPad/useDialPad.js - business logic
import { useCallback } from 'react';
import { useCallState } from '@/hooks/useCallState';

export function useDialPad() {
  const { callStatus, phoneNumber, setPhoneNumber } = useCallState();

  const isCalling = ['connecting', 'ringing'].includes(callStatus);
  const isActive = callStatus === 'connected';
  const canCall = !isCalling && !isActive && phoneNumber.length > 0;

  const dial = useCallback((number) => {
    setPhoneNumber(number);
    // Trigger call through call manager
    // This will be handled by the parent component or context
  }, [setPhoneNumber]);

  const hangup = useCallback(() => {
    // Trigger hangup
  }, []);

  return {
    isCalling,
    isActive,
    canCall,
    dial,
    hangup,
  };
}

// components/dashboard/DialPad/index.js
export { default } from './DialPad';
export { useDialPad } from './useDialPad';
```

---

## Building Self-Contained Layout Components

### Layout Component Structure

```
components/layout/
├── Header/
│   ├── Header.jsx
│   ├── Header.module.css
│   ├── useHeader.js       # Header-specific logic
│   └── index.js
├── Sidebar/
│   ├── Sidebar.jsx
│   ├── SidebarItem.jsx
│   ├── SidebarContext.jsx
│   ├── useSidebar.js
│   └── index.js
└── Footer/
    ├── Footer.jsx
    └── index.js
```

### Self-Contained Header Component

```javascript
// components/layout/Header/Header.jsx
import { useState, useCallback } from 'react';
import { Bell, User, Settings, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

export default function Header({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = useCallback(async () => {
    await logout();
    // Navigation handled by auth context
  }, [logout]);

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="menu-toggle"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="header-center">
        {/* Search or breadcrumbs can go here */}
      </div>

      <div className="header-right">
        {/* Notifications */}
        <div className="notification-wrapper">
          <button
            className="icon-button"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
          </button>
          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {/* User Menu */}
        <div className="user-menu-wrapper">
          <button
            className="user-button"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="user-avatar"
              />
            ) : (
              <User size={20} />
            )}
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <div className="user-info">
                <span className="user-name">{user?.displayName}</span>
                <span className="user-email">{user?.email}</span>
              </div>
              <hr />
              <button onClick={() => {/* Navigate to settings */}}>
                <Settings size={16} />
                Settings
              </button>
              <button onClick={handleLogout}>
                <LogOut size={16} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// components/layout/Header/Header.module.css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 64px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-button {
  /* styles */
}

.user-menu-wrapper {
  position: relative;
}

/* ... more styles */
```

### Self-Contained Sidebar Component

```javascript
// components/layout/Sidebar/Sidebar.jsx
import { useState, useCallback, createContext, useContext } from 'react';
import {
  Phone,
  History,
  BarChart2,
  Settings,
  Mic,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Sidebar Context for state management
const SidebarContext = createContext();

export function useSidebar() {
  return useContext(SidebarContext);
}

export default function Sidebar({
  isCollapsed: externalCollapsed,
  onToggle,
  activeItem,
  onItemSelect,
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const toggle = useCallback(() => {
    if (onToggle) onToggle(!isCollapsed);
    else setInternalCollapsed(!isCollapsed);
  }, [isCollapsed, onToggle]);

  const menuItems = [
    { id: 'dialer', icon: Phone, label: 'Dialer' },
    { id: 'history', icon: History, label: 'Call History' },
    { id: 'analytics', icon: BarChart2, label: 'Analytics' },
    { id: 'recordings', icon: FileText, label: 'Recordings' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const handleItemClick = useCallback(
    (itemId) => {
      if (onItemSelect) onItemSelect(itemId);
    },
    [onItemSelect]
  );

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggle }}>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => handleItemClick(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={20} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <button
          className="sidebar-toggle"
          onClick={toggle}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </aside>
    </SidebarContext.Provider>
  );
}
```

---

## Authentication and Authorization Patterns

### Protected Route Pattern

```javascript
// components/ProtectedRoute/ProtectedRoute.jsx
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (requiredRole && user.role !== requiredRole) {
      router.push('/unauthorized');
    }
  }, [user, loading, router, requiredRole]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return children;
}

// Usage in page.js
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
```

### Authorization Hook

```javascript
// hooks/useAuthorization.js
import { useAuth } from '@/context/AuthContext';

export function useAuthorization() {
  const { user, token } = useAuth();

  const hasRole = useCallback(
    (role) => {
      return user?.role === role;
    },
    [user]
  );

  const hasAnyRole = useCallback(
    (roles) => {
      return roles.includes(user?.role);
    },
    [user]
  );

  const hasPermission = useCallback(
    (permission) => {
      return user?.permissions?.includes(permission);
    },
    [user]
  );

  const can = useCallback(
    (action, resource) => {
      // Implement your permission logic here
      const permissions = {
        'call:make': ['user', 'admin', 'agent'],
        'recordings:view': ['user', 'admin', 'supervisor'],
        'analytics:view': ['admin', 'supervisor'],
        'settings:edit': ['admin'],
      };

      return permissions[`${resource}:${action}`]?.includes(user?.role) ?? false;
    },
    [user]
  );

  return {
    user,
    token,
    hasRole,
    hasAnyRole,
    hasPermission,
    can,
    isAdmin: user?.role === 'admin',
    isSupervisor: user?.role === 'supervisor',
  };
}
```

---

## Error Boundaries and Loading States

### Error Boundary Implementation

```javascript
// components/common/ErrorBoundary/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // Optional: Send to error reporting service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={this.handleRetry}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// hooks/useErrorHandler.js
import { useCallback } from 'react';

export function useErrorHandler() {
  const handleError = useCallback((error, customMessage) => {
    console.error(error);
    // You could dispatch to global error state
    // or show a toast notification
    return {
      message: customMessage || error.message,
      code: error.code,
    };
  }, []);

  return { handleError };
}
```

### Loading States Pattern

```javascript
// components/common/Loading/LoadingStates.jsx
export function LoadingSpinner({ size = 'md', text }) {
  const sizeClasses = {
    sm: 'spinner-sm',
    md: 'spinner-md',
    lg: 'spinner-lg',
  };

  return (
    <div className="loading-spinner-container">
      <div className={`spinner ${sizeClasses[size]}`} />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}

export function Skeleton({ count = 1, className }) {
  return (
    <div className={`skeleton ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-line" />
      ))}
    </div>
  );
}

export function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="page-loader">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// hooks/useAsync.js
import { useState, useCallback } from 'react';

export function useAsync(asyncFunction, options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFunction(...args);
        setData(result);
        return result;
      } catch (err) {
        setError(err);
        if (!options.silent) {
          throw err;
        }
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction, options.silent]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, error, loading, execute, reset };
}
```

---

## Custom Hooks Architecture

### Hook Organization

```
hooks/
├── index.js                    # Barrel export
├── useAuth.js                  # Auth-specific (if not in context)
├── useCallManager.js           # Call functionality
├── useCallState.js             # Call state management
├── useDialPad.js               # Dial pad logic
├── useNotifications.js        # Push notifications
├── useRecordings.js            # Recording data
├── useAnalytics.js             # Analytics data
├── useLocalStorage.js          # Generic utility
├── useDebounce.js              # Utility hooks
└── utils/
    ├── asyncHelpers.js
    └── stateHelpers.js
```

### Custom Hook Examples

```javascript
// hooks/useCallManager.js - Complete example
import { useEffect, useCallback, useRef } from 'react';
import { useCallState } from './useCallState';
import { useAuth } from '@/context/AuthContext';
import { callManager } from '@/lib/callManager';

export function useCallManager() {
  const { token, user } = useAuth();
  const {
    callStatus,
    setCallStatus,
    setMode,
    setCare4wId,
    setPhoneNumber,
    setCallError,
    setCallDuration,
    callDuration,
  } = useCallState();

  const timerRef = useRef(null);
  const initializedRef = useRef(false);

  // Initialize call manager
  useEffect(() => {
    if (!token || !user || initializedRef.current) return;

    const init = async () => {
      try {
        const { mode: callMode, care4wId: cfId } = await callManager.initialize(
          token,
          user.care4wId
        );

        setMode(callMode);
        setCare4wId(cfId);

        // Event listeners
        callManager.on('onCallStateChange', (status) => {
          setCallStatus(status);

          // Handle call timer
          if (status === 'connected') {
            startTimer();
          } else {
            stopTimer();
          }
        });

        callManager.on('onIncomingCall', (callData) => {
          setPhoneNumber(callData.from || callData.targetCare4wId);
          setCallStatus('incoming');
        });

        callManager.on('onError', (error) => {
          setCallError(error.message);
        });

        initializedRef.current = true;
      } catch (error) {
        setCallError(error.message);
      }
    };

    init();

    return () => {
      if (initializedRef.current) {
        callManager.disconnect();
        initializedRef.current = false;
      }
    };
  }, [token, user, setCallStatus, setMode, setCare4wId, setPhoneNumber, setCallError]);

  const startTimer = useCallback(() => {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, [setCallDuration]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallDuration(0);
  }, [setCallDuration]);

  const makeCall = useCallback(
    async (phoneNumber) => {
      setCallError(null);
      setCallStatus('connecting');

      try {
        await callManager.makeCall(phoneNumber);
      } catch (error) {
        setCallError(error.message);
        setCallStatus('idle');
        throw error;
      }
    },
    [setCallError, setCallStatus]
  );

  const endCall = useCallback(() => {
    callManager.endCall();
    setCallStatus('disconnected');
  }, [setCallStatus]);

  const answerCall = useCallback(async () => {
    setCallStatus('connecting');
    await callManager.answerCall();
  }, [setCallStatus]);

  const declineCall = useCallback(() => {
    callManager.declineCall();
    setCallStatus('idle');
  }, [setCallStatus]);

  const muteCall = useCallback((shouldMute) => {
    callManager.mute(shouldMute);
  }, []);

  const holdCall = useCallback((shouldHold) => {
    callManager.hold(shouldHold);
  }, []);

  return {
    // State (read-only)
    callStatus,
    callDuration,

    // Actions
    makeCall,
    endCall,
    answerCall,
    declineCall,
    muteCall,
    holdCall,

    // Utilities
    formatDuration: (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
  };
}
```

### Generic Utility Hooks

```javascript
// hooks/useLocalStorage.js
import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

// hooks/useDebounce.js
import { useState, useEffect } from 'react';

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// hooks/useClickOutside.js
import { useEffect } from 'react';

export function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
```

---

## Refactoring Patterns: Before and After

### Complete Dashboard Refactor

**Before ( monolithic page.js - ~400 lines):**

```javascript
// app/dashboard/page.js - BEFORE
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Phone, LogOut } from 'lucide-react';
import CallControls from '@/components/dashboard/CallControls';
import DialPadModal from '@/components/dashboard/DialPadModal';
import CallStatus from '@/components/dashboard/CallStatus';
import CallHistory from '@/components/dashboard/CallHistory';
import Analytics from '@/components/dashboard/Analytics';
import RecordingManager from '@/components/dashboard/RecordingManager';
import ProtectedRoute from '@/components/ProtectedRoute/ProtectedRoute';
import { useNotifications } from '@/hooks/useNotifications';
import { callManager } from '@/lib/callManager';
import { AudioProcessor } from '@/lib/audioProcessor';

export default function Dashboard() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dialer');

  // Call state (15+ variables)
  const [callStatus, setCallStatus] = useState('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [mode, setMode] = useState(null);
  const [care4wId, setCare4wId] = useState(null);
  const [modeInfo, setModeInfo] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callError, setCallError] = useState(null);
  const [isDialPadOpen, setIsDialPadOpen] = useState(false);

  // Data state
  const [callHistory, setCallHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  const timerInterval = useRef(null);
  const [pendingWebRTCCall, setPendingWebRTCCall] = useState(null);

  const {
    isSupported: notificationsSupported,
    permission: notificationPermission,
    registerToken,
  } = useNotifications({
    token,
    onIncomingCall: (callData) => {
      console.log('Incoming call notification received:', callData);
      setPhoneNumber(callData.from);
      setCallStatus('incoming');
    },
  });

  const [recordings, setRecordings] = useState([]);
  const [currentRecording, setCurrentRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState(null);

  // Multiple useEffects for different concerns
  useEffect(() => {
    if (token) {
      fetchRecordings();
      fetchAnalytics();
      fetchCallHistory();
    }
  }, [token]);

  const fetchRecordings = async () => {
    // Implementation...
  };

  const fetchAnalytics = async () => {
    // Implementation...
  };

  const fetchCallHistory = async () => {
    // Implementation...
  };

  // Initialize Call Manager
  const initializeCallManager = useCallback(async () => {
    // Implementation (~50 lines)
  }, [token, user]);

  useEffect(() => {
    initializeCallManager();
  }, [initializeCallManager]);

  // Timer functions
  const startCallTimer = () => {
    /* ... */
  };
  const stopCallTimer = () => {
    /* ... */
  };

  // Call actions
  const makeCall = useCallback(async () => {
    // Implementation
  }, [phoneNumber]);

  const endCall = useCallback(() => {
    // Implementation
  }, []);

  // Render
  if (authLoading) return <LoadingSpinner />;

  return (
    <ProtectedRoute>
      <div className="dashboard-layout">
        <header>...</header>
        <main>
          {activeTab === 'dialer' && <DialPadModal />}
          {activeTab === 'history' && <CallHistory />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'recordings' && <RecordingManager />}
        </main>
        <footer>...</footer>
      </div>
    </ProtectedRoute>
  );
}
```

**After (separated concerns - ~150 lines):**

```javascript
// app/dashboard/page.js - AFTER
"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ErrorBoundary from "@/components/common/ErrorBoundary/ErrorBoundary";
import { PageLoader } from "@/components/common/Loading/LoadingStates";
import { useAuth } from "@/context/AuthContext";
import { useRecordings } from "@/hooks/useRecordings";
import { useCallManager } from "@/hooks/useCallManager";

export default function DashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("dialer");

  // Custom hooks handle all complexity
  const { recordings, refresh: refreshRecordings } = useRecordings(token);
  const callManager = useCallManager();

  // Tab configuration
  const tabs = [
    { id: "dialer", component: DialPadTab },
    { id: "history", component: CallHistoryTab },
    { id: "analytics", component: AnalyticsTab },
    { id: "recordings", component: RecordingsTab },
  ];

  const ActiveTabComponent = tabs.find(t => t.id === activeTab)?.component;

  if (authLoading) {
    return <PageLoader text="Loading dashboard..." />;
  }

  return (
    <ProtectedRoute>
      <ErrorBoundary
        fallback={(error, retry) => (
          <ErrorDisplay error={error} onRetry={retry} />
        )}
      >
        <DashboardLayout
          user={user}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        >
          {ActiveTabComponent && (
            <ActiveTabComponent
              callManager={callManager}
              recordings={recordings}
              onRefreshRecordings={refreshRecordings}
            />
          )}
        </DashboardLayout>
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

// Sub-components in separate files
// components/dashboard/tabs/DialPadTab.jsx
export default function DialPadTab({ callManager }) {
  const {
    dialPadState,
    dial,
    hangup,
    mute
  } = callManager;

  return (
    <DialPad
      value={dialPadState.phoneNumber}
      onChange={dialPadState.setPhoneNumber}
      onCall={dial}
      onEnd={hangup}
      onMute={mute}
      disabled={dialPadState.isBusy}
    />
  );
}
```

---

## Decision Matrix: When to Use What

| Concern                   | Solution              | When to Use                                  |
| ------------------------- | --------------------- | -------------------------------------------- |
| **UI State**              | `useState`            | Simple, component-local state                |
| **Complex UI State**      | `useReducer`          | Multiple related states, complex transitions |
| **Cross-component State** | Context               | Few providers, avoid over-optimization       |
| **Auth/User Data**        | Context + Custom Hook | Always for auth                              |
| **API Data**              | React Query / SWR     | Server state, caching needed                 |
| **Global Store**          | Zustand / Jotai       | Multiple complex slices                      |
| **Form State**            | React Hook Form       | Any form with validation                     |
| **Side Effects**          | Custom Hooks          | Reusable effect logic                        |
| **Logic Extraction**      | Custom Hooks          | Business logic, computed values              |
| **UI Composition**        | Component Props       | Reusable UI components                       |
| **Layout**                | Slot Pattern          | Flexible layouts                             |

### Quick Reference Guide

```javascript
// ✅ USE: useState for UI state
const [isOpen, setIsOpen] = useState(false);

// ✅ USE: useReducer for complex state
const [state, dispatch] = useReducer(reducer, initialState);

// ✅ USE: Context for auth
const auth = useAuth();

// ✅ USE: React Query for server state
const { data } = useQuery({ queryKey: ['key'], queryFn });

// ✅ USE: Zustand for global UI state
const useStore = create((set) => ({
  /* ... */
}));

// ✅ USE: Custom hook for reusable logic
const value = useCustomHook(dep);

// ✅ USE: Component composition for UI
<Layout>
  <Content />
</Layout>;

// ✅ USE: Props for configuration
<Button variant="primary" onClick={handleClick} />;
```

---

## Page.js Thickness Guidelines

### When to Keep page.js Thin (~50-100 lines)

**Signs page.js should be thin:**

- It primarily composes child components
- Most logic is in custom hooks
- State is managed in external stores
- Data fetching is handled by data libraries
- No complex business rules in the page

```javascript
// ✅ THIN PAGE.JS - Good example
export default function DashboardPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <DashboardLayout user={user}>
      <SectionNavigator active={activeSection} onChange={setActiveSection} />
      <SectionRenderer section={activeSection} />
    </DashboardLayout>
  );
}
```

### When Moderate Complexity is Acceptable (~150-200 lines)

**Acceptable page.js complexity:**

- Page orchestrates multiple data sources
- Cross-cutting concerns (auth, error boundaries)
- Initial setup that doesn't fit elsewhere
- Route-specific logic

```javascript
// ✅ MODERATE PAGE.JS - Acceptable complexity
export default function AnalyticsPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [filters, setFilters] = useState({});

  // Data fetching for this specific page
  const { analytics, isLoading, error } = useAnalytics(dateRange, filters);

  // Route-specific logic
  useEffect(() => {
    if (!canViewAnalytics(user)) {
      router.push('/unauthorized');
    }
  }, [user]);

  // Handle share functionality
  const handleShare = useCallback(async () => {
    await shareAnalytics(analytics, user);
  }, [analytics, user]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <PageContainer>
      <PageHeader title="Analytics" actions={<ShareButton onShare={handleShare} />} />
      <DateRangeSelector value={dateRange} onChange={setDateRange} />
      <FilterBar filters={filters} onChange={setFilters} />
      <AnalyticsChart data={analytics} />
      <AnalyticsTable data={analytics} />
    </PageContainer>
  );
}
```

### When to Refactor (Signs page.js is too thick)

**Refactor when:**

- > 200 lines
- Multiple unrelated concerns
- Deeply nested useEffects
- Hard to test in isolation
- Duplicated logic across pages

---

## Import/Export Best Practices

### Barrel Exports Pattern

```javascript
// hooks/index.js
export { useAuth } from './useAuth';
export { useCallManager } from './useCallManager';
export { useRecordings } from './useRecordings';
export { useAnalytics } from './useAnalytics';
export { useNotifications } from './useNotifications';
export { useAsync } from './useAsync';
export { useLocalStorage } from './useLocalStorage';
export { useDebounce } from './useDebounce';

// components/dashboard/index.js
export { default as DialPad } from './DialPad';
export { default as CallControls } from './CallControls';
export { default as CallHistory } from './CallHistory';
export { default as Analytics } from './Analytics';
export { default as RecordingManager } from './RecordingManager';
```

### Named Exports for Utilities

```javascript
// lib/api/recordings.js
export async function fetchRecordings(token) {
  // implementation
}

export async function uploadRecording(token, file) {
  // implementation
}

export async function deleteRecording(token, id) {
  // implementation
}

// lib/api/index.js
export * from './recordings';
export * from './analytics';
export * from './calls';
```

### Component Exports

```javascript
// components/dashboard/DialPad/index.js
export { default } from './DialPad';
export { useDialPad } from './useDialPad';
export { DialPadSkeleton } from './DialPadSkeleton';
export { DialPadButton } from './DialPadButton';
```

### Import Organization

```javascript
// ✅ RECOMMENDED: Organized imports
// 1. React/Next.js imports
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party imports
import { format, parseISO } from 'date-fns';
import { useQuery, useMutation } from '@tanstack/react-query';

// 3. Context/Hooks
import { useAuth } from '@/context/AuthContext';
import { useCallManager } from '@/hooks/useCallManager';

// 4. Components
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import DialPad from '@/components/dashboard/DialPad';
import CallHistory from '@/components/dashboard/CallHistory';

// 5. Lib/Utils
import { formatDuration } from '@/lib/utils';
import { fetchRecordings } from '@/lib/api/recordings';

// 6. Styles
import styles from './Dashboard.module.css';
```

---

## Summary Checklist

### Before You Ship

- [ ] **State is separated**: Local, global, server state each have their home
- [ ] **Data fetching is isolated**: API calls are in dedicated hooks/lib files
- [ ] **Side effects are contained**: Async operations are wrapped in useEffect with cleanup
- [ ] **UI is pure**: Components receive data via props, emit events via callbacks
- [ ] **Layout components are self-contained**: Headers, sidebars, footers manage their own state
- [ ] **Auth is handled properly**: ProtectedRoute wraps protected pages
- [ ] **Errors are caught**: Error boundaries wrap risky components
- [ ] **Loading states exist**: Skeletons or spinners for async operations
- [ ] **Custom hooks are reusable**: Logic extracted to hooks for reuse
- [ ] **Page.js is appropriately thin**: No monolithic components
- [ ] **Imports are organized**: Grouped and using barrel exports where helpful
- [ ] **Tests are possible**: Each concern can be tested in isolation

---

## Additional Resources

- [React Documentation: Hooks](https://react.dev/reference/react)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Component Composition](https://react.dev/learn/composing-components)
