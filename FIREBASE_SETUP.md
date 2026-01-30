# Firebase Environment Variables Setup Guide

This guide will help you find and configure all Firebase environment variables for CareFlow.

## Firebase Project

Your Firebase Project ID: `careflow-5ac50`

---

## 1. Firebase Client Config (Public)

These values are used by the frontend and are safe to expose.

### Where to Find:

1. Go to https://console.firebase.google.com
2. Select your project: **careflow-5ac50**
3. Click the **gear icon** (⚙️) next to "Project Overview" → **Project settings**
4. Scroll down to **"Your apps"** section
5. Click on your **Web app** (or create one if it doesn't exist)
6. You'll see the Firebase SDK snippet with all the values

### Required Variables:

| Variable                                   | Where to Find                     | Example Value                     |
| ------------------------------------------ | --------------------------------- | --------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | SDK snippet - `apiKey`            | `AIzaSyABC123...`                 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | SDK snippet - `authDomain`        | `careflow-5ac50.firebaseapp.com`  |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | SDK snippet - `projectId`         | `careflow-5ac50`                  |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | SDK snippet - `storageBucket`     | `careflow-5ac50.appspot.com`      |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | SDK snippet - `messagingSenderId` | `123456789012`                    |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | SDK snippet - `appId`             | `1:123456789012:web:abc123def456` |

### Example SDK Snippet:

```javascript
const firebaseConfig = {
	apiKey: "AIzaSyABC123...",
	authDomain: "careflow-5ac50.firebaseapp.com",
	projectId: "careflow-5ac50",
	storageBucket: "careflow-5ac50.appspot.com",
	messagingSenderId: "123456789012",
	appId: "1:123456789012:web:abc123def456",
};
```

---

## 2. Firebase Admin Config (Server-side only)

These values are used by the backend and must be kept secret.

### Where to Find:

1. Go to https://console.firebase.google.com
2. Select your project: **careflow-5ac50**
3. Click the **gear icon** (⚙️) → **Project settings**
4. Click the **"Service accounts"** tab
5. Click **"Generate new private key"** button
6. A JSON file will download - open it to see the values

### Required Variables:

| Variable                      | Where to Find          | Example Value                                                    |
| ----------------------------- | ---------------------- | ---------------------------------------------------------------- |
| `FIREBASE_ADMIN_PROJECT_ID`   | `project_id` in JSON   | `careflow-5ac50`                                                 |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | `client_email` in JSON | `firebase-adminsdk-xxxxx@careflow-5ac50.iam.gserviceaccount.com` |
| `FIREBASE_ADMIN_PRIVATE_KEY`  | `private_key` in JSON  | `-----BEGIN PRIVATE KEY-----\nMIIE...`                           |

### Example Service Account JSON:

```json
{
	"type": "service_account",
	"project_id": "careflow-5ac50",
	"private_key_id": "abc123...",
	"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
	"client_email": "firebase-adminsdk-xxxxx@careflow-5ac50.iam.gserviceaccount.com",
	"client_id": "123456789",
	"auth_uri": "https://accounts.google.com/o/oauth2/auth",
	"token_uri": "https://oauth2.googleapis.com/token",
	"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
	"client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40careflow-5ac50.iam.gserviceaccount.com"
}
```

---

## 3. Enable Firebase Services

### Enable Authentication:

1. Go to https://console.firebase.google.com
2. Select your project
3. Click **"Authentication"** in the left sidebar
4. Click **"Get started"**
5. Enable **"Email/Password"** provider (or others you want)

### Enable Storage:

1. Go to https://console.firebase.google.com
2. Select your project
3. Click **"Storage"** in the left sidebar
4. Click **"Get started"**
5. Choose **"Start in production mode"** or **"Start in test mode"**
6. Select your location (e.g., `us-central`)

---

## 4. Update Your .env.local File

Copy the values you collected into your `.env.local` file:

```env
# Firebase Client Config (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=careflow-5ac50.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=careflow-5ac50
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=careflow-5ac50.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_actual_app_id

# Firebase Admin Config (Server-side only)
FIREBASE_ADMIN_PROJECT_ID=careflow-5ac50
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@careflow-5ac50.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourActualPrivateKeyHere\n-----END PRIVATE KEY-----\n"
```

**Important**: Make sure the private key is wrapped in quotes and the `\n` characters are preserved.

---

## 5. Firebase Free Tier Limits

| Service                 | Free Tier                           |
| ----------------------- | ----------------------------------- |
| **Authentication**      | 10,000 users/month                  |
| **Storage**             | 5 GB storage, 1 GB/day download     |
| **Firestore** (if used) | 50,000 reads/day, 20,000 writes/day |

These limits are generous for small to medium applications!

---

## Troubleshooting

### "Permission Denied" Errors

- Make sure you've enabled Authentication and Storage in Firebase Console
- Check that your service account has the right permissions

### "Invalid Credentials" Errors

- Double-check that the private key is correctly formatted with `\n` newlines
- Ensure the client email matches your service account

### Storage Upload Fails

- Check that Firebase Storage is enabled
- Verify the storage bucket name matches your project

---

## Need Help?

- Firebase Documentation: https://firebase.google.com/docs
- Firebase Console: https://console.firebase.google.com
- Firebase Support: https://firebase.google.com/support
