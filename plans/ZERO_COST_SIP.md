# Zero-Cost SIP Architecture

## Executive Summary

Can achieve **$0 cost** for CareFlow-to-CareFlow calls and SIP-to-SIP calls. PSTN connectivity (calling regular phones) requires some cost, but we can minimize it significantly.

## Cost Breakdown

| Call Type                       | Cost                | Notes                         |
| ------------------------------- | ------------------- | ----------------------------- |
| WebRTC ↔ WebRTC                 | **$0**              | Peer-to-peer, no server costs |
| SIP ↔ SIP (both CareFlow users) | **$0**              | Internal routing only         |
| SIP ↔ WebRTC                    | **$0**              | Same server                   |
| CareFlow → Regular Phone        | **$0.005-0.02/min** | SIP trunk (VoIP.ms, etc.)     |
| Regular Phone → CareFlow        | **$0.005-0.02/min** | Inbound DID                   |

## Zero-Cost Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CareFlow Zero-Cost Network                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   User A (care4w-1000001)                                      │
│   ┌──────────────┐                                              │
│   │ WebRTC       │──┐                                           │
│   │ SIP Phone    │  │                                           │
│   │ Mobile App   │  │                                           │
│   └──────────────┘  │                                           │
│                     │                                           │
│                       │ Kamailio (Free - Your Server)           │
│                     │                                           │
│   User B (care4w-1000002)           ┌──────────────┐           │
│   ┌──────────────┐                  │              │           │
│   │ WebRTC       │◄─────────────────┤ Internal     │           │
│   │ SIP Phone    │                  │ SIP Calls    │           │
│   │ Mobile App   │                  │              │           │
│   └──────────────┘                  └──────────────┘           │
│                                                                 │
│   User C (care4w-1000003)                                      │
│   ┌──────────────┐                                              │
│   │ WebRTC       │                                               │
│   └──────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Zero-Cost Strategies

### 1. WebRTC (Already Implemented) - $0

```
CareFlow Web Client ↔ CareFlow Web Client
        ↓
WebRTC peer-to-peer
        ↓
Cost: $0 (uses user's internet)
```

### 2. Internal SIP Network - $0

```
CareFlow SIP User A → Kamailio → CareFlow SIP User B
        ↓
No external trunk needed
        ↓
Cost: $0 (just your server costs)
```

### 3. Free SIP Trunk Options

| Provider          | Free Tier              | Cost         |
| ----------------- | ---------------------- | ------------ |
| Sipgate (Germany) | 1 DID, unlimited calls | €0           |
| VoIP.ms           | Pay-as-you-go          | $0.01/min    |
| Google Voice      | Free US calls          | $0           |
| Twilio            | Trial account          | $0 (limited) |

**Recommendation: Sipgate Free**

- German company, stable service
- Free SIP trunk
- Free German DID number
- Supports incoming/outgoing calls

### 4. Peer-to-Peer Call Extension

```javascript
// lib/p2pCall.js
export async function initiateP2PCall(callerId, calleeId) {
  // Check if both users are online
  const callerOnline = await checkUserOnline(callerId);
  const calleeOnline = await checkUserOnline(calleeId);

  if (callerOnline && calleeOnline) {
    // Both online - direct P2P call
    return {
      type: 'p2p',
      method: 'webrtc',
      cost: 0,
    };
  } else if (calleeOnline) {
    // Callee online - call to their registered devices
    return {
      type: 'sip',
      method: 'internal',
      cost: 0,
    };
  } else {
    // Neither online - need callback/PSTN
    return {
      type: 'callback',
      cost: callbackCost,
    };
  }
}
```

## Server Requirements (One-Time or Monthly)

### Option A: Personal/Home Server - $0

```
If you have a home server:
- Run Kamailio on Raspberry Pi ($0)
- Free electricity (minimal)
- Free bandwidth (your connection)
Total: $0/month
```

### Option B: Free Tier Cloud

```
Oracle Cloud Always Free:
- 2 AMD64 VMs
- 200Mbps network
- Perfect for Kamailio

Google Cloud Free Tier:
- e2-micro VM (US regions)
- 30GB storage

AWS Free Tier:
- t2.micro (12 months)
- 750 hours/month
```

