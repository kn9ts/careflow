# CareFlow Architecture Documentation

**Last Updated:** 2026-02-12
**Version:** 1.1.0

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Diagram](#component-diagram)
4. [Data Flow](#data-flow)
5. [Technology Stack](#technology-stack)
6. [Module Descriptions](#module-descriptions)
7. [Data Models](#data-models)
8. [Security Architecture](#security-architecture)
9. [Scalability Considerations](#scalability-considerations)

---

## System Overview

CareFlow is a web-based telephony application built with Next.js that enables browser-based voice communications through two primary channels:

### Calling Modes

| Mode             | Protocol     | Use Case                                         | Cost                     |
| ---------------- | ------------ | ------------------------------------------------ | ------------------------ |
| **Twilio Voice** | PSTN/SIP     | Traditional phone calls to/from any phone number | Per-minute pricing       |
| **WebRTC**       | Peer-to-Peer | Free calls between CareFlow users                | Free (data charges only) |

### Key Capabilities

- **User Authentication**: Firebase Auth with JWT tokens
- **Call Management**: Make, receive, mute, hold calls
- **Call Recording**: WebRTC call recording with Backblaze B2 storage
- **Call History**: Searchable call logs with pagination
- **Analytics**: Call duration, frequency, and direction statistics
- **Push Notifications**: Firebase Cloud Messaging for incoming calls
- **Voicemail**: Automatic voicemail for missed calls

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CareFlow System                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                         Client Layer                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐│   │
│  │  │   Next.js   │  │   React 18   │  │  TailwindCSS │  │  WebRTC SDK ││   │
│  │  │    App      │  │   Dashboard  │  │   Styling   │  │   Client   ││   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘│   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Call Manager                               │   │   │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │   │   │
│  │  │  │  Twilio Device  │  │  WebRTC Manager │  │  Audio Recorder│ │   │   │
│  │  │  │    (PSTN)       │  │  (P2P Calls)    │  │  (Call Record) │ │   │   │
│  │  │  └────────────────┘  └────────────────┘  └────────────────┘ │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                      │                                        │
│                                      ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                      API Layer (Next.js Routes)                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │   │
│  │  │  /auth   │ │ /recordings│ │ /calls  │ │ /users   │ │/webhooks │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                   Middleware Layer                              │   │   │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │   │   │
│  │  │  │ Auth Middleware│  │ Validation     │  │ Error Handler  │  │   │   │
│  │  │  │ (JWT Verify)   │  │ (Request Check) │  │ (API Response) │  │   │   │
│  │  │  └────────────────┘  └────────────────┘  └────────────────┘  │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                      │                                        │
│                                      ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                      External Services                                 │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐ │   │
│  │  │ Firebase   │ │  Twilio    │ │ Backblaze  │ │ MongoDB Atlas       │ │   │
│  │  │ Auth/FCM   │ │   Voice    │ │    B2      │ │   Database         │ │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘ │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Diagram

### Call Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Outbound Call Flow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User        Dashboard         API              Twilio         PSTN          │
│  ─────       ─────────         ───              ──────         ─────          │
│    │             │              │                 │              │           │
│    │  Click Call │              │                 │              │           │
│    │────────────>│              │                 │              │           │
│    │             │              │                 │              │           │
│    │             │ GET /token   │                 │              │           │
│    │             │─────────────>│                 │              │           │
│    │             │              │                 │              │           │
│    │             │ Token + SID  │                 │              │           │
│    │             │<─────────────│                 │              │           │
│    │             │              │                 │              │           │
│    │             │ Connect (Twilio Device)        │              │           │
│    │             │───────────────────────────────>│              │           │
│    │             │              │                 │              │           │
│    │             │              │         Create Call            │           │
│    │             │              │<───────────────────────────────│           │
│    │             │              │                 │              │           │
│    │             │              │                 │── Dial ──────>│           │
│    │             │              │                 │              │           │
│    │◄────────────│ Ring Event   │                 │              │           │
│    │             │              │                 │              │           │
│    │   Connected │              │                 │              │           │
│    │◄────────────│              │                 │              │           │
│    │             │              │                 │              │           │
│    │  In Call    │              │                 │              │           │
│    │◄────────────│              │                 │              │           │
│    │             │              │                 │              │           │
│    │  End Call   │              │                 │              │           │
│    │────────────>│              │                 │              │           │
│    │             │ Disconnect   │                 │              │           │
│    │             │─────────────>│                 │              │           │
│    │             │              │                 │              │           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### WebRTC Peer-to-Peer Call Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WebRTC P2P Call Architecture                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Caller A                              Caller B                             │
│   ─────────                              ─────────                            │
│      │                                      │                                │
│      │  1. getUserMedia (audio)             │                                │
│      │◄─────────────────────────────────────│                                │
│      │                                      │                                │
│      │  2. Create Offer                     │                                │
│      │──────────────────────────────┐       │                                │
│      │                              │       │                                │
│      │         Signaling             │       │                                │
│      │◄──────────────────────────────┘       │                                │
│      │                                      │                                │
│      │  3. Set Local Description            │                                │
│      │◄─────────────────────────────────────│                                │
│      │                                      │                                │
│      │  4. ICE Candidate Exchange           │                                │
│      │◄────────────────────────────────────►│                                │
│      │                                      │                                │
│      │  5. Peer Connection Established     │                                │
│      │◄════════════════════════════════════►│                                │
│      │                                      │                                │
│      │  6. Audio Stream Exchange            │                                │
│      │◄────────────────────────────────────►│                                │
│      │                                      │                                │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        Signaling Server                               │   │
│   │  - Firebase Realtime Database for ICE candidate exchange             │   │
│   │  - WebSocket or HTTP polling for offer/answer exchange               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Recording Upload Flow

```
1. User initiates recording (WebRTC call)
         │
         ▼
2. AudioProcessor captures media stream chunks
         │
         ▼
3. RecordingManager buffers chunks in MemoryBuffer
         │
         ▼
4. User ends call → recording stopped
         │
         ▼
5. Blob created from buffered chunks
         │
         ▼
6. RecordingUploader.upload() called
         │
         ▼
7. Exponential backoff retry (max 3 attempts)
         │
         ▼
8. Upload to Backblaze B2
         │
         ▼
9. Recording metadata saved to MongoDB
         │
         ▼
10. Return signed URL to user
```

---

## Technology Stack

### Frontend

| Technology       | Purpose         | Version |
| ---------------- | --------------- | ------- |
| Next.js          | React Framework | 15.x    |
| React            | UI Library      | 18.x    |
| Tailwind CSS     | Styling         | 3.x     |
| Twilio Voice SDK | PSTN Calls      | 2.x     |
| WebRTC           | P2P Calls       | Native  |

### Backend

| Technology         | Purpose            | Version |
| ------------------ | ------------------ | ------- |
| Next.js API Routes | Serverless Backend | 15.x    |
| Node.js            | Runtime            | 18.x    |
| Firebase Admin     | Auth Verification  | 11.x    |
| Mongoose           | MongoDB ODM        | 8.x     |

### Infrastructure

| Service                   | Purpose             |
| ------------------------- | ------------------- |
| Firebase Auth             | User Authentication |
| Firebase Cloud Messaging  | Push Notifications  |
| Twilio Programmable Voice | PSTN Calls          |
| Backblaze B2              | Object Storage      |
| MongoDB Atlas             | Database            |
| Vercel                    | Deployment          |

---

## Module Descriptions

### lib/callManager.js

The unified call manager that handles both Twilio and WebRTC calls.

**Key Responsibilities:**

- Initialize and manage Twilio Device
- Initialize and manage WebRTC peer connections
- Handle call lifecycle (make, accept, reject, end)
- Manage call recording
- Provide status notifications via event listeners

**Class Methods:**
| Method | Description |
|--------|-------------|
| `initialize(token, care4wId)` | Initialize call manager |
| `makeCall(number)` | Initiate outbound call |
| `acceptCall()` | Accept incoming call |
| `endCall()` | End current call |
| `toggleMute()` | Toggle microphone mute |
| `sendDigits(digit)` | Send DTMF tones |
| `startRecording()` | Start call recording |
| `stopRecording()` | Stop and upload recording |

### lib/webrtc.js

WebRTC peer connection management for P2P calls.

**Key Responsibilities:**

- Create and manage peer connections
- Handle ICE candidate exchange
- Manage audio tracks
- Handle connection state changes

### lib/recordingManager.js

Call recording functionality for WebRTC calls.

**Key Responsibilities:**

- Capture audio from MediaRecorder
- Buffer audio chunks
- Create downloadable Blob
- Handle upload with retry logic

### lib/backblaze.js

Backblaze B2 S3-compatible storage integration.

**Key Responsibilities:**

- Initialize B2 client
- Generate upload URLs
- Upload files
- Generate signed download URLs

### lib/careFlowIdGenerator.js

CareFlow User ID generation system.

**ID Format:** `care4w-XXXXXXX` (7-digit sequence)

**Key Functions:**
| Function | Description |
|----------|-------------|
| `generateCare4wId()` | Generate new unique ID |
| `isValidCare4wId(id)` | Validate ID format |

---

## Data Models

### User Model

```javascript
{
  firebaseUid: String (unique),
  email: String (unique),
  displayName: String,
  care4wId: String (unique),
  phoneNumber: String (E.164),
  role: 'user' | 'admin',
  storageLimit: Number (bytes),
  storageUsed: Number (bytes),
  notificationSettings: Object,
  createdAt: Date,
  lastLoginAt: Date
}
```

### Recording Model

```javascript
{
  userId: ObjectId (ref User),
  firebaseUid: String,
  type: 'call' | 'voicemail',
  callMode: 'twilio' | 'webrtc',
  callSid: String (Twilio only),
  webrtcCallId: String (WebRTC only),
  from: String,
  to: String,
  direction: 'inbound' | 'outbound',
  duration: Number (seconds),
  fileSize: Number (bytes),
  format: 'webm' | 'wav' | 'mp3',
  storage: {
    provider: 'twilio' | 'backblaze',
    b2Key: String,
    twilioUrl: String
  },
  status: 'recording' | 'processing' | 'active' | 'archived',
  isListened: Boolean,
  transcription: {
    status: 'pending' | 'completed' | 'failed',
    text: String
  },
  recordedAt: Date
}
```

---

## Security Architecture

### Authentication Flow

```
1. User logs in via Firebase Auth (client-side)
         │
         ▼
2. Firebase returns ID token
         │
         ▼
3. Client sends token in Authorization header
         │
         ▼
4. API middleware verifies token with Firebase Admin
         │
         ▼
5. Extract user UID and attach to request
         │
         ▼
6. MongoDB query uses UID for data access
```

### Security Measures

| Layer     | Measure                                    |
| --------- | ------------------------------------------ |
| Transport | HTTPS/TLS enforced                         |
| API       | JWT verification on all endpoints          |
| Database  | User-scoped queries (no cross-user access) |
| Storage   | Signed URLs with expiration                |
| Webhooks  | Twilio signature verification              |
| Input     | Request validation and sanitization        |

---

## Scalability Considerations

### Horizontal Scaling

- **Serverless**: Next.js API routes auto-scale
- **Database**: MongoDB Atlas handles scaling
- **Storage**: Backblaze B2 handles large files

### Performance Optimizations

| Optimization | Description                                        |
| ------------ | -------------------------------------------------- |
| Pagination   | All list endpoints support cursor-based pagination |
| Indexes      | Compound indexes on frequently queried fields      |
| CDN          | Vercel edge network for static assets              |
| Compression  | Gzip compression on API responses                  |

### Rate Limiting

- API: 100 requests/minute per user
- Recordings: 10 uploads/hour per user

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Production Deployment                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   GitHub Repository                                                          │
│         │                                                                     │
│         ▼                                                                     │
│   ┌─────────────┐                                                            │
│   │ GitHub      │                                                            │
│   │ Actions CI  │                                                            │
│   └─────────────┘                                                            │
│         │                                                                     │
│         ▼                                                                     │
│   ┌─────────────┐                                                            │
│   │   Vercel    │◄─────────────────────────────────────┐                      │
│   │  (Frontend) │                                      │                      │
│   └─────────────┘                                      │                      │
│         │                                             │                      │
│         ▼                                             │                      │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │                      │
│   │   Firebase  │  │  Twilio     │  │ Backblaze   │    │                      │
│   │   Auth/FCM  │  │   Voice     │  │     B2      │    │                      │
│   └─────────────┘  └─────────────┘  └─────────────┘    │                      │
│                                                     │                      │
│   ┌─────────────┐  ┌─────────────┐                    │                      │
│   │  MongoDB    │  │   Redis     │                    │                      │
│   │    Atlas    │  │  (Optional) │                    │                      │
│   └─────────────┘  └─────────────┘                    │                      │
│                                                     │                      │
│         ┌────────────────────────────────────────────┘                      │
│         │                                                                   │
│         ▼                                                                   │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                        Monitoring Stack                             │    │
│   │  - Vercel Analytics  - Error Tracking  - Performance Monitoring     │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

Last updated: February 2026
CareFlow v1.0.0
