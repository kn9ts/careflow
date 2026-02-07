# Free Cloud VM Services Comparison (No Credit Card Required)

## Summary Table

| Service                  | RAM         | CPU     | Storage | Bandwidth | Credit Card? | Duration  |
| ------------------------ | ----------- | ------- | ------- | --------- | ------------ | --------- |
| Oracle Cloud Always Free | 24GB        | 2 CPUs  | 200GB   | Unlimited | No           | Forever   |
| Amazon EC2 t2.micro      | 1GB         | 1 vCPU  | 30GB    | 15GB/mo   | Yes          | 12 months |
| Google Cloud e2-micro    | 1GB         | 1 vCPU  | 30GB    | 1GB/mo    | Yes          | 90 days   |
| Azure B1s                | 1GB         | 1 vCPU  | 4GB     | 15GB/mo   | Yes          | 12 months |
| Heroku Dynos             | 512MB       | 1 CPU   | —       | —         | Yes          | Forever   |
| Render Free              | 512MB       | 0.5 CPU | —       | 100GB/mo  | No           | Forever   |
| Railway                  | 500MB       | 0.5 CPU | —       | 100GB/mo  | No           | Forever   |
| Fly.io                   | 1GB         | 1 CPU   | 3GB     | 160GB/mo  | No           | Forever   |
| Coolify                  | Self-hosted | —       | —       | —         | No           | Forever   |
| Portainer                | Self-hosted | —       | —       | —         | No           | Forever   |

## Detailed Comparisons

### 1. Oracle Cloud Always Free ⭐ RECOMMENDED

**Requirements:** Phone number verification (no credit card)

```
✅ Pros:
- 2 ARM64 CPUs (2GB each = 4GB total possible)
- 24GB RAM total
- 200GB block storage
- Unlimited bandwidth
- Free forever (no trial period)
- Full root access
- Multiple VMs allowed

❌ Cons:
- Requires phone verification
- Complex interface
- ARM64 only (but Docker works fine)
- Limited regions
- Requires account verification

Website: https://cloud.oracle.com
```

### 2. Amazon EC2 t2.micro

**Requirements:** Credit card required

```
✅ Pros:
- 1GB RAM, 1 vCPU
- 30GB EBS storage
- Part of AWS ecosystem
- Great documentation

❌ Cons:
- Credit card required
- Only 12 months free
- Very limited resources
- Expensive after free tier

Website: https://aws.amazon.com/ec2
```

### 3. Google Cloud e2-micro

**Requirements:** Credit card required (for verification)

```
✅ Pros:
- 1GB RAM, 1 vCPU
- 30GB storage
- Part of Google Cloud
- Good network

❌ Cons:
- Credit card required
- Only 90 days free
- Very limited
- $7/month after trial

Website: https://cloud.google.com/compute
```

### 4. Azure B1s

**Requirements:** Credit card required

```
✅ Pros:
- 1GB RAM, 1 vCPU
- Part of Microsoft ecosystem
- 12 months free

❌ Cons:
- Credit card required
- Limited resources
- Complex pricing

Website: https://azure.microsoft.com
```

### 5. Heroku Dynos

**Requirements:** Credit card required for most features

```
✅ Pros:
- Easy deployment
- Great for web apps
- Add-ons ecosystem

❌ Cons:
- Credit card required
- 512MB RAM
- Sleeps after 30min inactivity (free tier)
- No root access
- Not suitable for SIP servers

Website: https://heroku.com
```

### 6. Render Free ⭐ RECOMMENDED

**Requirements:** GitHub account (no credit card)

```
✅ Pros:
- No credit card required
- Free forever
- Docker support
- Easy deployment
- Good for web apps

❌ Cons:
- 512MB RAM, 0.5 CPU
- Services sleep after 15min
- No root access
- Not suitable for SIP servers

Website: https://render.com
```

### 7. Railway ⭐ RECOMMENDED

**Requirements:** GitHub account (no credit card)

```
✅ Pros:
- No credit card required
- Free forever
- Docker support
- Easy deployment
- Good developer experience

❌ Cons:
- 500MB RAM, 0.5 CPU
- Limited egress
- Not suitable for SIP servers

Website: https://railway.app
```

### 8. Fly.io Free Tier ⭐ RECOMMENDED

**Requirements:** Credit card for verification (refundable hold)

```
✅ Pros:
- No credit card charges
- 1GB RAM, 1 CPU
- 3GB storage
- 160GB bandwidth/month
- Good for containers
- Edge network

❌ Cons:
- Credit card verification ($1 hold)
- Limited compute
- Complex pricing after free

Website: https://fly.io
```

### 9. Coolify ⭐ RECOMMENDED (Self-Hosted)

**Requirements:** Your own VM

```
✅ Pros:
- Completely free (self-hosted)
- No limits (depends on your VM)
- Heroku-like experience
- Docker management
- Easy deployments

❌ Cons:
- You need to host it
- Requires technical setup
- Maintenance is your responsibility

Website: https://coolify.io
```

### 10. Portainer (Self-Hosted)

