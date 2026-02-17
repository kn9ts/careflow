# ESLint Fixes Todo List

> Generated: 2026-02-13
> Status: Pending

This document tracks all ESLint warnings from the Next.js build and recommended fixes.

---

## API Route Fixes (Priority: High)

### 1. `app/api/auth/logout/route.js:5` - Unused `request` parameter

**Current Code:**

```javascript
export async function POST(request) {
```

**Fix:** Rename to `_request`

```javascript
export async function POST(_request) {
```

**Status:** [ ] Pending

---

### 2. `app/api/recordings/route.js:11` - Unused `backblazeStorage` import

**Current Code:**

```javascript
import backblazeStorage from '@/lib/backblaze';
```

**Fix:** Remove the import (not used in GET handler)

```javascript
// Removed: import backblazeStorage from '@/lib/backblaze';
```

**Status:** [ ] Pending

---

### 3. `app/api/recordings/upload/route.js:69` - Unused `recordingId` variable

**Current Code:**

```javascript
const recordingId = uuidv4();
const filename = `${direction}-${callId}-${Date.now()}.webm`;
```

**Fix:** Remove the unused variable

```javascript
const filename = `${direction}-${callId}-${Date.now()}.webm`;
```

**Status:** [ ] Pending

---

### 4. `app/api/token/route.js:17` - Unused `lookupCare4wId` import

**Current Code:**

```javascript
import { lookupCare4wId } from '@/lib/careFlowIdGenerator';
```

**Fix:** Remove the import

```javascript
// Removed: import { lookupCare4wId } from '@/lib/careFlowIdGenerator';
```

**Status:** [ ] Pending

---

### 5. `app/api/token/route.js:51` - Unused `apiSecret` in destructuring

**Current Code:**

```javascript
const { accountSid, apiKey, apiSecret, twimlAppSid } = credentials;
```

**Fix:** Prefix with underscore or remove from destructuring

```javascript
const { accountSid, apiKey, apiSecret: _apiSecret, twimlAppSid } = credentials;
```

**Status:** [ ] Pending

---

### 6. `app/api/webhooks/twilio/voicemail/route.js:16` - Unused `recordingUrl`

**Current Code:**

```javascript
const recordingUrl = formData.get('RecordingUrl');
```

**Fix:** Prefix with underscore (may be needed for future features)

```javascript
const _recordingUrl = formData.get('RecordingUrl');
```

**Status:** [ ] Pending

---

## Frontend Component Fixes (Priority: Medium)

### 7. `app/dashboard/tabs/DialerTab.jsx:84` - Unused `formatDuration` function

**Current Code:**

```javascript
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
```

**Fix:** Either remove or use for displaying `callDuration`

```javascript
// Option A: Remove entirely
// Option B: Use in JSX: {formatDuration(callDuration)}
```

**Status:** [ ] Pending

---

### 8. `app/dashboard/tabs/HistoryTab.jsx:8` - Unused `CardSkeleton` import

**Current Code:**

```javascript
import { CardSkeleton, TableSkeleton } from '@/components/common/Loading/LoadingComponents';
```

**Fix:** Remove `CardSkeleton` from import

```javascript
import { TableSkeleton } from '@/components/common/Loading/LoadingComponents';
```

**Status:** [ ] Pending

---

### 9. `app/forgot-password/page.js:12` - Unused `router`

**Current Code:**

```javascript
const router = useRouter();
```

**Fix:** Remove if not needed, or prefix with underscore

```javascript
const _router = useRouter(); // If needed for future navigation
// OR remove entirely
```

**Status:** [ ] Pending

---

### 10. `app/forgot-password/page.js:44` - Unused `getErrorMessage`

**Fix:** Remove the function or prefix with underscore

**Status:** [ ] Pending

---

### 11. `app/login/page.js:13` - Unused `setAuthError`

**Current Code:**

```javascript
const [authError, setAuthError] = useState(null);
```

**Fix:** Remove if not used, or use for error display

```javascript
const [authError] = useState(null); // If only reading
// OR use setAuthError in error handling
```

**Status:** [ ] Pending

---

### 12. `app/login/page.js:43` - Unused `getErrorMessage`

**Fix:** Remove or use for error message formatting

**Status:** [ ] Pending

---

### 13. `app/test-auth/page.js:3` - Unused `useEffect` import

**Current Code:**

```javascript
import { useState, useEffect } from 'react';
```

**Fix:** Remove `useEffect` from import

```javascript
import { useState } from 'react';
```

**Status:** [ ] Pending

---

### 14. `app/test-auth/page.js:11,12` - Unused `setTestEmail`, `setTestPassword`

**Fix:** Remove setters or use them in the form

**Status:** [ ] Pending

