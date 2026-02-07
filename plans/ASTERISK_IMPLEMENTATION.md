# Asterisk SIP Server Implementation Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CareFlow Architecture                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐    │
│  │  Web App    │    │  Mobile App │    │  SIP Phone Clients  │    │
│  │  (Next.js)  │    │  (React)    │    │  (Linphone/Zoiper)  │    │
│  └──────┬──────┘    └──────┬──────┘    └──────────┬──────────┘    │
│         │                  │                      │               │
│         └──────────────────┼──────────────────────┘               │
│                            ↓                                        │
│                   ┌────────────────┐                               │
│                   │  CareFlow API  │                               │
│                   │  (Next.js)     │                               │
│                   └───────┬────────┘                               │
│                           ↓                                         │
│         ┌─────────────────┼─────────────────┐                       │
│         ↓                 ↓                 ↓                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐           │
│  │  Kamailio   │  │   Asterisk   │  │  PostgreSQL     │           │
│  │  (SIP Proxy)│  │   (PBX)      │  │  (Database)     │           │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘           │
│         │                ↓                    │                    │
│         │        ┌─────────────┐              │                    │
│         │        │  RTPEngine  │              │                    │
│         │        │  (Media)    │              │                    │
│         │        └─────────────┘              │                    │
│         ↓                                      ↓                    │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                   Oracle Cloud Always Free               │       │
│  │                    ARM64 VM (2 CPU, 24GB RAM)            │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Docker Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Network: careflow-sip                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐   │
│  │   kamailio     │  │   asterisk    │  │   rtpengine       │   │
│  │   :5060        │  │   :5061       │  │   :2222           │   │
│  │   :5060/UDP    │  │   :5061/TLS   │  │   :2222/UDP       │   │
│  │   :8080        │  │   :8088       │  │                   │   │
│  └────────────────┘  └────────────────┘  └───────────────────┘   │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐   │
│  │   postgres     │  │   redis        │  │   monitoring      │   │
│  │   :5432        │  │   :6379        │  │   :3000           │   │
│  └────────────────┘  └────────────────┘  └───────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
infrastructure/
├── docker/
│   ├── docker-compose.sip.yml
│   ├── docker-compose.sip.arm64.yml
│   └── docker-compose.full.yml
│
├── asterisk/
│   ├── Dockerfile
│   ├── config/
│   │   ├── asterisk.conf
│   │   ├── sip.conf
│   │   ├── extensions.conf
│   │   ├── voicemail.conf
│   │   ├── http.conf
│   │   ├── modules.conf
│   │   ├── pjsip.conf
│   │   ├── cdr.conf
│   │   └── acl.conf
│   └── scripts/
│       ├── init.sh
│       └── generate-certs.sh
│
├── kamailio/
│   ├── Dockerfile
│   ├── config/
│   │   ├── kamailio.cfg
│   │   ├── tls.cfg
│   │   └── dispatcher.list
│   └── scripts/
│       └── init.sh
│
├── rtpengine/
│   ├── Dockerfile
│   └── config/
│       └── rtpengine.conf
│
├── postgres/
│   ├── Dockerfile
│   └── init/
│       └── init.sql
│
├── nginx/
│   ├── Dockerfile
│   └── config/
│       ├── nginx.conf
│       └── sip.conf
│
└── scripts/
    ├── setup.sh
    ├── start.sh
    ├── stop.sh
    ├── logs.sh
    ├── backup.sh
    └── restore.sh
```

## Docker Compose Files

### Full Docker Compose (SIP + Kamailio + PostgreSQL)

```yaml
# infrastructure/docker-compose.sip.yml
version: "3.8"

