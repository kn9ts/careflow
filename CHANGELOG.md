# CareFlow Changelog

## [Unreleased] - 2026-02-16

### Added

#### User Settings Feature (Phase 1 MVP)

- **Settings Schema**: Extended User model with comprehensive settings schema
  - `notifications`: Enable/disable push notifications, call notifications, message notifications, sound alerts, and quiet hours
  - `audio`: Input/output device selection, input gain, noise suppression, echo cancellation, auto-gain control
  - `display`: Theme preference, date format, time format, default dashboard tab, items per page

- **Settings API Endpoints**:
  - `GET /api/users/settings` - Retrieve user settings with defaults
  - `PATCH /api/users/settings` - Update specific settings fields
  - `POST /api/users/settings/reset` - Reset settings to defaults

- **Settings UI Components**:
  - `SettingsTab.jsx` - Main settings page with horizontal tab navigation
  - `NotificationSettingsPanel.jsx` - Notification preferences configuration
  - `AudioSettingsPanel.jsx` - Audio device and processing settings
  - `DisplaySettingsPanel.jsx` - Display and formatting preferences

- **Settings Management**:
  - `useSettings.js` hook - React hook for settings state management
  - `lib/settingsUtils.js` - Utility functions for settings validation and merging

#### Authentication & State Management

- **care4wId Integration**:
  - Token API now returns `care4wId` in response
  - `AuthContext` exposes `updateUserCare4wId()` to update global user state
  - `useCallManager` syncs care4wId from token response to global auth state

- **AuthContext Improvements**:
  - Added `user` alias for `currentUser` for convenience
  - Added `isInitialized` state for initialization tracking
  - Improved error handling and loading states

#### Call Status & WebRTC Improvements

- **CallStatus Component**:
  - Fixed authentication status display (was incorrectly showing "not authenticated")
  - Added WebRTC connection status indicator
  - Added Twilio service readiness indicator
  - Limited auto-retry attempts to 3 with 6-second intervals
  - Improved error recovery and status propagation

- **Call Manager**:
  - Increased initialization timeout to 30 seconds
  - Added `care4wId` to initialization change event
  - Improved token response parsing (handles `successResponse` wrapper)
  - Better error handling and logging

- **Database Connection**:
  - Added 10-second server selection timeout
  - Improved connection reliability

#### Testing Infrastructure

- **E2E Tests**:
  - `webrtc-negative.spec.js` - Negative test scenarios for WebRTC
  - `webrtc-signaling.spec.js` - Signaling flow tests

- **Integration Tests**:
  - `webrtc-race-conditions.test.js` - Race condition handling
  - `webrtc-resource-management.test.js` - Resource cleanup tests
  - `webrtc-signaling-isolation.test.js` - Signaling isolation tests
  - `webrtc-state-management.test.js` - State management tests

- **Test Helpers**:
  - `callManager-mock.js` - Mock implementations for CallManager
  - `firebase-helpers.js` - Firebase testing utilities
  - `webrtc-helpers.js` - WebRTC testing utilities

#### Documentation

- `CAREFLOW_ARCHITECTURAL_REVIEW_REPORT.md` - Comprehensive architecture review
- `CAREFLOW_BACKEND_ARCHITECTURAL_AUDIT.md` - Backend audit findings
- `CAREFLOW_ENTERPRISE_AUDIT_REPORT.md` - Enterprise readiness assessment
- `CAREFLOW_LOADING_STATE_ROOT_CAUSE_ANALYSIS.md` - Loading state issue analysis
- `CAREFLOW_QA_SERVICE_INTEGRATION_AUDIT.md` - QA service integration review
- `CAREFLOW_SECURITY_ARCHITECTURE_AUDIT_REPORT.md` - Security architecture audit
- `CAREFLOW_WEBRTC_CODE_REVIEW_REPORT.md` - WebRTC implementation review
- `CAREFLOW_WEBRTC_ISSUE_RESOLUTION_STATUS.md` - WebRTC issue tracking
- `DASHBOARD_URL_NAVIGATION_PLAN.md` - URL navigation implementation plan
- `USER_SETTINGS_SCHEMA.md` - User settings schema documentation
- `WEBRTC_INTEGRATION_TEST_SUITE_PLAN.md` - Test suite planning
- `WEBRTC_TEST_SUITE_EXECUTIVE_SUMMARY.md` - Test suite summary

### Changed

- Updated `.env.local.example` with new environment variables
- Updated `.eslintrc` configuration
- Improved `lib/firebase.js` initialization and error handling
- Enhanced `lib/webrtc.js` with better connection management
- Updated dashboard tabs to support URL-based navigation
- Improved `useNotifications` hook with settings integration
- Enhanced `useAudioRecorder` hook with audio settings support

### Fixed

- Authentication status propagation in CallStatus component
- Token response parsing in callManager (handles successResponse wrapper)
- care4wId auto-generation for users without existing ID
- WebRTC connection state tracking
- Twilio AccessToken import (direct import from `twilio/lib/jwt/AccessToken`)

### Security

- Added input validation for settings API
- Improved error message sanitization
- Enhanced webhook verification

---

## Release Notes Summary

This release introduces the **User Settings Feature (Phase 1 MVP)**, giving users essential control over notifications, audio, and display preferences. Key improvements include:

1. **Complete Settings System**: Full CRUD API, UI components, and real-time sync
2. **Enhanced Authentication**: care4wId integration with global state management
3. **Improved Call Status**: Visual indicators for WebRTC and Twilio service status
4. **Comprehensive Testing**: E2E and integration tests for WebRTC functionality
5. **Extensive Documentation**: 12 new documentation files covering architecture, security, and testing

### Breaking Changes

None - all changes are backward compatible.

### Migration Guide

No migration required. Existing users will have default settings applied automatically on first load.
