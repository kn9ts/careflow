# Free Hosting Options for CareFlow SIP Server

## Overview

This document compares free hosting options for running the CareFlow SIP server (Kamailio + Asterisk + RTPEngine).

---

## Quick Comparison

| Provider     | Cost     | RAM    | CPU    | Ports   | UDP | Type        |
| ------------ | -------- | ------ | ------ | ------- | --- | ----------- |
| Oracle Cloud | Free     | 24GB   | 2x ARM | Any     | ✅  | Full VM     |
| Google Cloud | Trial    | 1GB    | 1x     | Limited | ❌  | Limited     |
| AWS          | Trial    | 1GB    | 1x     | Limited | ❌  | Limited     |
| Azure        | Trial    | 1GB    | 1x     | Limited | ❌  | Limited     |
| Hetzner      | €4.50/mo | 4GB    | 2x     | Any     | ✅  | Full VM     |
| Contabo      | €4.99/mo | 6GB    | 2x     | Any     | ✅  | Full VM     |
| Raspberry Pi | ~$0      | 4GB    | 4x     | Any     | ✅  | Self-hosted |
| Home Server  | ~$0      | Varies | Varies | Any     | ✅  | Self-hosted |

---

## 1. Oracle Cloud Always Free ⭐ RECOMMENDED

### Specifications

| Attribute     | Value                   |
| ------------- | ----------------------- |
| **RAM**       | 24GB                    |
| **CPU**       | 2x ARM64 (Ampere Altra) |
| **Storage**   | 200GB Block Storage     |
| **Bandwidth** | Unlimited               |
| **Uptime**    | Always free             |
| **VMs**       | Up to 2 instances       |

### Pros

```
✅ Completely free forever
✅ 24GB RAM is generous
✅ Unlimited bandwidth
✅ Full root access
✅ Multiple VMs allowed
✅ Custom ports (5060, 5061, etc.)
✅ UDP support for SIP/RTP
✅ Oracle Linux or Ubuntu
✅ Free tier never expires
```

### Cons

```
❌ ARM64 architecture (not x86)
❌ Complex interface
❌ Phone verification required
❌ Limited to 2 VMs total
❌ Some regions have limited capacity
```

### Setup Steps

```bash
# 1. Create account at cloud.oracle.com
# 2. Verify phone number (SMS or call)
# 3. Create Always Free VM
#    - Shape: VM.Standard.A1.Flex
#    - CPUs: 2
#    - RAM: 12GB (can use up to 24GB)
#    - Image: Oracle Linux 8 or Ubuntu 22.04

# 4. Configure firewall
#    - 5060/udp (SIP)
#    - 5060/tcp (SIP)
#    - 5061/tcp (SIP TLS)
#    - 10000-20000/udp (RTP)
#    - 22/tcp (SSH)

# 5. SSH into VM
ssh opc@<VM_PUBLIC_IP>

# 6. Install Docker
sudo dnf update -y
sudo dnf install -y docker-ce
sudo systemctl start docker
sudo systemctl enable docker

# 7. Deploy SIP stack
git clone https://github.com/yourusername/CareFlow.git
cd CareFlow/infrastructure
docker compose -f docker-compose.sip.arm64.yml up -d
```

### Documentation

