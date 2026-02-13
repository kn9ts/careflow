# CareFlow WebRTC Documentation

## Overview

CareFlow uses WebRTC (Web Real-Time Communication) for peer-to-peer voice calls between users when Twilio credentials are not available. This enables free browser-to-browser calling using Firebase Realtime Database for signaling.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CareFlow WebRTC Architecture                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                    ┌─────────────────────────────────────┐  │
│  │   User A   │                    │             User B                  │  │
│  │  (Caller)  │                    │           (Callee)                 │  │
│  └──────┬──────┘                    └───────────────┬─────────────────┘  │
│         │                                    │        │                     │
│         │  1. Create Offer                  │        │                     │
│         │──────────────────────────────────►│        │                     │
│         │                                    │        │                     │
│         │  2. Store in Firebase (auth required)      │                     │
│         │         (calls/roomId/offer)      │        │                     │
│         │                                    │        │                     │
│         │         ◄──────────────────────────│─────── │                     │
│         │  3. Accept Call & Create Answer   │        │                     │
│         │                                    │        │                     │
│         │  4. Store Answer in Firebase      │        │                     │
│         │         (calls/roomId/answer)     │        │                     │
│         │                                    │        │                     │
│         │◄──────────────────────────────────│────────│                     │
│         │  5. Set Remote Description        │        │                     │
│         │                                    │        │                     │
│         │         ICE Candidate Exchange    │        │                     │
│         │         (calls/roomId/ice)        │        │                     │
│         │──────────────────────────────────┼────────┼────────────────►    │
│         │                                  │        │                     │
│         │         Peer Connection Established (P2P)                        │
│         │◄────────────────────────────────┼────────┼─────────────────    │
│         │                                  │        │                     │
│         │         RTP Audio Stream         │        │                     │
│         │◄────────────────────────────────┼────────┼─────────────────    │
│         │                                  │        │                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Firebase Realtime Database                    │   │
│  │  Structure:                                                          │   │
│  │  ├── calls/                                                          │   │
│  │  │   ├── {roomId}/                                                 │   │
│  │  │   │   ├── offer: { sdp, type, from, to, timestamp }             │   │
│  │  │   │   ├── answer: { sdp, type, from, timestamp }                │   │
│  │  │   │   └── ice/                                                  │   │
│  │  │   │       └── {timestamp}: { candidate, sdpMid, sdpMLineIndex } │   │
│  │  └──                                                               │   │
│  │                                                                   │   │
│  │  SECURITY: All operations require Firebase Authentication token │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Recent Security & Bug Fixes

### Fixed Bugs

1. **Method Name Mismatch** (`lib/callManager.js:309`)
   - **Issue:** `acceptOffer()` was called but the method is named `acceptCall()` in `lib/webrtc.js`
   - **Fix:** Changed to `acceptCall(roomId, offer)` to match the actual method name

2. **WebRTC Accept Handling** (`hooks/useCallManager.js:195-206`)
   - **Issue:** `acceptCall()` didn't differentiate between Twilio and WebRTC calls
   - **Fix:** Added check for `pendingWebRTCCall` to route WebRTC calls to `acceptWebRTCCall()`

### Security Enhancements

1. **Firebase Authentication** (`lib/webrtc.js`)
   - **Issue:** Firebase database operations were unauthenticated
   - **Fix:**
     - Added auth token parameter to `initialize(care4wId, token)`
     - Token is passed from `CallManager` during WebRTC initialization
     - Firebase Security Rules should validate the token

2. **Configuration Validation** (`lib/webrtc.js`)
   - **Issue:** No validation of Firebase configuration
   - **Fix:** Added `validateConfig()` function to check required environment variables

3. **Rate Limiting** (`lib/callManager.js`)
   - **Issue:** No protection against spam calls
   - **Fix:**
     - Added `_checkRateLimit()` method
     - Max 10 calls per minute
     - Min 5 seconds between calls
     - Returns user-friendly error messages

4. **Input Validation** (`lib/callManager.js`)
   - **Issue:** No browser support check before WebRTC calls
   - **Fix:** Added `WebRTCManager.isSupported()` check

