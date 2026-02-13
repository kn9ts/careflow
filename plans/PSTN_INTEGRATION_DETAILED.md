# PSTN Integration: Real Phone to CareFlow User Calls

## Overview

This document explains how to enable CareFlow users to receive calls from regular phone numbers (landline/mobile) and make calls to them.

## Call Flow: PSTN → CareFlow User

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PSTN to CareFlow Call Flow                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Regular Phone User                                                     │
│         ↓                                                               │
│  Public Switched Telephone Network (PSTN)                                │
│         ↓                                                               │
│  Telco/SIP Trunk Provider (e.g., Twilio, VoIP.ms, etc.)                 │
│         ↓                                                               │
│  Internet                                                              │
│         ↓                                                               │
│  Your SIP Server (Kamailio + Asterisk)                                  │
│         ↓                                                               │
│  CareFlow User's SIP Phone / WebRTC                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components Required

| Component       | Purpose                          | Cost                       |
| --------------- | -------------------------------- | -------------------------- |
| SIP Trunk       | Connects to PSTN                 | $0.50-2.00/min             |
| DID Number      | Phone number for callers to dial | $1-5/month                 |
| SIP Server      | Routes calls                     | Free (your infrastructure) |
| Carrier Account | Billing relationship             | Required                   |

## SIP Trunk Providers

### 1. Twilio ⭐ Popular

```
✅ Pros:
- Easy API integration
- Good documentation
- Pay-as-you-go pricing
- US numbers available
- Global coverage

❌ Cons:
- Not truly free (pay per minute)

Pricing:
- DID Number: $1.07/month (US)
- Inbound call: $0.0085/min (US)
- Outbound call: $0.0135/min (US)

Website: https://twilio.com
```

### 2. VoIP.ms ⭐ Budget-Friendly

```
✅ Pros:
- Very cheap (~$0.50/min)
- No monthly fees for DID
- Good international coverage
- Easy setup

❌ Cons:
- Less polished than Twilio
- Support can be slow

Pricing:
- DID Number: $0.99-4.99/month
- Inbound call: $0.01/min (US)
- Outbound call: $0.01/min (US)

Website: https://voip.ms
```

### 3. Telnyx

```
✅ Pros:
- Good quality
- API-first design
- Free tier available

❌ Cons:
- Limited free tier
- Requires credit card

Website: https://telnyx.com
```

### 4. SIPRoute

```
✅ Pros:
- No per-minute charges
- Unlimited calls included

❌ Cons:
- Requires credit card
- Limited features

Website: https://siproute.com
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PSTN Integration Architecture                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PSTN (Regular Phones)                                                   │
│         ↓                                                               │
│  SIP Trunk Provider (Twilio/VoIP.ms)                                     │
│         ↓                                                               │
│  Internet                                                              │
│         ↓                                                               │
│  Kamailio SIP Proxy                                                     │
│         ↓                                                               │
│  Asterisk PBX                                                           │
│         ↓                                                               │
│  CareFlow User (SIP Phone/WebRTC)                                       │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Database (PostgreSQL)                        │    │
│  │  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐    │    │
│  │  │ phone_numbers │  │   call_logs   │  │   user_mapping  │    │    │
│  │  └──────────────┘  └────────────────┘  └──────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Configuration

### 1. Twilio SIP Trunk Setup

```javascript
// lib/pstn/twilio.js
const twilio = require('twilio');

class TwilioTrunk {
  constructor(config) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.client = twilio(this.accountSid, this.authToken);
  }

  // Buy a DID number
  async buyPhoneNumber() {
    const number = await this.client
      .availablePhoneNumbers('US')
      .phoneNumbers.list({ limit: 1, capabilities: { voice: true } })[0];

    const purchased = await this.client.incomingPhoneNumbers.create({
      phoneNumber: number.phoneNumber,
      friendlyName: 'CareFlow Main Number',
      voiceUrl: 'https://your-domain.com/api/twilio/voice',
      statusCallback: 'https://your-domain.com/api/twilio/status',
    });

    return purchased;
  }

  // Configure SIP trunk
  async configureSipDomain() {
    const domain = await this.client.sip.domains.create({
      friendlyName: 'careflow-sip',
      domainName: 'careflow.sip.twilio.com',
      voiceUrl: 'https://your-domain.com/api/twilio/voice',
      fallbackUrl: 'https://your-domain.com/api/twilio/fallback',
    });

    return domain;
  }
}