---

## Accessibility & Performance Fixes (Priority: Low)

### 15. `app/forgot-password/page.js:61` - Use Next.js Image component

**Warning:** Using `<img>` instead of `<Image />`

**Fix:** Replace with Next.js Image component

```javascript
import Image from 'next/image';
// <Image src="/logo.svg" alt="CareFlow" width={150} height={40} />
```

**Status:** [ ] Pending

---

### 16. `app/login/page.js:62` - Use Next.js Image component

**Status:** [ ] Pending

---

### 17. `app/page.js:34` - Use Next.js Image component

**Status:** [ ] Pending

---

### 18. `app/signup/page.js:97` - Use Next.js Image component

**Status:** [ ] Pending

---

### 19. Form labels accessibility (multiple files)

**Files affected:**

- `app/forgot-password/page.js:120`
- `app/login/page.js:101, 119`
- `app/signup/page.js:136, 152, 169, 186`

**Fix:** Associate labels with form controls using `htmlFor` attribute

```javascript
<label htmlFor="email">Email</label>
<input id="email" type="email" ... />
```

**Status:** [ ] Pending

---

## React Best Practice Fixes (Priority: Medium)

### 20. `app/dashboard/page.js:192` - Nested component definition

**Warning:** Do not define components during render

**Fix:** Move component definition outside parent component

```javascript
// Before: const TabComponent = () => { ... } inside DashboardPage
// After: Move TabComponent outside DashboardPage
```

**Status:** [ ] Pending

---

### 21. `components/ProtectedRoute/ProtectedRoute.js:41` - Useless Fragment

**Fix:** Remove Fragment if only one child

```javascript
// Before: <> {children} </>
// After: {children}
```

**Status:** [ ] Pending

---

### 22. `components/dashboard/CallControls.js:215` - Useless Fragment

**Status:** [ ] Pending

---

### 23. Array index as key (multiple files)

**Files affected:**

- `app/test-auth/page.js:247`
- `components/common/Loading/LoadingComponents.jsx:61, 105, 109, 111`
- `components/dashboard/Analytics.js:18, 168`
- `components/dashboard/CallHistory.js:286`
- `components/dashboard/DialPad.js:146`

**Fix:** Use unique IDs instead of array index

```javascript
// Before: {items.map((item, index) => <div key={index}>...)}
// After: {items.map((item) => <div key={item.id}>...)}
```

**Status:** [ ] Pending

---

## Other Fixes

### 24. `components/dashboard/CallHistory.js:158, 196` - Unexpected `alert()`

**Fix:** Replace with proper UI notification/toast

```javascript
// Before: alert('Message')
// After: toast.error('Message') // or custom notification
```

**Status:** [ ] Pending

---

### 25. `components/dashboard/CallStatus.js:414` - Missing return value

**Warning:** Arrow function expected no return value

**Fix:** Ensure consistent return in function

**Status:** [ ] Pending

---

### 26. `components/dashboard/RecordingManager.js` - Multiple unused variables

**Lines:** 21, 22, 23, 27

**Fix:** Prefix unused destructured values with underscore

```javascript
const {
  currentRecording: _currentRecording,
  isRecording: _isRecording,
  onRefresh: _onRefresh,
} = props;
```

**Status:** [ ] Pending

---

### 27. `components/dashboard/RecordingPlayer.js:36` - Missing useEffect dependency

**Warning:** `fetchRecordingUrl` missing from dependency array

**Fix:** Add to dependencies or use useCallback

```javascript
useEffect(() => {
  fetchRecordingUrl();
}, [fetchRecordingUrl]); // Add fetchRecordingUrl
```

**Status:** [ ] Pending

---

### 28. `components/layout/DashboardSidebar.jsx:50` - Context value changes every render

**Fix:** Wrap context value in useMemo

```javascript
const contextValue = useMemo(() => ({ ...value }), [dependencies]);
```

**Status:** [ ] Pending

---

## Summary

| Category             | Count  | Priority |
| -------------------- | ------ | -------- |
| API Routes           | 6      | High     |
| Frontend Components  | 8      | Medium   |
| Accessibility        | 8      | Low      |
| React Best Practices | 8      | Medium   |
| Other                | 6      | Low      |
| **Total**            | **36** | -        |

---

## Quick Fix Commands

To fix all "unused variable" warnings quickly by prefixing with underscore:

```bash
# These are manual fixes - review each one before applying
# 1. logout/route.js: request → _request
# 2. token/route.js: apiSecret → _apiSecret
# 3. voicemail/route.js: recordingUrl → _recordingUrl
```

To remove unused imports automatically (review first):

```bash
# ESLint auto-fix can handle some of these
npx eslint --fix app/
```