5. **Detailed Error Messages** (`lib/callManager.js`)
   - **Issue:** Generic error messages didn't help users
   - **Fix:** Added specific error messages with suggestions

## How WebRTC Works

### 1. Initialization

```
User Logs In
    │
    ▼
useCallManager Hook Triggers Initialization
    │
    ▼
CallManager.initialize(token, care4wId)
    │
    ▼
Check Token Mode:
├── "twilio" → initializeTwilio()
└── "webrtc" → initializeWebRTC()
    │
    ▼
WebRTCManager.initialize(care4wId, token)
├── Initialize Firebase with auth
├── Create RTCPeerConnection with STUN servers
├── Set up ICE candidate handlers
├── Set up connection state handlers
└── Start listening for incoming calls
    │
    ▼
Ready for Calls! ✓
```

### 2. Making an Outgoing Call

```
1. User enters phone number or CareFlow ID
    │
    ▼
2. User clicks "Call" button
    │
    ▼
3. makeCall() → CallManager.makeCall(number)
    │
    ▼
4. Rate Limit Check (max 10 calls/min, 5s between calls)
    │
    ▼
5. Wait for initialization if in progress
    │
    ▼
CallManager.makeCall(number):
├── If Twilio mode → makeTwilioCall(number)
└── If WebRTC mode → makeWebRTCCall(number)
    │
    ▼ (WebRTC Path)
WebRTCManager.createOffer(targetCare4wId):
├── Create roomId: {localCare4wId}-{target}-{timestamp}
├── Create RTCSessionDescription (offer)
├── Set local description
├── Store offer in Firebase (auth required)
└── Start listening for answer
    │
    ▼
6. Status: "connecting" → "ringing"
    │
    ▼
7. Remote user accepts call
    │
    ▼
8. Answer stored in Firebase
    │
    ▼
9. Set remote description (answer)
    │
    ▼
10. ICE candidates exchanged via Firebase
    │
    ▼
11. Peer Connection established → Status: "connected"
    │
    ▼
Live Call Active! ✓
```

### 3. Receiving an Incoming Call

```
1. Caller creates offer and stores in Firebase
    │
    ▼
2. WebRTCManager.listenForIncomingCalls() detects offer
    │
    ▼
3. onIncomingCall listener triggered:
   ├── Check if offer.to === localCare4wId
   ├── Check if call not yet answered
   └── Emit onIncomingCall event
    │
    ▼
4. UI shows incoming call notification
    │
    ▼
5. User clicks "Accept"
    │
    ▼
6. acceptCall() → acceptWebRTCCall(roomId, offer):
   ├── Set remote description (offer)
   ├── Create answer RTCSessionDescription
   ├── Set local description
   ├── Store answer in Firebase
   └── Start listening for ICE candidates
    │
    ▼
7. Status: "connecting" → "connected"
    │
    ▼
8. ICE candidates exchanged via Firebase
    │
    ▼
9. Peer Connection established → Status: "connected"
    │
    ▼
Live Call Active! ✓
```

## User Guide

### Prerequisites

1. **Browser Requirements:**
   - Chrome 70+ (recommended)
   - Firefox 68+
   - Safari 14+
   - Edge 79+

2. **Permissions:**
   - Microphone access must be allowed
   - Check browser address bar for microphone icon

