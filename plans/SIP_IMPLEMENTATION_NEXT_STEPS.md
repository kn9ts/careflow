# CareFlow SIP Implementation - Next Steps

## Phase 1: Infrastructure Setup (Week 1)

### 1.1 Oracle Cloud Always Free Setup

```bash
# 1. Create Oracle Cloud account
# https://cloud.oracle.com

# 2. Create Always Free ARM64 VM
# Compute -> Instance -> Create
# Image: Oracle Linux 8
# Shape: VM.Standard.A1.Flex (2 CPUs, 24GB RAM)
# Subnet: Public subnet with security list

# 3. Configure security list (ingress rules)
# SSH (22/tcp) - Your IP
# SIP UDP (5060) - 0.0.0.0/0
# SIP TCP (5060) - 0.0.0.0/0
# SIP TLS (5061) - 0.0.0.0/0
# RTP Media (10000-20000/udp) - 0.0.0.0/0
# HTTP (80/tcp) - 0.0.0.0/0
# HTTPS (443/tcp) - 0.0.0.0/0
# Grafana (3000/tcp) - Your IP
# Prometheus (9090/tcp) - Your IP
```

### 1.2 VM Preparation

```bash
# SSH into VM
ssh opc@<VM_IP>

# Update system
sudo dnf update -y

# Install Docker
sudo dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Install Git
sudo dnf install -y git

# Generate SSH key for GitHub
ssh-keygen -t ed25519 -C "careflow@oraclecloud"
cat ~/.ssh/id_ed25519.pub
# Add to GitHub
```

### 1.3 Clone Repository

```bash
# Clone CareFlow
git clone https://github.com/yourusername/CareFlow.git
cd CareFlow/infrastructure

# Copy environment template
cp .env.example .env
# Edit .env with your settings
```

### 1.4 Deploy Infrastructure

```bash
# Generate certificates
./scripts/generate-certs.sh

# Start services
./scripts/start.sh

# Check status
docker compose ps

# Verify health
curl http://localhost:8088/http status
```

## Phase 2: Configure SIP Endpoints (Week 2)

### 2.1 Create Test Users

```sql
-- Connect to PostgreSQL
docker exec -it careflow-postgres psql -U careflow -d careflow

-- Insert test users
INSERT INTO sip_users (careflow_id, username, password_hash, email, display_name, sip_extension)
VALUES
('care4w-001', 'user001', 'hashed_password', 'user1@example.com', 'Test User 1', '1001'),
('care4w-002', 'user002', 'hashed_password', 'user2@example.com', 'Test User 2', '1002');

-- Exit
\q
```

### 2.2 Configure SIP Phones

**Linphone (Desktop/Mobile):**

```
Settings -> SIP Account
Username: user001
Domain: sip.careflow.io
Password: your_password
Transport: TLS
```

**Zoiper (Mobile):**

```
Account Setup -> Add SIP Account
SIP Domain: sip.careflow.io
Username: user001
Password: your_password
TLS: Enabled
```

### 2.3 Test Registration

```bash
# Check Kamailio registrations
docker exec -it careflow-kamailio kamctl ul show

# Check Asterisk peers
docker exec -it careflow-asterisk asterisk -rx "sip show peers"
```

## Phase 3: Integrate with CareFlow App (Week 3)

### 3.1 Add SIP Configuration

Update `lib/callManager.js`:

```javascript
// Add SIP configuration
const sipConfig = {
  server: process.env.NEXT_PUBLIC_SIP_SERVER || 'sip.careflow.io',
  port: process.env.NEXT_PUBLIC_SIP_PORT || 5061,
  transport: process.env.NEXT_PUBLIC_SIP_TRANSPORT || 'tls',
  realm: 'sip.careflow.io',
};
```

### 3.2 Add SIP Registration