**Requirements:** Your own VM

```
✅ Pros:
- Completely free (self-hosted)
- Easy Docker management
- Web UI for containers

❌ Cons:
- You need to host it
- Doesn't provide VM

Website: https://portainer.io
```

## Best Options for CareFlow SIP Server

### Option 1: Oracle Cloud Always Free ⭐ BEST

**Why:**

- 2 CPUs, 24GB RAM - enough for full SIP stack
- Free forever
- No credit card (just phone verification)
- Multiple VMs possible
- Full root access

**Setup:**

```
1. Go to cloud.oracle.com
2. Create account with email + phone
3. Verify phone number (SMS or call)
4. Create Always Free VM.Standard.A1.Flex
5. Install Docker
6. Deploy CareFlow SIP infrastructure
```

### Option 2: Oracle Cloud on Raspberry Pi / Home Server

**Why:**

- Completely free
- You control the hardware
- No cloud bills

**Requirements:**

- Raspberry Pi 4 (4GB+ RAM) or old laptop
- Static IP or dynamic DNS
- Home internet upload bandwidth

**Setup:**

```
1. Install Ubuntu Server on Pi
2. Docker: curl -fsSL https://get.docker.com | sh
3. Clone CareFlow
4. ./scripts/start.sh
5. Configure dynamic DNS
```

### Option 3: Hetzner Cloud (Pay-as-you-go)

**Requirements:** PayPal (no credit card)

```
✅ Pros:
- Very cheap (€4.50/month for 2GB RAM)
- No credit card (PayPal accepted)
- Great performance
- Full root access

❌ Cons:
- Not free (but cheap)
- Requires payment method

Website: https://hetzner.com
```

## Comparison by Use Case

| Use Case                   | Best Option              | Alternative          |
| -------------------------- | ------------------------ | -------------------- |
| SIP Server (needs RAM/CPU) | Oracle Cloud Always Free | Hetzner Cloud        |
| Web App (light traffic)    | Render Free              | Railway              |
| Database Server            | Oracle Cloud Always Free | Coolify              |
| Development Environment    | GitHub Codespaces        | Gitpod               |
| Container Management       | Coolify                  | Portainer            |
| Learning/Experimentation   | Oracle Cloud Always Free | Google Cloud (trial) |

## Oracle Cloud Step-by-Step

### 1. Create Account

```
1. Go to https://cloud.oracle.com
2. Click "Sign Up"
3. Enter:
   - Email
   - Password
   - Country
4. Verify email
5. Add phone number for SMS verification
6. Enter verification code
```

### 2. Create VM

```
1. Go to Compute -> Instances
2. Click "Create Instance"
3. Configure:
   - Name: careflow-sip
   - Image: Oracle Linux 8 (or Ubuntu 22.04)
   - Shape: VM.Standard.A1.Flex
   - CPUs: 2
   - RAM: 12GB (default for A1.Flex)
4. Add SSH key (create new or paste public key)
5. Click "Create"
```

### 3. Configure Networking

```
1. Go to Networking -> Virtual Cloud Networks
2. Click your VCN
3. Go to Security Lists
4. Add ingress rules:
   - 22/tcp (SSH) - Your IP
   - 5060/udp (SIP) - 0.0.0.0/0
   - 5060/tcp (SIP) - 0.0.0.0/0
   - 5061/tcp (SIP TLS) - 0.0.0.0/0
   - 10000-20000/udp (RTP) - 0.0.0.0/0
   - 80/tcp (HTTP) - 0.0.0.0/0
   - 443/tcp (HTTPS) - 0.0.0.0/0
```

### 4. Connect to VM

```bash
# Get public IP from Oracle Console
# SSH in
ssh opc@<VM_PUBLIC_IP>

# Install Docker
sudo dnf update -y
sudo dnf install -y docker-ce
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Clone and deploy
git clone https://github.com/yourusername/CareFlow.git
cd CareFlow/infrastructure
./scripts/setup.sh
./scripts/start.sh
```

## Recommendations

### For CareFlow SIP Server

**Primary: Oracle Cloud Always Free**

- 2 CPUs, 24GB RAM, 200GB storage
- Free forever
- Perfect for SIP + Kamailio + Asterisk

**Alternative: Self-hosted**

- Raspberry Pi 4 (4GB) + dynamic DNS
- Old laptop + Ubuntu Server
- Free but limited bandwidth

### For Development/Testing

**Primary: GitHub Codespaces**

- 2 cores, 4GB RAM, 15GB storage
- Free 120 core-hours/month
- No setup required

**Alternative: Gitpod**

- Similar to Codespaces
- Free tier available

## Final Recommendation

**Use Oracle Cloud Always Free** for the CareFlow SIP server:

- ✅ No credit card required (phone verification only)
- ✅ Free forever
- ✅ 2 CPUs, 24GB RAM
- ✅ Unlimited bandwidth
- ✅ Full root access
- ✅ Multiple VMs possible

**Runner-up: Self-hosted Raspberry Pi** if you want complete control and zero costs.