3. **Environment Variables Required:**
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
   ```

### Using the Dialer

1. **Open Dialer:**
   - Click the phone icon in the header
   - Or select "Dialer" tab in the sidebar

2. **Enter Number:**
   - Type phone number with country code (e.g., +1234567890)
   - Or enter a CareFlow ID (format: `care4w-XXXXXXX`)

3. **Make Call:**
   - Click "Call" button
   - Wait for connection (status: connecting → ringing → connected)

4. **During Call:**
   - **Mute/Unmute:** Toggle microphone on/off
   - **End Call:** Click "Hang up" button

5. **End Call:**
   - Click "Hang up" button
   - Or close the dialer

### Receiving Calls

1. **Incoming Call Notification:**
   - Banner appears at top of screen
   - Shows caller ID (phone number or CareFlow ID)
   - Shows "Accept" and "Reject" buttons

2. **Accept Call:**
   - Click "Accept" to answer
   - Call connects immediately

3. **Reject Call:**
   - Click "Reject" to decline
   - Caller receives busy signal

## ICE Servers

WebRTC uses STUN/TURN servers for NAT traversal:

```javascript
// Current STUN servers (free, public)
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];
```

**Note:** For production with strict firewalls, add TURN servers:

```javascript
{
  urls: "turn:your-turn-server.com:3478",
  username: "username",
  credential: "password"
}
```

## Troubleshooting

### Common Issues

| Issue                  | Cause                         | Solution                             |
| ---------------------- | ----------------------------- | ------------------------------------ |
| Can't make calls       | Mic permission denied         | Allow microphone in browser settings |
| No audio               | Speaker/mic muted             | Check system audio settings          |
| Call fails immediately | Network firewall              | Add TURN servers                     |
| Caller not found       | Wrong CareFlow ID             | Verify recipient's ID                |
| Stuck at "connecting"  | ICE candidate exchange failed | Check Firebase connection            |
| "Too many calls"       | Rate limit exceeded           | Wait 1 minute                        |
| "WebRTC not supported" | Browser incompatible          | Use Chrome/Firefox/Edge/Safari       |

### Debug Mode

Enable debug logging in browser console:

```javascript
// In browser console
localStorage.setItem('webrtc_debug', 'true');
// Refresh page
```

### Checking Browser Support

```javascript
import { WebRTCManager } from '@/lib/webrtc';

if (WebRTCManager.isSupported()) {
  console.log('WebRTC is supported!');
} else {
  console.log('WebRTC is NOT supported in this browser');
}
```

## Code Structure

```
lib/
├── webrtc.js              # WebRTCManager class
│   ├── initialize(care4wId, token)  # Initialize with auth
│   ├── createOffer(targetCare4wId)  # Make outgoing call
│   ├── acceptCall(roomId, offer)    # Accept incoming call
│   └── endCall()          # End current call
│
├── callManager.js         # CallManager (unified interface)
│   ├── initialize()      # Detect mode, initialize Twilio or WebRTC
│   ├── makeCall()         # Route to appropriate backend + rate limit
│   ├── acceptCall()       # Handle both Twilio and WebRTC
│   ├── acceptWebRTCCall() # WebRTC-specific accept
│   └── endCall()          # End current call
│
hooks/
├── useCallManager.js      # React hook for call management
│   ├── makeCall, hangupCall, acceptCall, etc.
│   └── pendingWebRTCCall   # Store incoming call data
│
components/
└── dashboard/
    ├── DialPad.js        # Phone keypad UI
    ├── DialPadModal.js   # Modal containing dialer
    ├── CallControls.js   # Mute, hangup buttons
    └── CallStatus.js     # Connection status display
```

## API Reference

### WebRTCManager Methods

```javascript
class WebRTCManager {
  // Initialize with user's CareFlow ID and auth token
  async initialize(localCare4wId, token = null)

  // Get local microphone stream
  async getLocalStream(constraints = { audio: true, video: false })

  // Create offer for outgoing call
  async createOffer(targetCare4wId)

  // Accept incoming call
  async acceptCall(roomId, offerSdp)

  // End current call
  async endCall()

  // Set event listeners
  on(event, callback)  // events: onStatusChange, onCallStateChange, onIncomingCall, onCallEnded, onError, onLocalStream, onRemoteStream

  // Check browser support
  static isSupported()
}
```

### CallManager Methods

```javascript
class CallManager {
  // Initialize with token and CareFlow ID
  async initialize(token, care4wId)

  // Make outgoing call (with rate limiting)
  async makeCall(number)

  // Accept incoming call (auto-detects mode)
  async acceptCall()

  // Reject incoming call
  async rejectCall()

  // End current call
  async endCall()