services:
  # Kamailio SIP Proxy
  kamailio:
    image: careflow/kamailio:latest
    container_name: careflow-kamailio
    restart: unless-stopped
    ports:
      - "5060:5060/udp"
      - "5060:5060/tcp"
      - "8080:8080/tcp"
    volumes:
      - ./kamailio/config:/etc/kamailio:ro
      - kamailio-data:/var/run/kamailio
    environment:
      - KAMAILIO_HOSTNAME=${HOSTNAME:-sip.careflow.io}
      - KAMAILIO_TLS=${KAMAILIO_TLS:-yes}
      - KAMAILIO_DEBUG=${KAMAILIO_DEBUG:-0}
    networks:
      - sip-network
    healthcheck:
      test: ["CMD", "kamailio", "-c", "/etc/kamailio/kamailio.cfg"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Asterisk PBX
  asterisk:
    image: careflow/asterisk:latest
    container_name: careflow-asterisk
    restart: unless-stopped
    ports:
      - "5061:5061/tcp"
      - "5061:5061/udp"
      - "8088:8088/tcp"
    volumes:
      - ./asterisk/config:/etc/asterisk:ro
      - asterisk-data:/var/lib/asterisk
      - asterisk-sounds:/var/lib/asterisk/sounds
      - asterisk-recordings:/var/spool/asterisk/recordings
    environment:
      - AST_HOSTNAME=${HOSTNAME:-pbx.careflow.io}
      - AST_TLS=${ASTERISK_TLS:-yes}
      - AST_MAX_CALLS=100
      - AST_CONTEXT=default
    networks:
      - sip-network
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "asterisk", "-rx", "core show version"]
      interval: 30s
      timeout: 10s
      retries: 3

  # RTPEngine Media Relay
  rtpengine:
    image: careflow/rtpengine:latest
    container_name: careflow-rtpengine
    restart: unless-stopped
    ports:
      - "2222:2222/udp"
      - "2223:2223/tcp"
    volumes:
      - ./rtpengine/config:/etc/rtpengine:ro
      - rtpengine-data:/var/lib/rtpengine
    environment:
      - RTPE_CONFIG=/etc/rtpengine/rtpengine.conf
      - RTPE_LOG_LEVEL=notice
    networks:
      - sip-network
    cap_add:
      - NET_ADMIN

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: careflow-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
    environment:
      - POSTGRES_DB=careflow
      - POSTGRES_USER=${POSTGRES_USER:-careflow}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-secure_password}
    networks:
      - sip-network
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "careflow"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache (for session management)
  redis:
    image: redis:7-alpine
    container_name: careflow-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - sip-network
    command: redis-server --appendonly yes

  # Monitoring Dashboard
  monitoring:
    image: careflow/monitoring:latest
    container_name: careflow-monitoring
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./monitoring/config:/etc/grafana:ro
      - monitoring-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    networks:
      - sip-network
    depends_on:
      - prometheus

  # Prometheus Metrics
  prometheus:
    image: prom/prometheus:latest
    container_name: careflow-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
    networks:
      - sip-network

volumes:
  kamailio-data:
  asterisk-data:
  asterisk-sounds:
  asterisk-recordings:
  rtpengine-data:
  postgres-data:
  redis-data:
  monitoring-data:
  prometheus-data:

networks:
  sip-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

### ARM64 Docker Compose (Oracle Cloud Always Free)

```yaml
# infrastructure/docker-compose.sip.arm64.yml
version: "3.8"

services:
  # ARM64 Kamailio (pre-built for Oracle Cloud ARM)
  kamailio:
    image: careflow/kamailio:arm64
    container_name: careflow-kamailio
    restart: unless-stopped
    privileged: true
    ports:
      - "5060:5060/udp"
      - "5060:5060/tcp"
      - "8080:8080/tcp"
    volumes:
      - ./kamailio/config:/etc/kamailio:ro
      - /sys:/sys:ro
      - kamailio-data:/var/run/kamailio
    environment:
      - KAMAILIO_HOSTNAME=${HOSTNAME:-sip.careflow.io}
      - KAMAILIO_TLS=yes
      - KAMAILIO_DEBUG=0
    networks:
      - sip-network

  # ARM64 Asterisk
  asterisk:
    image: careflow/asterisk:arm64
    container_name: careflow-asterisk
    restart: unless-stopped
    ports:
      - "5061:5061/tcp"
      - "5061:5061/udp"
      - "8088:8088/tcp"
    volumes:
      - ./asterisk/config:/etc/asterisk:ro
      - asterisk-data:/var/lib/asterisk
      - asterisk-recordings:/var/spool/asterisk/recordings
    environment:
      - AST_HOSTNAME=${HOSTNAME:-pbx.careflow.io}
      - AST_TLS=yes
      - AST_MAX_CALLS=50
    networks:
      - sip-network
    depends_on:
      - postgres

  # ARM64 RTPEngine
  rtpengine:
    image: careflow/rtpengine:arm64
    container_name: careflow-rtpengine
    restart: unless-stopped
    ports:
      - "2222:2222/udp"
    environment:
      - RTPE_LOG_LEVEL=notice
    networks:
      - sip-network
    cap_add:
      - NET_ADMIN

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: careflow-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=careflow
      - POSTGRES_USER=${POSTGRES_USER:-careflow}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-secure_password}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - sip-network

volumes:
  kamailio-data:
  asterisk-data:
  asterisk-recordings:
  postgres-data:

networks:
  sip-network:
    driver: bridge
```

