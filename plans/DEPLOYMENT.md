---
# CareFlow Deployment Guide

## Target Platform

**Vercel** (recommended for Next.js applications)

Other options:
- AWS Amplify
- Railway
- Fly.io
- Docker containers

---

## Prerequisites

Before deploying, ensure you have:

1. **GitHub repository** with your CareFlow code
2. **Vercel account** (free tier works for development)
3. **All environment variables** configured

---

## Quick Start

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial CareFlow deployment"
git push origin main
```

### 2. Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Framework: **Next.js** (automatic detection)

### 3. Configure Environment Variables

In Vercel project settings, add all variables from [`careflow/.env.local.example`](careflow/.env.local.example):

#### Required Variables

```bash
# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-rtdb.firebaseio.com

# Firebase Admin (Server)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/careflow

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

#### Twilio Variables (Optional - for PSTN calls)

```bash
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_TWIML_APP_SID=your-twiml-app-sid
TWILIO_API_KEY=your-api-key
TWILIO_API_SECRET=your-api-secret
```

#### Backblaze B2 Variables (Optional - for recordings)

```bash
BACKBLAZE_KEY_ID=your-key-id
BACKBLAZE_APPLICATION_KEY=your-application-key
BACKBLAZE_BUCKET_NAME=your-bucket-name
BACKBLAZE_ENDPOINT=https://s3.us-east-1.backblazeb2.com
BACKBLAZE_REGION=us-east-1
```

> **Note**: Backblaze B2 is a cost-effective alternative to AWS S3. Get credentials at [Backblaze B2](https://secure.backblaze.com).

### 4. Deploy

1. Click "Deploy" in Vercel
2. Wait for build to complete (~2-3 minutes)
3. Note your deployment URL

### 5. Configure Twilio Webhooks

If using Twilio, update your TwiML App webhooks:

- **Voice URL**: `https://your-domain.vercel.app/api/webhooks/twilio/voice`
- **Status URL**: `https://your-domain.vercel.app/api/webhooks/twilio/status`

### 6. Add Firebase Authorized Domain

In Firebase Console > Authentication > Settings:

1. Add `your-domain.vercel.app` to authorized domains
2. Add localhost for development

---

## Backblaze B2 Setup

### Create Backblaze B2 Account

1. Go to [Backblaze B2](https://www.backblazeb2.com)
2. Sign up for free account
3. Verify email

### Create Bucket

1. In Backblaze B2 dashboard, click "Create Bucket"
2. Bucket name: `careflow-recordings` (unique name)
3. Set to "Public" or configure CORS for private access
4. Note the bucket name

### Create Application Key

1. Go to "Application Keys" in sidebar
2. Click "Add Application Key"
3. Key name: `careflow-prod`
4. Permissions: `Read and Write`
5. Copy Key ID and Application Key (shown once)

### Configure CORS (Optional)

For browser uploads, add CORS rule to bucket:

```json
[
  {
    "allowedHeaders": ["*"],
    "allowedMethods": ["GET", "PUT", "POST"],
    "allowedOrigins": ["https://your-domain.vercel.app", "http://localhost:3000"],
    "exposeHeaders": ["ETag"],
    "maxAgeSeconds": 3600
  }
]
```

---

## Twilio Setup (Optional)

### Create Twilio Account

1. Go to [Twilio](https://www.twilio.com)
2. Sign up for account
3. Get phone number

### Configure Twilio

1. Create TwiML App in Console
2. Set voice webhook URL
3. Note Account SID and Auth Token

### Update Webhooks

In Twilio Console > Phone Numbers > Your Number:

- **Voice & Fax** > **Voice URL**: `https://your-domain.vercel.app/api/webhooks/twilio/voice`
- **Status Callback URL**: `https://your-domain.vercel.app/api/webhooks/twilio/status`

---

## Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] Firebase authentication works
- [ ] Login/registration functions
- [ ] Dashboard loads
- [ ] Twilio webhooks respond (if configured)
- [ ] Recordings upload to Backblaze B2 (if configured)
- [ ] Call history saves to MongoDB

---

## Troubleshooting

### Build Fails

```
Error: Module not found
```

**Solution**: Ensure all dependencies are in `package.json`:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Firebase Auth Errors

```
auth/unauthorized-domain
```

**Solution**: Add your domain to Firebase Console > Authentication > Authorized domains

### Twilio Webhook Fails

```
Error: TwiML instruction not implemented
```

**Solution**: Check webhook URL is accessible (not returning 404/500)

### MongoDB Connection Fails

```
MongoNetworkError: connection timeout
```

**Solution**: Whitelist Vercel IPs in MongoDB Atlas (or use VPC peering)

### Backblaze B2 Upload Fails

```
Access Denied
```

**Solution**: Verify bucket name, Key ID, and Application Key are correct

---

## Local vs Production

| Variable              | Local                        | Production                       |
| --------------------- | ---------------------------- | -------------------------------- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000`      | `https://your-domain.vercel.app` |
| `MONGODB_URI`         | Local or development cluster | Production cluster               |
| Backblaze B2          | Use same credentials         | Use same credentials             |

---

## Environment Variables Reference

| Variable                                   | Required | Description                    |
| ------------------------------------------ | -------- | ------------------------------ |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Yes      | Firebase API key               |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Yes      | Firebase auth domain           |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Yes      | Firebase project ID            |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Yes      | Firebase storage bucket        |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes      | Firebase messaging sender ID   |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Yes      | Firebase app ID                |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL`        | Yes      | Firebase Realtime DB URL       |
| `FIREBASE_ADMIN_PROJECT_ID`                | Yes      | Firebase admin project ID      |
| `FIREBASE_ADMIN_CLIENT_EMAIL`              | Yes      | Firebase admin service account |
| `FIREBASE_ADMIN_PRIVATE_KEY`               | Yes      | Firebase admin private key     |
| `MONGODB_URI`                              | Yes      | MongoDB connection string      |
| `NEXT_PUBLIC_APP_URL`                      | Yes      | Public app URL                 |
| `TWILIO_ACCOUNT_SID`                       | No       | Twilio account SID             |
| `TWILIO_AUTH_TOKEN`                        | No       | Twilio auth token              |
| `TWILIO_PHONE_NUMBER`                      | No       | Twilio phone number            |
| `TWILIO_TWIML_APP_SID`                     | No       | Twilio TwiML app SID           |
| `TWILIO_API_KEY`                           | No       | Twilio API key                 |
| `TWILIO_API_SECRET`                        | No       | Twilio API secret              |
| `BACKBLAZE_KEY_ID`                         | No       | Backblaze B2 key ID            |
| `BACKBLAZE_APPLICATION_KEY`                | No       | Backblaze B2 application key   |
| `BACKBLAZE_BUCKET_NAME`                    | No       | Backblaze B2 bucket name       |
| `BACKBLAZE_ENDPOINT`                       | No       | Backblaze B2 S3 endpoint       |
| `BACKBLAZE_REGION`                         | No       | Backblaze B2 region            |

---

## Rollback Procedure

If deployment fails:

1. Go to Vercel Dashboard > Deployments
2. Find previous working deployment
3. Click "..." > "Redeploy"
4. Verify application works

---

## Related Documents

- [System Architecture](SYSTEM_ARCHITECTURE.md)
- [WebRTC Fallback Architecture](WEBRTC_FALLBACK_ARCHITECTURE.md)
- [Backblaze B2 Guide](BACKBLAZE_B2_GUIDE.md)
- [User Flows](USER_FLOWS.md)
