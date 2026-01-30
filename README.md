# CareFlow

A modern web application that allows users to make and receive phone calls directly in their browser using Twilio's Voice API.

## Features

- **Browser-based Calling**: Make and receive phone calls without any additional software
- **Call Recording**: Automatic recording of all calls with cloud storage
- **Real-time Controls**: Mute, record, and manage calls during the conversation
- **Call History**: View and manage call recordings
- **Modern UI**: Beautiful, responsive interface with dark theme
- **Secure**: JWT-based authentication and secure API endpoints

## Tech Stack

- **Frontend**: Next.js 15, React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Voice API**: Twilio Programmable Voice
- **Cloud Storage**: Firebase Storage
- **Database**: MongoDB Atlas
- **Authentication**: Firebase Authentication

## Prerequisites

- Node.js 18+
- yarn (or npm, pnpm, bun)
- Twilio account
- Firebase project (for auth and storage)
- Firebase project

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd careflow
   ```

2. **Install dependencies**

   Using yarn:

   ```bash
   yarn install
   ```

   Or using npm:

   ```bash
   npm install
   ```

   Or using pnpm:

   ```bash
   pnpm install
   ```

   Or using bun:

   ```bash
   bun install
   ```

3. **Environment Setup**
   Copy the example environment file and fill in your credentials:

   ```bash
   cp .env.local.example .env.local
   ```

4. **Configure Environment Variables**

   **Twilio Configuration:**
   - `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
   - `TWILIO_PHONE_NUMBER`: Your Twilio phone number
   - `TWILIO_TWIML_APP_SID`: Your Twilio TwiML App SID
   - `TWILIO_API_KEY`: Your Twilio API Key
   - `TWILIO_API_SECRET`: Your Twilio API Secret

   **Firebase Configuration:**
   - `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase API Key
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase Auth Domain
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase Project ID
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Firebase Storage Bucket
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Firebase Messaging Sender ID
   - `NEXT_PUBLIC_FIREBASE_APP_ID`: Firebase App ID
   - `FIREBASE_ADMIN_PROJECT_ID`: Firebase Admin Project ID
   - `FIREBASE_ADMIN_CLIENT_EMAIL`: Firebase Admin Client Email
   - `FIREBASE_ADMIN_PRIVATE_KEY`: Firebase Admin Private Key

   **AWS S3 Configuration:**
   - `AWS_ACCESS_KEY_ID`: AWS Access Key ID
   - `AWS_SECRET_ACCESS_KEY`: AWS Secret Access Key
   - `AWS_REGION`: AWS Region (e.g., us-east-1)
   - `AWS_S3_BUCKET`: S3 Bucket name for recordings

   **Database Configuration:**
   - `MONGODB_URI`: MongoDB Atlas connection string

5. **Twilio Setup**

   **Create a TwiML App:**
   1. Go to Twilio Console → All Products & Services → TwiML Apps
   2. Create a new TwiML App
   3. Set Voice Request URL to: `https://your-domain.com/api/twilio/voice`
   4. Copy the TwiML App SID to your environment variables

   **Configure Phone Number:**
   1. Go to Twilio Console → Phone Numbers → Manage → Active Numbers
   2. Select your phone number
   3. Under Voice & Fax, set:
      - Configure with: Webhooks, TwiML Apps
      - A call comes in: Webhook → `https://your-domain.com/api/twilio/voice`
      - TwiML App: Select your created TwiML App

6. **Start the Development Server**

   Using yarn:

   ```bash
   yarn dev
   ```

   Or using npm:

   ```bash
   npm run dev
   ```

   Or using pnpm:

   ```bash
   pnpm dev
   ```

   Or using bun:

   ```bash
   bun dev
   ```

   The application will be available at `http://localhost:3000`

## Usage

1. **Make a Call**: Enter a phone number and click "Call"
2. **Call Controls**: Use mute and record buttons during the call
3. **View Recordings**: Access your call recordings in the sidebar
4. **Upload Recordings**: Upload external audio files for storage

## API Endpoints

- `GET /api/twilio/token` - Generate Twilio access token
- `POST /api/twilio/voice` - Handle incoming calls (TwiML)
- `GET /api/calls/recordings` - List call recordings
- `POST /api/calls/upload` - Upload external recordings
- `POST /api/calls/webhook` - Handle Twilio webhooks

## Security

- All API endpoints are protected with proper CORS headers
- JWT tokens are used for client authentication
- Environment variables are kept secure on the server side
- Recording URLs are time-limited and signed

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The application can be deployed on any platform that supports Node.js applications. Ensure all environment variables are properly configured.

## Troubleshooting

**Common Issues:**

1. **CORS Errors**: Ensure your domain is properly configured in Twilio settings
2. **Authentication Errors**: Verify all Twilio credentials are correct
3. **Recording Issues**: Check AWS S3 bucket permissions and credentials
4. **Call Quality**: Ensure good internet connection and proper microphone access

**Debug Mode:**
Enable debug logging in Twilio Device by setting `debug: true` in the initialization.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Check the [Twilio Documentation](https://www.twilio.com/docs/voice)
- Review the [Next.js Documentation](https://nextjs.org/docs)
- Create an issue in this repository
