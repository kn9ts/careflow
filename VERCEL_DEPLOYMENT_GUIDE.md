# Vercel Deployment Guide for CareFlow

This guide will walk you through deploying CareFlow to Vercel step-by-step.

## Prerequisites

- GitHub account (you have this ✅)
- Vercel account (free to create)
- Your code is on GitHub at: https://github.com/kn9ts/careflow ✅

---

## Step 1: Create Vercel Account

1. Go to https://vercel.com
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

---

## Step 2: Import Your Project

1. Once logged in, click the **"Add New..."** button (top right)
2. Select **"Project"**
3. You'll see a list of your GitHub repositories
4. Find and click **"Import"** next to **"careflow"**

---

## Step 3: Configure Project Settings

Vercel should auto-detect Next.js. Verify these settings:

| Setting              | Value                           |
| -------------------- | ------------------------------- |
| **Framework Preset** | Next.js                         |
| **Root Directory**   | `./` (leave as default)         |
| **Build Command**    | `next build` (auto-detected)    |
| **Output Directory** | `.next` (auto-detected)         |
| **Install Command**  | `npm install` or `yarn install` |

Click **"Deploy"** to start the initial deployment (it will fail without env vars, that's OK).

---

## Step 4: Add Environment Variables

After the initial deployment attempt:

1. Go to your project dashboard on Vercel
2. Click the **"Settings"** tab
3. Click **"Environment Variables"** in the left sidebar
4. Add each variable one by one (copy from your `.env.local` file):

### Required Environment Variables:

```
PROJECT_ID=your_project_id
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_TWIML_APP_SID=your_twiml_app_sid
TWILIO_API_KEY=your_api_key
TWILIO_API_SECRET=your_api_secret
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
+h9XgFDsXkrAMjm9gEfBGq4M9LMVxk1DZXor+75xb+4lIGFk5kMojXinHAVRjaMr
IR6KMu3b7heQTGC5LQ1KFiRDIEpERs3L2vaOu6Up8LpIDI4BuT1DaO37dXQzs2wY
vTxOhKhI70hRZUkeakQ++CdRY7Qvh4pzZ8bYHv0hAoGBALjXf1ugoKlsL9G7ZniZ
UUHsfbrsGv5tfu18PE1a5H++XtvSvgRt07yZ4CmhD+UYR06Elw6WnVcKxb0pCNxA
zUGc84zg0sSzzvEAIFVpuVGiIug9EWCilB1ExyvKRJOREqvdXN9aLzrjxU751N2y
OfYzr4yuz3weRgAZ40moQ38M
-----END PRIVATE KEY-----
MONGODB_URI=your_mongodb_connection_string
```

**Important**: For `FIREBASE_ADMIN_PRIVATE_KEY`, make sure to:

- Keep the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- The entire key should be in one field (Vercel handles multiline values)

5. Click **"Save"** after adding all variables

---

## Step 5: Redeploy

1. Go to the **"Deployments"** tab
2. Find the latest deployment
3. Click the **"..."** menu (three dots)
4. Select **"Redeploy"**
5. Check **"Use existing Build Cache"** (optional)
6. Click **"Redeploy"**

Wait for the build to complete (usually 1-3 minutes).

---

## Step 6: Get Your Domain

Once deployed successfully:

1. Vercel will assign you a domain like:
   `https://careflow-xyz123.vercel.app`

2. You can see this on your project dashboard

3. Copy this domain - you'll need it for the next steps!

---

## Step 7: Update Twilio Webhook URL

1. Go to https://console.twilio.com
2. Navigate to **TwiML Apps**
3. Find your TwiML App
4. Update **Voice Request URL** to:
   ```
   https://your-vercel-domain.vercel.app/api/twilio/voice
   ```
5. Save changes

Also update your Phone Number webhook:

1. Go to **Phone Numbers** → **Manage** → **Active Numbers**
2. Click your phone number (+17257555535)
3. Under **Voice & Fax**, set:
   - **A call comes in**: Webhook
   - URL: `https://your-vercel-domain.vercel.app/api/twilio/voice`
4. Save changes

---

## Step 8: Add Domain to Firebase

1. Go to https://console.firebase.google.com
2. Select your Firebase project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **"Add domain"**
5. Enter your Vercel domain (e.g., `careflow-xyz123.vercel.app`)
6. Click **"Add"**

---

## Step 9: Test Your App! 🎉

1. Open your Vercel domain in a browser
2. You should see the CareFlow login page
3. Sign up / Log in
4. Try making a test call!

---

## Troubleshooting

### Build Fails

- Check that all environment variables are added correctly
- Check the build logs for specific errors
- Make sure `FIREBASE_ADMIN_PRIVATE_KEY` is formatted correctly

### "Unauthorized Domain" Error

- Make sure you added your Vercel domain to Firebase authorized domains

### Calls Don't Work

- Check Twilio webhook URL is updated correctly
- Verify Twilio credentials are correct

### Can't Upload Recordings

- Check Firebase Storage is enabled in Firebase Console
- Verify Firebase Admin credentials

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Firebase Docs: https://firebase.google.com/docs
- Twilio Docs: https://www.twilio.com/docs

---

**Your app is ready to go live! 🚀**