  // Toggle mute
  toggleMute()
}
```

## Security Best Practices

### Firebase Security Rules

```json
{
  "rules": {
    "calls": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null",
        ".validate": "new.data.hasChildren(['from', 'timestamp'])",
        "offer": {
          ".validate": "new.data.hasChildren(['sdp', 'type', 'from', 'to', 'timestamp'])",
          "to": {
            ".validate": "new.data.val() === auth.uid || new.data.val() === auth.token.care4wId"
          }
        },
        "answer": {
          ".validate": "new.data.hasChildren(['sdp', 'type', 'from', 'timestamp'])"
        }
      }
    }
  }
}
```

### Environment Security

1. **Never expose Firebase Admin credentials on client**
2. **Use Firebase Security Rules for all database access**
3. **Validate CareFlow IDs server-side when possible**
4. **Use HTTPS in production**
5. **Enable Firebase App Check for additional protection**

### Rate Limiting

The implementation includes client-side rate limiting:

- Max 10 calls per minute
- Min 5 seconds between calls
- Server-side rate limiting should also be implemented

## Error Handling

### Error Codes and Messages

| Error Code  | Message                                  | Solution                |
| ----------- | ---------------------------------------- | ----------------------- |
| INIT_FAILED | "Call system not initialized"            | Wait for initialization |
| NO_SUPPORT  | "WebRTC not supported"                   | Use compatible browser  |
| RATE_LIMIT  | "Too many calls"                         | Wait 1 minute           |
| RATE_LIMIT  | "Please wait before making another call" | Wait 5 seconds          |
| SELF_CALL   | "Cannot call your own CareFlow ID"       | Use different ID        |
| INVALID_ID  | "Invalid CareFlow User ID"               | Check ID format         |
| MIC_DENIED  | (Browser permission error)               | Allow microphone        |

## Testing Infrastructure

### Overview

The WebRTC testing infrastructure uses comprehensive mocks to simulate browser APIs in a Node.js test environment. This allows testing WebRTC functionality without requiring an actual browser or media devices.

### Test Files

| File                               | Purpose                                   |
| ---------------------------------- | ----------------------------------------- |
| `tests/webrtc.test.js`             | Unit tests for WebRTCManager class        |
| `tests/webrtc-integration.test.js` | Integration tests for signaling workflows |
| `tests/lib/webrtc.test.js`         | Configuration and utility tests           |

### Mock Configuration

#### 1. Logger Mock

The logger must be mocked first to prevent import errors:

```javascript
jest.mock('@/lib/logger', () => ({
  logger: {
    init: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
    trace: jest.fn(),
    incomingCall: jest.fn(),
    recordingStart: jest.fn(),
    recordingStop: jest.fn(),
    complete: jest.fn(),
  },
}));
```

#### 2. Firebase Mocks

Firebase is mocked to avoid actual database connections:

```javascript
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({
    name: '[DEFAULT]',
    options: {},
  })),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/database', () => {
  const off = jest.fn();
  return {
    getDatabase: jest.fn(() => ({ ref: jest.fn() })),
    ref: jest.fn(() => ({
      on: jest.fn(),
      off: off,
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    })),
    onValue: jest.fn((ref, callback) => {
      callback({ val: () => null });
      return jest.fn(); // unsubscribe function
    }),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    serverTimestamp: jest.fn(() => Date.now()),
    push: jest.fn(() => ({ key: 'mock-push-key' })),
    off: off,
  };
});
```

#### 3. WebRTC API Mocks

The WebRTC API mocks must be set up in `beforeAll()` before importing the WebRTC module. **Critical**: All WebRTC APIs must be set on both `global` AND `global.window` for the `isWebRTCSupported()` check to pass.

```javascript
beforeAll(async () => {
  // Set up global window object
  global.window = {};

  // Mock RTCSessionDescription (define before setting on window)
  global.RTCSessionDescription = class RTCSessionDescription {
    constructor(description) {
      this.type = description.type;
      this.sdp = description.sdp;
    }
  };
  // Also set on window for isWebRTCSupported() check
  global.window.RTCSessionDescription = global.RTCSessionDescription;

  // Mock RTCIceCandidate
  global.RTCIceCandidate = class RTCIceCandidate {
    constructor(candidate) {
      this.candidate = candidate.candidate;
      this.sdpMid = candidate.sdpMid;
      this.sdpMLineIndex = candidate.sdpMLineIndex;
    }
  };
  global.window.RTCIceCandidate = global.RTCIceCandidate;

  // Mock RTCPeerConnection
  global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
    onicecandidate: null,
    onconnectionstatechange: null,
    ontrack: null,
    onsignalingstatechange: null,
    connectionState: 'new',
    signalingState: 'stable',
    localDescription: null,
    remoteDescription: null,
    iceGatheringState: 'complete',
    createOffer: jest.fn().mockResolvedValue({
      type: 'offer',
      sdp: 'v=0\r\no=- 123456789 0 IN IP4 0.0.0.0\r\ns=-\r\n',
    }),
    createAnswer: jest.fn().mockResolvedValue({
      type: 'answer',
      sdp: 'v=0\r\no=- 123456789 0 IN IP4 0.0.0.0\r\ns=-\r\n',
    }),
    setLocalDescription: jest.fn().mockResolvedValue(undefined),
    setRemoteDescription: jest.fn().mockResolvedValue(undefined),
    addIceCandidate: jest.fn().mockResolvedValue(undefined),
    addTrack: jest.fn(),
    getStats: jest.fn().mockResolvedValue(
      new Map([
        ['inbound-rtp', { type: 'inbound-rtp', bytesReceived: 1000, packetsLost: 0 }],
        ['outbound-rtp', { type: 'outbound-rtp', bytesSent: 2000 }],
        ['candidate-pair', { type: 'candidate-pair', currentRoundTripTime: 0.05 }],
      ])
    ),
    close: jest.fn(),
  }));
  // Also set on window for isWebRTCSupported() check
  global.window.RTCPeerConnection = global.RTCPeerConnection;

  // Mock MediaRecorder
  global.MediaRecorder = class MediaRecorder {
    constructor(stream, options) {
      this.stream = stream;
      this.options = options;
      this.state = 'inactive';
      this.ondataavailable = null;
      this.onstop = null;
    }

    start(interval) {
      this.state = 'recording';
    }

    stop() {
      this.state = 'inactive';
      if (this.onstop) {
        this.onstop();
      }
    }

    static isTypeSupported(mimeType) {
      const supported = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      return supported.includes(mimeType);
    }
  };

  // Mock navigator.mediaDevices - MUST be set before importing WebRTC module
  const mockAudioTrack = { kind: 'audio', enabled: true, stop: jest.fn() };
  mockMediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      id: 'local-stream-id',
      getTracks: () => [mockAudioTrack],
      getAudioTracks: () => [mockAudioTrack],
    }),
  };

  global.navigator = {
    mediaDevices: mockMediaDevices,
  };
  // Also set on window for isWebRTCSupported() check
  global.window.navigator = global.navigator;

  // Import the module AFTER all mocks are set up
  const module = await import('@/lib/webrtc.js');
  WebRTCManager = module.default;
  createWebRTCManager = module.createWebRTCManager;
});
```

#### Common Mock Setup Issues

1. **Missing `window` properties**: The `isWebRTCSupported()` function checks `window.RTCPeerConnection`, `window.RTCSessionDescription`, and `window.navigator.mediaDevices.getUserMedia`. All must be set on `global.window`.

2. **Wrong mock order**: Define the mock class/function first, then set it on `global.window`. Setting `window.RTCPeerConnection` before defining `global.RTCPeerConnection` will result in `undefined`.

3. **Missing navigator**: Both `global.navigator` and `global.window.navigator` must be set for the browser support check.

### Environment Variables in Tests

Each test file sets required environment variables in `beforeEach()`:

```javascript
beforeEach(() => {
  jest.clearAllMocks();
  originalEnv = { ...process.env };

  // Set required env variables
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abc123';
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL = 'https://test.firebaseio.com';
});

