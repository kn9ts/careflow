# Enable SIP Endpoints for CareFlow

## Overview

Allow desk phones and softphones to connect to CareFlow using SIP protocol.

## Architecture

```mermaid
graph TB
    subgraph CareFlow User
        USER[CareFlow User]
        SIP_PHONE[SIP Desk Phone]
        SOFTPHONE[Softphone App]
        LAPTOP[CareFlow Web]
    end

    subgraph SIP Server
        KAM[Kamailio<br/>SIP Registrar]
        REDIS[(Redis<br/>User Registry)]
    end

    subgraph CareFlow Cloud
        API[CareFlow API]
        DB[(CareFlow DB)]
    end

    USER -->|Login| API
    API --> DB

    SIP_PHONE -->|SIP REGISTER| KAM
    SOFTPHONE -->|SIP REGISTER| KAM
    LAPTOP -->|WebSocket| KAM

    KAM -->|Verify| API
    KAM --> REDIS
```

## Implementation Plan

### Phase 1: Kamailio SIP Registrar

#### 1.1 Docker Setup

```yaml
# docker-compose.sip.yml
version: '3.8'
services:
  kamailio:
    image: kamailio/kamailio:5.7
    container_name: careflow-sip
    ports:
      - '5060:5060/udp' # SIP UDP
      - '5060:5060/tcp' # SIP TCP
      - '5061:5061/tls' # SIP TLS
      - '8080:8080' # REST API
    volumes:
      - ./config/kamailio.cfg:/etc/kamailio/kamailio.cfg:ro
      - ./config/kamailio.d:/etc/kamailio/:ro
    environment:
      - SIP_DOMAIN=sip.careflow.io
      - DB_URL=mysql://user:pass@host:3306/kamailio
      - REDIS_URL=redis://cache:6379/0
    networks:
      - sip-network

  redis:
    image: redis:7-alpine
    container_name: careflow-redis
    volumes:
      - redis-data:/data
    networks:
      - sip-network

networks:
  sip-network:
    driver: bridge

volumes:
  redis-data:
```

#### 1.2 Kamailio Configuration (kamailio.cfg)

```cfg
#!define WITH_AUTH
#!define WITH_USRLOC
#!define WITH_NAT
#!define WITH_TLS
#!define WITH_REST

# Parameters
debug=2
fork=yes
log_stderror=no
children=8
disable_tls=no

listen=udp:0.0.0.0:5060
listen=tcp:0.0.0.0:5060
listen=tls:0.0.0.0:5061

# Database connection
loadmodule "db_mysql.so"
modparam("db_mysql", "connection_timeout", 5)
modparam("db_mysql", "ping_interval", 60)

# Redis for registrations
loadmodule "db_redis.so"
modparam("db_redis", "redis_server", "redis://localhost:6379/0")

# Authentication
loadmodule "auth.so"
loadmodule "auth_db.so"
modparam("auth_db", "db_url", "mysql://kamailio:kamailio@localhost/kamailio")
modparam("auth_db", "user_column", "username")
modparam("auth_db", "password_column", "password")
modparam("auth_db", "password_column_2", "HA1")

# User Location
loadmodule "usrloc.so"
modparam("usrloc", "db_mode", 0)  # 0 = memory only
modparam("usrloc", "registrar_expires", 3600)
modparam("usrloc", "max_contacts", 10)

# NAT Support
loadmodule "nathelper.so"
modparam("nathelper", "natping_interval", 30)
modparam("nathelper", "ping_nated_only", 1)

# REST API for CareFlow integration
loadmodule "jsonrpcs.so"
modparam("jsonrpcs", "rpc", "/jsonrpc/kamailio")

# TLS Configuration
loadmodule "tls.so"
modparam("tls", "tls_method", "TLSv1_2")
modparam("tls", "certificate", "/etc/kamailio/certs/server.crt")
modparam("tls", "private_key", "/etc/kamailio/certs/server.key")
modparam("tls", "ca_list", "/etc/kamailio/certs/ca.crt")

# Routing Logic
route {
    if (!mf_process_maxfwd_header("10")) {
        sl_send_reply("483","Too Many Hops");
        exit;
    }

    if (has_body("application/sdp")) {
        set_reply_mark();
    }

    # Handle SIP requests
    route(SIP_REQUEST);
}

route[SIP_REQUEST] {
    # NAT detection
    route(NAT_DETECT);

    # Authentication
    if (is_method("REGISTER")) {
        if (!www_authorize("", "subscriber")) {
            www_challenge("", "0");
            exit;
        }
        save("location");
        exit;
    }

    # Invite requires authentication
    if (is_method("INVITE")) {
        if (!proxy_authorize("", "subscriber")) {
            proxy_challenge("", "0");
            exit;
        }
        consume_credentials();
    }

    # Lookup and forward
    if (is_method("INVITE")) {
        if (!location_lookup("location")) {
            sl_send_reply("404", "User Not Found");
            exit;
        }
        t_relay();
        exit;
    }
}

route[NAT_DETECT] {
    force_rport();
    if (nat_uac_test("23")) {
        fix_nated_contact();
    }
}

# Event routes
event_route[E_CORE_PARSE_ERROR] {
    xlog("L_ERR", "SIP parsing error: $mb\n");
}
```