module.exports = new TwilioTrunk({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
});
```

### 2. Asterisk SIP Trunk Configuration

```ini
; /etc/asterisk/sip.conf

; Twilio SIP trunk
[twilio-trunk]
type=peer
host=sip.twilio.com
port=5060
fromuser=your_twilio_number
secret=your_auth_token
insecure=port,invite
context=from_pstn
disallow=all
allow=opus
allow=g722
allow=ulaw
dtmfmode=rfc2833
```

### 3. VoIP.ms SIP Trunk Configuration

```ini
; /etc/asterisk/sip.conf

; VoIP.ms trunk
[voipms-trunk]
type=peer
host=nYC.voip.ms
port=5060
username=your_account
secret=your_password
fromuser=your_did_number
insecure=port,invite
context=from_pstn
disallow=all
allow=opus
allow=g722
allow=ulaw
```

### 4. Asterisk Dialplan for PSTN Calls

```ini
; /etc/asterisk/extensions.conf

[from_pstn]
; Incoming call from PSTN
exten => _X!,1,NoOp(Incoming PSTN call from ${CALLERID(num)})
 same => n,Set(CALLERID(num)=${CALLERID(num):1})
 same => n,Answer()
 same => n,Playback(welcome-message)
 same => n,Set(TIMEOUT(absolute)=3600)

; Ask for CareFlow ID
 same => n,Playback(enter-careflow-id)
 same => n,Read(TARGET_ID,,4)
 same => n,GotoIf($["${TARGET_ID}" != ""]?lookup:invalid)

 same => n(lookup),NoOp(Looking up CareFlow user: ${TARGET_ID})
 same => n,Lookup(${TARGET_ID})
 same => n,GotoIf($["${SIPPEER}" != ""]?connect:invalid)

; Connect to CareFlow user
 same => n(connect),NoOp(Connecting to ${SIPPEER})
 same => n,Dial(SIP/${SIPPEER},30,Ttm)
 same => n,Hangup()

 same => n(invalid),Playback(invalid-careflow-id)
 same => n,Hangup()

[from_kamailio]
; Calls from Kamailio SIP proxy
exten => _care4w-XXXXXXX,1,NoOp(Calling CareFlow user: ${EXTEN})
 same => n,Set(CAREUSER=${EXTEN:7})
 same => n,Lookup(${CAREUSER})
 same => n,GotoIf($["${SIPPEER}" != ""]?found:noauth)
 same => n(found),Dial(SIP/${SIPPEER},30,Ttm)
 same => n,Hangup()
 same => n(noauth),Playback(user-not-found)
 same => n,Hangup()
```

## Call Flow Details

### Inbound Call Flow (PSTN → CareFlow User)

```
1. Caller dials CareFlow DID number (e.g., +1-555-123-4567)
         ↓
2. Telco routes call to SIP trunk provider
         ↓
3. SIP trunk provider sends INVITE to Asterisk
         ↓
4. Asterisk answers and plays welcome message
         ↓
5. Asterisk prompts for CareFlow ID
         ↓
6. Caller enters CareFlow ID (DTMF or voice)
         ↓
7. Asterisk looks up user in database
         ↓
8. Asterisk connects call via Kamailio to user's SIP endpoint
         ↓
9. CareFlow user's phone rings
         ↓
10. User answers → Call connected
         ↓
11. RTP media flows directly between caller and user
         ↓
12. Call ends → CDR recorded in database
```

### Outbound Call Flow (CareFlow User → PSTN)

```
1. CareFlow user enters phone number
         ↓
2. CareFlow app sends request to API
         ↓
3. API validates user and credits
         ↓
4. API initiates call via SIP trunk provider
         ↓
5. SIP trunk provider calls user's phone first (callback)
         ↓
6. User answers → Call connected
         ↓
7. SIP trunk dials destination number
         ↓
8. Destination answers → 3-way conference
         ↓
9. User and destination can talk
         ↓
10. Call ends → CDR recorded
```

## Database Schema for PSTN

```sql
-- PSTN-related tables