## Dockerfiles

### Asterisk Dockerfile

```dockerfile
# infrastructure/asterisk/Dockerfile
FROM asterisk/asterisk:18-certified-alpine

# Install dependencies
RUN apk add --no-cache \
    postgresql-client \
    redis-tools \
    curl \
    jq \
    openssl \
    bash \
    coreutils

# Create directories
RUN mkdir -p /var/lib/asterisk/sounds \
    /var/lib/asterisk/recordings \
    /var/spool/asterisk/recordings \
    /var/log/asterisk \
    /etc/asterisk/certs

# Copy configuration
COPY config/ /etc/asterisk/

# Download sound files
RUN asterisk -rx "core show translation" >/dev/null 2>&1 || true

# Create healthcheck script
RUN echo '#!/bin/bash\n\
asterisk -rx "core show version" >/dev/null 2>&1 && exit 0 || exit 1\n' > /healthcheck && chmod +x /healthcheck

# Expose ports
EXPOSE 5060 5061 8088

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD /healthcheck

# Entrypoint
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

### Kamailio Dockerfile

```dockerfile
# infrastructure/kamailio/Dockerfile
FROM kamailio/kamailio:5.7-alpine

# Install dependencies
RUN apk add --no-cache \
    bash \
    curl \
    jq \
    openssl \
    postgresql-client \
    redis-tools \
    procps

# Create directories
RUN mkdir -p /var/run/kamailio \
    /var/log/kamailio \
    /etc/kamailio/tls

# Copy configuration
COPY config/ /etc/kamailio/

# Create healthcheck script
RUN echo '#!/bin/bash\n\
kamailio -c /etc/kamailio/kamailio.cfg >/dev/null 2>&1 && exit 0 || exit 1\n' > /healthcheck && chmod +x /healthcheck

# Expose ports
EXPOSE 5060 5061 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD /healthcheck

# Entrypoint
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

### RTPEngine Dockerfile

```dockerfile
# infrastructure/rtpengine/Dockerfile
FROM siplet/rtpengine:latest

# Create directories
RUN mkdir -p /var/lib/rtpengine \
    /var/log/rtpengine

# Copy configuration
COPY config/rtpengine.conf /etc/rtpengine/rtpengine.conf

# Expose ports
EXPOSE 2222 2223

# Entrypoint
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

## Asterisk Configuration Files

### asterisk.conf

```ini
[directories]
astetcdir => /etc/asterisk
astmoddir => /usr/lib/asterisk/modules
astvarlibdir => /var/lib/asterisk
astdbdir => /var/lib/asterisk
astkeydir => /var/lib/asterisk
astdatadir => /var/lib/asterisk
astagidir => /var/lib/asterisk/agi-bin
astspooldir => /var/spool/asterisk
astrundir => /var/run/asterisk
astlogdir => /var/log/asterisk

[options]
runuser = asterisk
rungroup = asterisk
defaultlanguage = en
defaultcodec = opus
dumpcore = yes
systemname = CareFlowPBX
```

### sip.conf (Legacy SIP)

```ini
[general]
context = default
bindport = 5060
bindaddr = 0.0.0.0
srvlookup = yes
register => kamailio:kamailio_secret@127.0.0.1:5060/kamailio

[tls]
method = tlsv1_2
certfile = /etc/asterisk/certs/asterisk.crt
privatekey = /etc/asterisk/certs/asterisk.key
tlscipher = ALL
tlsclientmethod = tlsv1_2

; CareFlow user template
careflow_user
type = friend
secret = ${SIP_PASSWORD}
host = dynamic
context = careflow_users
disallow = all
allow = opus
allow = g722
allow = ulaw
allow = alaw
qualify = yes
contact = sip:asterisk:5061

; Kamailio interconnection
kamailio
type = peer
host = 127.0.0.1
port = 5060
context = from_kamailio
```

### pjsip.conf (Modern SIP)

```ini
[transport-tcp]
type = transport
protocol = tcp
bind = 0.0.0.0:5061

[transport-tls]
type = transport
protocol = tls
bind = 0.0.0.0:5061
cert_file = /etc/asterisk/certs/asterisk.crt
priv_key_file = /etc/asterisk/certs/asterisk.key
method = tlsv1_2