#### 1.3 Subscriber Table Schema

```sql
-- Kamailio subscriber table
CREATE TABLE subscriber (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    domain VARCHAR(64),
    password VARCHAR(64),
    HA1 VARCHAR(128),
    HA1B VARCHAR(128),
    email VARCHAR(64),
    careflow_user_id VARCHAR(64),
    careflow_care4w_id VARCHAR(64),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY username_domain (username, domain),
    INDEX idx_careflow_user (careflow_user_id)
);
```

### Phase 2: CareFlow API Integration

#### 2.1 API Endpoints

```javascript
// app/api/sip/register/route.js
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { careflowUserId, sipUsername, sipPassword } = body;

    // Verify user exists in CareFlow
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ firebaseUid: careflowUserId });

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Create SIP credentials in Kamailio database
    const kamailio = await connectToKamailioDB();
    await kamailio.query(
      `INSERT INTO subscriber
             (username, domain, password, HA1, HA1B, careflow_user_id, careflow_care4w_id, email)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sipUsername,
        'sip.careflow.io',
        sipPassword,
        generateHA1(sipUsername, 'sip.careflow.io', sipPassword),
        generateHA1b(sipUsername, 'sip.careflow.io', sipPassword),
        careflowUserId,
        user.care4wId,
        user.email,
      ]
    );

    return Response.json({
      success: true,
      sipConfig: {
        domain: 'sip.careflow.io',
        port: 5060,
        tlsPort: 5061,
        transport: 'udp,tcp,tls',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint to retrieve SIP credentials
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const careflowUserId = searchParams.get('userId');

  // Return SIP credentials for the user
  // In production, fetch from secure storage
}
```

#### 2.2 Generate SIP Credentials

```javascript
// lib/sipCredentials.js
import crypto from 'crypto';

export function generateSIPCredentials(userId, care4wId) {
  // Username format: careflow_[userId]
  const username = `careflow_${userId.slice(0, 8)}`;

  // Generate secure random password (16 chars)
  const password = crypto.randomBytes(8).toString('hex');

  return {
    username,
    password,
    displayName: care4wId,
    domain: 'sip.careflow.io',
    realm: 'sip.careflow.io',
  };
}

export function generateHA1(username, realm, password) {
  return crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
}

export function generateHA1b(username, realm, password) {
  return crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
}
```

### Phase 3: SIP Endpoint Setup Guide

#### 3.1 Configuration for Common SIP Phones

**Yealink T46S/T54S**

```
1. Menu → Account → Account 1
2. Register Status:
   - Label: CareFlow
   - Server Host: sip.careflow.io
   - Port: 5060
   - Transport: UDP
3. Authentication:
   - Username: careflow_[userId]
   - Password: [generated password]
4. Codecs: G.711μ, G.722, Opus
```

**Cisco SPA303**

```
1. Admin Login → Ext 1
2. Line Settings:
   - Subscriber Information:
     * Display Name: [Your Name]
     * User ID: careflow_[userId]
     * Password: [generated password]
   - Proxy: sip.careflow.io
   - Register Expires: 3600
```

**MicroSIP (Windows Softphone)**

```
1. Menu → Account → Add Account
2. Account:
   - Name: CareFlow
   - Server: sip.careflow.io
   - Username: careflow_[userId]
   - Password: [generated password]
3. Advanced:
   - Transport: UDP
   - Port: 5060
```

#### 3.2 Mobile Softphones

**Acrobits Groundwire (iOS/Android)**

```
Account Settings:
- Host: sip.careflow.io
- Port: 5060
- Transport: TLS
- Username: careflow_[userId]
- Password: [generated password]
- Use SRTP: Yes
- Use TLS: Yes
```

**CSipSimple (Android)**

```
Account:
- Hostname: sip.careflow.io
- Port: 5060
- Transport: TLS
- Username: careflow_[userId]
- Password: [generated password]
```

### Phase 4: Dashboard Integration

#### 4.1 SIP Settings Page

```javascript
// components/dashboard/SIPSettings.js
export default function SIPSettings({ user }) {
  const [credentials, setCredentials] = useState(null);
  const [generating, setGenerating] = useState(false);

  const generateCredentials = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/sip/register', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ careflowUserId: user.uid }),
      });
      const data = await response.json();
      setCredentials(data);
    } catch (error) {
      console.error('Failed to generate SIP credentials:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="sip-settings">
      <h2>SIP Phone Configuration</h2>

      {!credentials ? (
        <button onClick={generateCredentials} disabled={generating}>
          {generating ? 'Generating...' : 'Generate SIP Credentials'}
        </button>
      ) : (
        <div className="credentials">
          <label>Domain: {credentials.sipConfig.domain}</label>
          <label>Port: {credentials.sipConfig.port}</label>
          <label>Username: {credentials.username}</label>
          <label>Password: {credentials.password}</label>

          <button
            onClick={() =>
              navigator.clipboard.writeText(
                `sip:${credentials.username}@${credentials.sipConfig.domain}`
              )
            }
          >
            Copy SIP URI
          </button>
        </div>
      )}
    </div>
  );
}
```

### Phase 5: Security

#### 5.1 Firewall Rules

```bash
# Allow SIP traffic
iptables -A INPUT -p udp --dport 5060 -j ACCEPT
iptables -A INPUT -p tcp --dport 5060 -j ACCEPT
iptables -A INPUT -p tcp --dport 5061 -j ACCEPT

