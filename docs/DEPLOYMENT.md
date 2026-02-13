# CareFlow Deployment Guide

**Last Updated:** 2026-02-06
**Version:** 1.0.0

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Deployment Platforms](#deployment-platforms)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Third-Party Services](#third-party-services)
8. [SSL/TLS Configuration](#ssltls-configuration)
9. [Monitoring & Logging](#monitoring--logging)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

| Service       | Purpose              | Signup URL                  |
| ------------- | -------------------- | --------------------------- |
| Vercel        | Hosting & Serverless | https://vercel.com          |
| Firebase      | Auth & Notifications | https://firebase.google.com |
| MongoDB Atlas | Database             | https://mongodb.com/atlas   |
| Twilio        | Voice Calls          | https://twilio.com          |
| Backblaze B2  | File Storage         | https://backblaze.com       |

### Local Tools

- **Node.js**: Version 18.x or higher
- **npm** or **yarn**: Package manager
- **Git**: Version control

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/careflow.git
cd careflow
```

### 2. Install Dependencies

```bash
# Using yarn (recommended)
yarn install

# Or using npm
npm install
```

### 3. Configure Environment Variables

```bash
# Copy example environment file
cp .env.local.example .env.local

# Edit with your credentials
nano .env.local
```

---

## Local Development

### Start Development Server

```bash
# Using yarn
yarn dev

# Using npm
npm run dev

# Using pnpm
pnpm dev
```

The application will be available at `http://localhost:3000`

### Run Tests Locally

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/lib/callManager.test.js

# Run in watch mode
npm run test:watch
```

---

## Deployment Platforms

### Vercel (Recommended)

#### Automatic Deployment

1. **Push to GitHub**

   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - Set NODE_ENV to `production`

4. **Deploy**
   - Vercel will automatically deploy on push to main

#### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Docker Deployment

#### Build Docker Image

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t careflow .
docker run -p 3000:3000 careflow
```

### AWS Amplify

1. Connect GitHub repository to AWS Amplify
2. Configure build settings:
   ```yaml
   # amplify.yml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
3. Add environment variables in Amplify console

---

## Environment Variables

### Required Variables

```env
# Firebase (Client - prefix with NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase (Admin)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account-email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/careflow

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_API_KEY=your-api-key
TWILIO_API_SECRET=your-api-secret

# Backblaze B2
BACKBLAZE_KEY_ID=your-key-id
BACKBLAZE_APPLICATION_KEY=your-application-key
BACKBLAZE_BUCKET_NAME=your-bucket-name
BACKBLAZE_BUCKET_ID=your-bucket-id
```

### Optional Variables

```env
# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Logging
LOG_LEVEL=info
```

---

## Database Setup

### MongoDB Atlas

1. **Create Cluster**
   - Go to MongoDB Atlas
   - Create free tier cluster (M0)

2. **Create Database User**
   - Database Access → Add New User
   - Set username/password
   - Grant "Atlas Admin" role

3. **Configure Network Access**
   - Network Access → Add IP Address
   - Allow access from anywhere (0.0.0.0/0) for development
   - Specific IPs for production

4. **Get Connection String**
   - Cluster → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your database password

5. **Create Indexes**
   ```javascript
   // In MongoDB Atlas Search Indexes or via Compass
   db.recordings.createIndex({ firebaseUid: 1, recordedAt: -1 });
   db.recordings.createIndex({ firebaseUid: 1, type: 1 });
   db.users.createIndex({ firebaseUid: 1 }, { unique: true });
   ```

---

## Third-Party Services

### Firebase Setup

#### Create Project

1. Go to Firebase Console
2. Create new project
3. Enable Authentication (Email/Password, Google)
4. Enable Cloud Messaging

#### Get Admin Credentials

1. Project Settings → Service Accounts
2. Generate new private key
3. Copy contents to environment variables

#### Configure Client SDK

1. Project Settings → General
2. Add web app
3. Copy configuration values

### Twilio Setup

#### Purchase Phone Number

1. Twilio Console → Phone Numbers
2. Buy a number with Voice capability
3. Configure with Webhook

#### Configure Webhooks

1. Phone Number → Voice & Fax
2. Set "A call comes in" to: Webhook → `https://your-domain.com/api/webhooks/twilio/voice`
3. Set "A call is completed" to: Webhook → `https://your-domain.com/api/webhooks/twilio/status`

#### Create TwiML App (Optional)

1. Twilio Console → TwiML Apps
2. Create new app
3. Set Voice Request URL to `https://your-domain.com/api/webhooks/twilio/voice`

### Backblaze B2 Setup

#### Create Bucket

1. B2 Cloud Storage → Buckets
2. Create bucket with public access disabled
3. Note bucket ID and name

#### Create Application Key

1. Account → Application Keys
2. Create new application key
3. Grant access to your bucket
4. Note key ID and application key

---

## SSL/TLS Configuration

### Vercel (Automatic)

Vercel provides automatic SSL for custom domains.

### Custom Domain

1. **Purchase Domain**
   - Go to Vercel Domains or any registrar

2. **Add Domain to Vercel**
   - Project Settings → Domains
   - Add your domain
   - Configure DNS records

3. **SSL Certificate**
   - Vercel will automatically provision Let's Encrypt certificate
   - Renewal is automatic

### AWS Route 53 (Optional)

```yaml
# DNS Configuration
# A Record for apex domain
careflow.com.    A    76.76.21.21

# CNAME for www
www.careflow.com. CNAME careflow.vercel.app

# MX Records (if using custom email)
careflow.com.    MX    10 ALT1.ASPMX.L.GOOGLE.COM
careflow.com.    MX    10 ALT2.ASPMX.L.GOOGLE.COM
```

---

## Monitoring & Logging

### Vercel Analytics

1. Enable Vercel Analytics in project settings
2. View dashboard at vercel.com/dashboard

### Error Tracking

```bash
# Configure error logging
export SENTRY_DSN=your-sentry-dsn
```

### Log Management

```bash
# View logs in Vercel CLI
vercel logs --follow

# Tail production logs
vercel logs --prod
```

### Health Checks

```javascript
// Add to app/api/health/route.js
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
```

---

## Troubleshooting

### Common Issues

#### CORS Errors

**Symptom:** Browser blocks API requests

**Solution:**

```javascript
// Verify Twilio phone number is configured
// Check Vercel deployment URL matches Twilio webhook
```

#### Authentication Failures

**Symptom:** 401 Unauthorized errors

**Solution:**

1. Verify Firebase Admin credentials
2. Check token expiration
3. Ensure proper Authorization header format

```bash
# Test token verification
curl -H "Authorization: Bearer $TOKEN" https://your-domain.com/api/calls
```

#### Database Connection Issues

**Symptom:** MongoDB connection errors

**Solution:**

1. Verify connection string
2. Check IP whitelist in MongoDB Atlas
3. Ensure database user has correct permissions

```bash
# Test MongoDB connection
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(console.error)"
```

#### Recording Upload Failures

**Symptom:** Recordings not uploading to Backblaze

**Solution:**

1. Verify B2 credentials
2. Check bucket permissions
3. Review Backblaze B2 API keys

```bash
# Test B2 connection
node -e "const B2 = require('backblaze-node'); const b2 = new B2({ accountId: process.env.BACKBLAZE_KEY_ID, applicationKey: process.env.BACKBLAZE_APPLICATION_KEY }); b2.authorize().then(() => console.log('Authorized')).catch(console.error)"
```

### Performance Issues

#### Slow API Responses

1. Check MongoDB query performance
2. Add compound indexes
3. Enable pagination on all list endpoints
4. Consider Redis caching for frequently accessed data

#### High Latency Calls

1. Check Twilio region settings
2. Verify STUN/TURN servers for WebRTC
3. Monitor network conditions

### Rollback Procedure

```bash
# Via Vercel CLI
vercel rollback [deployment-url]

# Via Git revert
git revert [commit-hash]
git push origin main
```

---

## Security Checklist

- [ ] Enable HTTPS on all endpoints
- [ ] Use environment variables for all secrets
- [ ] Enable CORS restrictions
- [ ] Implement rate limiting
- [ ] Validate all user inputs
- [ ] Sanitize database queries
- [ ] Enable Firebase App Check (optional)
- [ ] Regular security audits
- [ ] Monitor for suspicious activity

---

## Backup & Recovery

### MongoDB Atlas Backups

1. Automatic backups enabled by default
2. Configure point-in-time recovery
3. Test restoration quarterly

### Backblaze B2 Versioning

1. Enable versioning on bucket
2. Configure lifecycle rules
3. Test file recovery

---

Last updated: February 2026
CareFlow v1.0.0