[transport-ws]
type = transport
protocol = ws
bind = 0.0.0.0:5061

[transport-wss]
type = transport
protocol = wss
bind = 0.0.0.0:5061

[kamailio-endpoint]
type = endpoint
context = from_kamailio
disallow = all
allow = opus
media_address = ${ASTERISK_PUBLIC_IP}
direct_media = no
```

### extensions.conf (Dialplan)

```ini
[general]
static = yes
writeprotect = no
autofallthrough = yes
clearglobalvars = no

[default]
; Timeout before going to voicemail
exten => _X!,1,NoOp(Call from ${CALLERID(all)} to ${EXTEN})
 same => n,Set(TIMEOUT(absolute)=3600)
 same => n,Answer()
 same => n,Playback(tt-weasels)
 same => n,Hangup()

; CareFlow users context
[careflow_users]
; Call another CareFlow user by CareFlow ID
exten => _care4w-XXXXXXX,1,NoOp(Calling CareFlow user: ${EXTEN})
 same => n,Set(CAREUSER=${EXTEN:7})
 same => n,Lookup(${CAREUSER})
 same => n,GotoIf($["${SIPPEER}" != ""]?found:noauth)
 same => n(found),Dial(SIP/${SIPPEER},30,Ttm)
 same => n,Hangup()
 same => n(noauth),Playback(invalid)
 same => n,Hangup()

; Conference room
exten => 8000,1,ConfBridge(8000,default_bridge,user_menu)

; Voicemail
exten => *99,1,VoiceMailMain(${CALLERID(num)})

; Call recording status
exten => *98,1,Playback(please-enter-your-person)
```

### http.conf (Web Interface)

```ini
[general]
enabled = yes
bindaddr = 0.0.0.0
bindport = 8088
tlsenable = yes
tlsbindaddr = 0.0.0.0:8089
tlscertfile = /etc/asterisk/certs/asterisk.crt
tlsprivatekey = /etc/asterisk/certs/asterisk.key

[api]
enabled = yes
pretty = yes
```

### modules.conf (Load Modules)

```ini
[modules]
autoload = no

; Core
load = app_dial.so
load = app_playback.so
load = app_voicemail.so
load = app_confbridge.so
load = pbx_config.so

; SIP
load = chan_pjsip.so
load = res_ari.so
load = res_asterisk_http.so

; Codecs
load = codec_opus.so
load = codec_g722.so
load = codec_ulaw.so
load = codec_alaw.so

; Format
load = format_ogg_opus.so
load = format_wav.so

; Recording
load = res_agi.so
load = cdr_csv.so
load = cdr_pgsql.so
```

## Kamailio Configuration

### kamailio.cfg

```cfg
#!KAMAILIO

####### Global Parameters #########

#!define DEBUG 1
#!define LOCAL_DOMAIN "sip.careflow.io"
#!define LOCAL_IP "10.0.0.10"

####### Modules Sections ########

#!ifdef DEBUG
debug = 4
log_stderror = yes
#!else
debug = 2
log_stderror = no
#!endif

fork = yes
children = 8
disable_tcp = no
listen = udp:0.0.0.0:5060
listen = tcp:0.0.0.0:5060
listen = tls:0.0.0.0:5061

####### Modules ########

loadmodule "tm.so"
loadmodule "sl.so"
loadmodule "rr.so"
loadmodule "pv.so"
loadmodule "maxfwd.so"
loadmodule "usrloc.so"
loadmodule "registrar.so"
loadmodule "auth.so"
loadmodule "auth_db.so"
loadmodule "nathelper.so"
loadmodule "rtpengine.so"
loadmodule "dispatcher.so"
loadmodule "tls.so"
loadmodule "jsonrpcs.so"

####### Parameters ########

modparam("usrloc", "db_mode", 0)
modparam("auth_db", "password_column", "password")
modparam("auth_db", "calculate_ha1", yes)
modparam("nathelper", "natping_interval", 30)
modparam("rtpengine", "rtpengine_sock", "udp:127.0.0.1:2222")

####### Routing Logic ########

