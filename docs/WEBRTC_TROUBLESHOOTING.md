# CareFlow WebRTC Troubleshooting Guide

**Last Updated:** 2026-02-12
**Version:** 1.0.0

---

## Overview

This comprehensive troubleshooting guide covers common issues encountered when using CareFlow's WebRTC calling feature. Use this guide to diagnose and resolve connection problems, audio issues, and other WebRTC-related challenges.

## Table of Contents

1. [Quick Diagnosis Flowchart](#quick-diagnosis-flowchart)
2. [Connection Issues](#connection-issues)
3. [Audio Problems](#audio-problems)
4. [Network Issues](#network-issues)
5. [Browser Compatibility](#browser-compatibility)
6. [Firebase Signaling Issues](#firebase-signaling-issues)
7. [TURN Server Issues](#turn-server-issues)
8. [Mobile Device Issues](#mobile-device-issues)
9. [Diagnostic Tools](#diagnostic-tools)
10. [Error Reference](#error-reference)

---

## Quick Diagnosis Flowchart

```
Start: User reports WebRTC issue
    │
    ▼
Is the user logged in?
    │
    ├─► NO → Check authentication
    │
    ▼
Is media access granted?
    │
    ├─► NO → Check browser permissions
    │
    ▼
Does call initiate?
    │
    ├─► NO → Check signaling (Firebase)
    │
    ▼
Does call connect?
    │
    ├─► NO → Check ICE/STUN/TURN
    │
    ▼
Is audio working?
    │
    ├─► NO → Check audio devices
    │
    ▼
Issue resolved ✓
```

---

## Connection Issues

### Calls Never Connect (Stuck at "Connecting")

**Symptoms:**

- Call stays in "connecting" state indefinitely
- No audio on either side

**Diagnosis Steps:**

1. **Check browser console for errors**

   ```javascript
   // Open DevTools → Console
   // Look for ICE errors, STUN failures
   ```

2. **Verify ICE server configuration**

   ```javascript
   // In browser console
   const pc = new RTCPeerConnection({
     iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
   });

   // Check ICE connection state
   pc.oniceconnectionstatechange = () => {
     console.log("ICE state:", pc.iceConnectionState);
   };
   ```

3. **Test STUN server connectivity**
   ```bash
   # From terminal
   nc -zv stun.l.google.com 3478
   ```

**Solutions:**

1. **Add TURN server for symmetric NATs**

   ```javascript
   // lib/webrtc.js
   const ICE_SERVERS = [
     { urls: "stun:stun.l.google.com:19302" },
     { urls: "stun:stun1.l.google.com:19302" },
     // Add TURN server
     {
       urls: "turn:your-turn-server.com:3478",
       username: "user",
       credential: "password",
     },
   ];
   ```

2. **Check firewall rules**

   ```bash
   # Allow UDP ports
   sudo ufw allow 3478/udp
   sudo ufw allow 10000-60000/udp
   ```

3. **Verify Firebase connectivity**

   ```javascript
   // Check Firebase connection
   import { getDatabase, ref, onValue } from "firebase/database";

   const db = getDatabase();
   const connectedRef = ref(db, ".info/connected");

   onValue(connectedRef, (snap) => {
     if (snap.val() === true) {
       console.log("Firebase connected");
     } else {
       console.log("Firebase disconnected");
     }
   });
   ```

### Calls Connect But No Audio

**Symptoms:**

- Connection state shows "connected"
- Both users see each other as connected
- No audio is heard

**Diagnosis Steps:**

1. **Check audio track status**

   ```javascript
   // In browser console
   const stream = document.querySelector("audio").srcObject;
   const tracks = stream.getAudioTracks();

   tracks.forEach((track) => {
     console.log("Track:", track.label);
     console.log("Enabled:", track.enabled);
     console.log("Muted:", track.muted);
   });
   ```

2. **Verify mute state**

   ```javascript
   // Check if audio is muted
   const audioTracks = peerConnection
     .getTransceivers()
     .filter((t) => t.mediaKind === "audio")
     .map((t) => t.sender.track);

   audioTracks.forEach((track) => {
     console.log("Audio track muted:", track.muted);
   });
   ```

3. **Check WebRTC statistics**
   ```javascript
   const stats = await peerConnection.getStats();
   stats.forEach((report) => {
     if (report.type === "inbound-rtp" && report.kind === "audio") {
       console.log("Packets received:", report.packetsReceived);
       console.log("Packets lost:", report.packetsLost);
     }
   });
   ```

**Solutions:**

1. **Unmute audio**

   ```javascript
   const stream = document.querySelector("audio").srcObject;
   stream.getAudioTracks().forEach((track) => {
     track.enabled = true;
   });
   ```

2. **Check system audio settings**
   - Verify volume is not muted at OS level
   - Check browser is not muted
   - Ensure correct output device selected

3. **Re-initiate audio**

   ```javascript
   // Stop and restart audio track
   const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
   const oldStream = document.querySelector("audio").srcObject;

   // Replace track in peer connection
   const sender = peerConnection
     .getSenders()
     .find((s) => s.track && s.track.kind === "audio");
   if (sender) {
     await sender.replaceTrack(stream.getAudioTracks()[0]);
   }
   ```

### Audio Echo Issues

**Symptoms:**

- Loud echo during call
- Audio feedback loop
- Difficulty hearing clearly

**Solutions:**

1. **Enable echo cancellation**

   ```javascript
   const stream = await navigator.mediaDevices.getUserMedia({
     audio: {
       echoCancellation: true,
       noiseSuppression: true,
       autoGainControl: true,
     },
   });
   ```

2. **Use headphones**
   - Recommend users wear headphones during calls
   - Reduces feedback loop

3. **Lower speaker volume**
   - Lower volume reduces echo pickup

---

## Audio Problems

### No Microphone Input Detected

**Symptoms:**

- "Microphone not found" error
- Call connects but other party hears nothing

**Diagnosis:**

1. **List available devices**

   ```javascript
   // In browser console
   const devices = await navigator.mediaDevices.enumerateDevices();
   const audioInputs = devices.filter((d) => d.kind === "audioinput");
   console.log("Audio input devices:", audioInputs);
   ```

2. **Test microphone directly**
   ```javascript
   // Simple mic test
   const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
   const audio = new Audio();
   audio.srcObject = stream;
   await audio.play();
   ```

**Solutions:**

1. **Request microphone permission**

   ```javascript
   try {
     const stream = await navigator.mediaDevices.getUserMedia({
       audio: {
         deviceId: { exact: preferredDeviceId },
       },
     });
   } catch (error) {
     if (error.name === "NotAllowedError") {
       console.log("Permission denied");
     }
   }
   ```

2. **Switch to different microphone**

   ```javascript
   const devices = await navigator.mediaDevices.enumerateDevices();
   const audioInputs = devices.filter((d) => d.kind === "audioinput");

   if (audioInputs.length > 0) {
     const stream = await navigator.mediaDevices.getUserMedia({
       audio: { deviceId: audioInputs[0].deviceId },
     });
   }
   ```

3. **Check browser permission settings**
   - Navigate to `chrome://settings/content/microphone`
   - Ensure CareFlow has microphone permission

### Poor Audio Quality

**Symptoms:**

- Choppy or garbled audio
- Frequent audio dropouts
- Robot-like voice quality

**Diagnosis:**

1. **Check network quality**

   ```javascript
   const stats = await peerConnection.getStats();
   stats.forEach((report) => {
     if (report.type === "candidate-pair" && report.state === "succeeded") {
       console.log("Round trip time:", report.currentRoundTripTime);
       console.log("Available bandwidth:", report.availableOutgoingBitrate);
     }
   });
   ```

2. **Monitor packet loss**

   ```javascript
   peerConnection.getStats().then((stats) => {
     const inbound = [...stats.values()].find(
       (s) => s.type === "inbound-rtp" && s.kind === "audio",
     );

     if (inbound) {
       console.log(
         "Packet loss:",
         inbound.packetsLost,
         "/",
         inbound.packetsReceived,
       );
     }
   });
   ```

**Solutions:**

1. **Enable adaptive bitrate**

   ```javascript
   const stream = await navigator.mediaDevices.getUserMedia({
     audio: {
       sampleRate: 48000,
       channelCount: 1,
       echoCancellation: true,
       noiseSuppression: true,
     },
   });
   ```

2. **Use bandwidth constraints**

   ```javascript
   const offer = await peerConnection.createOffer({
     offerToReceiveAudio: true,
     offerToReceiveVideo: false,
   });

   // Modify SDP for lower bitrate
   const sdp = offer.sdp;
   const modifiedSDP = sdp.replace(
     /b=AS:.*\r\n/,
     "b=AS:24\r\n", // 24 kbps for audio
   );
   ```

---

## Network Issues

### Firewall Blocking

**Symptoms:**

- Cannot establish connections
- STUN binding requests timeout
- ICE candidates show host type only

**Diagnosis:**

1. **Test port connectivity**

   ```bash
   # Test STUN port
   nc -zv stun.l.google.com 3478

   # Test TURN port
   nc -zv your-turn-server.com 3478

   # Test media ports
   nc -zv your-turn-server.com 50000
   ```

2. **Check NAT type**

   ```javascript
   // Create test peer connection
   const pc = new RTCPeerConnection({
     iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
   });

   pc.createDataChannel("test");
   const offer = await pc.createOffer();
   await pc.setLocalDescription(offer);

   // Check local candidates
   pc.onicecandidate = (event) => {
     if (event.candidate) {
       console.log("Candidate type:", event.candidate.type);
     }
   };
   ```

**Solutions:**

1. **Configure TURN server for relay**

   ```javascript
   const iceServers = [
     { urls: "stun:stun.l.google.com:19302" },
     {
       urls: "turn:your-turn-server.com:3478",
       username: "user",
       credential: "password",
     },
   ];
   ```

2. **Open required ports**

   ```bash
   # STUN/TURN ports
   sudo ufw allow 3478/tcp
   sudo ufw allow 3478/udp

   # Media port range
   sudo ufw allow 49152:65535/udp

   # HTTPS for signaling (fallback)
   sudo ufw allow 443/tcp
   ```

### High Latency

**Symptoms:**

- Delayed audio
- Poor call quality
- Sync issues

**Diagnosis:**

1. **Measure latency**

   ```javascript
   const start = Date.now();
   await peerConnection.createOffer();
   const latency = Date.now() - start;
   console.log("Offer creation latency:", latency);
   ```

2. **Check geographic location**
   - Both users' distances from TURN server
   - Network backbone quality

**Solutions:**

1. **Use geographically close TURN servers**

   ```javascript
   const iceServers = [
     { urls: "stun:stun.l.google.com:19302" },
     // Use regional TURN servers
     { urls: "turn:us-west.turn.example.com:3478" },
     { urls: "turn:eu-central.turn.example.com:3478" },
   ];
   ```

2. **Implement jitter buffer**
   - Built into WebRTC, but monitor performance

---

## Browser Compatibility

### Chrome Issues

**Common Issues:**

- Hardware acceleration conflicts
- Audio context suspended
- Microphone permission persistence

**Solutions:**

1. **Enable audio context**

   ```javascript
   const audioContext = new (
     window.AudioContext || window.webkitAudioContext
   )();
   if (audioContext.state === "suspended") {
     await audioContext.resume();
   }
   ```

2. **Disable hardware acceleration**
   - Navigate to `chrome://settings/system`
   - Turn off "Use hardware acceleration"

### Firefox Issues

**Common Issues:**

- Different ICE candidate handling
- Audio device selection
- SDP format differences

**Solutions:**

1. **Use Firefox-specific workarounds**
   ```javascript
   const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
   if (isFirefox) {
     // Apply Firefox-specific configuration
   }
   ```

### Safari Issues

**Common Issues:**

- Limited WebRTC support on older versions
- Different codec support
- Autoplay restrictions

**Solutions:**

1. **Request audio context**

   ```javascript
   // Safari requires user gesture for audio
   document.addEventListener("click", async () => {
     const audioContext = new (
       window.AudioContext || window.webkitAudioContext
     )();
     await audioContext.resume();
   });
   ```

2. **Use compatible codecs**
   ```javascript
   const supportedCodecs = RTCRtpSender.getCapabilities("audio").codecs;
   const preferredCodec = supportedCodecs.find(
     (c) => c.mimeType === "audio/opus",
   );
   ```

---

## Firebase Signaling Issues

### Connection Drops

**Symptoms:**

- Calls disconnect unexpectedly
- Reconnection required

**Diagnosis:**

1. **Monitor Firebase connection**

   ```javascript
   import { getDatabase, ref, onValue, onDisconnect } from "firebase/database";

   const db = getDatabase();
   const connectedRef = ref(db, ".info/connected");

   onValue(connectedRef, (snap) => {
     if (!snap.val()) {
       console.log("Firebase disconnected");
     }
   });
   ```

2. **Check Firebase quotas**
   - Verify not exceeding concurrent connections
   - Check data transfer limits

**Solutions:**

1. **Implement reconnection logic**

   ```javascript
   manager.on("reconnecting", () => {
     console.log("Attempting to reconnect...");
   });

   manager.on("reconnected", () => {
     console.log("Reconnected successfully");
   });
   ```

2. **Increase connection limits**
   - Upgrade Firebase plan if needed
   - Implement connection pooling

### Signaling Timeout

**Symptoms:**

- Long delays before call connects
- "Signaling timeout" errors

**Diagnosis:**

1. **Check Firebase latency**

   ```javascript
   const start = Date.now();
   await set(ref(db, "test"), { timestamp: Date.now() });
   const latency = Date.now() - start;
   console.log("Firebase write latency:", latency);
   ```

2. **Verify network path**
   - Test from both call participants' locations

**Solutions:**

1. **Use regional Firebase instances**
   ```javascript
   // Configure Firebase with regional database
   const firebaseConfig = {
     // ... other config
     databaseURL: "https://your-project.us-central1.firebasedatabase.app",
   };
   ```

---

## TURN Server Issues

### TURN Connection Failures

**Symptoms:**

- Calls fail with TURN errors
- "TURN allocation failed" messages

**Diagnosis:**

1. **Test TURN server directly**

   ```bash
   # Using turnutils_uclient
   turnutils_uclient -u username -w password -v turn.example.com
   ```

2. **Check TURN server logs**
   ```bash
   tail -f /var/log/turnserver.log | grep -i error
   ```

**Solutions:**

1. **Verify credentials**

   ```javascript
   const iceServers = [
     {
       urls: "turn:turn.example.com:3478",
       username: "correct-username",
       credential: "correct-password",
     },
   ];
   ```

2. **Check server capacity**
   ```bash
   # Check active allocations
   grep "allocation" /var/log/turnserver.log | wc -l
   ```

### TURN Performance Issues

**Symptoms:**

- High latency with TURN
- Poor quality through TURN relay

**Solutions:**

1. **Deploy TURN servers regionally**
   ```yaml
   # Kubernetes deployment for multiple regions
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: coturn-us-west
   spec:
     selector:
       app: coturn
       region: us-west
   ```

---

## Mobile Device Issues

### iOS Safari Issues

**Common Problems:**

- WebRTC limited support
- Audio routing issues
- Background call handling

**Solutions:**

1. **Use compatible configuration**

   ```javascript
   const configuration = {
     iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
     iceCandidatePoolSize: 10,
   };
   ```

2. **Handle audio routing**
   ```javascript
   // Request audio session
   const audioSession = AVAudioSession.sharedInstance();
   await audioSession.setCategory(.playAndRecord, .defaultToSpeaker);
   ```

### Android Chrome Issues

**Common Problems:**

- Hardware codec limitations
- Battery optimization conflicts
- Doze mode interruptions

**Solutions:**

1. **Keep device awake during call**

   ```javascript
   // Request wake lock
   try {
     const wakeLock = await navigator.wakeLock.request("audio");
   } catch (err) {
     console.log("Wake lock not supported");
   }
   ```

2. **Disable battery optimization**
   ```javascript
   // Check if app is optimized
   const powerManager = navigator.power;
   if (powerManager) {
     const isIgnoring = await powerManager.isIgnoringBatteryOptimizations();
     if (!isIgnoring) {
       // Suggest user disable battery optimization
     }
   }
   ```

---

## Diagnostic Tools

### In-Browser Diagnostics

```javascript
// Run in browser console for comprehensive diagnostics
async function diagnoseWebRTC() {
  console.log("=== WebRTC Diagnostics ===\n");

  // 1. Check browser support
  console.log("Browser:", navigator.userAgent);
  console.log("WebRTC supported:", !!window.RTCPeerConnection);
  console.log(
    "getUserMedia supported:",
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  );

  // 2. Check ICE servers
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  console.log("ICE servers configured:", pc.getConfiguration().iceServers);

  // 3. List devices
  const devices = await navigator.mediaDevices.enumerateDevices();
  console.log(
    "\nAudio input devices:",
    devices.filter((d) => d.kind === "audioinput"),
  );
  console.log(
    "Audio output devices:",
    devices.filter((d) => d.kind === "audiooutput"),
  );

  // 4. Test microphone
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("\nMicrophone test: SUCCESS");
    stream.getTracks().forEach((t) => t.stop());
  } catch (err) {
    console.log("\nMicrophone test: FAILED -", err.message);
  }

  // 5. Check Firebase connection
  console.log("\n=== End Diagnostics ===");
}

// Run the diagnostic
diagnoseWebRTC();
```

### Network Testing

```bash
# Test STUN server
stunclient stun.l.google.com 19302

# Test TURN server
turnutils_uclient -u username -w password -v turn.example.com

# Check UDP connectivity
iperf3 -c test-server -u -b 1M -t 10

# Measure latency
mtr -r -c 100 stun.l.google.com
```

### Log Collection

```javascript
// Enable verbose logging
const originalConsole = { ...console };

// Patch console to capture logs
const logs = [];
const originalLog = console.log;
console.log = (...args) => {
  logs.push({ type: "log", message: args.join(" "), timestamp: Date.now() });
  originalLog.apply(console, args);
};

// Export logs
function exportLogs() {
  const blob = new Blob([JSON.stringify(logs, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "webrtc-logs.json";
  a.click();
}
```

---

## Error Reference

| Error Code                   | Error Message          | Cause              | Solution                  |
| ---------------------------- | ---------------------- | ------------------ | ------------------------- |
| `ERR_ACCESS_DENIED`          | Permission denied      | Microphone blocked | Check browser permissions |
| `ERR_NOT_FOUND`              | Device not found       | No microphone      | Connect microphone        |
| `ERR_NOT_ALLOWED`            | Not allowed            | Permission denied  | Grant permission          |
| `ERR_ICE_FAILED`             | ICE negotiation failed | Network/firewall   | Configure TURN            |
| `ERR_ICE_CONNECTION_FAILURE` | ICE connection failed  | NAT/firewall       | Use TURN server           |
| `ERR_DATA_CHANNEL_FAILURE`   | Data channel failed    | Signaling issue    | Check Firebase            |
| `ERR_AUDIO_OUTPUT_DEVICE`    | Audio device error     | Wrong device       | Select correct device     |
| `ERR_FIREBASE_DISCONNECTED`  | Firebase disconnected  | Network issue      | Check connection          |

---

## Emergency Procedures

### Immediate Call Termination

```javascript
// Force end call immediately
async function emergencyEndCall() {
  // Stop all tracks
  if (manager.localStream) {
    manager.localStream.getTracks().forEach((track) => track.stop());
  }

  // Close peer connection
  if (manager.peerConnection) {
    manager.peerConnection.close();
  }

  // Remove from Firebase
  if (manager.db && manager.currentRoomId) {
    const { remove } = await import("firebase/database");
    await remove(ref(manager.db, `calls/${manager.currentRoomId}`));
  }
}
```

### Reset WebRTC State

```javascript
async function resetWebRTC() {
  // Close existing connection
  if (manager.peerConnection) {
    manager.peerConnection.close();
  }

  // Clear local stream
  if (manager.localStream) {
    manager.localStream.getTracks().forEach((track) => track.stop());
  }

  // Reset state
  manager.peerConnection = null;
  manager.localStream = null;
  manager.remoteStream = null;
  manager.currentRoomId = null;

  // Reinitialize
  await manager.initialize(manager.localCare4wId);
}
```

---

## Related Documentation

- [API Reference](WEBRTC_API_REFERENCE.md)
- [TURN Configuration](TURN_CONFIGURATION.md)
- [Architecture](WEBRTC_ARCHITECTURE.md)
- [Testing Guide](../tests/CAREFLOW_WEBRTC_TESTING_GUIDE.md)
