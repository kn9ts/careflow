# CareFlow Deployment Guide

## Deploying to Vercel (Free Tier)

### Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- All environment variables ready

### Step 1: Push Code to GitHub

1. Create a new repository on GitHub
2. Initialize git and push your code:

```bash
cd careflow
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/careflow.git
git push -u origin main
```

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or `careflow` if repo has parent folder)
   - **Build Command**: `next build`
   - **Output Directory**: `.next`

5. Add Environment Variables:
   Click "Environment Variables" and add all variables from your `.env.local`:

   | Variable                                   | Value                          |
   | ------------------------------------------ | ------------------------------ |
   | `TWILIO_ACCOUNT_SID`                       | your_account_sid               |
   | `TWILIO_AUTH_TOKEN`                        | your_auth_token                |
   | `TWILIO_PHONE_NUMBER`                      | your_phone_number              |
   | `TWILIO_TWIML_APP_SID`                     | your_twiml_app_sid             |
   | `TWILIO_API_KEY`                           | your_api_key                   |
   | `TWILIO_API_SECRET`                        | your_api_secret                |
   | `NEXT_PUBLIC_APP_URL`                      | https://your-domain.vercel.app |
   | `NEXT_PUBLIC_FIREBASE_API_KEY`             | your_firebase_api_key          |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | your-project.firebaseapp.com   |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | your-project-id                |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | your-project.appspot.com       |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | your_sender_id                 |
   | `NEXT_PUBLIC_FIREBASE_APP_ID`              | your_app_id                    |
   | `FIREBASE_ADMIN_PROJECT_ID`                | your-project-id                |
   | `FIREBASE_ADMIN_CLIENT_EMAIL`              | firebase-adminsdk@...          |
   | `FIREBASE_ADMIN_PRIVATE_KEY`               | your_private_key               |
   | `MONGODB_URI`                              | your_mongodb_uri               |

6. Click "Deploy"

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
cd careflow
vercel

# Follow the prompts to configure your project
```

### Step 3: Update Twilio Webhook URL

After deployment, update your Twilio configuration:

1. Go to https://console.twilio.com
2. Navigate to your TwiML App
3. Update the Voice Request URL to:
   ```
   https://your-domain.vercel.app/api/twilio/voice
   ```
4. Update your Phone Number webhook:
   - Go to Phone Numbers → Manage → Active Numbers
   - Set "A call comes in" webhook to:
     ```
     https://your-domain.vercel.app/api/twilio/voice
     ```

### Step 4: Update Firebase Authorized Domains

1. Go to https://console.firebase.google.com
2. Navigate to Authentication → Settings → Authorized domains
3. Add your Vercel domain:
   ```
   your-domain.vercel.app
   ```

### Step 5: Update Environment Variables

If you need to update environment variables after deployment:

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add/Edit variables
5. Redeploy the project

---

## Local Development vs Production

### Local Development

```bash
# Uses .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (Vercel)

```bash
# Set in Vercel dashboard
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## Troubleshooting

### Build Failures

- Check that all environment variables are set
- Ensure `next.config.js` is properly configured
- Check build logs in Vercel dashboard

### API Routes Not Working

- Verify server-side environment variables are set (not just public ones)
- Check function logs in Vercel dashboard

### Twilio Webhook Errors

- Ensure webhook URL is publicly accessible (not localhost)
- Check Twilio error logs in Twilio Console

### Firebase Auth Issues

- Add your Vercel domain to Firebase authorized domains
- Verify Firebase config values are correct

---

## Free Tier Limits (Vercel)

- **Bandwidth**: 100GB/month
- **Serverless Function Execution**: 10 seconds
- **Build Time**: 45 minutes per deployment
- **Team Members**: 1 (just you)

For most small to medium applications, these limits are more than sufficient!