request_route {
    # NAT handling
    if (nat_uac_test("1")) {
        setflag(NAT);
        fix_nated_contact();
    }

    # Dispatcher for load balancing
    if (has_totag()) {
        if (loose_route()) {
            route(relay);
            exit;
        }
    }

    # CANCEL processing
    if (is_method("CANCEL")) {
        if (t_check_trans()) {
            t_relay();
        }
        exit;
    }

    # Authentication
    if (is_method("INVITE") || is_method("REGISTER")) {
        if (!proxy_authorize("", "subscriber")) {
            proxy_challenge("", "auth");
            exit;
        }
        if (is_method("REGISTER")) {
            2;
            consume_credentials();
        }
    }

    # Request URI processing
    if (is_method("INVITE")) {
        # Add RTPEngine for media proxy
        rtpengine_use_media_proxy();

        # Dispatch to Asterisk for PBX features
        if (uri =~ "^sip:[^@]+@") {
            $du = "sip:asterisk:5060";
            route(relay);
            exit;
        }
    }

    # REGISTER handling
    if (is_method("REGISTER")) {
        save("location");
        exit;
    }

    # Default handling
    sl_send_reply("404", "Not Found");
    exit;
}

branch_route[MANAGE_BRANCH] {
    if (nat_uac_test("1")) {
        fix_nated_branch();
    }
}

route[relay] {
    if (is_method("INVITE")) {
        if (!t_is_set("FRINV_TIMER")) {
            t_set_fr(30000, 15000);
        }
    }
    if (!t_relay()) {
        sl_reply_error();
    }
    exit;
}
```

## Database Schema

```sql
-- infrastructure/postgres/init/init.sql