```javascript
// Register SIP user in browser
async function registerSIPUser(credentials) {
  const sipStack = new SIPml.Stack({
    realm: 'sip.careflow.io',
    impi: credentials.username,
    impu: `sip:${credentials.username}@sip.careflow.io`,
    password: credentials.password,
    transport: 'tls',
    ws_proxy_url: `wss://sip.careflow.io:5061`,
    enable_rtcweb_allow: true,
  });

  sipStack.start();
  return sipStack;
}
```

### 3.3 Add Call Functionality

```javascript
// Make outbound call
async function makeCall(calleeCareflowId) {
  const callSession = sipStack.newSession('call-audio', {
    audio: true,
    video: false,
  });

  callSession.call(`sip:${calleeCareflowId}@sip.careflow.io`);
  return callSession;
}

// Handle incoming calls
sipStack.setEventListener('onIncomingCall', (event) => {
  const session = event.session;
  // Show incoming call UI
  // Play ringtone
  // Accept/reject buttons
});
```

## Phase 4: Testing & QA (Week 4)

### 4.1 Unit Tests

```bash
# Run tests
npm test

# Test coverage
npm test -- --coverage
```

### 4.2 Integration Tests

```bash
# Test SIP registration
npm run test:sip

# Test call flow
npm run test:calls

# Test recording
npm run test:recording
```

### 4.3 Performance Tests

```bash
# Load test with SIPp
sipp -sn uac -s 1001 sip.careflow.io:5060 -l 10 -r 2 -m 100

# Monitor resources
docker stats
```

## Phase 5: Production Deployment

### 5.1 Domain & SSL

```bash
# Configure DNS
# A record: sip.careflow.io -> VM_IP
# A record: pbx.careflow.io -> VM_IP

# Get SSL from Let's Encrypt
sudo certbot certonly --standalone -d sip.careflow.io -d pbx.careflow.io

# Copy certificates
sudo cp /etc/letsencrypt/live/sip.careflow.io/fullchain.pem asterisk/config/certs/
sudo cp /etc/letsencrypt/live/sip.careflow.io/privkey.pem asterisk/config/certs/
```

### 5.2 Configure Firewall

```bash
# Allow traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5060/tcp
sudo ufw allow 5060/udp
sudo ufw allow 5061/tcp
sudo ufw allow 10000:20000/udp

# Enable
sudo ufw enable
```

### 5.3 Setup Monitoring

```bash
# Access Grafana
# http://<VM_IP>:3000
# User: admin
# Password: <from .env>

# Import dashboards
# Add Prometheus data source
# Import Asterisk and Kamailio dashboards
```

## Phase 6: Documentation & Runbook

### 6.1 Operations Runbook

Create `docs/OPERATIONS_RUNBOOK.md` with:

- Service start/stop procedures
- Health check commands
- Common issues and solutions
- Backup/restore procedures
- Escalation procedures

### 6.2 User Guide

Create `docs/SIP_USER_GUIDE.md` with:

- How to configure SIP phones
- How to use call features
- Troubleshooting tips

## Checklist Summary

| Phase | Task                     | Status | Owner    |
| ----- | ------------------------ | ------ | -------- |
| 1     | Oracle Cloud VM setup    | ☐      | DevOps   |
| 1     | Docker installation      | ☐      | DevOps   |
| 1     | Deploy infrastructure    | ☐      | DevOps   |
| 2     | Test SIP registration    | ☐      | QA       |
| 2     | Test audio calls         | ☐      | QA       |
| 2     | Configure mobile clients | ☐      | QA       |
| 3     | Integrate CareFlow app   | ☐      | Frontend |
| 3     | Add WebRTC bridge        | ☐      | Frontend |
| 4     | Unit tests               | ☐      | QA       |
| 4     | Integration tests        | ☐      | QA       |
| 5     | Production DNS/SSL       | ☐      | DevOps   |
| 5     | Configure monitoring     | ☐      | DevOps   |
| 6     | Write runbook            | ☐      | DevOps   |
| 6     | User documentation       | ☐      | Docs     |

## Success Criteria

- [ ] All 269 unit tests pass
- [ ] SIP registration works on mobile/desktop
- [ ] Audio calls connect successfully
- [ ] Call quality is acceptable
- [ ] Monitoring dashboards are populated
- [ ] Documentation is complete
- [ ] Runbook is tested