### Option C: Cheap VPS ($5-10/month)

```
Hetzner Cloud:
- €4.50/month (2 vCPU, 4GB RAM)
- Enough for Kamailio + FreeSWITCH

DigitalOcean:
- $5/month (1 vCPU, 1GB RAM)
- Basic needs
```

## Cost Analysis by User Scale

| Users    | Monthly Cost | Notes                     |
| -------- | ------------ | ------------------------- |
| 1-10     | $0-5         | Free tier or small VPS    |
| 10-100   | $5-20        | Small VPS + minimal trunk |
| 100-1000 | $20-50       | Dedicated server          |
| 1000+    | $50-100      | Multiple servers          |

## Zero-Cost PSTN Alternatives

### Option 1: Free Callback Service

```
User with no internet dials CareFlow
        ↓
Call triggers webhook
        ↓
CareFlow calls back user's phone
        ↓
Both connected via CareFlow server
```

### Option 2: Missed Call Verification

```
User verifies phone with missed call
        ↓
No voice minutes used
        ↓
Uses SMS or app notifications instead
```

### Option 3: SIP-Only Policy

```
Communicate policy:
- All calls between CareFlow users are FREE
- PSTN calls available at additional cost
- Encourage app-to-app calling
```

## Recommended Zero-Cost Stack

```
┌────────────────────────────────────────────────────────────┐
│ Component           │ Choice                    │ Cost  │
├────────────────────────────────────────────────────────────┤
│ SIP Server          │ Kamailio                  │ $0    │
│ PBX                 │ FreeSWITCH                │ $0    │
│ Database            │ MySQL (shared) or SQLite  │ $0    │
│ Server              │ Oracle Always Free        │ $0    │
│ Domain              │ Your existing domain      │ $0    │
│ SSL Certificate     │ Let's Encrypt            │ $0    │
│ PSTN (optional)     │ Sipgate Free              │ €0    │
│ Recording Storage   │ Backblaze B2              │ ~$5   │
└────────────────────────────────────────────────────────────┘

Total: $0-5/month
```

## Implementation Steps

### 1. Deploy Kamailio on Free Server

```bash
# Oracle Cloud Always Free ARM64
# Or Raspberry Pi at home
```

### 2. Configure Free SIP Trunk

```
Sipgate Configuration:
- Register: sipgate.de
- Username: your-account-id
- Password: your-password
- DID: +49XXXXXXXXX (German number)
```

### 3. Set Up CareFlow SIP Credentials

```
Each user gets:
- SIP Domain: sip.your-domain.com
- Username: careflow_[userId]
- Password: [auto-generated]
```

### 4. Call Routing

```
Priority:
1. P2P (both online) → WebRTC direct
2. Internal (both have SIP) → Kamailio
3. Callback (one offline) → Call back via trunk
```

## Call Quality Considerations

| Method       | Quality   | Latency | Cost |
| ------------ | --------- | ------- | ---- |
| WebRTC P2P   | Excellent | Low     | $0   |
| Internal SIP | Excellent | Low     | $0   |
| PSTN Trunk   | Good      | Medium  | $    |
| Callback     | Good      | High    | $$   |

## Marketing the Zero-Cost Model

```
"CareFlow: Free Calls Between Users"

✓ Unlimited calls between CareFlow users
✓ Works on any SIP phone or web browser
✓ No per-minute charges
✓ No contracts
✓ No hidden fees

[Download App] [Connect SIP Phone]
```

## Conclusion

**Yes, you can achieve $0 cost for all CareFlow-to-CareFlow calls.**

PSTN connectivity (calling regular phones) requires minimal cost (~$5-10/month for a SIP trunk), but:

1. **All internal calls** = $0
2. **WebRTC calls** = $0
3. **SIP-to-SIP calls** = $0
4. **PSTN calls** = ~$5-10/month (optional)

**Recommendation:** Start with $0 internal calling, add PSTN as premium feature.
