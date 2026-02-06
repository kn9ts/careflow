# CareFlow Application Analysis Report

**Date:** 2026-01-31
**Version:** 1.0.0
**Analyst:** Kilo Code

---

## Executive Summary

CareFlow is a customer care platform built with Next.js 14, React 18, Firebase Authentication, Twilio Programmable Voice API, and MongoDB. The application enables businesses to communicate with their customers through web-based phone calls and voicemail, with features including call recording, call history, analytics, and real-time call controls.

This report provides a comprehensive analysis of the application's architecture, functionality, and identifies areas for improvement, missing features, and optimization opportunities.

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Technical Architecture](#technical-architecture)
3. [How the Application Works](#how-the-application-works)
4. [Missing Features](#missing-features)
5. [Erroneous Features](#erroneous-features)
6. [Optimization Opportunities](#optimization-opportunities)
7. [Security Considerations](#security-considerations)
8. [Recommendations](#recommendations)

---

## 1. Application Overview

### 1.1 Purpose

CareFlow is a web-based telephony application that allows users to:

- Make outbound phone calls from their browser
- Receive incoming phone calls
- Record calls automatically
- View call history and analytics
- Manage call controls (mute, hangup, DTMF)

### 1.2 Tech Stack

| Category       | Technology                | Version |
| -------------- | ------------------------- | ------- |
| Framework      | Next.js                   | 14.2.21 |
| UI Library     | React                     | 18.3.1  |
| Authentication | Firebase Auth             | Latest  |
| Voice API      | Twilio Programmable Voice | Latest  |
| Database       | MongoDB (Mongoose)        | Latest  |
| Storage        | Firebase Storage          | Latest  |
| Styling        | Tailwind CSS              | Latest  |
| Charts         | Recharts                  | Latest  |

### 1.3 Key Features

- Browser-based calling using Twilio Programmable Voice
- **WebRTC Fallback**: Browser-to-browser calls when Twilio credentials are missing
- Firebase Authentication with email/password
- JWT token management with automatic refresh
- Call recording and storage
- Real-time call controls (mute, hangup, DTMF)
- Call history with filtering and pagination
- Analytics dashboard with call statistics
- Responsive dark-themed UI

---

## 2. Technical Architecture

### 2.1 Project Structure

```
careflow/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── analytics/            # Analytics endpoint
│   │   ├── calls/                # Call history endpoint
│   │   ├── token/                # Twilio token endpoint
│   │   └── webhooks/             # Twilio webhooks
│   ├── dashboard/                # Main dashboard page
│   ├── login/                    # Login page
│   ├── signup/                   # Signup page
│   └── forgot-password/          # Password reset page
├── components/                   # React components
│   ├── dashboard/                # Dashboard components
│   └── ProtectedRoute/          # Route protection
├── context/                     # React Context
│   └── AuthContext.js           # Authentication context
├── lib/                         # Utility libraries
│   ├── auth.js                  # Authentication utilities
│   ├── db.js                    # Database connection
│   ├── firebase.js              # Firebase client config
│   ├── firebaseStorage.js       # Firebase Storage utilities
│   ├── twilio.js               # Twilio service wrapper
│   ├── webrtc.js               # WebRTC peer connection manager
│   ├── callManager.js           # Unified call interface (Twilio/WebRTC)
│   └── env.config.js           # Environment configuration
└── models/                      # Mongoose models
    ├── User.js                  # User model
    └── Recording.js             # Recording model
```

### 2.2 Data Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─────────────────────────────────────────────┐
       │                                             │
       ▼                                             ▼
┌──────────────┐                            ┌──────────────┐
│   Firebase   │                            │   Twilio     │
│   Auth       │                            │   Voice SDK  │
└──────┬───────┘                            └──────┬───────┘
       │                                            │
       │                                            │
       ▼                                            ▼
┌──────────────┐                            ┌──────────────┐
│  Next.js     │◄──────────────────────────►│  Twilio     │
│  API Routes  │   Webhooks & Tokens       │  API        │
└──────┬───────┘                            └──────┬───────┘
       │                                            │
       ▼                                            │
┌──────────────┐                                    │
│  MongoDB     │◄─────────────────────────────────────┘
│  Atlas       │   Call Status & Recording Data
└──────────────┘
```

### 2.3 Authentication Flow

```
1. User enters credentials
   ↓
2. Firebase Auth validates credentials
   ↓
3. Firebase returns ID token
   ↓
4. Client sends token to /api/auth/login
   ↓
5. Server verifies token with Firebase Admin
   ↓
6. Server creates/updates user in MongoDB
   ↓
7. Server returns user data with Twilio client identity
   ↓
8. Client stores token in AuthContext
   ↓
9. Token auto-refreshes every 50 minutes
```

### 2.4 Call Flow

```
Outbound Call:
1. User enters phone number
   ↓
2. Client requests Twilio token from /api/token
   ↓
3. Server generates JWT with VoiceGrant
   ↓
4. Client initializes Twilio Device with token
   ↓
5. User clicks "Make Call"
   ↓
6. Twilio Device connects to Twilio API
   ↓
7. Call is established
   ↓
8. Twilio sends status webhook on completion
   ↓
9. Server creates Recording document in MongoDB

Incoming Call:
1. Twilio receives call to Twilio number
   ↓
2. Twilio sends webhook to /api/webhooks/twilio/voice
   ↓
3. Server returns TwiML to connect to browser client
   ↓
4. Twilio Device receives "incoming" event
   ↓
5. User accepts or rejects call
   ↓
6. Call is established or rejected
   ↓
7. Twilio sends status webhook on completion
```

---

## 3. How the Application Works

### 3.1 Authentication System

The authentication system uses Firebase Authentication as the primary identity provider, with MongoDB storing additional user metadata.

**Components:**

- [`AuthContext.js`](careflow/context/AuthContext.js:1) - Client-side authentication state management
- [`lib/auth.js`](careflow/lib/auth.js:1) - Server-side authentication utilities
- [`lib/firebase.js`](careflow/lib/firebase.js:1) - Firebase client initialization

**Key Features:**

- Email/password authentication
- Password reset via email
- Automatic token refresh (every 50 minutes)
- User session persistence (localStorage)
- Role-based access control (user/admin)

**Authentication Endpoints:**

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### 3.2 Dashboard

The dashboard ([`app/dashboard/page.js`](careflow/app/dashboard/page.js:1)) is the main application interface with three tabs:

**Dialer Tab:**

- Phone number input with dial pad
- Call status display
- Call controls (make call, hangup, accept, reject, mute)
- Quick stats display

**History Tab:**

- Paginated call history list
- Filtering by type (all, incoming, outgoing, missed)
- Sorting by date, caller, duration, status
- Refresh functionality

**Analytics Tab:**

- Total calls count
- Total voicemails count
- Total duration
- Success rate
- Today's calls
- Average call duration
- Recent calls list

### 3.3 Twilio Integration

**Token Generation ([`app/api/token/route.js`](careflow/app/api/token/route.js:1)):**

- Generates JWT access tokens for Twilio Programmable Voice
- Includes VoiceGrant with outgoing application SID
- Sets incoming allow to true for receiving calls

**Webhooks:**

- [`/api/webhooks/twilio/voice`](careflow/app/api/webhooks/twilio/voice/route.js:1) - Handles incoming call routing
- [`/api/webhooks/twilio/status`](careflow/app/api/webhooks/twilio/status/route.js:1) - Handles call status updates (updates existing recordings OR creates new ones if missing)

**Twilio Service ([`lib/twilio.js`](careflow/lib/twilio.js:1)):**

- Wrapper class for Twilio Device SDK
- Event listener management
- Connection management

### 3.4 WebRTC Fallback Support

CareFlow supports dual calling modes with automatic fallback:

**Mode 1: Twilio Voice (Default)**

- Uses Twilio Programmable Voice SDK
- PSTN calls to regular phone numbers
- Call recording via Twilio
- Professional telephony features
- Requires: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

**Mode 2: WebRTC Peer-to-Peer (Fallback)**

- Browser-to-browser calls when Twilio credentials are missing
- Free peer-to-peer encrypted audio
- No telephony costs
- Works between CareFlow users only
- Uses Firebase Realtime Database for signaling

**Automatic Detection Logic:**

```javascript
const twilioConfigured = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN;

if (twilioConfigured) {
  mode = "twilio";
  // Use Twilio Voice SDK
} else {
  mode = "webrtc";
  // Use WebRTC for browser-to-browser
}
```

**WebRTC Architecture:**

```
UserA → Signaling Server → UserB
   │         │
   └────► Direct WebRTC ◄────┘
         (P2P Connection)
```

**Related Files:**

- [`lib/webrtc.js`](careflow/lib/webrtc.js:1) - WebRTC peer connection manager
- [`lib/callManager.js`](careflow/lib/callManager.js:1) - Unified call interface
- [`plans/WEBRTC_FALLBACK_ARCHITECTURE.md`](careflow/plans/WEBRTC_FALLBACK_ARCHITECTURE.md) - Detailed architecture

### 3.5 Database Models

**User Model ([`models/User.js`](careflow/models/User.js:1)):**

```javascript
{
  firebaseUid: String (unique, indexed),
  email: String (unique, lowercase),
  displayName: String,
  photoURL: String,
  role: String (enum: ["user", "admin"]),
  isActive: Boolean,
  twilioPhoneNumber: String,
  twilioClientIdentity: String (unique, sparse),
  notifications: {
    incomingCalls: Boolean,
    missedCalls: Boolean,
    voicemails: Boolean,
    email: Boolean
  },
  storageUsed: Number,
  storageLimit: Number,
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Recording Model ([`models/Recording.js`](careflow/models/Recording.js:1)):**

```javascript
{
  userId: ObjectId (ref: User),
  firebaseUid: String (indexed),
  type: String (enum: ["call", "voicemail"]),
  sid: String (unique),
  callSid: String,
  from: String,
  to: String,
  direction: String (enum: ["inbound", "outbound"]),
  s3Key: String,
  s3Bucket: String,
  duration: Number,
  fileSize: Number,
  format: String,
  recordedAt: Date,
  uploadedAt: Date,
  listenedAt: Date,
  archivedAt: Date,
  status: String (enum: ["active", "archived", "deleted"]),
  storageClass: String (enum: ["STANDARD", "GLACIER_DEEP_ARCHIVE"]),
  isListened: Boolean,
  transcription: String,
  callerLocation: String
}
```

### 3.5 API Endpoints

| Endpoint                      | Method | Description                     |
| ----------------------------- | ------ | ------------------------------- | -------------------------- |
| `/api/auth/login`             | POST   | Authenticate user               |
| `/api/auth/register`          | POST   | Register new user               |
| `/api/auth/logout`            | POST   | Logout user                     |
| `/api/token`                  | GET    | Generate Twilio/WebRTC token    |
| `/api/calls/history`          | GET    | Get call history                |
| `/api/analytics`              | GET    | Get call analytics              |
| `/api/webhooks/twilio/voice`  | POST   | Handle incoming calls (Twilio)  |
| `/api/webhooks/twilio/status` |        | POST                            | Handle call status updates |
| `/api/signaling/offer`        | POST   | WebRTC offer exchange (WebRTC)  |
| `/api/signaling/answer`       | POST   | WebRTC answer exchange (WebRTC) |
| `/api/signaling/ice`          | POST   | WebRTC ICE candidate exchange   |

---

## 4. Missing Features

### 4.1 Critical Missing Features

| Feature                     | Impact                                           | Priority |
| --------------------------- | ------------------------------------------------ | -------- |
| **Call Recording Playback** | Users cannot listen to recorded calls            | High     |
| **Voicemail System**        | No voicemail functionality despite model support | High     |
| **Contact Management**      | No way to save/manage contacts                   | High     |
| **Call Notes/Tags**         | Cannot add notes or tags to calls                | Medium   |
| **Export Call History**     | Cannot export call data                          | Medium   |
| **Real-time Notifications** | No incoming call notifications                   | High     |
| **Call Transfer**           | Cannot transfer calls                            | Medium   |
| **Conference Calling**      | No multi-party calling support                   | Low      |
| **SMS Integration**         | No SMS messaging capability                      | Medium   |
| **Call Scheduling**         | Cannot schedule calls                            | Low      |

### 4.2 UI/UX Missing Features

| Feature                    | Impact                                   | Priority |
| -------------------------- | ---------------------------------------- | -------- |
| **Settings Page**          | No user settings interface               | High     |
| **Profile Management**     | Cannot update profile information        | High     |
| **Dark/Light Mode Toggle** | Only dark theme available                | Low      |
| **Mobile App**             | No native mobile application             | Medium   |
| **Keyboard Shortcuts**     | No keyboard shortcuts for common actions | Low      |
| **Search in Call History** | Cannot search calls by number/name       | Medium   |
| **Date Range Filter**      | Limited date filtering options           | Medium   |
| **Audio Visualizer**       | No visual feedback during calls          | Low      |

### 4.3 Administrative Missing Features

| Feature                      | Impact               | Priority |
| ---------------------------- | -------------------- | -------- |
| **Admin Dashboard**          | No admin interface   | High     |
| **User Management**          | Cannot manage users  | High     |
| **Billing/Usage Tracking**   | No cost tracking     | Medium   |
| **Audit Logs**               | No activity logging  | Medium   |
| **System Health Monitoring** | No health checks     | Medium   |
| **Rate Limiting**            | No API rate limiting | High     |

---

## 5. Erroneous Features

### 5.1 Bugs and Issues

| Issue                          | Location                                                                                  | Description                                                                            | Severity |
| ------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| **Timer Memory Leak**          | [`dashboard/page.js:88-99`](careflow/app/dashboard/page.js:88)                            | `timerInterval` is declared as a module-level variable, causing potential memory leaks | High     |
| **Missing Cleanup**            | [`dashboard/page.js:204-210`](careflow/app/dashboard/page.js:204)                         | No cleanup of Twilio Device on component unmount                                       | Medium   |
| **Hardcoded Client Identity**  | [`webhooks/twilio/voice/route.js:22`](careflow/app/api/webhooks/twilio/voice/route.js:22) | `dial.client("user")` uses hardcoded identity instead of user's twilioClientIdentity   | High     |
| **Unused Twilio Service**      | [`lib/twilio.js`](careflow/lib/twilio.js:1)                                               | The TwilioService class is defined but never used in the dashboard                     | Low      |
| **Missing Error Handling**     | [`dashboard/page.js:156-178`](careflow/app/dashboard/page.js:156)                         | No retry logic for failed API calls                                                    | Medium   |
| **Inconsistent Status Values** | [`CallStatus.js`](careflow/components/dashboard/CallStatus.js:1)                          | Status values don't match all Twilio Device states                                     | Low      |
| **Missing Pagination UI**      | [`CallHistory.js`](careflow/components/dashboard/CallHistory.js:1)                        | Pagination exists but API doesn't support it properly                                  | Medium   |
| **No Loading States**          | Multiple components                                                                       | Missing loading states for better UX                                                   | Low      |

### 5.2 Configuration Issues

| Issue                             | Location                                      | Description                                                       | Severity |
| --------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- | -------- |
| **Missing Environment Variables** | Multiple files                                | No validation for required environment variables on startup       | High     |
| **Hardcoded CORS Origins**        | [`next.config.js`](careflow/next.config.js:1) | CORS origins are hardcoded instead of using environment variables | Medium   |
| **No Database Connection Retry**  | [`lib/db.js`](careflow/lib/db.js:1)           | No retry logic for failed database connections                    | Medium   |
| **Missing Rate Limiting**         | API routes                                    | No rate limiting on authentication endpoints                      | High     |

### 5.3 Data Model Issues

| Issue                           | Location                                           | Description                                                                     | Severity |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------- | -------- |
| **Unused Fields**               | [`Recording.js`](careflow/models/Recording.js:1)   | `s3Key`, `s3Bucket`, `storageClass` suggest AWS S3 but Firebase Storage is used | Medium   |
| **Missing Indexes**             | [`Recording.js`](careflow/models/Recording.js:111) | Missing compound indexes for common queries                                     | Low      |
| **No Data Validation**          | [`User.js`](careflow/models/User.js:1)             | No validation for email format, phone number format                             | Medium   |
| **Soft Delete Not Implemented** | [`Recording.js`](careflow/models/Recording.js:1)   | Status field exists but no soft delete logic                                    | Low      |

---

## 6. Optimization Opportunities

### 6.1 Performance Optimizations

| Area                     | Current State                          | Optimization                              | Impact |
| ------------------------ | -------------------------------------- | ----------------------------------------- | ------ |
| **Database Queries**     | Multiple queries in analytics endpoint | Use aggregation pipeline for single query | High   |
| **Component Re-renders** | No memoization in dashboard            | Use `useMemo` and `useCallback`           | Medium |
| **Image Loading**        | No lazy loading                        | Implement lazy loading for avatars        | Low    |
| **Bundle Size**          | All dependencies loaded                | Implement code splitting                  | High   |
| **API Caching**          | No caching strategy                    | Implement Redis caching                   | High   |
| **Static Assets**        | Not optimized                          | Use CDN for static assets                 | Medium |

### 6.2 Code Quality Improvements

| Area                 | Current State                    | Improvement                                          | Impact |
| -------------------- | -------------------------------- | ---------------------------------------------------- | ------ |
| **Error Handling**   | Inconsistent error handling      | Standardize error handling with custom error classes | High   |
| **Type Safety**      | No TypeScript                    | Migrate to TypeScript                                | High   |
| **Testing**          | No tests                         | Add unit and integration tests                       | High   |
| **Logging**          | Console.log statements           | Implement structured logging                         | Medium |
| **Code Duplication** | Duplicated API response handling | Create reusable hooks                                | Medium |
| **Documentation**    | Minimal inline comments          | Add JSDoc comments                                   | Low    |

### 6.3 Security Enhancements

| Area                     | Current State            | Enhancement                              | Impact |
| ------------------------ | ------------------------ | ---------------------------------------- | ------ |
| **Input Validation**     | Basic validation         | Implement comprehensive input validation | High   |
| **XSS Protection**       | Relies on React defaults | Add CSP headers                          | High   |
| **CSRF Protection**      | Not implemented          | Add CSRF tokens                          | High   |
| **Rate Limiting**        | Not implemented          | Implement rate limiting                  | High   |
| **Webhook Verification** | Not implemented          | Verify Twilio webhook signatures         | High   |
| **Password Strength**    | 6 character minimum      | Implement stronger requirements          | Medium |
| **Session Management**   | localStorage             | Consider httpOnly cookies                | Medium |

### 6.4 Scalability Improvements

| Area                      | Current State          | Improvement                       | Impact |
| ------------------------- | ---------------------- | --------------------------------- | ------ |
| **Database Connection**   | Single connection pool | Implement connection pooling      | High   |
| **API Response Time**     | Synchronous operations | Implement async processing        | High   |
| **File Storage**          | Firebase Storage       | Consider CDN for recordings       | Medium |
| **Webhook Processing**    | Synchronous            | Implement queue system            | High   |
| **Analytics Calculation** | Real-time              | Pre-calculate with scheduled jobs | Medium |

---

## 7. Security Considerations

### 7.1 Current Security Measures

1. **Firebase Authentication** - Secure authentication with token-based auth
2. **JWT Token Management** - Automatic token refresh
3. **Protected Routes** - Route-level protection with [`ProtectedRoute`](careflow/components/ProtectedRoute/ProtectedRoute.js:1) component
4. **Environment Variables** - Sensitive data stored in environment variables

### 7.2 Security Vulnerabilities

| Vulnerability                         | Severity | Mitigation                                    |
| ------------------------------------- | -------- | --------------------------------------------- |
| **No Webhook Signature Verification** | High     | Verify Twilio webhook signatures              |
| **No Rate Limiting**                  | High     | Implement rate limiting on API endpoints      |
| **No Input Sanitization**             | Medium   | Implement comprehensive input validation      |
| **localStorage for Tokens**           | Medium   | Consider httpOnly cookies                     |
| **No CSRF Protection**                | High     | Add CSRF tokens                               |
| **Missing CSP Headers**               | Medium   | Implement Content Security Policy             |
| **No Audit Logging**                  | Medium   | Implement audit logging for sensitive actions |
| **Weak Password Requirements**        | Low      | Strengthen password policy                    |

### 7.3 Recommended Security Enhancements

1. Implement webhook signature verification for Twilio webhooks
2. Add rate limiting to all API endpoints
3. Implement comprehensive input validation and sanitization
4. Add Content Security Policy headers
5. Implement CSRF protection
6. Add audit logging for all sensitive operations
7. Strengthen password requirements
8. Implement session timeout and invalidation
9. Add security headers (HSTS, X-Frame-Options, etc.)
10. Regular security audits and dependency updates

---

## 8. Recommendations

### 8.1 Immediate Actions (High Priority)

1. **Fix Timer Memory Leak**
   - Move `timerInterval` to component state or useRef
   - Clean up interval on component unmount

2. **Fix Webhook Client Identity**
   - Use user's `twilioClientIdentity` instead of hardcoded "user"
   - Implement proper routing to specific users

3. **Add Webhook Signature Verification**
   - Verify Twilio webhook signatures to prevent spoofing

4. **Implement Rate Limiting**
   - Add rate limiting to authentication endpoints
   - Prevent brute force attacks

5. **Add Call Recording Playback**
   - Implement audio player for recorded calls
   - Add download functionality

6. **Create Settings Page**
   - Allow users to manage their profile
   - Configure notification preferences

### 8.2 Short-term Actions (Medium Priority)

1. **Add Contact Management**
   - Create contact CRUD operations
   - Integrate with dialer

2. **Implement Real-time Notifications**
   - Add browser notifications for incoming calls
   - Add sound alerts

3. **Add Call Notes/Tags**
   - Allow users to add notes to calls
   - Implement tagging system

4. **Export Functionality**
   - Export call history to CSV/Excel
   - Export analytics reports

5. **Improve Error Handling**
   - Standardize error handling
   - Add user-friendly error messages

6. **Add Loading States**
   - Improve UX with loading indicators
   - Add skeleton screens

### 8.3 Long-term Actions (Low Priority)

1. **Migrate to TypeScript**
   - Improve type safety
   - Reduce runtime errors

2. **Add Comprehensive Testing**
   - Unit tests for components
   - Integration tests for API routes
   - E2E tests with Playwright

3. **Implement Voicemail System**
   - Add voicemail recording
   - Voicemail playback and management

4. **Add Conference Calling**
   - Multi-party call support
   - Conference management UI

5. **Create Admin Dashboard**
   - User management
   - System monitoring
   - Billing and usage tracking

6. **Mobile Application**
   - React Native or PWA
   - Push notifications

---

## 9. Conclusion

CareFlow is a well-architected browser-based calling application with a solid foundation. The application successfully integrates Firebase Authentication, Twilio Programmable Voice, and MongoDB to provide a functional calling experience.

However, there are several areas that require attention:

**Strengths:**

- Clean architecture with separation of concerns
- Modern tech stack (Next.js 14, React 18)
- Comprehensive environment configuration system
- Good use of React Context for state management
- Responsive dark-themed UI

**Areas for Improvement:**

- Several bugs and erroneous features need fixing
- Missing critical features (call playback, contacts, settings)
- Security vulnerabilities need addressing
- Performance optimizations needed
- Lack of testing and documentation

**Overall Assessment:**
The application is functional but requires significant improvements to be production-ready. The recommended actions, particularly the high-priority fixes, should be addressed before deploying to a production environment.

---

## Appendix A: File Reference Index

| File                                                                                                             | Purpose                  |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------ |
| [`careflow/package.json`](careflow/package.json:1)                                                               | Dependencies and scripts |
| [`careflow/README.md`](careflow/README.md:1)                                                                     | Project documentation    |
| [`careflow/next.config.js`](careflow/next.config.js:1)                                                           | Next.js configuration    |
| [`careflow/app/layout.js`](careflow/app/layout.js:1)                                                             | Root layout              |
| [`careflow/app/dashboard/page.js`](careflow/app/dashboard/page.js:1)                                             | Main dashboard           |
| [`careflow/app/login/page.js`](careflow/app/login/page.js:1)                                                     | Login page               |
| [`careflow/app/signup/page.js`](careflow/app/signup/page.js:1)                                                   | Signup page              |
| [`careflow/app/forgot-password/page.js`](careflow/app/forgot-password/page.js:1)                                 | Password reset           |
| [`careflow/context/AuthContext.js`](careflow/context/AuthContext.js:1)                                           | Auth context             |
| [`careflow/lib/auth.js`](careflow/lib/auth.js:1)                                                                 | Auth utilities           |
| [`careflow/lib/db.js`](careflow/lib/db.js:1)                                                                     | Database connection      |
| [`careflow/lib/firebase.js`](careflow/lib/firebase.js:1)                                                         | Firebase client          |
| [`careflow/lib/twilio.js`](careflow/lib/twilio.js:1)                                                             | Twilio service           |
| [`careflow/lib/env.config.js`](careflow/lib/env.config.js:1)                                                     | Environment config       |
| [`careflow/models/User.js`](careflow/models/User.js:1)                                                           | User model               |
| [`careflow/models/Recording.js`](careflow/models/Recording.js:1)                                                 | Recording model          |
| [`careflow/components/dashboard/CallControls.js`](careflow/components/dashboard/CallControls.js:1)               | Call controls            |
| [`careflow/components/dashboard/DialPad.js`](careflow/components/dashboard/DialPad.js:1)                         | Dial pad                 |
| [`careflow/components/dashboard/CallHistory.js`](careflow/components/dashboard/CallHistory.js:1)                 | Call history             |
| [`careflow/components/dashboard/Analytics.js`](careflow/components/dashboard/Analytics.js:1)                     | Analytics                |
| [`careflow/components/dashboard/CallStatus.js`](careflow/components/dashboard/CallStatus.js:1)                   | Call status              |
| [`careflow/components/ProtectedRoute/ProtectedRoute.js`](careflow/components/ProtectedRoute/ProtectedRoute.js:1) | Route protection         |
| [`careflow/app/api/auth/login/route.js`](careflow/app/api/auth/login/route.js:1)                                 | Login endpoint           |
| [`careflow/app/api/auth/register/route.js`](careflow/app/api/auth/register/route.js:1)                           | Register endpoint        |
| [`careflow/app/api/token/route.js`](careflow/app/api/token/route.js:1)                                           | Token endpoint           |
| [`careflow/app/api/calls/history/route.js`](careflow/app/api/calls/history/route.js:1)                           | Call history endpoint    |
| [`careflow/app/api/analytics/route.js`](careflow/app/api/analytics/route.js:1)                                   | Analytics endpoint       |
| [`careflow/app/api/webhooks/twilio/voice/route.js`](careflow/app/api/webhooks/twilio/voice/route.js:1)           | Voice webhook            |
| [`careflow/app/api/webhooks/twilio/status/route.js`](careflow/app/api/webhooks/twilio/status/route.js:1)         | Status webhook           |

---

**End of Report**