afterEach(() => {
  process.env = originalEnv;
});
```

### Testing Browser Support Detection

The `isWebRTCSupported()` function checks for all required browser APIs:

```javascript
it('should throw error when initialized in non-browser environment', async () => {
  const manager = new WebRTCManager();
  const originalWindow = global.window;
  const originalNavigator = global.navigator;
  delete global.window;
  delete global.navigator;

  await expect(manager.initialize('test-user')).rejects.toThrow(
    'WebRTC is not supported in this browser'
  );

  global.window = originalWindow;
  global.navigator = originalNavigator;
});
```

### Test Categories

#### 1. Initialization Tests

- Browser environment detection
- Peer connection creation with ICE servers
- TURN server configuration
- Firebase initialization
- Connection state management

#### 2. Local Stream Tests

- Audio stream acquisition
- Permission denial handling
- Track management

#### 3. Call Initiation Tests

- Offer creation
- Room ID generation
- Firebase storage

#### 4. Call Acceptance Tests

- Answer creation
- Remote description handling
- ICE candidate listening

#### 5. Call Termination Tests

- Peer connection cleanup
- Stream track stopping
- Firebase room cleanup
- Event listener notification

#### 6. Recording Tests

- MIME type detection
- MediaRecorder lifecycle
- Chunk collection

#### 7. Event Listener Tests

- Registration and unregistration
- Event emission
- Invalid event handling

#### 8. Connection Statistics Tests

- Stats retrieval
- Null handling for no connection

### Running Tests

```bash
# Run all WebRTC tests
npm test -- --testPathPattern="webrtc"

