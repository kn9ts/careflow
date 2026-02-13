# CareFlow WebRTC API Reference

**Last Updated:** 2026-02-12
**Version:** 1.0.0

---

## Overview

The CareFlow WebRTC API provides peer-to-peer voice calling capabilities using WebRTC technology. This document serves as the complete API reference for developers integrating WebRTC functionality into CareFlow applications.

## Table of Contents

1. [WebRTCManager Class](#webrtcmanager-class)
2. [Event Listeners](#event-listeners)
3. [Connection Methods](#connection-methods)
4. [Call Methods](#call-methods)
5. [Recording Methods](#recording-methods)
6. [Utility Methods](#utility-methods)
7. [Constants and Configuration](#constants-and-configuration)
8. [Error Handling](#error-handling)

---

## WebRTCManager Class

The `WebRTCManager` class is the primary interface for all WebRTC operations.

### Constructor

```javascript
const manager = new WebRTCManager();
```

Creates a new WebRTCManager instance. No parameters required.

### Properties

| Property               | Type                | Description                                          |
| ---------------------- | ------------------- | ---------------------------------------------------- |
| `peerConnection`       | `RTCPeerConnection` | The underlying WebRTC peer connection                |
| `localStream`          | `MediaStream`       | Local audio/video stream                             |
| `remoteStream`         | `MediaStream`       | Remote peer's audio/video stream                     |
| `currentRoomId`        | `string`            | Unique identifier for the current call room          |
| `targetCare4wId`       | `string`            | CareFlow ID of the target user                       |
| `localCare4wId`        | `string`            | CareFlow ID of the local user                        |
| `isRecording`          | `boolean`           | Whether recording is active                          |
| `isReconnecting`       | `boolean`           | Whether reconnection is in progress                  |
| `reconnectAttempts`    | `number`            | Number of reconnection attempts made                 |
| `maxReconnectAttempts` | `number`            | Maximum number of reconnection attempts (default: 5) |

---

## Initialization

### `initialize(localCare4wId, token)`

Initializes the WebRTC manager with the user's CareFlow ID and authentication token.

**Parameters:**

- `localCare4wId` (string): The user's unique CareFlow identifier
- `token` (string, optional): Firebase authentication token

**Returns:** `Promise<void>`

**Throws:**

- `Error`: If called in non-browser environment
- `Error`: If Firebase initialization fails

**Example:**

```javascript
const manager = new WebRTCManager();

try {
  await manager.initialize('care4w-1000001', 'firebase-auth-token');
  console.log('WebRTC initialized successfully');
} catch (error) {
  console.error('Initialization failed:', error.message);
}
```

---

## Event Listeners

### `on(event, callback)`

Registers an event listener for WebRTC events.

**Parameters:**

- `event` (string): The event name (see below)
- `callback` (function): The callback function to execute

**Supported Events:**

| Event                   | Callback Parameters     | Description                               |
| ----------------------- | ----------------------- | ----------------------------------------- |
| `localStream`           | `(stream: MediaStream)` | Fired when local media stream is acquired |
| `remoteStream`          | `(stream: MediaStream)` | Fired when remote stream is received      |
| `connectionStateChange` | `(state: string)`       | Fired when connection state changes       |
| `callEnded`             | `()`                    | Fired when call ends                      |
| `incomingCall`          | `(callInfo: object)`    | Fired when incoming call is received      |
| `recordingStarted`      | `(info: object)`        | Fired when recording starts               |
| `recordingStopped`      | `(recording: object)`   | Fired when recording stops                |
| `recordingError`        | `(error: string)`       | Fired when recording encounters error     |
| `reconnecting`          | `()`                    | Fired when reconnection starts            |
| `reconnected`           | `()`                    | Fired when reconnection succeeds          |

**Example:**

```javascript
manager.on('localStream', (stream) => {
  const audioElement = document.getElementById('audio');
  audioElement.srcObject = stream;
});

manager.on('connectionStateChange', (state) => {
  console.log('Connection state:', state);
});

manager.on('callEnded', () => {
  console.log('Call has ended');
});
```

### `off(event)`

Removes an event listener.

**Parameters:**

- `event` (string): The event name to unregister

**Example:**

```javascript
manager.off('localStream');
```

---

## Connection Methods

### `getLocalStream(constraints)`

Acquires the local media stream (microphone).

**Parameters:**

- `constraints` (MediaStreamConstraints, optional): Media constraints
  - Default: `{ audio: true, video: false }`

**Returns:** `Promise<MediaStream>`

**Throws:**

- `Error`: If WebRTC is not initialized
- `Error`: If user denies media permissions

**Example:**

```javascript
// Audio only (default)
const stream = await manager.getLocalStream();

// With video
const stream = await manager.getLocalStream({ audio: true, video: true });

// Custom audio constraints
const stream = await manager.getLocalStream({
  audio: { echoCancellation: true, noiseSuppression: true },
});
```

### `createOffer(targetCare4wId)`

Creates and sends an offer to initiate a call.

**Parameters:**

- `targetCare4wId` (string): CareFlow ID of the user to call

**Returns:** `Promise<RTCSessionDescription>`

**Throws:**

- `Error`: If WebRTC is not initialized

**Example:**

```javascript
try {
  const offer = await manager.createOffer('care4w-1000002');
  console.log('Offer created:', offer.type);
} catch (error) {
  console.error('Failed to create offer:', error.message);
}
```

### `acceptCall(roomId, offerSdp)`

Accepts an incoming call.

**Parameters:**

- `roomId` (string): The room ID from the incoming call
- `offerSdp` (object): The offer SDP from the caller
  - `type` (string): "offer"
  - `sdp` (string): Session Description Protocol data

**Returns:** `Promise<RTCSessionDescription>`

**Throws:**

- `Error`: If WebRTC is not initialized

**Example:**

```javascript
const offer = {
  type: 'offer',
  sdp: 'v=0\r\no=- ... (SDP data)',
};

const answer = await manager.acceptCall('room-12345', offer);
console.log('Answer created:', answer.type);
```

### `endCall()

Ends the current call and cleans up resources.

**Returns:** `Promise<void>`

**Example:**

```javascript
await manager.endCall();
console.log('Call ended');
```

---

## Call Methods

### `sendIceCandidate(candidate)`

Sends an ICE candidate to the remote peer.

**Parameters:**

- `candidate` (RTCIceCandidate): The ICE candidate to send

**Returns:** `Promise<void>`

**Example:**

```javascript
const candidate = new RTCIceCandidate({
  candidate: 'candidate:1 1 udp 2113937151 192.168.1.1 54321 typ host',
  sdpMid: '0',
  sdpMLineIndex: 0,
});

await manager.sendIceCandidate(candidate);
```

### `restartIce()`

Restarts the ICE connection (useful after network changes).

**Returns:** `Promise<void>`

**Throws:**

- `Error`: If peer connection is not initialized

**Example:**

```javascript
await manager.restartIce();
```

### `toggleMute()`

Toggles the mute state of the local audio.

**Returns:** `boolean` - `true` if muted (audio disabled), `false` if unmuted (audio enabled)

**Example:**

```javascript
const isMuted = manager.toggleMute();
console.log('Microphone muted:', isMuted);
```

---

## Recording Methods

### `startRecording()

Starts recording the call audio.

**Returns:** `Promise<boolean>`

**Example:**

```javascript
const started = await manager.startRecording();
if (started) {
  console.log('Recording started');
}
```

### `stopRecording()

Stops the call recording and processes the recorded audio.

**Returns:** `Promise<Recording>` - Recording object with metadata

**Recording Object:**

```javascript
{
  id: "rec_1234567890",
  blob: Blob,
  duration: 120,        // seconds
  size: 1234567,       // bytes
  mimeType: "audio/webm",
  createdAt: "2026-02-12T11:46:00.000Z"
}
```

**Example:**

```javascript
const recording = await manager.stopRecording();
console.log(`Recording saved: ${recording.duration}s`);

// Upload recording
await uploadRecording(recording.blob);
```

### `getSupportedMimeType()

Returns the supported MIME type for MediaRecorder.

**Returns:** `string` - Supported MIME type

**Example:**

```javascript
const mimeType = manager.getSupportedMimeType();
console.log('Using MIME type:', mimeType);
// Possible values: "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"
```

---

## Utility Methods

### `getConnectionStats()

Retrieves current connection statistics.

**Returns:** `Promise<ConnectionStats>`

**ConnectionStats Object:**

```javascript
{
  bytesReceived: 1024000,      // Total bytes received
  bytesSent: 2048000,         // Total bytes sent
  packetsLost: 0,             // Packets lost
  roundTripTime: 0.05,        // RTT in seconds
  state: "connected"          // Connection state
}
```

**Example:**

```javascript
const stats = await manager.getConnectionStats();
console.log('RTT:', stats.roundTripTime * 1000, 'ms');
console.log('Packets lost:', stats.packetsLost);
```

### `listenForIncomingCalls()

Sets up the listener for incoming calls (called automatically during initialization).

### `listenForAnswer(roomId)`

Sets up the listener for answer to our offer.

**Parameters:**

- `roomId` (string): The room ID to listen for

### `listenForIceCandidates(roomId)`

Sets up the listener for ICE candidates from the remote peer.

**Parameters:**

- `roomId` (string): The room ID to listen for

### `cleanupListeners()

Removes all Firebase listeners.

### `setupReconnectionHandler()

Sets up Firebase connection monitoring (called automatically).

### `handleFirebaseReconnect()

Handles Firebase reconnection event.

### `attemptReconnection()

Attempts to restore signaling connection.

---

## Constants and Configuration

### ICE Servers Configuration

```javascript
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];
```

### Environment Variables

| Variable                            | Description                    | Required |
| ----------------------------------- | ------------------------------ | -------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`      | Firebase API key               | Yes      |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`  | Firebase auth domain           | Yes      |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`   | Firebase project ID            | Yes      |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Firebase Realtime Database URL | Yes      |
| `NEXT_PUBLIC_TURN_SERVER_URL`       | TURN server URL (optional)     | No       |
| `NEXT_PUBLIC_TURN_USERNAME`         | TURN username (optional)       | No       |
| `NEXT_PUBLIC_TURN_CREDENTIAL`       | TURN credential (optional)     | No       |

---

## Error Handling

### Common Errors

| Error                                                      | Cause                               | Solution                      |
| ---------------------------------------------------------- | ----------------------------------- | ----------------------------- |
| `"WebRTC is only available in browser environment"`        | Called from server-side code        | Ensure code runs in browser   |
| `"WebRTC not initialized"`                                 | Method called before `initialize()` | Call `initialize()` first     |
| `"Failed to initialize Firebase"`                          | Firebase configuration missing      | Check environment variables   |
| `"Permission denied: Camera and microphone access denied"` | User denied media permissions       | Request permissions from user |
| `"Requested device not found"`                             | No microphone connected             | Connect a microphone          |
| `"Constraints not satisfied"`                              | Media constraints cannot be met     | Adjust constraints            |
| `"Max reconnection attempts reached"`                      | Too many reconnection failures      | Check network connectivity    |

### Error Handling Pattern

```javascript
const manager = new WebRTCManager();

try {
  await manager.initialize('care4w-1000001');

  manager.on('localStream', (stream) => {
    // Handle local stream
  });

  manager.on('error', (error) => {
    console.error('WebRTC error:', error);
  });

  await manager.getLocalStream();
  await manager.createOffer('care4w-1000002');
} catch (error) {
  if (error.message.includes('Permission denied')) {
    // Handle permission error
    showPermissionRequestDialog();
  } else {
    // Handle other errors
    console.error('WebRTC error:', error);
  }
}
```

---

## Connection States

The WebRTC connection can be in the following states:

| State          | Description                 |
| -------------- | --------------------------- |
| `new`          | Peer connection created     |
| `connecting`   | ICE negotiation in progress |
| `connected`    | Successfully connected      |
| `disconnected` | Peer disconnected           |
| `failed`       | Connection failed           |
| `closed`       | Connection closed           |

---

## Complete Usage Example

```javascript
import WebRTCManager from '@/lib/webrtc';

class CallManager {
  constructor() {
    this.manager = new WebRTCManager();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.manager.on('localStream', (stream) => {
      this.attachLocalStream(stream);
    });

    this.manager.on('remoteStream', (stream) => {
      this.attachRemoteStream(stream);
    });

    this.manager.on('connectionStateChange', (state) => {
      this.updateConnectionUI(state);
    });

    this.manager.on('callEnded', () => {
      this.handleCallEnded();
    });

    this.manager.on('incomingCall', (callInfo) => {
      this.showIncomingCallModal(callInfo);
    });

    this.manager.on('recordingStopped', (recording) => {
      this.saveRecording(recording);
    });
  }

  async startCall(targetCare4wId) {
    await this.manager.initialize(this.localCare4wId);
    await this.manager.getLocalStream();
    await this.manager.createOffer(targetCare4wId);
  }

  async acceptCall(roomId, offerSdp) {
    await this.manager.acceptCall(roomId, offerSdp);
  }

  async endCall() {
    await this.manager.endCall();
  }

  toggleMute() {
    return this.manager.toggleMute();
  }

  async startRecording() {
    return await this.manager.startRecording();
  }

  async stopRecording() {
    return await this.manager.stopRecording();
  }
}
```

---

## Related Documentation

- [WebRTC Documentation](WEBRTC_DOCUMENTATION.md)
- [TURN Configuration](TURN_CONFIGURATION.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Testing Guide](../tests/CAREFLOW_WEBRTC_TESTING_GUIDE.md)
