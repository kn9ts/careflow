# CareFlow TURN Server Deployment Guide

**Last Updated:** 2026-02-12
**Version:** 1.0.0

---

## Overview

This guide provides comprehensive instructions for deploying and configuring TURN (Traversal Using Relays around NAT) servers for CareFlow's WebRTC implementation. TURN servers are essential for establishing connections when users are behind symmetric NATs, corporate firewalls, or other restrictive network configurations.

## Table of Contents

1. [Introduction to TURN](#introduction-to-turn)
2. [Prerequisites](#prerequisites)
3. [Deployment Options](#deployment-options)
4. [Self-Hosted Coturn Deployment](#self-hosted-coturn-deployment)
5. [Cloud TURN Services](#cloud-turn-services)
6. [Configuration](#configuration)
7. [Security](#security)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Introduction to TURN

### Why TURN Servers Are Needed

WebRTC uses STUN (Session Traversal Utilities for NAT) servers to discover public IP addresses and port mappings. However, STUN only works when both peers have "cone" or "address-restricted" NATs.

### NAT Types and WebRTC Connectivity

| NAT Type           | STUN Works? | P2P Possible? |
| ------------------ | ----------- | ------------- |
| Full Cone          | ✅ Yes      | ✅ Yes        |
| Address-Restricted | ✅ Yes      | ✅ Yes        |
| Port-Restricted    | ✅ Yes      | ⚠️ Sometimes  |
| Symmetric          | ✅ No       | ❌ No         |

### When TURN Is Required

- **Corporate Firewalls**: Many corporate networks block UDP traffic
- **Symmetric NAT**: Both peers behind symmetric NATs cannot connect directly
- **VPN Connections**: Some VPN configurations prevent P2P connections
- **Mobile Networks**: Carrier-grade NATs often require TURN

---

## Prerequisites

### System Requirements

For self-hosted deployment:

- **CPU**: 2 cores minimum (4 cores recommended)
- **Memory**: 2 GB minimum (4 GB recommended)
- **Storage**: 10 GB minimum (SSD recommended)
- **Network**: 100 Mbps minimum (1 Gbps recommended for production)

### Required Ports

| Port        | Protocol | Description            |
| ----------- | -------- | ---------------------- |
| 3478        | TCP/UDP  | TURN/STUN primary port |
| 5349        | TCP      | TURN over TLS          |
| 49152-65535 | UDP      | Media relay port range |

### Software Requirements

- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose (recommended)
- OpenSSL for certificate generation
- Root/sudo access

---

## Deployment Options

### Option 1: Self-Hosted (Coturn)

**Pros:**

- Full control over infrastructure
- No per-minute costs
- Can be customized for specific needs

**Cons:**

- Requires server management
- Bandwidth costs apply
- Need to manage scalability

### Option 2: Cloud TURN Services

**Pros:**

- Easy to set up
- Scalable infrastructure
- Managed reliability

**Cons:**

- Usage-based pricing
- Dependency on third party
- Potential latency issues

### Option 3: Hybrid Approach

Use self-hosted TURN for primary traffic and cloud TURN for redundancy.

---

## Self-Hosted Coturn Deployment

### Method 1: Docker Deployment (Recommended)

#### 1. Create Docker Compose File

```yaml
# docker-compose.yml
version: "3.8"

services:
  coturn:
    image: coturn/coturn:latest
    container_name: coturn-server
    restart: unless-stopped
    ports:
      - "3478:3478"
      - "3478:3478/udp"
      - "5349:5349"
      - "5349:5349/udp"
      - "49152-65535:49152-65535/udp"
    volumes:
      - ./turnserver.conf:/etc/coturn/turnserver.conf:ro
      - ./turn_pkey.pem:/etc/coturn/turn_pkey.pem:ro
      - ./turn_cert.pem:/etc/coturn/turn_cert.pem:ro
      - coturn_data:/var/lib/coturn
    environment:
      - TZ=UTC
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    networks:
      - turn-network

volumes:
  coturn_data:

networks:
  turn-network:
    driver: bridge
```

#### 2. Create Coturn Configuration

```bash
# /path/to/turnserver.conf

# Listening port
listening-port=3478
tls-listening-port=5349

# Server name
server-name=your-turn-server

# Realm
realm=turn.yourdomain.com

# Authentication method
lt-cred-mech
# OR for static credentials:
# use-auth-secret
# static-auth-secret=your-secret-key

# Certificate and key files
cert=/etc/coturn/turn_cert.pem
pkey=/etc/coturn/turn_pkey.pem

# Private key password (if encrypted)
# pkey-pwd=your-password

# Process file location
pidfile=/var/run/turnserver.pid

# Log file
log-file=/var/log/turnserver.log
verbose

# User database (for static credentials)
# userdb=/etc/coturn/turnuserdb.conf

# Maximum number of output sessions
# max-output-sessions=1000

# Maximum allocation per user
# max-bps=1048576

# Total quota
# total-quota=100

# Reload credentials periodically
# stale-nonce

# No SSLv3
no-sslv3

# No TLSv1.0
no-tlsv1.0

# No TLSv1.1
no-tlsv1.1

# Bypass SSL certificate verification for local IPs
# no-tlsv1.3

# Enable mobile support
mobility
```

#### 3. Generate SSL Certificates

```bash
# Generate private key
openssl genrsa -out turn_pkey.pem 4096

# Generate certificate
openssl req -new -x509 -key turn_pkey.pem -out turn_cert.pem -days 365

# Make private key readable
chmod 600 turn_pkey.pem
```

#### 4. Start the Server

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f coturn

# Check status
docker-compose ps
```

### Method 2: Native Installation

#### 1. Install Coturn

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install coturn

# Enable coturn service
sudo systemctl enable coturn
```

#### 2. Configure Coturn

```bash
# Copy default config
sudo cp /etc/turnserver.conf.example /etc/turnserver/turnserver.conf

# Edit configuration
sudo nano /etc/turnserver/turnserver.conf
```

#### 3. Configure Systemd

```bash
# Create override file
sudo mkdir -p /etc/systemd/system/turnserver.service.d
sudo nano /etc/systemd/system/turnserver.service.d/override.conf
```

```ini
[Service]
User=turnserver
Group=turnserver
LimitNOFILE=65536
Environment="TZ=UTC"
```

```bash
# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart turnserver
```

### Method 3: Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coturn
  labels:
    app: coturn
spec:
  replicas: 3
  selector:
    matchLabels:
      app: coturn
  template:
    metadata:
      labels:
        app: coturn
    spec:
      containers:
        - name: coturn
          image: coturn/coturn:latest
          ports:
            - containerPort: 3478
              protocol: UDP
            - containerPort: 3478
              protocol: TCP
            - containerPort: 5349
              protocol: TCP
            - containerPort: 49152
              protocol: UDP
              name: media-udp
          volumeMounts:
            - name: config
              mountPath: /etc/coturn
            - name: certs
              mountPath: /etc/coturn/certs
          env:
            - name: TZ
              value: "UTC"
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
      volumes:
        - name: config
          configMap:
            name: coturn-config
        - name: certs
          secret:
            secretName: coturn-certs
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: coturn-config
data:
  turnserver.conf: |
    listening-port=3478
    tls-listening-port=5349
    realm=turn.yourdomain.com
    lt-cred-mech
    cert=/etc/coturn/certs/turn_cert.pem
    pkey=/etc/coturn/certs/turn_pkey.pem
    log-file=/var/log/turnserver.log
    verbose
---
apiVersion: v1
kind: Service
metadata:
  name: coturn
spec:
  selector:
    app: coturn
  ports:
    - name: turn-tcp
      port: 3478
      targetPort: 3478
      protocol: TCP
    - name: turn-udp
      port: 3478
      targetPort: 3478
      protocol: UDP
    - name: turns-tls
      port: 5349
      targetPort: 5349
      protocol: TCP
```

---

## Cloud TURN Services

### Twilio Network Traversal Service

#### 1. Sign Up and Get Credentials

1. Create account at [Twilio](https://www.twilio.com/)
2. Go to Console → Network Traversal → Settings
3. Copy your API credentials

#### 2. Environment Configuration

```bash
# Twilio TURN configuration
export NEXT_PUBLIC_TURN_SERVER_URL=turn:global.turn.twilio.com:3478
export NEXT_PUBLIC_TURN_USERNAME=$(echo -n "$TWILIO_ACCOUNT_SID:$TWILIO_API_KEY_SID:$(date +%s)" | base64)
export NEXT_PUBLIC_TURN_CREDENTIAL=$TWILIO_API_KEY_SECRET
```

#### 3. Dynamic Credential Generation

```javascript
// lib/twilio-credentials.js

/**
 * Generate TURN credentials for Twilio Network Traversal Service
 * Credentials are time-limited for security
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_API_KEY_SID = process.env.TWILIO_API_KEY_SID;
const TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;
const TTL = 86400; // 24 hours

function generateTURNUsername() {
  const timestamp = Math.floor(Date.now() / 1000) + TTL;
  return `${TWILIO_API_KEY_SID}:${timestamp}`;
}

function generateTURNPassword() {
  // HMAC-SHA1 signature
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha1", TWILIO_API_KEY_SECRET);
  hmac.update(generateTURNUsername());
  return hmac.digest("base64");
}

module.exports = {
  getTURNConfig: () => ({
    urls: `turn:global.turn.twilio.com:3478`,
    username: generateTURNUsername(),
    credential: generateTURNPassword(),
  }),
};
```

### Xirsys TURN Service

```bash
# Xirsys configuration
export NEXT_PUBLIC_TURN_SERVER_URL=turn:s1.xirsys.com:3478
export NEXT_PUBLIC_TURN_USERNAME=your-username
export NEXT_PUBLIC_TURN_CREDENTIAL=your-password
```

### OpenRelay (Free)

```bash
# OpenRelay - free, no credentials required
export NEXT_PUBLIC_TURN_SERVER_URL=turn:openrelay.project:3478
export NEXT_PUBLIC_TURN_USERNAME=your-username
export NEXT_PUBLIC_TURN_CREDENTIAL=your-password
```

---

## Configuration

### Environment Variables

#### Required Variables

```bash
# .env.local

# TURN Server Configuration
NEXT_PUBLIC_TURN_SERVER_URL=turn:your-turn-server.com:3478
NEXT_PUBLIC_TURN_USERNAME=your-username
NEXT_PUBLIC_TURN_CREDENTIAL=your-password
```

#### Multiple TURN Servers

For redundancy, configure multiple TURN servers:

```bash
# Primary TURN Server
NEXT_PUBLIC_TURN_SERVER_URL=turn:primary.turn.example.com:3478
NEXT_PUBLIC_TURN_USERNAME_1=primary-user
NEXT_PUBLIC_TURN_CREDENTIAL_1=primary-password

# Secondary TURN Server
NEXT_PUBLIC_TURN_SERVER_URL_2=turn:secondary.turn.example.com:3478
NEXT_PUBLIC_TURN_USERNAME_2=secondary-user
NEXT_PUBLIC_TURN_CREDENTIAL_2=secondary-password

# Tertiary TURN Server (fallback)
NEXT_PUBLIC_TURN_SERVER_URL_3=turn:fallback.turn.example.com:3478
NEXT_PUBLIC_TURN_USERNAME_3=fallback-user
NEXT_PUBLIC_TURN_CREDENTIAL_3=fallback-password
```

### Client-Side Configuration

```javascript
// lib/webrtc.js

function getIceServers() {
  const servers = [
    // Public STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ];

  // Add TURN servers from environment
  const turnUrl = process.env.NEXT_PUBLIC_TURN_SERVER_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  // Add additional TURN servers if configured
  if (process.env.NEXT_PUBLIC_TURN_SERVER_URL_2) {
    servers.push({
      urls: process.env.NEXT_PUBLIC_TURN_SERVER_URL_2,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME_2,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL_2,
    });
  }

  return servers;
}
```

---

## Security

### Static Credentials

For basic authentication, use static credentials:

```bash
# /etc/coturn/turnuserdb.conf
user1:password1:admin
user2:password2
user3:password3
```

### Time-Limited Credentials (Recommended)

For enhanced security, use time-limited credentials:

```javascript
// Generate short-lived credentials
const generateTimeLimitedCredentials = (username, secret, ttl = 3600) => {
  const expiry = Math.floor(Date.now() / 1000) + ttl;
  const hmac = crypto.createHmac("sha1", secret);
  hmac.update(`${username}:${expiry}`);
  const password = hmac.digest("base64");
  return { username: `${username}:${expiry}`, password };
};
```

### Firewall Configuration

```bash
# UFW configuration
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp

# Media port range
sudo ufw allow 49152:65535/udp

# Verify rules
sudo ufw status verbose
```

### Rate Limiting

Add to `turnserver.conf`:

```bash
# Rate limiting
max-bps=1048576           # 1 Mbps per session
total-quota=100           # Max 100 concurrent sessions
stale-nonce=600           # Nonce valid for 10 minutes
```

### SSL/TLS Configuration

```bash
# Generate strong certificates
openssl genrsa -out turn_pkey.pem 4096
openssl req -new -x509 -key turn_pkey.pem -out turn_cert.pem -days 365 -subj "/CN=turn.example.com"
```

---

## Monitoring and Maintenance

### Key Metrics

| Metric               | Description           | Alert Threshold |
| -------------------- | --------------------- | --------------- |
| `total_allocations`  | Active relay sessions | > 80% capacity  |
| `bytes_allocated`    | Total bandwidth used  | Near limit      |
| `allocations_failed` | Failed relay requests | > 5% of total   |
| `session_duration`   | Average call length   | N/A             |

### Logging

```bash
# View logs
tail -f /var/log/turnserver.log

# Search for errors
grep "error" /var/log/turnserver.log

# Monitor connections
grep "session" /var/log/turnserver.log | wc -l
```

### Prometheus Metrics

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "coturn"
    static_configs:
      - targets: ["localhost:9641"]
    metrics_path: /metrics
```

### Health Check Endpoint

```javascript
// health-check.js
const net = require("net");

async function checkCoturnHealth(port = 3478) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(5000);

    socket.on("connect", () => {
      socket.destroy();
      resolve({ status: "healthy", port });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ status: "unhealthy", port, error: "timeout" });
    });

    socket.on("error", (err) => {
      socket.destroy();
      resolve({ status: "unhealthy", port, error: err.message });
    });

    socket.connect(port, "localhost");
  });
}

checkCoturnHealth().then(console.log);
```

### Backup and Recovery

```bash
# Backup configuration
tar -czvf coturn-backup-$(date +%Y%m%d).tar.gz \
  /etc/coturn/ \
  /var/lib/coturn/

# Restore from backup
tar -xzvf coturn-backup-20240212.tar.gz -C /
```

---

## Troubleshooting

### Common Issues

#### 1. TURN Server Not Connecting

**Symptoms:** Calls fail immediately or hang at "connecting"

**Diagnosis:**

```bash
# Test connectivity
nc -zv your-turn-server.com 3478

# Test UDP
nc -uvz your-turn-server.com 3478

# Check TLS
openssl s_client -connect your-turn-server.com:5349
```

**Solutions:**

- Verify TURN credentials are correct
- Check firewall rules allow UDP 3478
- Ensure TURN server TLS certificate is valid
- Check server logs for authentication errors

#### 2. High Latency on TURN Calls

**Symptoms:** Audio/video quality is poor, delays

**Solutions:**

- Use geographically close TURN servers
- Implement bandwidth adaptation
- Consider using STUN when possible
- Upgrade server resources

#### 3. One-Way Audio

**Symptoms:** Caller can hear but not be heard

**Diagnosis:**

```javascript
// Check WebRTC stats
const stats = await peerConnection.getStats();
stats.forEach((report) => {
  if (report.type === "inbound-rtp") {
    console.log("Packets received:", report.packetsReceived);
    console.log("Packets lost:", report.packetsLost);
  }
});
```

**Solutions:**

- Check TURN server bandwidth limits
- Verify UDP is not blocked
- Test with multiple networks

#### 4. Authentication Failures

**Symptoms:** "401 Unauthorized" errors

**Solutions:**

- Verify username/password combinations
- Check time synchronization on server
- Ensure credentials are URL-encoded properly

#### 5. Certificate Errors

**Symptoms:** TLS handshake failures

**Solutions:**

- Regenerate certificates
- Check certificate expiration
- Verify certificate chain

### Debug Commands

```bash
# Test TURN server manually
turnutils_uclient -u username -w password -v turn-server.com

# Check active sessions
turnadmin -k -u username -p password

# View user database
turnadmin -E -P

# Test allocation
turnutils_peer
```

### Performance Tuning

```bash
# Increase file descriptor limit
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize network settings
echo "net.core.rmem_max=16777216" >> /etc/sysctl.conf
echo "net.core.wmem_max=16777216" >> /etc/sysctl.conf
sysctl -p
```

---

## Migration Checklist

- [ ] Choose TURN server provider
- [ ] Configure environment variables
- [ ] Test TURN connectivity
- [ ] Monitor initial usage
- [ ] Set up alerts for capacity
- [ ] Document internal procedures
- [ ] Plan scalability strategy

---

## Support

For issues with TURN configuration:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review browser console logs
3. Check TURN server logs
4. Contact your TURN provider support
5. Open a GitHub issue with details

---

## Related Documentation

- [WebRTC Documentation](WEBRTC_DOCUMENTATION.md)
- [API Reference](WEBRTC_API_REFERENCE.md)
- [Architecture](WEBRTC_ARCHITECTURE.md)
- [Testing Guide](../tests/CAREFLOW_WEBRTC_TESTING_GUIDE.md)
- [Troubleshooting Guide](WEBRTC_TROUBLESHOOTING.md)