- [Oracle Cloud Free Tier FAQ](https://www.oracle.com/cloud/free/faq/)
- [Always Free VM Shapes](https://docs.oracle.com/en-us/iaas/Content/Compute/Concepts/computeoverview.htm#VM-Shape)

---

## 2. Google Cloud Free Tier

### Specifications

| Attribute     | Value            |
| ------------- | ---------------- |
| **RAM**       | 1GB (e2-micro)   |
| **CPU**       | 1x vCPU          |
| **Storage**   | 30GB             |
| **Bandwidth** | 1GB/month egress |
| **Uptime**    | 90 days trial    |

### Pros

```
✅ Easy to use interface
✅ Good documentation
✅ Part of Google Cloud ecosystem
```

### Cons

```
❌ Requires credit card
❌ Only 90 days free trial
❌ 1GB RAM is too small for SIP
❌ Limited bandwidth
❌ Port restrictions
❌ UDP limitations
```

### Verdict

**Not recommended** - RAM and bandwidth too limited for SIP.

---

## 3. AWS Free Tier

### Specifications

| Attribute     | Value          |
| ------------- | -------------- |
| **RAM**       | 1GB (t2.micro) |
| **CPU**       | 1x vCPU        |
| **Storage**   | 30GB EBS       |
| **Bandwidth** | 15GB/month     |
| **Uptime**    | 12 months      |

### Pros

```
✅ Industry standard
✅ Excellent documentation
✅ Global infrastructure
```

### Cons

```
❌ Requires credit card
❌ Only 12 months free
❌ 1GB RAM insufficient
❌ Limited bandwidth
❌ Port restrictions
```

### Verdict

**Not recommended** - RAM too limited for production SIP.

---

## 4. Azure Free Tier

### Specifications

| Attribute     | Value      |
| ------------- | ---------- |
| **RAM**       | 1GB (B1s)  |
| **CPU**       | 1x vCPU    |
| **Storage**   | 4GB        |
| **Bandwidth** | 15GB/month |
| **Uptime**    | 12 months  |

### Pros

```
✅ Microsoft ecosystem integration
✅ Good documentation
```

### Cons

```
❌ Requires credit card
❌ Only 12 months free
❌ 1GB RAM insufficient
❌ Limited storage
❌ Port restrictions
```

### Verdict

**Not recommended** - RAM and storage too limited.

---

## 5. Hetzner Cloud (Budget Option)

### Specifications

| Attribute     | Value       |
| ------------- | ----------- |
| **RAM**       | 4GB (CCX11) |
| **CPU**       | 2x vCPU     |
| **Storage**   | 40GB SSD    |
| **Bandwidth** | Unlimited   |
| **Price**     | €4.50/month |

### Pros

```
✅ Simple interface
✅ Good performance
✅ Unlimited bandwidth
✅ Custom ports
✅ UDP support
✅ Pay-as-you-go
```

### Cons

```
❌ Not free (but cheap)
❌ Requires credit card or PayPal
```

### Setup

```bash
# 1. Create account at hetzner.com
# 2. Add payment method (credit card or PayPal)
# 3. Create cloud server
#    - Location: Falkenstein (cheapest)
#    - Image: Ubuntu 22.04
#    - Type: CCX11 (€4.50/mo)
# 4. SSH into server
ssh root@<VM_IP>

# 5. Install Docker
apt update
apt install -y docker-compose
docker-compose -f docker-compose.sip.yml up -d
```

### Verdict

**Recommended budget option** - Great value for money.

---

## 6. Contabo

### Specifications

| Attribute     | Value       |
| ------------- | ----------- |
| **RAM**       | 6GB         |
| **CPU**       | 2x vCPU     |
| **Storage**   | 50GB SSD    |
| **Bandwidth** | Unlimited   |
| **Price**     | €4.99/month |

### Pros

```
✅ 6GB RAM
✅ Unlimited bandwidth
✅ Custom ports
✅ UDP support
✅ Simple pricing
```

### Cons

```
❌ Not free
❌ Requires credit card
❌ Some reviews mention downtime
```

### Verdict

**Good alternative** - More RAM than Hetzner.

---

## 7. Self-Hosted Options

### 7.1 Raspberry Pi 4

### Specifications

| Attribute   | Value                |
| ----------- | -------------------- |
| **RAM**     | 4GB or 8GB           |
| **CPU**     | 4x ARM Cortex-A72    |
| **Storage** | 32GB+ SD card or SSD |
| **Power**   | ~5W                  |

### Hardware Requirements

```
Minimum:
- Raspberry Pi 4 (4GB RAM)
- 32GB SD card
- Power supply
- Case

Recommended:
- Raspberry Pi 4 (8GB RAM)
- 128GB NVMe SSD via USB
- Active cooling
- Power supply
```

### Setup

```bash
# 1. Install Ubuntu Server on Pi
# Download from https://ubuntu.com/download/raspberry-pi

# 2. Flash to SD card using Balena Etcher

# 3. Boot Pi and SSH in

# 4. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 5. Deploy SIP stack
git clone https://github.com/yourusername/CareFlow.git
cd CareFlow/infrastructure

# Use ARM64 docker-compose
docker compose -f docker-compose.sip.arm64.yml up -d
```

### Considerations

```
✅ Completely free (one-time hardware cost)
✅ Low power consumption
✅ Quiet (no moving parts)
❌ Home internet upload speed limits
❌ Dynamic DNS required
❌ Uptime depends on home power/internet
```

### 7.2 Old Laptop/Desktop

### Specifications

| Attribute   | Value          |
| ----------- | -------------- |
| **RAM**     | 4GB-16GB       |
| **CPU**     | 2-8 cores      |
| **Storage** | 100GB+ HDD/SSD |
| **Power**   | 50-200W        |

### Setup

```bash
# 1. Install Ubuntu Server or Desktop
# Download from https://ubuntu.com/download

# 2. Boot from USB and install

# 3. Disable sleep/hibernate
sudo systemctl set-default multi-user.target

# 4. Install Docker
curl -fsSL https://get.docker.com | sh

# 5. Deploy
git clone https://yourusername/CareFlow.git
cd CareFlow/infrastructure
docker compose -f docker-compose.sip.yml up -d
```

### Considerations

```
✅ Reuse old hardware
✅ More powerful than Pi
❌ Higher power consumption
❌ Noisy (fan)
❌ Home internet upload limits
```

---

## 8. Dynamic DNS Providers

For self-hosted solutions, you'll need dynamic DNS:

| Provider   | Free Tier   | Price                |
| ---------- | ----------- | -------------------- |
| No-IP      | 3 hostnames | $0                   |
| DuckDNS    | Unlimited   | $0                   |
| FreeDNS    | Unlimited   | $0                   |
| Cloudflare | Unlimited   | $0 (requires domain) |

### Setup DuckDNS (Free)

```bash
# 1. Create account at duckdns.org
# 2. Create domain (e.g., careflow.duckdns.org)
# 3. Install client on server

# On your server:
mkdir -p /opt/duckdns
cd /opt/duckdns
echo "token=your-token" > duckdns.conf
echo "domains=careflow" > domains.txt

# Add cron job
crontab -e
# Add:
*/5 * * * * /opt/duckdns/duckdns.sh
```

---

## 9. Port Forwarding

For self-hosted solutions:

### Router Setup

```
1. Access router admin (usually 192.168.1.1)
2. Find port forwarding / NAT rules
3. Forward ports:
   - 5060/udp -> Your server IP
   - 5060/tcp -> Your server IP
   - 5061/tcp -> Your server IP
   - 10000-20000/udp -> Your server IP
4. Save and apply
```

### Firewall on Server

```bash
# Allow ports
sudo ufw allow 22/tcp
sudo ufw allow 5060/udp
sudo ufw allow 5060/tcp
sudo ufw allow 5061/tcp
sudo ufw allow 10000:20000/udp
sudo ufw enable
```

---

## 10. Comparison Summary

### For Production

| Option           | Score      | Reason                            |
| ---------------- | ---------- | --------------------------------- |
| **Oracle Cloud** | ⭐⭐⭐⭐⭐ | Free, powerful, reliable          |
| **Hetzner**      | ⭐⭐⭐⭐   | Cheap, reliable, good support     |
| **Contabo**      | ⭐⭐⭐     | Good specs, some downtime reports |

### For Development/Testing

| Option           | Score    | Reason                      |
| ---------------- | -------- | --------------------------- |
| **Raspberry Pi** | ⭐⭐⭐⭐ | Cheap, learning opportunity |
| **Old Laptop**   | ⭐⭐⭐   | Reuse hardware              |

### Decision Matrix

| Requirement           | Best Option                  |
| --------------------- | ---------------------------- |
| Completely free       | Oracle Cloud or Raspberry Pi |
| Most reliable         | Oracle Cloud or Hetzner      |
| Easiest setup         | Oracle Cloud                 |
| Learning/self-hosting | Raspberry Pi                 |
| Budget (>$0)          | Hetzner (€4.50/mo)           |

---

## 11. Recommended Architecture

### Production (Free)

```
┌─────────────────────────────────────────────────────────┐
│                    Oracle Cloud                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              CareFlow SIP Server                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ Kamailio │ │ Asterisk │ │RTPEngine │         │  │
│  │  │  (5060)  │ │  (5061)  │ │  (2222)  │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘         │  │
│  │                                                  │  │
│  │  ┌──────────┐ ┌──────────┐                     │  │
│  │  │PostgreSQL│ │  Redis   │                     │  │
│  │  │  (5432)  │ │  (6379)  │                     │  │
│  │  └──────────┘ └──────────┘                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Costs: $0/month (Always Free)                           │
└─────────────────────────────────────────────────────────┘
```

### Hybrid (Vercel + Oracle)

```
┌─────────────────────────────────────────────────────────┐
│  Vercel (Frontend/API)          Oracle Cloud (SIP)       │
│  ┌──────────────────┐         ┌──────────────────┐   │
│  │   Next.js App    │  ───►   │   Kamailio +     │   │
│  │   (careflow.io)  │   API   │   Asterisk       │   │
│  └──────────────────┘         └──────────────────┘   │
│                                                          │
│  Costs: $0-20/mo              Costs: $0/month            │
└─────────────────────────────────────────────────────────┘
```

### Self-Hosted (Home)

```
┌─────────────────────────────────────────────────────────┐
│  Raspberry Pi 4 (8GB)                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Docker Container Stack               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ Kamailio │ │ Asterisk │ │RTPEngine │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘         │  │
│  │                                                  │  │
│  │  ┌──────────┐                                  │  │
│  │  │PostgreSQL│                                  │  │
│  │  └──────────┘                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Costs: ~$100 one-time (hardware)                        │
│  Requirements: Static IP or Dynamic DNS                 │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Recommendation

### For CareFlow SIP Server

**Primary: Oracle Cloud Always Free**

```
✅ 24GB RAM, 2 CPUs
✅ Free forever
✅ Unlimited bandwidth
✅ Full control
✅ UDP/SIP ports supported
```

**Alternative: Hetzner Cloud (€4.50/mo)**

```
✅ 4GB RAM, 2 CPUs
✅ Reliable infrastructure
✅ Simple interface
✅ Pay-as-you-go
```

### For Development

**Raspberry Pi 4 (4GB/8GB)**

```
✅ ~$50-100 one-time
✅ Great learning experience
✅ Fully functional
```

---

## 13. Next Steps

1. Choose hosting option
2. Create account
3. Provision VM
4. Configure firewall
5. Deploy Docker stack
6. Test SIP registration
7. Configure DNS
8. Set up monitoring
