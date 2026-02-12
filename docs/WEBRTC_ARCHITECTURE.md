# CareFlow WebRTC Architecture Documentation

**Last Updated:** 2026-02-12
**Version:** 1.0.0

---

## Overview

This document describes the architecture of CareFlow's WebRTC implementation, including signaling workflows, media flow, and the components involved in establishing peer-to-peer voice calls.

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Signaling Flow](#signaling-flow)
3. [Media Flow](#media-flow)
4. [Component Diagram](#component-diagram)
5. [Sequence Diagrams](#sequence-diagrams)
6. [Network Topology](#network-topology)
7. [Data Flow](#data-flow)

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CareFlow WebRTC Architecture                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐  │
│  │   Caller    │     │   Callee    │     │   Firebase Realtime DB   │  │
│  │  Browser    │     │  Browser    │     │     (Signaling)          │  │
│  └──────┬──────┘     └──────┬──────┘     └───────────┬─────────────┘  │
│         │                    │                          │               │
│         │   ┌────────────────┴────────────────┐       │               │
│         │   │                                  │       │               │
│         │   │     Firebase Authentication      │       │               │
│         │   │        (User Identity)          │       │               │
│         │   │                                  │       │               │
│         └───┴──────────────────────────────────┴───────┘               │
│                    │                          │                        │
│                    ▼                          ▼                        │
│         ┌──────────────────┐         ┌──────────────────┐              │
│         │   WebRTCManager  │◄──────►│   WebRTCManager  │              │
│         │   (Peer Conn)    │         │   (Peer Conn)    │              │
│         └────────┬─────────┘         └────────┬─────────┘              │
│                  │                            │                         │
│                  │  ICE Candidates / SDP       │                         │
│                  │  (Via Firebase)             │                         │
│                  │                            │                         │
│                  ▼                            ▼                         │
│         ┌──────────────────┐         ┌──────────────────┐              │
│         │  STUN/TURN      │         │  STUN/TURN       │              │
│         │  Servers        │         │  Servers         │              │
│         └──────────────────┘         └──────────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Signaling Flow

The signaling phase handles the exchange of Session Description Protocol (SDP) offers and answers, as well as ICE candidates.

### Call Initiation Flow

```
Caller                                    Firebase                           Callee
  │                                         │                                  │
  │  1. createOffer()                      │                                  │
  │  ┌─────────────────────────────────────┐│                                  │
  │  │ Create RTCSessionDescription (offer) ││                                  │
  │  └─────────────────────────────────────┘│                                  │
  │  │                                         │                                  │
  │  │  2. setLocalDescription(offer)           │                                  │
  │  │                                         │                                  │
  │  │  3. Store Offer in Firebase             │                                  │
  │  │────────────────────────────────────────►│                                  │
  │  │   POST /calls/{roomId}/offer            │                                  │
  │  │   { sdp, type: "offer", from, to }      │                                  │
  │  │                                         │                                  │
  │  │                                         │  4. Listen for offers            │
  │  │                                         │◄─────────────────────────────────│
  │  │                                         │                                  │
  │  │                                         │  5. onIncomingCall event         │
  │  │                                         │─────────────────────────────────►
  │  │                                         │                                  │
  │  │                                         │                                  │  6. setRemoteDescription(offer)
  │  │                                         │                                  │  ┌─────────────────────────┐
  │  │                                         │                                  │  │ Create RTCSessionDesc   │
  │  │                                         │                                  │  │ (answer)                │
  │  │                                         │                                  │  └─────────────────────────┘
  │  │                                         │                                  │
  │  │                                         │  7. Store Answer in Firebase     │
  │  │                                         │◄─────────────────────────────────│
  │  │   8. Listen for answer                  │                                  │
  │  │◄────────────────────────────────────────│                                  │
  │  │   { sdp, type: "answer" }               │                                  │
  │  │                                         │                                  │
  │  │  9. setRemoteDescription(answer)         │                                  │
  │  │                                         │                                  │
  │  │  10. ICE Candidate Exchange             │                                  │
  │  │◄────────────────────────────────────────│                                  │
  │  │   { candidate, sdpMid, sdpMLineIndex }  │                                  │
  │  │                                         │                                  │
  │  │  11. addIceCandidate()                  │                                  │
  │  │                                         │                                  │
  │  │  12. Connection Established!            │                                  │
  │  │═════════════════════════════════════════│══════════════════════════════════│
```

### ICE Candidate Exchange

```
Caller                                                             Callee
  │                                                                   │
  │  1. onIceCandidate event                                        │
  │  ┌─────────────────────────────────────────────────────────────┐│
  │  │ RTCIceCandidate {                                           ││
  │  │   candidate: "candidate:1 1 udp 2113937151 192.168.1.1...  ││
  │  │   sdpMid: "audio"                                          ││
  │  │   sdpMLineIndex: 0                                         ││
  │  │ }                                                           ││
  │  └─────────────────────────────────────────────────────────────┘│
  │  │                                                             │
  │  │  2. Store ICE candidate in Firebase                         │
  │  │───────────────────────────────────────────────────────────►│
  │  │   POST /calls/{roomId}/ice/{timestamp}                     │
  │  │   { candidate, sdpMid, sdpMLineIndex, from }              │
  │  │                                                             │
  │  │                                                             │  3. Listen for ICE candidates
  │  │                                                             │◄─────────────────────────────
  │  │                                                             │
  │  │                                                             │  4. Receive ICE candidate
  │  │                                                             │   { candidate, sdpMid, ... }
  │  │                                                             │
  │  │                                                             │  5. addIceCandidate()
  │  │                                                             │
  │  │  6. ICE candidate received                                  │
  │  │◄─────────────────────────────────────────────────────────────│
  │  │   { candidate, sdpMid, sdpMLineIndex }                     │
  │  │                                                             │
  │  │  7. addIceCandidate()                                       │
  │  │                                                             │
  │  │  8. ICE Connection Established!                             │
  │  │═════════════════════════════════════════════════════════════╪
```

---

## Media Flow

Once the peer connection is established, audio data flows directly between peers.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Media Flow Diagram                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Caller                                                                 Callee
│     │                                                                     │
│     │  1. getUserMedia()                                                 │
│     │  ┌───────────────────────────────────────────────────────────────┐  │
│     │  │ AudioContext → Microphone → MediaStream                      │  │
│     │  └───────────────────────────────────────────────────────────────┘  │
│     │                                                                     │
│     │  2. addTrack()                                                    │
│     │  ┌───────────────────────────────────────────────────────────────┐  │
│     │  │ audioTrack → peerConnection.addTrack(track, stream)          │  │
│     │  └───────────────────────────────────────────────────────────────┘  │
│     │                                                                     │
│     │  3. ICE Candidate → TURN/STUN → Remote Peer                       │
│     │  ┌───────────────────────────────────────────────────────────────┐  │
│     │  │ RTP Packets: Opus-encoded audio over UDP                     │  │
│     │  │ Sample Rate: 48kHz | Channels: 1 (mono) | Bitrate: ~24kbps  │  │
│     │  └───────────────────────────────────────────────────────────────┘  │
│     │                                                                     │
│     │  4. peerConnection.ontrack()                                       │
│     │  ┌───────────────────────────────────────────────────────────────┐  │
│     │  │ event.streams[0] → Remote MediaStream                        │  │
│     │  └───────────────────────────────────────────────────────────────┘  │
│     │                                                                     │
│     │  5. Play remote audio                                             │
│     │  ┌───────────────────────────────────────────────────────────────┐  │
│     │  │ AudioElement.srcObject = remoteStream                         │  │
│     │  │ remoteStream → AudioContext → Speakers                       │  │
│     │  └───────────────────────────────────────────────────────────────┘  │
│     │                                                                     │
│     │◄═══════════════════════════════════════════════════════════════════►│
│     │                     Bidirectional Audio Stream                      │
│     │════════════════════════════════════════════════════════════════════►│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Audio Codec Details

| Parameter   | Value     | Description                     |
| ----------- | --------- | ------------------------------- |
| Codec       | Opus      | IETF standard audio codec       |
| Sample Rate | 48 kHz    | High-quality audio              |
| Channels    | 1 (mono)  | Single channel for voice        |
| Bitrate     | 6-24 kbps | Adaptive based on network       |
| Frame Size  | 20 ms     | Packet interval                 |
| Complexity  | 10        | Balance between quality and CPU |

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WebRTC Component Hierarchy                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  WebRTCManager                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  State Management                                                 │   │
│  │  ├─ peerConnection: RTCPeerConnection                           │   │
│  │  ├─ localStream: MediaStream                                     │   │
│  │  ├─ remoteStream: MediaStream                                   │   │
│  │  ├─ currentRoomId: string                                        │   │
│  │  ├─ isRecording: boolean                                        │   │
│  │  └─ listeners: EventMap                                          │   │
│  ├─────────────────────────────────────────────────────────────────┐   │
│  │  Firebase Integration                                            │   │
│  │  ├─ db: Database                                                 │   │
│  │  ├─ ref(): Reference                                            │   │
│  │  ├─ set(): Promise                                               │   │
│  │  ├─ onValue(): Listener                                         │   │
│  │  └─ remove(): Promise                                            │   │
│  ├─────────────────────────────────────────────────────────────────┐   │
│  │  Peer Connection Handler                                         │   │
│  │  ├─ createOffer(): RTCSessionDescription                         │   │
│  │  ├─ createAnswer(): RTCSessionDescription                        │   │
│  │  ├─ setLocalDescription(): Promise                               │   │
│  │  ├─ setRemoteDescription(): Promise                              │   │
│  │  ├─ addIceCandidate(): Promise                                    │   │
│  │  └─ getStats(): RTCStatsReport                                   │   │
│  ├─────────────────────────────────────────────────────────────────┐   │
│  │  Recording Handler                                                │   │
│  │  ├─ startRecording(): Promise<boolean>                            │   │
│  │  ├─ stopRecording(): Promise<Recording>                          │   │
│  │  └─ MediaRecorder                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Signaling (Firebase Realtime Database)                          │   │
│  │  /calls/{roomId}/offer       ← SDP Offer                         │   │
│  │  /calls/{roomId}/answer      ← SDP Answer                        │   │
│  │  /calls/{roomId}/ice/{id}    ← ICE Candidates                   │   │
│  │  /calls/{roomId}/hangup     ← Hangup Signal                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ICE Servers                                                     │   │
│  │  ├─ STUN: stun.l.google.com:19302                              │   │
│  │  ├─ STUN: stun1.l.google.com:19302                             │   │
│  │  ├─ STUN: stun2.l.google.com:19302                             │   │
│  │  └─ TURN: [configurable]                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagrams

### Call Establishment Sequence

```
Title: Complete Call Establishment Sequence

actor Caller
actor Callee
participant Firebase
participant "STUN/TURN" as ICE

Caller->>Caller: getLocalStream()
Caller->>Caller: createOffer()
Caller->>Caller: setLocalDescription(offer)
Caller->>Firebase: set(calls/roomId/offer, offer)
Firebase-->>Callee: onValue callback (offer)
Callee->>Callee: setRemoteDescription(offer)
Callee->>Callee: createAnswer()
Callee->>Callee: setLocalDescription(answer)
Callee->>Firebase: set(calls/roomId/answer, answer)
Firebase-->>Caller: onValue callback (answer)
Caller->>Caller: setRemoteDescription(answer)

loop ICE Candidate Exchange
  Caller->>Caller: onIceCandidate(event)
  Caller->>Firebase: set(calls/roomId/ice/1, candidate)
  Firebase-->>Callee: onValue callback (candidate)
  Callee->>Callee: addIceCandidate(candidate)

  Callee->>Caller: onIceCandidate(event)
  Callee->>Firebase: set(calls/roomId/ice/2, candidate)
  Firebase-->>Caller: onValue callback (candidate)
  Caller->>Caller: addIceCandidate(candidate)
end

Caller->>ICE: Bind Request (STUN)
ICE-->>Caller: Bind Response (reflexive address)
Callee->>ICE: Bind Request (STUN)
ICE-->>Callee: Bind Response (reflexive address)

Caller->>Caller: onConnectionStateChange("connected")
Caller->>Caller: ontrack(remoteStream)
Callee->>Caller: RTP Audio Stream
Caller->>Callee: RTP Audio Stream
```

### Call Termination Sequence

```
Title: Call Termination Sequence

actor Caller
actor Callee
participant Firebase

Caller->>Caller: endCall()
Caller->>Caller: localStream.getTracks().stop()
Caller->>Caller: peerConnection.close()
Caller->>Firebase: remove(calls/roomId)
Firebase-->>Callee: onValue callback (null/removed)
Callee->>Callee: onConnectionStateChange("disconnected")
Callee->>Callee: cleanup()
```

---

## Network Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Network Topology                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐          ┌──────────────┐          ┌─────────────┐  │
│   │  Caller NAT  │          │   Internet   │          │ Callee NAT  │  │
│   │              │          │              │          │             │  │
│   │  ┌────────┐  │          │  ┌────────┐  │          │  ┌────────┐ │  │
│   │  │ Host   │  │          │              │          │  │ Host   │ │  │
│   │  │ 192.168.│  │◄────────►│  Public  │◄─────────►│  │192.168.│ │  │
│   │  │  1.100 │  │          │  Internet │          │  │  1.200 │ │  │
│   │  └────────┘  │          │              │          │  └────────┘ │  │
│   │      │       │          └──────┬───────┘          │      │      │  │
│   │      │       │                 │                  │      │      │  │
│   └──────┼───────┘                 │                  └──────┼──────┘  │
│          │                         │                         │         │
│          │                         │                         │         │
│          ▼                         ▼                         ▼         │
│   ┌───────────────────────────────────────────────────────────────┐   │
│   │                    NAT Traversal Methods                        │   │
│   │                                                                │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │   │
│   │  │    STUN     │  │    TURN     │  │       Direct P2P        │ │   │
│   │  │             │  │             │  │  (When STUN succeeds)  │ │   │
│   │  │  Discover   │  │   Relay     │  │                        │ │   │
│   │  │  Public IP  │  │   Media     │  │  Lowest latency         │ │   │
│   │  └─────────────┘  └─────────────┘  │  No server load         │ │   │
│   │                                   └────────────────────────┘  │   │
│   └───────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────┐   │
│   │                    Firewall Considerations                       │   │
│   │                                                                │   │
│   │  Required Ports:                                               │   │
│   │  ├─ UDP 3478: STUN/TURN                                        │   │
│   │  ├─ UDP 3479: TURN alternative                                 │   │
│   │  ├─ UDP 10000-60000: RTP media (dynamic)                      │   │
│   │  └─ TCP 443: HTTPS signaling (fallback)                       │   │
│   │                                                                │   │
│   │  Protocols:                                                    │   │
│   │  ├─ ICE: Interactive Connectivity Establishment               │   │
│   │  ├─ RTP/SRTP: Real-time Transport Protocol                     │   │
│   │  └─ DTLS/SRTP: Secure Real-time Transport                     │   │
│   │                                                                │   │
│   └───────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Message Types and Structures

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Signaling Message Structures                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  OFFER MESSAGE                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│  {                                                                    │
│    "type": "offer",                                                    │
│    "sdp": "v=0\r\n o=- 123456789 0 IN IP4 0.0.0.0\r\n...",            │
│    "from": "care4w-1000001",                                           │
│    "to": "care4w-1000002",                                            │
│    "timestamp": 1707735600000                                          │
│  }                                                                    │
│                                                                          │
│  ANSWER MESSAGE                                                         │
│  ─────────────────────────────────────────────────────────────────────   │
│  {                                                                    │
│    "type": "answer",                                                   │
│    "sdp": "v=0\r\n o=- 987654321 0 IN IP4 0.0.0.0\r\n...",            │
│    "from": "care4w-1000002",                                           │
│    "timestamp": 1707735601000                                          │
│  }                                                                    │
│                                                                          │
│  ICE CANDIDATE MESSAGE                                                  │
│  ─────────────────────────────────────────────────────────────────────   │
│  {                                                                    │
│    "candidate": "candidate:1 1 udp 2113937151 192.168.1.1 54321 typ host",
│    "sdpMid": "audio",                                                  │
│    "sdpMLineIndex": 0,                                                 │
│    "from": "care4w-1000001",                                           │
│    "timestamp": 1707735602000                                          │
│  }                                                                    │
│                                                                          │
│  HANGUP MESSAGE                                                         │
│  ─────────────────────────────────────────────────────────────────────   │
│  {                                                                    │
│    "type": "hangup",                                                   │
│    "from": "care4w-1000001",                                           │
│    "reason": "user_hangup",                                            │
│    "timestamp": 1707735605000                                          │
│  }                                                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Firebase Database Structure

```
careflow-firebase/
└── calls/
    ├── {roomId}/
    │   ├── offer/
    │   │   ├── sdp: "v=0\r\n..."
    │   │   ├── type: "offer"
    │   │   ├── from: "care4w-1000001"
    │   │   ├── to: "care4w-1000002"
    │   │   └── timestamp: 1707735600000
    │   │
    │   ├── answer/
    │   │   ├── sdp: "v=0\r\n..."
    │   │   ├── type: "answer"
    │   │   ├── from: "care4w-1000002"
    │   │   └── timestamp: 1707735601000
    │   │
    │   └── ice/
    │       ├── 1707735602000/
    │       │   ├── candidate: "candidate:1..."
    │       │   ├── sdpMid: "audio"
    │       │   ├── sdpMLineIndex: 0
    │       │   ├── from: "care4w-1000001"
    │       │   └── timestamp: 1707735602000
    │       │
    │       └── 1707735603000/
    │           ├── candidate: "candidate:2..."
    │           ├── sdpMid: "audio"
    │           ├── sdpMLineIndex: 0
    │           ├── from: "care4w-1000002"
    │           └── timestamp: 1707735603000
```

---

## Related Documentation

- [API Reference](WEBRTC_API_REFERENCE.md)
- [TURN Configuration](TURN_CONFIGURATION.md)
- [Testing Guide](../tests/CAREFLOW_WEBRTC_TESTING_GUIDE.md)
- [Troubleshooting Guide](WEBRTC_TROUBLESHOOTING.md)
