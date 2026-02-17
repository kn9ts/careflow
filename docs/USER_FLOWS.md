# CareFlow User Flows Documentation

## Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [Call Management Flow](#call-management-flow)
3. [WebRTC Call Recording Flow](#webrtc-call-recording-flow)
4. [Recording Playback Flow](#recording-playback-flow)
5. [Recording Management Flow](#recording-management-flow)
6. [Error States and Recovery](#error-states-and-recovery)
7. [Edge Cases](#edge-cases)

---

## Authentication Flow

### Happy Path: User Login

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER FLOW: Authentication - Login                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────┐ │
│  │ User     │     │ Login Page    │     │ Auth API    │     │ Dashboard │ │
│  │ visits   │────▶│ displays      │────▶│ validates   │────▶│ loads      │ │
│  │ /login   │     │ login form    │     │ credentials │     │            │ │
│  └──────────┘     └──────────────┘     └─────────────┘     └────────────┘ │
│                                                                             │
│  Steps:                                                                     │
│  1. User navigates to /login                                                │
│  2. System displays login form with email/password fields                  │
│  3. User enters credentials                                                 │
│  4. System validates input format                                          │
│  5. System submits to /api/auth/login                                       │
│  6. System receives JWT token                                              │
│  7. User redirected to /dashboard                                           │
│                                                                             │
│  User Emotional State:                                                     │
│  - Start: Neutral/期待 (expectant)                                          │
│  - During: Focused, attentive                                               │
│  - End: Satisfied, confident                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Alternate Path: Registration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER FLOW: Authentication - Registration                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User clicks "Sign Up" on login page                                    │
│  2. Navigate to /signup                                                     │
│  3. Complete registration form:                                             │
│     - Email (required, validated format)                                   │
│     - Password (required, min 8 chars)                                      │
│     - Care4wID (optional, for existing users)                               │
│  4. Submit to /api/auth/register                                            │
│  5. Auto-login and redirect to dashboard                                   │
│                                                                             │
│  Design Rationale:                                                          │
│  - Optional Care4wID allows linking to existing Twilio account             │
│  - Auto-login improves UX by eliminating redundant login                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Error State: Invalid Credentials

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ERROR STATE: Invalid Credentials                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Trigger: Wrong email/password combination                                  │
│                                                                             │
│  System Response:                                                           │
│  - Display error message: "Invalid email or password"                      │
│  - Highlight password field                                                 │
│  - Clear password field                                                    │
│  - Keep user on login page                                                 │
│                                                                             │
│  User Action Required:                                                      │
│  - Re-enter credentials                                                    │
│                                                                             │
│  Recovery Mechanism:                                                       │
│  - Password reset link available                                           │
│  - No account lockout (per UX best practices)                             │
│                                                                             │
│  Friction Points:                                                           │
│  - None significant - clear error, easy recovery                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Call Management Flow

### Happy Path: Outbound Call (WebRTC Mode)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER FLOW: Outbound WebRTC Call                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐ │
│  │ Dialer Page  │     │ CallManager │     │ WebRTC      │     │ Remote  │ │
│  │              │     │ initialize  │────▶│ signaling   │────▶│ peer    │ │
│  │              │     │             │     │             │     │         │ │
│  └──────────────┘     └─────────────┘     └─────────────┘     └──────────┘ │
│         │                   │                   │                   │      │
│         │ User enters       │ Create Room       │ Exchange SDP     │      │
│         │ phone number     │                   │ & ICE candidates  │      │
│         │                   │                   │                   │      │
│         ▼                   ▼                   ▼                   ▼      │
│  ┌──────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐ │
│  │ User clicks  │     │ ICE         │     │ Call state  │     │ Audio   │ │
│  │ "Call"       │────▶│ candidates  │────▶│ changes to  │────▶│ stream  │ │
│  │              │     │ collected   │     │ "connected" │     │ active  │ │
│  └──────────────┘     └─────────────┘     └─────────────┘     └──────────┘ │
│                                                                             │
│  Key Decision Points:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DECISION: Browser supports WebRTC?                                   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ YES → Proceed with WebRTC call                                      │   │
│  │ NO  → Fallback to Twilio (if configured) or show error              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DECISION: ICE connection successful?                                 │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ YES → Call connects, audio flows                                    │   │
│  │ NO  → Show "Connection failed" error, offer retry                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  User Emotional State:                                                      │
│  - Dialing: Anticipation, slight anxiety                                    │
│  - Ringing: Expectation                                                    │
│  - Connected: Relief, focus                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Happy Path: Inbound Call

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER FLOW: Inbound WebRTC Call                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Remote Peer initiates call                                                 │
│           │                                                                │
│           ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DECISION: User available?                                             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ YES → Notify user via:                                               │   │
│  │      - In-app toast notification                                     │   │
│  │      - Audio ringtone (if enabled)                                    │   │
│  │      - Browser push notification (if permitted)                        │   │
│  │                                                                       │   │
│  │ User actions available:                                              │   │
│  │  ┌──────────┐  ┌──────────┐                                           │   │
│  │  │ Accept   │  │ Reject   │                                           │   │
│  │  │ (green)  │  │ (red)    │                                           │   │
│  │  └──────────┘  └──────────┘                                           │   │
│  │                                                                       │   │
│  │ NO → Call routed to voicemail (if configured)                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Timeout Behavior:                                                          │
│  - If no action within 30 seconds → Auto-reject                            │
│  - Ringback continues until user action                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Call Controls During Active Call

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CALL CONTROLS: During Active Call                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Available Controls:                                                   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  [MUTE]     Toggle microphone                                       │   │
│  │             User Goal: Prevent other party from hearing               │   │
│  │             System Response: Mute local audio stream                  │   │
│  │             Visual: Icon changes, muted indicator appears            │   │
│  │                                                                     │   │
│  │  [HANG UP]  End call                                                 │   │
│  │             User Goal: End the conversation                          │   │
│  │             System Response: Close WebRTC connection, show summary    │   │
│  │             Visual: Red button, call duration displayed               │   │
│  │                                                                     │   │
│  │  [KEYPAD]   Send DTMF tones (if in-call dialing needed)             │   │
│  │             User Goal: Navigate IVR systems                          │   │
│  │             System Response: Play DTMF tones over audio              │   │
│  │                                                                     │   │
│  │  [RECORD]   Start/stop call recording (if enabled)                   │   │
│  │             User Goal: Create call recording                          │   │
│  │             System Response: Start MediaRecorder                     │   │
│  │             Visual: Recording indicator, timer                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Call Duration Display:                                                    │
│  - Format: MM:SS (minutes:seconds)                                         │
│  - Updates every second                                                    │
│  - Visible throughout call                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## WebRTC Call Recording Flow

### Happy Path: Recording Start to Upload

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER FLOW: WebRTC Call Recording                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐ │
│  │ Call         │     │ User clicks │     │ MediaRecorder│    │ Local    │ │
│  │ connected    │────▶│ "Record"    │────▶│ starts      │────▶│ chunks   │ │
│  │              │     │             │     │ capturing   │     │ buffered │ │
│  └──────────────┘     └─────────────┘     └─────────────┘     └──────────┘ │
│                                                                             │
│         │                                                                   │
│         │ Call ends                                                         │
│         ▼                                                                   │
│  ┌──────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐ │
│  │ User clicks │     │ Recording   │     │ Backblaze   │     │ Database │ │
│  │ "Stop"      │────▶│ processing  │────▶│ B2 upload   │────▶│ metadata │ │
│  │             │     │             │     │             │     │ updated  │ │
│  └──────────────┘     └─────────────┘     └─────────────┘     └──────────┘ │
│                                                                             │
│  Processing Steps:                                                          │
│  1. MediaRecorder stops                                                     │
│  2. Finalize WebM blob                                                      │
│  3. Generate unique recording ID                                            │
│  4. Upload to Backblaze B2 with retry logic (max 3 retries)                │
│  5. Store metadata in database                                              │
│  6. Generate signed URL for access                                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DECISION: Upload successful?                                         │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ YES → Recording available in "Recordings" tab                        │   │
│  │ NO  → Show error, option to retry                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Design Rationale:                                                          │
│  - Client-side recording reduces server load                               │
│  - WebM format is browser-native                                           │
│  - Backblaze B2 provides cost-effective storage                            │
│  - Signed URLs ensure secure access                                         │
│                                                                             │
│  User Emotional State:                                                      │
│  - Recording: Aware, slightly self-conscious                                 │
│  - Uploading: Neutral/waiting                                               │
│  - Complete: Satisfied, confident                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Recording File Processing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RECORDING PROCESSING FLOW                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Stage 1: Raw Capture (WebM)                                          │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ Codec: opus (audio)                                                  │   │
│  │ Container: WebM                                                      │   │
│  │ Bitrate: ~128 kbps                                                   │   │
│  │ Duration: Same as call                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Stage 2: Upload to Backblaze B2                                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ Bucket: careflow-recordings-[env]                                    │   │
│  │ File naming: recordings/{year}/{month}/{day}/{id}.webm              │   │
│  │ Lifecycle: Moved to Glacier after 90 days                            │   │
│  │ Retention: Permanent unless deleted by user                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Stage 3: Metadata Storage                                           │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ Collection: recordings                                               │   │
│  │ Fields:                                                             │   │
│  │   - id: Unique identifier                                           │   │
│  │   - userId: Owner                                                   │   │
│  │   - callId: Related call                                            │   │
│  │   - direction: inbound/outbound                                     │   │
│  │   - from/to: Phone numbers                                          │   │
│  │   - duration: Call duration in seconds                              │   │
│  │   - fileSize: Bytes                                                 │   │
│  │   - format: webm                                                    │   │
│  │   - status: active/archived/deleted                                 │   │
│  │   - accessUrl: Signed URL (expires 24h)                             │   │
│  │   - createdAt: Timestamp                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Recording Playback Flow

### Happy Path: Play Recording

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER FLOW: Play Recording                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐ │
│  │ Recordings  │     │ User clicks │     │ API returns │     │ Audio    │ │
│  │ list        │────▶│ "Play"       │────▶│ signed URL  │────▶│ player   │ │
│  │ displayed   │     │              │     │             │     │ loads    │ │
│  └──────────────┘     └─────────────┘     └─────────────┘     └──────────┘ │
│                                                                             │
│  User Actions in Player:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Control          │ Action                                              │   │
│  ├──────────────────┼─────────────────────────────────────────────────────┤   │
│  │ Play/Pause       │ Toggle playback                                     │   │
│  │ Progress bar     │ Seek to position                                    │   │
│  │ Volume           │ Adjust volume (0-100%)                              │   │
│  │ Mute             │ Toggle audio on/off                                │   │
│  │ Download         │ Download recording file                             │   │
│  │ Delete           │ Remove recording                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Keyboard Shortcuts:                                                         │
│  - Space: Play/Pause                                                        │
│  - Arrow Left: Seek backward 5s                                             │
│  - Arrow Right: Seek forward 5s                                             │
│  - M: Mute                                                                  │
│                                                                             │
│  Error States:                                                              │
│  - Expired URL: Re-fetch from API                                           │
│  - Network error: Retry button                                              │
│  - Corrupted file: Error message, contact support                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Recording List with Filters

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RECORDING LIST: Filters and Navigation                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Available Filters:                                                   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  [Type ▼]       Filter by recording type                            │   │
│  │                 - All Types                                          │   │
│  │                 - Calls                                              │   │
│  │                 - Voicemails                                         │   │
│  │                                                                     │   │
│  │  [Direction ▼]  Filter by call direction                            │   │
│  │                 - All Directions                                     │   │
│  │                 - Inbound                                            │   │
│  │                 - Outbound                                            │   │
│  │                                                                     │   │
│  │  [Status ▼]     Filter by recording status                          │   │
│  │                 - All Status                                         │   │
│  │                 - Active                                             │   │
│  │                 - Archived                                          │   │
│  │                 - Deleted                                           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Pagination:                                                                │
│  - Default: 20 recordings per page                                         │
│  - Shows: Page X of Y                                                      │
│  - Previous/Next buttons                                                   │
│                                                                             │
│  Recording List Columns:                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Column          │ Description                                        │   │
│  ├────────────────┼─────────────────────────────────────────────────────┤   │
│  │ Direction       │ Inbound/Outbound badge                             │   │
│  │ Date/Time       │ When recording was made                            │   │
│  │ Phone Numbers   │ From → To                                          │   │
│  │ Duration        │ Call length                                        │   │
│  │ Size            │ File size (MB)                                     │   │
│  │ Format          │ Audio format                                       │   │
│  │ Status          │ Active/Listened badge                               │   │
│  └────────────────┴─────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Recording Management Flow

### Happy Path: Delete Recording

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER FLOW: Delete Recording                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User clicks "Delete" on recording                                          │
│           │                                                                │
│           ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CONFIRMATION REQUIRED                                                │   │
│  │                                                                     │   │
│  │ ┌───────────────────────────────────────────────────────────────┐   │   │
│  │ │  ⚠️  Are you sure?                                             │   │   │
│  │ │                                                               │   │   │
│  │ │  This action cannot be undone. This recording will be         │   │   │
│  │ │  permanently deleted and cannot be recovered.                │   │   │
│  │ │                                                               │   │   │
│  │ │  [ Cancel ]                     [ Delete ]                     │   │   │
│  │ └───────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                │
│           ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DELETE ACTIONS:                                                      │   │
│  │ 1. API marks recording as 'deleted' in database                     │   │
│  │ 2. Backblaze B2 file lifecycle policy moves to Glacier             │   │
│  │ 3. Access URL immediately invalidated                              │   │
│  │ 4. Recording removed from list view                                │   │
│  │ 5. Toast notification: "Recording deleted"                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Design Rationale:                                                          │
│  - Soft delete preserves data for compliance                               │
│  - Glacier storage maintains backup for legal requirements                 │
│  - Immediate URL invalidation prevents access                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Happy Path: Download Recording

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER FLOW: Download Recording                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User clicks "Download"                                                     │
│           │                                                                │
│           ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ API Request:                                                         │   │
│  │ GET /api/recordings/:id?includeUrl=true                              │   │
│  │ Authorization: Bearer {token}                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                │
│           ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ API Response:                                                         │   │
│  │ {                                                                   │   │
│  │   "success": true,                                                   │   │
│  │   "data": {                                                          │   │
│  │     "recording": {                                                   │   │
│  │       "downloadUrl": "https://.../recording.webm?signature=...",    │   │
│  │       "expiresAt": "2026-02-07T..."                                  │   │
│  │     }                                                                │   │
│  │   }                                                                  │   │
│  │ }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                │
│           ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Browser Actions:                                                      │   │
│  │ 1. Create <a> element with downloadUrl                               │   │
│  │ 2. Set download attribute with filename                              │   │
│  │ 3. Programmatically click element                                    │   │
│  │ 4. File downloads to user's default location                          │   │
│  │                                                                     │   │
│  │ Filename format: recording-{id}.webm                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Error States and Recovery

### Network Errors

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ERROR STATE: Network Failure                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Scenarios:                                                                 │
│  1. Call initialization fails                                              │
│  2. ICE connection timeout                                                  │
│  3. Recording upload interrupted                                            │
│  4. API request timeout                                                     │
│                                                                             │
│  System Responses:                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Scenario                  │ System Response                          │   │
│  ├───────────────────────────┼───────────────────────────────────────────┤   │
│  │ Call init fails          │ Show "Connection error", offer retry     │   │
│  │ ICE timeout              │ Show "Peer unreachable" message         │   │
│  │ Upload interrupted       │ Auto-retry up to 3 times                │   │
│  │ API timeout              │ Show "Please try again" toast             │   │
│  └───────────────────────────┴───────────────────────────────────────────┘   │
│                                                                             │
│  Recovery Mechanisms:                                                       │
│  - Automatic retry with exponential backoff                                │
│  - Clear error messages with suggested actions                             │
│  - Connection state indicators                                             │
│  - Offline mode indicator                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Browser Compatibility Issues

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ERROR STATE: Browser Not Supported                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Detection Points:                                                          │
│  1. getUserMedia not available                                             │
│  2. RTCPeerConnection not available                                         │
│  3. MediaRecorder not available                                             │
│                                                                             │
│  System Response:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │ │  ⚠️  Browser Not Supported                                      │ │   │
│  │ │                                                                 │ │   │
│  │ │  Your browser doesn't support WebRTC calls.                    │ │   │
│  │ │                                                                 │ │   │
│  │ │  Please use one of these browsers:                              │ │   │
│  │ │    ✅ Chrome 72+                                                 │ │   │
│  │ │    ✅ Firefox 68+                                                │ │   │
│  │ │    ✅ Safari 14.1+                                              │ │   │
│  │ │    ✅ Edge 79+                                                  │ │   │
│  │ │                                                                 │ │   │
│  │ │  [ Go to Chrome Download ]                                      │ │   │
│  │ └─────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Fallback Behavior (if Twilio configured):                                 │
│  - Automatic fallback to Twilio PSTN call                                   │
│  - User prompted: "Use phone-based calling instead?"                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Permission Denied

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ERROR STATE: Permission Denied                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Scenarios:                                                                 │
│  1. Microphone permission denied                                           │
│  2. Notification permission denied                                         │
│                                                                             │
│  System Response:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Microphone:                                                         │   │
│  │ - Show inline permission request                                     │   │
│  │ - If denied: Show "Allow microphone access" button                  │   │
│  │ - Guide user to browser settings                                    │   │
│  │                                                                     │   │
│  │ Notifications:                                                      │   │
│  │ - Hide notification option if permanently denied                   │   │
│  │ - Show message: "Notifications disabled in browser settings"        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Recovery Steps:                                                            │
│  1. Click on lock/icon in browser address bar                              │
│  2. Find microphone/notifications setting                                  │
│  3. Change to "Allow"                                                       │
│  4. Refresh page                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases

### Edge Case 1: Call Drops During Recording

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EDGE CASE: Network Interrupt During Call                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Scenario: User's network temporarily disconnects                          │
│                                                                             │
│  Detection:                                                                 │
│  - ICE connection state changes to 'failed'                                │
│  - No ICE candidates received for 10 seconds                                │
│                                                                             │
│  System Response:                                                           │
│  1. Show "Connection lost" message                                         │
│  2. Attempt ICE restart (WebRTC standard)                                   │
│  3. If restart succeeds: Resume call                                       │
│  4. If restart fails after 30s: End call                                   │
│                                                                             │
│  Recording Handling:                                                        │
│  - Recording continues locally during network issues                       │
│  - Recording uploaded when connection restored                              │
│  - If call ends during disconnect: Upload partial recording                │
│                                                                             │
│  User Notification:                                                         │
│  "Connection lost. Attempting to reconnect..."                              │
│  "Connection restored! Call resuming..."                                     │
│  "Unable to reconnect. Call ended."                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Edge Case 2: Multiple Call Attempts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EDGE CASE: User Attempts Multiple Concurrent Calls                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Constraint: Only one active call per browser tab                           │
│                                                                             │
│  Scenario: User clicks "Call" while already on a call                       │
│                                                                             │
│  System Response:                                                           │
│  1. Show modal: "End current call to start new one?"                        │
│  2. Options:                                                                │
│    - "End & Call" - Hang up current, start new                             │
│    - "Cancel" - Stay on current call                                        │
│                                                                             │
│  User Emotional State:                                                      │
│  - Slight frustration (barrier to workflow)                                │
│  - Appreciates clear choice                                                 │
│                                                                             │
│  Design Rationale:                                                          │
│  - Prevents audio conflicts                                                 │
│  - Clear rather than silently failing                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Edge Case 3: Recording Storage Full

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EDGE CASE: Storage Quota Exceeded                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Detection: Backblaze B2 upload fails with quota error                       │
│                                                                             │
│  System Response:                                                           │
│  1. Show user notification: "Storage limit reached"                        │
│  2. Offer options:                                                          │
│    - Delete old recordings                                                  │
│    - Download recordings to free space                                       │
│    - Contact admin for storage upgrade                                      │
│                                                                             │
│  Recording Preservation:                                                     │
│  - Partial uploads retained for 24 hours                                    │
│  - Auto-cleanup of old archived recordings (configurable)                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Edge Case 4: Recording Upload Failure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EDGE CASE: Upload Failure After Call Ends                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Scenario: Recording captured but upload fails (network/storage error)      │
│                                                                             │
│  Retry Logic:                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Attempt 1: Immediate retry (1s delay)                               │   │
│  │ Attempt 2: Exponential backoff (2s, 4s, 8s...)                     │   │
│  │ Attempt 3: Final attempt with extended timeout                      │   │
│  │                                                                     │   │
│  │ All attempts fail:                                                   │   │
│  │ 1. Save recording to IndexedDB (browser storage)                    │   │
│  │ 2. Show user notification: "Recording saved locally"               │   │
│  │ 3. Retry upload on next page load                                   │   │
│  │ 4. Provide manual retry option                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  User Actions:                                                              │
│  - "Retry Upload" button in recordings tab                                  │
│  - "Download" to save locally                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Known Usability Concerns

### 1. Permission Fatigue

- **Issue**: Users may accidentally deny permissions
- **Mitigation**: Clear explanation of why permissions are needed
- **UI**: Non-intrusive, contextual permission requests

### 2. Recording Awareness

- **Issue**: Users may forget they're being recorded
- **Mitigation**:
  - Persistent recording indicator
  - Sound notification when recording starts/stops
  - Clear UI showing "Recording" status

### 3. Audio Quality Feedback

- **Issue**: Users don't know if their audio is being captured clearly
- **Mitigation**:
  - Visual audio level meter
  - Pre-call test option
  - Post-call quality feedback

### 4. Mobile Experience

- **Issue**: WebRTC behavior varies on mobile browsers
- **Mitigation**:
  - Explicit mobile-optimized UI
  - Auto-fallback for unsupported devices
  - Touch-friendly controls

---

## Optimization Opportunities

### 1. Pre-call Setup Wizard

- Add optional pre-call audio test
- Camera/microphone selection
- Network speed test

### 2. Smart Recording

- Automatic recording detection (voice activity)
- Silence removal for smaller files
- Transcription integration

### 3. Enhanced Notifications

- Desktop notifications for incoming calls
- Missed call SMS fallback
- Voicemail transcription

### 4. Analytics Integration

- Call duration trends
- Recording access patterns
- Quality metrics dashboard

---

## Implementation Gaps

### Current Gaps:

1. **Call recording toggle in CallControls** - Not yet integrated
2. **Real-time recording upload** - Only uploads after call ends
3. **Recording indicators** - Need visual feedback during recording
4. **Partial recording recovery** - IndexedDB storage not implemented
5. **Transcription** - Not yet available

### Priority for Implementation:

1. **High**: Recording toggle integration
2. **High**: Upload retry logic
3. **Medium**: Visual recording indicators
4. **Medium**: IndexedDB fallback storage
5. **Low**: Call recording analytics

---

## Version History

| Version | Date       | Changes               |
| ------- | ---------- | --------------------- |
| 1.0.0   | 2026-02-06 | Initial documentation |
