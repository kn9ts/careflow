# CareFlow Technical Documentation

**Last Updated:** 2026-02-06
**Version:** 2.0.0

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Authentication System](#authentication-system)
4. [Database Models](#database-models)
5. [WebRTC Peer-to-Peer Calling](#webrtc-peer-to-peer-calling)
6. [Twilio Voice Integration](#twilio-voice-integration)
7. [Backblaze B2 Storage](#backblaze-b2-storage)
8. [CareFlow ID Generation System](#careflow-id-generation-system)
9. [API Endpoints](#api-endpoints)
10. [Environment Configuration](#environment-configuration)
11. [Push Notifications](#push-notifications)
12. [Call Flow Diagrams](#call-flow-diagrams)
13. [Error Handling](#error-handling)
14. [Security](#security)

---

## System Overview

CareFlow is a web-based telephony application built with Next.js 14 that enables browser-based voice communications. The application supports two calling modes:

- **Twilio Voice Mode**: Traditional PSTN telephony calls to phone numbers (when Twilio credentials are configured)
- **WebRTC Mode**: Free browser-to-browser peer-to-peer calls using CareFlow User IDs (fallback when Twilio is unavailable)

### Key Features

- User registration and authentication via Firebase Auth
- Browser-based outbound and inbound calls
- Automatic call recording with cloud storage
- Call history with pagination and filtering
- Analytics dashboard with call statistics
- Push notifications for incoming calls and call status
- Dark-themed responsive UI

### Tech Stack

| Category       | Technology                              |
| -------------- | --------------------------------------- |
| Framework      | Next.js 14.2.21                         |
| UI Library     | React 18.3.1                            |
| Authentication | Firebase Auth                           |
| Voice API      | Twilio Programmable Voice               |
| Database       | MongoDB with Mongoose                   |
| Storage        | Backblaze B2 (S3-compatible)            |
| Styling        | Tailwind CSS                            |
| Real-time      | Firebase Realtime DB (WebRTC signaling) |

---

## Architecture

### System Architecture Diagram

```mermaid
graph TB
    subgraph Client
        A[Next.js App] --> B[AuthContext]
        B --> C[Dashboard UI]
        C --> D[Call Manager]
        D --> E{Twilio Available?}
        E -->|Yes| F[Twilio Device SDK]
        E -->|No| G[WebRTC Manager]
    end

    subgraph API_Layer
        H[App Router API]
        H --> I[Auth Handlers]
        H --> J[Call History]
        H --> K[Analytics]
        H --> L[Twilio Webhooks]
        H --> M[User Lookup]
        H --> N[Token Endpoint]
    end

    subgraph Services
        O[Firebase Auth]
        P[MongoDB Atlas]
        Q[Twilio Voice API]
        R[Firebase Realtime DB]
        S[Backblaze B2]
        T[Firebase Cloud Messaging]
    end

    D --> F
    D --> G
    F --> Q
    G --> R
    H --> I
    I --> O
    H --> J
    J --> P
    H --> N
    N --> Q
    L --> Q
    J --> S
    H --> T
```

### Data Flow Architecture

```mermaid
flowchart LR
    subgraph User["User Browser"]
        UI["Dashboard UI"]
        SDK["Twilio Device / WebRTC"]
    end

    subgraph Backend["Next.js API"]
        Auth["Auth Handlers"]
        Token["Token Endpoint"]
        Webhooks["Twilio Webhooks"]
    end

    subgraph Storage["Data & Storage"]
        DB[(MongoDB)]
        Auth0[(Firebase Auth)]
        B2[(Backblaze B2)]
    end

    subgraph Telephony["Telephony"]
        Twilio["Twilio Voice"]
    end

    UI -->|"Login/Register"| Auth0
    UI -->|"API Requests"| Backend
    Backend --> DB
    Auth --> Auth0
    Token -->|"JWT Token"| UI
    UI --> SDK
    SDK -->|"Voice Calls"| Twilio
    Twilio -->|"Webhooks"| Webhooks
    Webhooks --> DB
    DB -->|"Recordings"| B2
```

---

## Authentication System

### Authentication Architecture

CareFlow uses Firebase Authentication as the primary identity provider, with MongoDB storing additional user metadata.

```mermaid
flowchart TB
    subgraph Client["Client-Side"]
        A[AuthContext] --> B[Firebase Auth SDK]
        B --> C[Token Storage]
        C --> D[Auto Refresh Timer]
    end

    subgraph Server["Server-Side"]
        E[API Routes]
        F[verifyAuthToken]
        G[Firebase Admin SDK]
        H[User Model]
    end

    A -->|"Auth State Change"| E
    E -->|"Bearer Token"| F
    F --> G
    G -->|"Verify Token"| Firebase
    F -->|"Query/Update"| H
```

### Client-Side Authentication

The `AuthContext` provides React context for authentication state management:

**Features:**

- Automatic authentication state detection
- JWT token management with automatic refresh (every 50 minutes)
- Session persistence via localStorage
- User profile management

**Key Functions:**

| Function                                   | Purpose                    |
| ------------------------------------------ | -------------------------- |
| `signup(email, password, displayName)`     | Create new user account    |
| `login(email, password)`                   | Authenticate existing user |
| `logout()`                                 | Sign out user              |
| `resetPassword(email)`                     | Send password reset email  |
| `updateProfileData(displayName, photoURL)` | Update user profile        |

**Token Refresh Logic:**

```javascript
// Tokens refresh every 50 minutes (Firebase tokens expire in 60 minutes)
const tokenRefresh = setInterval(
  async () => {
    try {
      const newToken = await getIdToken(user, true);
      setToken(newToken);
    } catch (err) {
      // If refresh fails, sign out user
      await handleLogout();
    }
  },
  50 * 60 * 1000,
);
```

### Server-Side Authentication

The server-side authentication utilities handle token verification and user management:

**Functions:**

| Function                                                    | Purpose                                            |
| ----------------------------------------------------------- | -------------------------------------------------- |
| `verifyAuthToken(request)`                                  | Verify Firebase ID token from Authorization header |
| `getOrCreateUser(firebaseUid, email, displayName, options)` | Get or create user in MongoDB                      |
| `requireAuth(request)`                                      | Verify authentication and return user data         |
| `requireAdmin(request)`                                     | Verify admin role access                           |

**Token Verification:**

```javascript
export async function verifyAuthToken(request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized - No token provided", status: 401 };
  }

  const token = authHeader.split("Bearer ")[1];
  const auth = getAdminAuth();
  const decodedToken = await auth.verifyIdToken(token);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    displayName: decodedToken.name,
    success: true,
  };
}
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant Firebase
    participant API
    participant MongoDB

    User->>Client: Enter email/password
    Client->>Firebase: signInWithEmailAndPassword()
    Firebase-->>Client: ID Token + User Data
    Client->>API: POST /api/auth/login (with token)
    API->>Firebase: verifyIdToken()
    Firebase-->>API: Token valid
    API->>MongoDB: getOrCreateUser()
    MongoDB-->>API: User profile
    API-->>Client: User data + care4wId
    Client->>Client: Store token in AuthContext
```

---

## Database Models

### User Model

The User model stores user profiles and CareFlow-specific data:

```javascript
{
  // Firebase Auth ID (primary identifier)
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
  },

  // Profile Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  displayName: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 50,
  },
  photoURL: {
    type: String,
    default: "",
  },

  // Role & Permissions
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true,
  },

  // Phone Configuration
  twilioPhoneNumber: {
    type: String,
    default: null,
    validate: /^\+?[1-9]\d{1,14}$/, // E.164 format
  },
  twilioClientIdentity: {
    type: String,
    sparse: true,
  },

  // CareFlow User ID for WebRTC calls
  care4wId: {
    type: String,
    unique: true,
    immutable: true, // Cannot be changed
  },
  sequenceNumber: {
    type: Number,
    unique: true,
    immutable: true,
  },

  // Notification Preferences
  notifications: {
    incomingCalls: { type: Boolean, default: true },
    missedCalls: { type: Boolean, default: true },
    voicemails: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
  },

  // Push Notification Tokens
  notificationTokens: [{
    token: String,
    deviceInfo: {
      userAgent: String,
      platform: String,
    },
    registeredAt: Date,
  }],

  // Storage Quota
  storageUsed: { type: Number, default: 0 }, // bytes
  storageLimit: { type: Number, default: 1073741824 }, // 1GB

  // Timestamps
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**

- `firebaseUid` (unique)
- `email` (unique)
- `care4wId` (unique)
- `sequenceNumber` (unique)
- `twilioClientIdentity` (sparse)
- `isActive + lastLoginAt` (compound)
- `role + isActive` (compound)

### Recording Model

The Recording model stores call and voicemail recordings:

```javascript
{
  // Association with User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  firebaseUid: {
    type: String,
    required: true,
    index: true,
  },

  // Recording Type
  type: {
    type: String,
    enum: ["call", "voicemail"],
    required: true,
  },

  // Call Information
  sid: {
    type: String,
    required: true,
    unique: true,
  },
  callSid: String,
  from: { type: String, required: true },
  to: { type: String, required: true },
  direction: {
    type: String,
    enum: ["inbound", "outbound"],
    required: true,
  },

  // Storage (Backblaze B2)
  storageKey: { type: String, required: true },
  storageBucket: { type: String, required: true },

  // Metadata
  duration: { type: Number, required: true },
  fileSize: Number,
  format: { type: String, default: "wav" },

  // Timestamps
  recordedAt: { type: Date, required: true },
  uploadedAt: Date,
  listenedAt: Date,
  archivedAt: Date,

  // Status
  status: {
    type: String,
    enum: ["active", "archived", "deleted"],
    default: "active",
  },
  storageClass: {
    type: String,
    enum: ["STANDARD", "GLACIER_DEEP_ARCHIVE"],
    default: "STANDARD",
  },
  isListened: { type: Boolean, default: false },

  // Optional
  transcription: String,
  callerLocation: String,
}
```

**Indexes:**

- `userId + recordedAt` (compound)
- `firebaseUid + type` (compound)
- `userId + isListened` (compound)

### Database Connection

MongoDB connection management with connection pooling:

```javascript
export async function connectDB() {
  // Uses cached connection for hot reloads
  // Max pool size: 10 connections
  // Server selection timeout: 5000ms
  // Socket timeout: 45000ms
}
```

---

## WebRTC Peer-to-Peer Calling

### WebRTC Architecture

When Twilio credentials are unavailable, CareFlow automatically switches to WebRTC mode for free browser-to-browser calls.

```mermaid
flowchart TB
    subgraph UserA["Caller (care4w-1000001)"]
        A1[WebRTC Manager]
        A2[Local Stream]
        A3[Peer Connection]
    end

    subgraph Signaling["Signaling Server"]
        S1[Firebase Realtime DB]
    end

    subgraph UserB["Callee (care4w-1000002)"]
        B1[WebRTC Manager]
        B2[Local Stream]
        B3[Peer Connection]
    end

    A3 -->|"Offer (SDP)"| S1
    S1 -->|"Offer (SDP)"| B3
    B3 -->|"Answer (SDP)"| S1
    S1 -->|"Answer (SDP)"| A3
    A3 -->|"ICE Candidates"| S1
    S1 -->|"ICE Candidates"| B3
    A3 <==>|"P2P Audio"| B3
```

### WebRTC Manager

The `WebRTCManager` class handles peer-to-peer connections:

**Constructor:**

```javascript
class WebRTCManager {
  peerConnection: RTCPeerConnection
  localStream: MediaStream
  remoteStream: MediaStream
  currentRoomId: string
  targetCare4wId: string
  localCare4wId: string
}
```

**Key Methods:**

| Method                         | Purpose                        |
| ------------------------------ | ------------------------------ |
| `initialize(localCare4wId)`    | Initialize WebRTC with user ID |
| `getLocalStream(constraints)`  | Get microphone access          |
| `createOffer(targetCare4wId)`  | Create call offer              |
| `acceptCall(roomId, offerSdp)` | Accept incoming call           |
| `sendIceCandidate(candidate)`  | Send ICE candidate             |
| `endCall()`                    | Terminate call                 |
| `listenForIncomingCalls()`     | Listen for incoming calls      |

**ICE Servers Configuration:**

```javascript
const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];
```

### Signaling via Firebase Realtime DB

WebRTC signaling uses Firebase Realtime Database:

**Data Structure:**

```
calls/
  {roomId}/
    offer/
      sdp: SessionDescription
      type: "offer"
      from: care4wId
      to: care4wId
      timestamp: serverTimestamp
    answer/
      sdp: SessionDescription
      type: "answer"
      from: care4wId
      timestamp: serverTimestamp
    ice/
      {timestamp}/
        candidate: ICE Candidate
        from: care4wId
```

### WebRTC Call Flow

```mermaid
sequenceDiagram
    participant Caller
    participant Firebase["Firebase RTDB"]
    participant Callee

    Caller->>Caller: Get local audio stream
    Caller->>Firebase: Create room + Store offer
    Firebase-->>Caller: Room created

    Firebase->>Callee: Listen for incoming calls
    Callee-->>Firebase: Detect offer

    Callee->>Callee: Get local audio stream
    Callee->>Firebase: Store answer
    Firebase-->>Callee: Answer stored

    Firebase->>Caller: Detect answer
    Caller->>Caller: Set remote description

    loop ICE Candidate Exchange
        Caller->>Firebase: Send ICE candidate
        Firebase->>Callee: Forward ICE candidate
        Callee->>Caller: Add ICE candidate

        Callee->>Firebase: Send ICE candidate
        Firebase->>Caller: Forward ICE candidate
        Caller->>Callee: Add ICE candidate
    end

    Caller<==>Callee: P2P Audio Stream Established
```

### CallManager

The `CallManager` provides a unified interface for both Twilio and WebRTC:

```javascript
class CallManager {
  mode: 'twilio' | 'webrtc'
  care4wId: string
  twilioDevice: Device
  webrtcManager: WebRTCManager

  async initialize(token, care4wId)
  async makeCall(number)      // Phone number or care4wId
  async acceptCall()
  async endCall()
  toggleMute()
  sendDigits(digit)
}
```

**Mode Detection:**

```javascript
async fetchTokenInfo() {
  const response = await fetch("/api/token", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json(); // { mode: 'twilio' | 'webrtc', care4wId }
}
```

---

## Twilio Voice Integration

### Token Generation

The token endpoint generates access tokens for Twilio Voice SDK:

```mermaid
flowchart TB
    A[GET /api/token] --> B[requireAuth]
    B --> C{Twilio Available?}
    C -->|Yes| D[Generate JWT Token]
    C -->|No| E[Return WebRTC Mode]

    D --> F[VoiceGrant with TwiML App SID]
    F --> G[incomingAllow: true]
    G --> H[Return token + mode: 'twilio']

    E --> I[Return care4wId + mode: 'webrtc']
```

**Response Format:**

```javascript
// Twilio Mode
{
  success: true,
  data: {
    token: "eyJ...",
    identity: "user-abc123",
    mode: "twilio",
    care4wId: "care4w-1000001"
  }
}

// WebRTC Mode
{
  success: true,
  data: {
    token: null,
    identity: null,
    mode: "webrtc",
    care4wId: "care4w-1000001",
    message: "WebRTC mode active - use care4w- IDs for calls"
  }
}
```

### Voice Webhook

Handles incoming calls by connecting to browser client:

```mermaid
sequenceDiagram
    participant Caller
    participant Twilio
    participant API["Voice Webhook"]
    participant MongoDB
    participant Browser

    Caller->>Twilio: Dial Twilio number
    Twilio->>API: POST /webhooks/twilio/voice
    API->>MongoDB: Find user by twilioPhoneNumber
    MongoDB-->>API: User found
    API->>Twilio: TwiML Dial Client(user.twilioClientIdentity)
    Twilio->>Browser: Incoming call event
    Browser-->>Twilio: Accept call
    Twilio->>Caller: Connected
```

**TwiML Response:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting your call</Say>
  <Dial>
    <Client>user-abc123</Client>
  </Dial>
</Response>
```

### Status Webhook

Handles call status updates and creates recordings:

```mermaid
stateDiagram-v2
    [*] --> Ringing
    Ringing --> InProgress: answered
    Ringing --> NoAnswer: no-answer
    Ringing --> Busy: busy
    Ringing --> Failed: failed
    InProgress --> Completed: completed
    Completed --> [*]
    NoAnswer --> [*]
    Busy --> [*]
    Failed --> [*]
```

**Status Handling:**

| Status      | Action                                     |
| ----------- | ------------------------------------------ |
| `completed` | Create/update recording, send notification |
| `no-answer` | Send missed call notification              |
| `busy`      | Send busy notification                     |
| `failed`    | Send failed notification                   |

---

## Backblaze B2 Storage

### Overview

CareFlow uses Backblaze B2 as the primary cloud storage for call recordings. B2 is S3-compatible and offers significant cost savings over AWS S3.

### Storage Class

```javascript
class BackblazeStorage {
  client: S3Client
  bucketName: string

  initialize(): boolean
  isConfigured(): boolean
  async uploadFile(key, body, contentType): { key, url, bucket }
  async uploadRecording(callId, buffer, filename): { key, url }
  async getSignedUrl(key, expiresIn): string
  async getFile(key): Buffer
  async deleteFile(key): { key, deleted }
  async listFiles(prefix, maxKeys): [{ key, size, lastModified }]
  async getFileMetadata(key): { size, contentType, lastModified }
  async fileExists(key): boolean
}
```

### Storage Operations

**Uploading a Recording:**

```javascript
const result = await backblazeStorage.uploadRecording(
  callId, // e.g., "CA123456"
  fileBuffer, // Audio file buffer
  "recording.webm",
);
// Returns: { key: "recordings/CA123/1701234567-recording.webm", url: "..." }
```

**Getting Presigned URL:**

```javascript
// Get temporary download URL (valid for 1 hour)
const url = await backblazeStorage.getSignedUrl(key);
// Returns: "https://s3.us-east-1.backblazeb2.com/...?X-Amz-Expires=3600"
```

**Listing Recordings:**

```javascript
const files = await backblazeStorage.listFiles(`recordings/${callId}`);
// Returns: [{ key, size, lastModified }, ...]
```

### Recording Upload Flow

```mermaid
sequenceDiagram
    participant Twilio
    participant API
    participant BackblazeB2
    participant MongoDB

    Twilio->>API: Recording complete webhook
    API->>BackblazeB2: Upload recording file
    BackblazeB2-->>API: Upload confirmation + URL
    API->>MongoDB: Create Recording document
    MongoDB-->>API: Recording created
    API-->>Twilio: Confirm storage
```

---

## CareFlow ID Generation System

### Overview

The CareFlow ID system generates unique `care4w-XXXXXXX` IDs for WebRTC peer-to-peer calls.

### ID Format

```
Format: care4w-{7-digit-sequence}
Example: care4w-1000001, care4w-1000002
```

**Properties:**

- **Immutable**: Cannot be changed after creation
- **Unique**: Each user has a unique ID
- **Indexed**: Optimized for database lookups

### ID Generator

```javascript
export async function generateCare4wId() {
  // Get the next sequence number
  const sequenceNumber = await getNextSequence();

  // Format: care4w-{7-digit-zero-padded-sequence}
  const care4wId = `care4w-${sequenceNumber.toString().padStart(7, "0")}`;

  return { care4wId, sequenceNumber };
}

async function getNextSequence() {
  // Uses MongoDB atomic increment
  const counter = await connection
    .collection("counters")
    .findOneAndUpdate(
      { _id: "care4wSequence" },
      { $inc: { sequence: 1 } },
      { upsert: true, returnDocument: "after" },
    );

  // Start from 1000001
  const sequence = counter?.sequence || 1;
  return 1000000 + sequence;
}
```

### ID Validation

```javascript
export function isValidCare4wId(care4wId) {
  // Format: care4w- followed by exactly 7 digits
  return /^care4w-\d{7}$/.test(care4wId);
}
```

### User Lookup

```javascript
export async function lookupCare4wId(care4wId) {
  const user = await User.findOne({ care4wId })
    .select("displayName firebaseUid")
    .lean();

  if (user) {
    return {
      exists: true,
      displayName: user.displayName,
      uid: user.firebaseUid,
    };
  }

  return { exists: false };
}
```

### ID Generation Flow

```mermaid
flowchart TB
    A[User Registration] --> B[Call generateCare4wId]
    B --> C{Atomic Counter Available?}
    C -->|Yes| D[Increment counter collection]
    C -->|No| E[Query highest sequence from User]
    D --> F[Generate care4w-XXXXXXX]
    E --> F
    F --> G[Store with user profile]
    G --> H[Return care4wId to client]
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register

Register a new user and create user profile.

**Request:**

```json
{
  "displayName": "John Doe",
  "email": "john@example.com",
  "firebaseUid": "abc123xyz"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "User profile created successfully",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "john@example.com",
      "displayName": "John Doe",
      "role": "user",
      "care4wId": "care4w-1000001",
      "twilioClientIdentity": "user-abc123-1701234567",
      "createdAt": "2026-02-06T19:00:00.000Z"
    }
  }
}
```

#### POST /api/auth/login

Authenticate user and return user data.

**Request:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Login successful",
    "user": {
      "uid": "abc123xyz",
      "email": "john@example.com",
      "displayName": "John Doe",
      "role": "user",
      "twilioClientIdentity": "user-abc123-1701234567"
    }
  }
}
```

### Token Endpoint

#### GET /api/token

Generate Twilio access token or return WebRTC mode info.

**Headers:**

```
Authorization: Bearer {firebaseIdToken}
```

**Response (Twilio Mode):**

```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "identity": "user-abc123",
    "mode": "twilio",
    "care4wId": "care4w-1000001"
  }
}
```

**Response (WebRTC Mode):**

```json
{
  "success": true,
  "data": {
    "token": null,
    "identity": null,
    "mode": "webrtc",
    "care4wId": "care4w-1000001",
    "message": "WebRTC mode active - use care4w- IDs for calls"
  }
}
```

### Call History Endpoint

#### GET /api/calls/history

Get call history for authenticated user.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `type` | string | - | Filter by type ('call' or 'voicemail') |

**Response:**

```json
{
  "success": true,
  "data": {
    "calls": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "firebaseUid": "abc123xyz",
        "type": "call",
        "sid": "CA123456",
        "from": "+1234567890",
        "to": "+0987654321",
        "direction": "outbound",
        "duration": 120,
        "recordedAt": "2026-02-06T19:00:00.000Z",
        "status": "active",
        "isListened": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### Analytics Endpoint

#### GET /api/analytics

Get call analytics for authenticated user.

**Response:**

```json
{
  "success": true,
  "data": {
    "analytics": {
      "totalCalls": 150,
      "totalVoicemails": 25,
      "totalDuration": 36000,
      "averageCallDuration": 240,
      "todayCalls": 5,
      "successRate": 92,
      "recentCalls": [...]
    }
  }
}
```

### User Lookup Endpoint

#### GET /api/users/lookup

Look up user by CareFlow User ID.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `care4wId` | string | Yes | CareFlow User ID to look up |

**Response (Found):**

```json
{
  "success": true,
  "data": {
    "exists": true,
    "care4wId": "care4w-1000002",
    "displayName": "Jane Doe",
    "message": "User found"
  }
}
```

**Response (Not Found):**

```json
{
  "success": true,
  "data": {
    "exists": false,
    "care4wId": "care4w-9999999",
    "message": "User not found"
  }
}
```

### Twilio Webhooks

#### POST /api/webhooks/twilio/voice

Handle incoming Twilio voice calls.

**Form Data:**
| Parameter | Description |
|-----------|-------------|
| `From` | Caller phone number |
| `To` | Called Twilio number |
| `CallSid` | Twilio call SID |
| `CallStatus` | Current call status |

**Response:** TwiML XML

#### POST /api/webhooks/twilio/status

Handle Twilio call status updates.

**Form Data:**
| Parameter | Description |
|-----------|-------------|
| `CallSid` | Twilio call SID |
| `CallStatus` | Call status (completed, no-answer, busy, failed) |
| `From` | Caller number |
| `To` | Called number |
| `Direction` | inbound/outbound |
| `CallDuration` | Call duration in seconds |
| `RecordingSid` | Recording SID |
| `RecordingUrl` | Recording URL |

### API Summary Table

| Endpoint                         | Method | Auth | Purpose                    |
| -------------------------------- | ------ | ---- | -------------------------- |
| `/api/auth/register`             | POST   | No\* | Create user profile        |
| `/api/auth/login`                | POST   | No\* | Authenticate user          |
| `/api/auth/logout`               | POST   | Yes  | Logout user                |
| `/api/token`                     | GET    | Yes  | Get Twilio/WebRTC token    |
| `/api/calls/history`             | GET    | Yes  | Get call history           |
| `/api/analytics`                 | GET    | Yes  | Get call analytics         |
| `/api/users/lookup`              | GET    | Yes  | Look up user by care4wId   |
| `/api/webhooks/twilio/voice`     | POST   | No   | Handle incoming calls      |
| `/api/webhooks/twilio/status`    | POST   | No   | Handle call status updates |
| `/api/webhooks/twilio/voicemail` | POST   | No   | Handle voicemail           |

\*Auth handled by Firebase token in request body

---

## Environment Configuration

### Configuration Schema

CareFlow uses a comprehensive environment configuration system with validation.

### Required Variables

#### Firebase Client Configuration

| Variable                                   | Required | Description                           |
| ------------------------------------------ | -------- | ------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Yes      | Firebase API Key                      |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Yes      | Firebase Auth Domain                  |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Yes      | Firebase Project ID                   |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Yes      | Firebase Storage Bucket               |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes      | FCM Sender ID                         |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Yes      | Firebase App ID                       |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL`        | No       | Firebase Realtime DB URL (for WebRTC) |

#### Firebase Admin Configuration

| Variable                      | Required | Description                 |
| ----------------------------- | -------- | --------------------------- |
| `FIREBASE_ADMIN_PROJECT_ID`   | Yes      | Admin Project ID            |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Yes      | Admin Service Account Email |
| `FIREBASE_ADMIN_PRIVATE_KEY`  | Yes      | Admin Private Key           |

#### Twilio Configuration

| Variable               | Required | Description         |
| ---------------------- | -------- | ------------------- |
| `TWILIO_ACCOUNT_SID`   | No\*     | Twilio Account SID  |
| `TWILIO_AUTH_TOKEN`    | No\*     | Twilio Auth Token   |
| `TWILIO_PHONE_NUMBER`  | No\*     | Twilio Phone Number |
| `TWILIO_TWIML_APP_SID` | No\*     | TwiML App SID       |
| `TWILIO_API_KEY`       | No\*     | Twilio API Key      |
| `TWILIO_API_SECRET`    | No\*     | Twilio API Secret   |

\*Required for Twilio Voice mode, optional for WebRTC-only mode

#### MongoDB Configuration

| Variable      | Required | Description                  |
| ------------- | -------- | ---------------------------- |
| `MONGODB_URI` | Yes      | MongoDB Atlas Connection URI |

#### Backblaze B2 Configuration

| Variable                    | Required | Description                    |
| --------------------------- | -------- | ------------------------------ |
| `BACKBLAZE_KEY_ID`          | No       | B2 Key ID                      |
| `BACKBLAZE_APPLICATION_KEY` | No       | B2 Application Key             |
| `BACKBLAZE_BUCKET_NAME`     | No       | B2 Bucket Name                 |
| `BACKBLAZE_ENDPOINT`        | No       | B2 S3 Endpoint                 |
| `BACKBLAZE_REGION`          | No       | B2 Region (default: us-east-1) |

#### Application Configuration

| Variable              | Required | Description                               |
| --------------------- | -------- | ----------------------------------------- |
| `NODE_ENV`            | No       | Environment (development/production/test) |
| `NEXT_PUBLIC_APP_URL` | Yes      | Public Application URL                    |

### Environment File Template

```bash
# Application Configuration
NODE_ENV=development

# Firebase Client Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-rtdb.firebaseio.com

# Firebase Admin Config
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret

# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/careflow

# Backblaze B2
BACKBLAZE_KEY_ID=004xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BACKBLAZE_APPLICATION_KEY=your_application_key
BACKBLAZE_BUCKET_NAME=careflow-recordings
BACKBLAZE_ENDPOINT=https://s3.us-east-1.backblazeb2.com
BACKBLAZE_REGION=us-east-1

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Push Notifications

### Notification System

CareFlow uses Firebase Cloud Messaging for push notifications:

```mermaid
flowchart TB
    A[Call Event] --> B[Determine Notification Type]
    B --> C{Status}
    C -->|incoming| D[sendIncomingCallNotification]
    C -->|completed| E[sendCallStatusNotification]
    C -->|no-answer| F[sendMissedCallNotification]
    C -->|voicemail| G[sendVoicemailNotification]

    D --> H[sendPushNotification]
    E --> H
    F --> H
    G --> H

    H --> I[Query User's FCM Tokens]
    I --> J[Send to each device]
    J --> K[Return results]
```

### Notification Types

| Function                       | Title                        | Body                            | Data                                    |
| ------------------------------ | ---------------------------- | ------------------------------- | --------------------------------------- |
| `sendIncomingCallNotification` | "Incoming Call"              | "Call from {from}"              | type: incoming_call, callSid, from, to  |
| `sendMissedCallNotification`   | "Missed Call"                | "You missed a call from {from}" | type: missed_call, callSid, from, to    |
| `sendCallStatusNotification`   | "Call completed/failed/busy" | "Call with {from} {status}"     | type: call_status, status, callSid      |
| `sendVoicemailNotification`    | "New Voicemail"              | "New voicemail from {from}"     | type: voicemail, recordingSid, duration |

### FCM Message Structure

```javascript
const message = {
  message: {
    token, // FCM device token
    notification: {
      title: "Incoming Call",
      body: "Call from +1234567890",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      click_action: "/dashboard",
    },
    data: {
      type: "incoming_call",
      callSid: "CA123456",
      timestamp: new Date().toISOString(),
    },
    android: {
      priority: "high",
      notification: {
        channel_id: "incoming_calls",
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          alert: { title, body },
          sound: "default",
          badge: 1,
        },
      },
    },
  },
};
```

---

## Call Flow Diagrams

### Outbound Call Flow (Twilio)

```mermaid
sequenceDiagram
    participant User
    participant Dashboard
    participant API["/api/token"]
    participant Twilio
    participant Recipient

    User->>Dashboard: Enter phone number
    Dashboard->>API: GET /api/token
    API-->>Dashboard: Twilio token
    Dashboard->>Twilio: Device.connect({ To: number })
    Twilio->>Recipient: PSTN call
    Recipient-->>Twilio: Answer
    Twilio-->>Dashboard: Connected event
    Dashboard->>User: Show call interface

    Note over User,Recipient: Call in progress

    User->>Dashboard: Click hangup
    Dashboard->>Twilio: disconnect()
    Twilio->>API: Status webhook (completed)
    API->>MongoDB: Create/update Recording
    Twilio-->>Dashboard: Disconnected event
```

### Inbound Call Flow (Twilio)

```mermaid
sequenceDiagram
    participant Caller
    participant Twilio
    participant VoiceWebhook["/api/webhooks/twilio/voice"]
    participant MongoDB
    participant Dashboard
    participant User

    Caller->>Twilio: Dial Twilio number
    Twilio->>VoiceWebhook: POST with From, To, CallSid
    VoiceWebhook->>MongoDB: Find user by twilioPhoneNumber
    MongoDB-->>VoiceWebhook: User found
    VoiceWebhook-->>Twilio: TwiML Dial Client
    Twilio->>Dashboard: incoming event
    Dashboard->>User: Show incoming call UI

    User->>Dashboard: Accept call
    Dashboard->>Twilio: connection.accept()
    Twilio->>Caller: Connected
    Dashboard->>User: Show call interface

    Note over User,Caller: Call in progress

    User->>Dashboard: Click hangup
    Dashboard->>Twilio: disconnect()
    Twilio->>StatusWebhook: Status webhook (completed)
    StatusWebhook->>MongoDB: Create/update Recording
```

### WebRTC Call Flow

```mermaid
sequenceDiagram
    participant Caller
    participant FirebaseRTDB["Firebase RTDB"]
    participant Callee

    Caller->>Caller: Enter care4w-1000002
    Caller->>FirebaseRTDB: Create room + Offer (SDP)
    FirebaseRTDB-->>Caller: Room created

    FirebaseRTDB->>Callee: Listen for incoming
    Callee-->>FirebaseRTDB: Detect new offer

    Callee->>Callee: User accepts call
    Callee->>FirebaseRTDB: Store Answer (SDP)

    FirebaseRTDB->>Caller: Detect answer
    Caller->>Caller: Set remote description

    loop ICE Exchange
        Caller->>FirebaseRTDB: Send ICE candidate
        FirebaseRTDB->>Callee: Forward ICE
        Callee->>Caller: Add ICE candidate
    end

    Caller<==>Callee: P2P Audio Stream
```

### Call Recording Flow

```mermaid
flowchart TB
    A[Call Completed] --> B[Twilio Status Webhook]
    B --> C{Has Recording?}
    C -->|Yes| D[Get RecordingSid + RecordingUrl]
    C -->|No| E[Create Recording with call details]

    D --> F[Upload to Backblaze B2]
    F --> G[Get storageKey + bucket]
    G --> H[Create Recording document in MongoDB]
    H --> I[Recording indexed and accessible]

    E --> I
```

---

## Error Handling

### API Response Format

All API responses follow a consistent format:

**Success Response:**

```json
{
  "success": true,
  "data": {
    /* response data */
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {
      /* optional details */
    }
  }
}
```

### Error Codes

| Code                     | HTTP Status | Description                  |
| ------------------------ | ----------- | ---------------------------- |
| `VALIDATION_ERROR`       | 400         | Invalid request parameters   |
| `UNAUTHORIZED`           | 401         | Authentication required      |
| `AUTH_REGISTER_FAILED`   | 500         | User registration failed     |
| `AUTH_LOGIN_FAILED`      | 401         | Login failed                 |
| `TOKEN_ERROR`            | 500         | Token generation failed      |
| `CALL_HISTORY_FAILED`    | 500         | Failed to fetch call history |
| `ANALYTICS_FETCH_FAILED` | 500         | Failed to fetch analytics    |
| `WEBHOOK_STATUS_FAILED`  | 500         | Webhook processing failed    |
| `LOOKUP_ERROR`           | 500         | User lookup failed           |
| `INTERNAL_ERROR`         | 500         | Internal server error        |

---

## Security

### Security Measures

#### Authentication Security

- Firebase ID token verification on all protected endpoints
- Token refresh every 50 minutes
- Automatic logout on token refresh failure
- Role-based access control (user/admin)

#### Data Security

- MongoDB connection with connection pooling
- Encrypted storage of sensitive data
- Secure session management

#### API Security

- Bearer token authentication
- Input validation on all endpoints
- Secure webhook signature verification (Twilio)

#### Storage Security

- Private Backblaze B2 buckets
- Presigned URLs for temporary file access
- No public access to recordings

### Environment Variables Security

- Firebase Admin credentials stored server-side only
- Twilio credentials protected
- MongoDB URI encrypted in transit
- Private keys never exposed to client

### WebRTC Security

- DTLS-SRTP encryption for peer connections
- ICE candidate filtering
- Secure signaling via Firebase Realtime Database rules

---

## Related Documentation

- [System Architecture](SYSTEM_ARCHITECTURE.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Backblaze B2 Guide](BACKBLAZE_B2_GUIDE.md)
- [WebRTC Fallback Architecture](WEBRTC_FALLBACK_ARCHITECTURE.md)
- [User Flows](USER_FLOWS.md)
- [CareFlow How It Works](CAREFLOW_HOW_IT_WORKS.md)

---

## File Reference

| File Path                                                  | Description                |
| ---------------------------------------------------------- | -------------------------- |
| [`context/AuthContext.js`](context/AuthContext.js)         | Client-side authentication |
| [`lib/auth.js`](lib/auth.js)                               | Server-side authentication |
| [`lib/webrtc.js`](lib/webrtc.js)                           | WebRTC peer connection     |
| [`lib/callManager.js`](lib/callManager.js)                 | Unified call interface     |
| [`lib/backblaze.js`](lib/backblaze.js)                     | Backblaze B2 storage       |
| [`lib/careFlowIdGenerator.js`](lib/careFlowIdGenerator.js) | CareFlow ID generation     |
| [`lib/db.js`](lib/db.js)                                   | MongoDB connection         |
| [`lib/notifications.js`](lib/notifications.js)             | Push notifications         |
| [`models/User.js`](models/User.js)                         | User model                 |
| [`models/Recording.js`](models/Recording.js)               | Recording model            |

---

_This documentation is automatically generated and cross-referenced with the actual implementation. Last sync: 2026-02-06_