# Allow RTP media traffic
iptables -A INPUT -p udp --dport 10000:60000 -j ACCEPT

# Rate limiting
iptables -A INPUT -p udp --dport 5060 -m limit --limit 50/second --limit-burst 100 -j ACCEPT
iptables -A INPUT -p udp --dport 5060 -j DROP
```

#### 5.2 Fail2ban Configuration

```ini
# /etc/fail2ban/filter.d/kamailio.conf
[Definition]
failregex = ^\w+ ERROR: <script>: Auth user not found .*\[<HOST>\]$
            ^\w+ ERROR: <script>: Password mismatch for user .*\[<HOST>\]$
            ^\w+ ERROR: <script>: Too many authentication failures .*\[<HOST>\]$
```

### Files to Create

```
lib/
├── sipCredentials.js      # Generate SIP credentials
├── sipAuth.js            # Auth verification

app/api/sip/
├── register/route.js      # Generate SIP credentials
├── credentials/route.js   # Get user credentials
├── status/route.js       # Check registration status
└── deregister/route.js   # Remove SIP registration

components/dashboard/
└── SIPSettings.js        # SIP configuration UI

infrastructure/
├── docker-compose.sip.yml
└── kamailio/
    ├── kamailio.cfg
    ├── kamailio.d/
    │   └── redis.conf
    └── certs/
        ├── server.crt
        ├── server.key
        └── ca.crt
```

### Testing Checklist

- [ ] Kamailio starts successfully
- [ ] Database connection works
- [ ] Redis stores registrations
- [ ] SIP phone can REGISTER
- [ ] Call between SIP phones works
- [ ] TLS encryption works
- [ ] Rate limiting works
- [ ] Fail2ban blocks brute force
- [ ] WebRTC clients can still make calls
- [ ] CareFlow dashboard shows SIP status
