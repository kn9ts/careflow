# Local Development Guide for CareFlow

This guide will help you run CareFlow on your local machine.

## Prerequisites

Before you start, make sure you have:

1. **Node.js 18+** installed
   - Check: `node --version`
   - Download: https://nodejs.org

2. **npm** or **yarn** installed
   - npm comes with Node.js
   - Check: `npm --version` or `yarn --version`

3. **Git** installed
   - Check: `git --version`

4. **All environment variables** configured in `.env.local`
   - See `.env.local.example` for the required variables

---

## Step 1: Clone the Repository (if not already)

```bash
git clone https://github.com/kn9ts/careflow.git
cd careflow
```

---

## Step 2: Install Dependencies

Using **npm**:

```bash
npm install
```

Using **yarn**:

```bash
yarn install
```

Using **pnpm**:

```bash
pnpm install
```

---

## Step 3: Configure Environment Variables

1. Copy the example environment file:

   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` in your editor and fill in your actual values:
   - Twilio credentials
   - Firebase credentials
   - MongoDB URI

---

## Step 4: Run the Development Server

Using **npm**:

```bash
npm run dev
```

Using **yarn**:

```bash
yarn dev
```

Using **pnpm**:

```bash
pnpm dev
```

---

## Step 5: Open the App

1. Open your browser
2. Go to: http://localhost:3000
3. You should see the CareFlow login page!

---

## Common Issues & Solutions

### Issue: "Module not found" errors

**Solution:** Delete node_modules and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Port 3000 is already in use"

**Solution:** Use a different port:

```bash
npm run dev -- --port 3001
```

### Issue: Environment variables not loading

**Solution:** Make sure `.env.local` is in the root of the project (same folder as `package.json`)

### Issue: Firebase connection errors

**Solution:**

- Check that all Firebase environment variables are correct
- Verify your Firebase project is set up correctly
- Make sure Firebase Authentication and Storage are enabled

### Issue: MongoDB connection errors

**Solution:**

- Check your MongoDB URI is correct
- Make sure your IP is whitelisted in MongoDB Atlas
- Verify the database user has the correct permissions

### Issue: Twilio errors when making calls

**Solution:**

- Verify all Twilio credentials are correct
- Check that your Twilio phone number is active
- Make sure you have a TwiML App configured

---

## Available Scripts

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Start development server with hot reload |
| `npm run build` | Build for production                     |
| `npm start`     | Start production server (after build)    |
| `npm run lint`  | Run ESLint to check code quality         |

---

## Project Structure

```
careflow/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   └── layout.js          # Root layout
├── components/            # React components
│   ├── dashboard/         # Dashboard components
│   └── ProtectedRoute/    # Auth protection
├── lib/                   # Utility libraries
│   ├── firebase.js        # Firebase client config
│   ├── firebaseStorage.js # Firebase Storage helpers
│   └── twilio.js          # Twilio helpers
├── pages/                 # Next.js Pages Router
│   ├── api/               # API routes
│   ├── dashboard.js       # Dashboard page
│   └── index.js           # Home page (phone dialer)
├── .env.local             # Environment variables (local only)
├── .env.local.example     # Example environment file
├── package.json           # Dependencies and scripts
└── README.md              # Project documentation
```

---

## Development Tips

1. **Hot Reload**: The dev server automatically reloads when you save files

2. **API Routes**: Test API routes at http://localhost:3000/api/...
   - Example: http://localhost:3000/api/twilio/token

3. **Environment Changes**: If you modify `.env.local`, restart the dev server

4. **Console Logs**: Check browser console and terminal for errors

5. **Network Tab**: Use browser DevTools Network tab to debug API calls

---

## Testing Features

### Test Authentication:

1. Go to http://localhost:3000
2. Sign up with email/password
3. Log in

### Test Phone Calls:

1. Make sure Twilio credentials are configured
2. Enter a phone number in the dialer
3. Click "Call"

### Test Dashboard:

1. Navigate to http://localhost:3000/dashboard
2. View call analytics and history

---

## Building for Production (Local)

To test the production build locally:

```bash
npm run build
npm start
```

Then open http://localhost:3000

---

## Need Help?

- Check the main README.md
- See FIREBASE_SETUP.md for Firebase configuration
- See DEPLOYMENT.md for deployment information
- Check the browser console for error messages

---

**Happy coding! 🚀**