# Run specific test file
npm test -- tests/webrtc.test.js

# Run with coverage
npm test -- --testPathPattern="webrtc" --coverage
```

### Common Test Issues

| Issue                                     | Cause                       | Solution                                                         |
| ----------------------------------------- | --------------------------- | ---------------------------------------------------------------- |
| "WebRTC is not supported"                 | Mocks not set on `window`   | Add `global.window.RTCPeerConnection = global.RTCPeerConnection` |
| "Firebase configuration incomplete"       | Missing env variables       | Set all `NEXT_PUBLIC_FIREBASE_*` in `beforeEach()`               |
| Tests pass individually but fail together | State pollution             | Use `jest.clearAllMocks()` in `beforeEach()`                     |
| Module import fails                       | Mocks not set before import | Ensure all mocks are in `beforeAll()` before `import()`          |

### Test Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WebRTC Test Architecture                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Jest Test Environment                        │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │    │
│  │  │ Logger Mock   │  │ Firebase Mock │  │ WebRTC Mock   │           │    │
│  │  └───────────────┘  └───────────────┘  └───────────────┘           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Test Files                                   │    │
│  │  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐  │    │
│  │  │ webrtc.test.js    │  │ webrtc-           │  │ lib/webrtc.     │  │    │
│  │  │ (Unit Tests)      │  │ integration.      │  │ test.js         │  │    │
│  │  │                   │  │ test.js           │  │ (Config Tests)  │  │    │
│  │  │ - Initialization  │  │ (Integration)     │  │                 │  │    │
│  │  │ - Local Stream    │  │ - Signaling Flow  │  │ - ICE Config    │  │    │
│  │  │ - Call Actions    │  │ - Error Handling  │  │ - Signaling Msg │  │    │
│  │  │ - Recording       │  │ - Reconnection    │  │ - Quality Stats │  │    │
│  │  │ - Event Listeners │  │                   │  │                 │  │    │
│  │  └───────────────────┘  └───────────────────┘  └─────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      WebRTCManager Module                            │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │  Class Methods (tested via mocked browser APIs):             │    │    │
│  │  │  - initialize() → Uses mocked Firebase & RTCPeerConnection   │    │    │
│  │  │  - getLocalStream() → Uses mocked navigator.mediaDevices     │    │    │
│  │  │  - createOffer/acceptCall() → Uses mocked RTCSessionDesc     │    │    │
│  │  │  - startRecording() → Uses mocked MediaRecorder              │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Best Practices

1. **Mock Order Matters**: Logger → Firebase → WebRTC APIs → Module Import
2. **Window vs Global**: Set mocks on both `global` and `global.window` for `isWebRTCSupported()` checks
3. **Async Initialization**: Use `beforeAll(async () => { ... })` for module imports
4. **Environment Isolation**: Save and restore `process.env` in `beforeEach`/`afterEach`
5. **Clear Mocks**: Always call `jest.clearAllMocks()` in `beforeEach()`
6. **Test Independence**: Each test should work in isolation without relying on other tests