-- Users table with SIP credentials
CREATE TABLE IF NOT EXISTS sip_users (
    id SERIAL PRIMARY KEY,
    careflow_id VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(128),
    sip_extension VARCHAR(10),
    voicemail_pin VARCHAR(4),
    voicemail_enabled BOOLEAN DEFAULT TRUE,
    call_recording BOOLEAN DEFAULT FALSE,
    max_concurrent_calls INTEGER DEFAULT 2,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Call history
CREATE TABLE IF NOT EXISTS call_history (
    id SERIAL PRIMARY KEY,
    call_id VARCHAR(64) UNIQUE NOT NULL,
    caller_id VARCHAR(20) NOT NULL,
    callee_id VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answer_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER,
    recording_url VARCHAR(512),
    notes TEXT
);

-- SIP registrations
CREATE TABLE IF NOT EXISTS sip_registrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES sip_users(id),
    contact_uri VARCHAR(255),
    received VARCHAR(64),
    path VARCHAR(512),
    expires INTEGER,
    server_id VARCHAR(64),
    reg_id VARCHAR(64),
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_careflow_id ON sip_users(careflow_id);
CREATE INDEX idx_sip_extension ON sip_users(sip_extension);
CREATE INDEX idx_call_history_call_id ON call_history(call_id);
CREATE INDEX idx_call_history_users ON call_history(caller_id, callee_id);
CREATE INDEX idx_sip_reg_user ON sip_registrations(user_id);
```

## Setup Scripts

### setup.sh

```bash
#!/bin/bash
# infrastructure/scripts/setup.sh

set -e

echo "🚀 Setting up CareFlow SIP Server..."

# Create directories
mkdir -p docker
mkdir -p asterisk/config
mkdir -p asterisk/scripts
mkdir -p kamailio/config
mkdir -p kamailio/scripts
mkdir -p rtpengine/config
mkdir -p postgres/init
mkdir -p monitoring/config

# Generate environment file
cat > .env <<EOF
# CareFlow SIP Environment
HOSTNAME=sip.careflow.io
KAMAILIO_TLS=yes
ASTERISK_TLS=yes
POSTGRES_USER=careflow
POSTGRES_PASSWORD=$(openssl rand -base64 32)
GRAFANA_PASSWORD=$(openssl rand -base64 16)
EOF

echo "✅ Setup complete!"
echo "📝 Edit .env with your configuration"
echo "🚀 Run ./start.sh to start services"
```

### start.sh

```bash
#!/bin/bash
# infrastructure/scripts/start.sh

set -e

echo "🚀 Starting CareFlow SIP Server..."

# Check Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
fi

# Load environment
source .env

# Build images
echo "🔨 Building Docker images..."
docker compose -f docker-compose.sip.yml build

# Start services
echo "📦 Starting services..."
docker compose -f docker-compose.sip.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
docker compose -f docker-compose.sip.yml ps

echo "✅ CareFlow SIP Server started!"
echo "🌐 Kamailio: sip://sip.careflow.io:5060"
echo "🌐 Asterisk: sip://pbx.careflow.io:5061"
echo "🌐 Web UI: http://localhost:8088"
```

### stop.sh

```bash
#!/bin/bash
# infrastructure/scripts/stop.sh

echo "🛑 Stopping CareFlow SIP Server..."

docker compose -f docker-compose.sip.yml down

echo "✅ CareFlow SIP Server stopped!"
```

### logs.sh

```bash
#!/bin/bash
# infrastructure/scripts/logs.sh

SERVICE=${1:-all}

if [ "$SERVICE" = "all" ]; then
    docker compose -f docker-compose.sip.yml logs -f
else
    docker compose -f docker-compose.sip.yml logs -f "$SERVICE"
fi
```

## Monitoring Configuration

### prometheus.yml

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "kamailio"
    static_configs:
      - targets: ["kamailio:8080"]
    metrics_path: /metrics

  - job_name: "asterisk"
    static_configs:
      - targets: ["asterisk:8088"]
    metrics_path: /metrics

  - job_name: "rtpengine"
    static_configs:
      - targets: ["rtpengine:2223"]
    metrics_path: /metrics

  - job_name: "node"
    static_configs:
      - targets: ["node-exporter:9100"]
```

## SSL/TLS Certificates

### generate-certs.sh

```bash
#!/bin/bash
# infrastructure/scripts/generate-certs.sh

mkdir -p certs
cd certs

# Generate CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 365 -key ca.key -out ca.crt \
    -subj "/C=KE/ST=Nairobi/L=Nairobi/O=CareFlow/OU=IT/CN=CareFlow CA"

# Generate Asterisk certificate
openssl genrsa -out asterisk.key 4096
openssl req -new -key asterisk.key -out asterisk.csr \
    -subj "/C=KE/ST=Nairobi/L=Nairobi/O=CareFlow/OU=IT/CN=asterisk.careflow.io"
openssl x509 -req -days 365 -in asterisk.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out asterisk.crt

# Generate Kamailio certificate
openssl genrsa -out kamailio.key 4096
openssl req -new -key kamailio.key -out kamailio.csr \
    -subj "/C=KE/ST=Nairobi/L=Nairobi/O=CareFlow/OU=IT/CN=sip.careflow.io"
openssl x509 -req -days 365 -in kamailio.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out kamailio.crt

# Copy certificates
cp asterisk.crt asterisk.key ../asterisk/config/certs/
cp kamailio.crt kamailio.key ../kamailio/config/certs/

echo "✅ Certificates generated!"
```

## Firewall Configuration

```bash
# infrastructure/scripts/firewall.sh

# Allow SIP traffic
sudo ufw allow 5060/udp
sudo ufw allow 5060/tcp
sudo ufw allow 5061/tcp

# Allow RTP media
sudo ufw allow 10000:20000/udp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow monitoring
sudo ufw allow 3000/tcp
sudo ufw allow 9090/tcp

# Enable firewall
sudo ufw enable
```

## Performance Tuning

### sysctl.conf

```ini
# Increase UDP buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.udp_rmem_min = 16384
net.ipv4.udp_wmem_min = 16384

# Enable IP forwarding
net.ipv4.ip_forward = 1

# Increase max connections
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Enable connection tracking
net.netfilter.nf_conntrack_max = 1048576
```

## Implementation Checklist

- [ ] 1. Create infrastructure directory structure
- [ ] 2. Create Dockerfiles for each service
- [ ] 3. Create Docker Compose files
- [ ] 4. Configure Asterisk dialplan
- [ ] 5. Configure Kamailio SIP proxy
- [ ] 6. Set up PostgreSQL database schema
- [ ] 7. Generate SSL/TLS certificates
- [ ] 8. Configure firewall rules
- [ ] 9. Set up monitoring (Prometheus + Grafana)
- [ ] 10. Create setup/start/stop scripts
- [ ] 11. Test SIP registration
- [ ] 12. Test calls between endpoints
- [ ] 13. Configure WebRTC bridge
- [ ] 14. Set up call recording
- [ ] 15. Configure voicemail
- [ ] 16. Test failover scenarios
- [ ] 17. Document configuration
- [ ] 18. Create runbook for operations

```

## Next Steps

1. **Run setup script**: `./scripts/setup.sh`
2. **Generate certificates**: `./scripts/generate-certs.sh`
3. **Start services**: `./scripts/start.sh`
4. **Test**: Register SIP endpoints and test calls
5. **Integrate**: Connect CareFlow app to SIP infrastructure

See [`plans/SIP_ENDPOINTS_IMPLEMENTATION.md`](plans/SIP_ENDPOINTS_IMPLEMENTATION.md) for client configuration.
```