-- Phone numbers owned by CareFlow
CREATE TABLE pstn_numbers (
    id SERIAL PRIMARY KEY,
    number VARCHAR(20) UNIQUE NOT NULL,
    country_code VARCHAR(3) DEFAULT '1',
    provider VARCHAR(50) NOT NULL,
    monthly_cost DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active',
    careflow_user_id INTEGER REFERENCES sip_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Call detail records for PSTN calls
CREATE TABLE pstn_cdr (
    id SERIAL PRIMARY KEY,
    call_id VARCHAR(64) UNIQUE NOT NULL,
    direction VARCHAR(10) NOT NULL,
    pstn_number VARCHAR(20) NOT NULL,
    careflow_user_id INTEGER REFERENCES sip_users(id),
    destination_number VARCHAR(20),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answer_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER,
    cost DECIMAL(10,4),
    status VARCHAR(20) NOT NULL,
    recording_url VARCHAR(512)
);

-- Call pricing per provider
CREATE TABLE call_rates (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    country_code VARCHAR(3),
    rate_per_minute DECIMAL(10,4),
    connection_fee DECIMAL(10,4) DEFAULT 0
);

-- Indexes
CREATE INDEX idx_pstn_number ON pstn_numbers(number);
CREATE INDEX idx_pstn_cdr_call_id ON pstn_cdr(call_id);
CREATE INDEX idx_pstn_cdr_user ON pstn_cdr(careflow_user_id);
CREATE INDEX idx_pstn_cdr_time ON pstn_cdr(start_time);
```

## Cost Analysis

### Monthly Costs (US Coverage)

| Item                     | Cost        |
| ------------------------ | ----------- |
| DID Number (Twilio)      | $1.07/month |
| DID Number (VoIP.ms)     | $0.99/month |
| Inbound call (~$100min)  | $0.85/min   |
| Outbound call (~$100min) | $1.35/min   |
| SIP Trunk                | $0          |

### Per-Call Costs

| Call Type           | Cost per Minute |
| ------------------- | --------------- |
| US to US (Landline) | $0.0085         |
| US to US (Mobile)   | $0.0135         |
| US to Canada        | $0.0135         |
| US to UK            | $0.0285         |
| US to Kenya         | $0.3695         |

## Zero-Cost Alternatives

### CareFlow-to-CareFlow (Already Free)

```
CareFlow User A → CareFlow User B = $0.00
```

No PSTN involved - direct SIP-to-SIP calls.

### SMS Alternative (Cheaper)

Instead of voice calls, use SMS:

- Twilio SMS: $0.0075/text
- Much cheaper for short messages

### Toll-Free Numbers (Expensive)

```
US Toll-Free: $0.05/min (inbound)
Not recommended for budget
```

## Implementation Checklist

- [ ] 1. Choose SIP trunk provider (Twilio recommended)
- [ ] 2. Create provider account
- [ ] 3. Purchase DID number
- [ ] 4. Configure Asterisk SIP trunk
- [ ] 5. Configure dialplan
- [ ] 6. Set up database tables
- [ ] 7. Configure webhooks for call events
- [ ] 8. Test inbound calls
- [ ] 9. Test outbound calls
- [ ] 10. Set up call recording
- [ ] 11. Configure billing/cost tracking
- [ ] 12. Document user guide

## User Experience

### For CareFlow User (Receiving Call)

```
1. Regular phone user dials CareFlow number
2. CareFlow user's phone rings
3. User sees caller ID (regular phone number)
4. User answers in CareFlow app
5. Conversation happens
```

### For Regular Phone User (Calling CareFlow)

```
1. Dials CareFlow DID number
2. Hears: "Welcome to CareFlow. Please enter the CareFlow ID."
3. Enters CareFlow ID (e.g., "care4w-001")
4. Hears: "Connecting..."
5. CareFlow user answers
6. Conversation happens
```

## Security Considerations

1. **Caller ID Spoofing** - Verify caller identity
2. **Toll Fraud** - Prevent unauthorized expensive calls
3. **Call Recording** - Comply with local laws (one-party/two-party consent)
4. **SIP Authentication** - Secure trunk credentials
5. **Rate Limiting** - Prevent abuse

## Next Steps

1. Create account with SIP trunk provider
2. Purchase DID number
3. Configure Asterisk SIP trunk
4. Implement dialplan
5. Add call recording
6. Set up billing tracking
7. Test with real calls
