# CareFlow

A modern web application for browser-based voice communications with Twilio Voice and WebRTC P2P calling, featuring call recording, analytics, and cloud storage.

![CareFlow Dashboard](public/dashboard-screenshot.png)

## Features

### Calling Modes

- **Twilio Voice Mode**: Traditional PSTN telephony calls to any phone number worldwide
- **WebRTC Mode**: Free peer-to-peer calls between CareFlow users using their unique care4wId

### Core Features

- 🔐 **Secure Authentication**: Firebase Auth with JWT token verification
- 📞 **Browser-based Calling**: Make and receive calls without additional software
- 🎙️ **Call Recording**: Automatic WebRTC call recording with Backblaze B2 cloud storage
- 📊 **Analytics Dashboard**: Call statistics, duration tracking, and usage patterns
- 📱 **Real-time Controls**: Mute, hold, DTMF, and call management
- 📝 **Call History**: Searchable call logs with pagination and filtering
- 🔔 **Push Notifications**: Firebase Cloud Messaging for incoming calls
- 🌙 **Modern UI**: Beautiful, responsive dark-themed interface

## Tech Stack

| Layer          | Technology                              |
| -------------- | --------------------------------------- |
| Framework      | Next.js 14 (App Router)                 |
| UI Library     | React 18                                |
| Styling        | Tailwind CSS                            |
| Authentication | Firebase Auth                           |
| Voice API      | Twilio Programmable Voice               |
| Database       | MongoDB Atlas (Mongoose ODM)            |
| Storage        | Backblaze B2 (S3-compatible)            |
| Real-time      | Firebase Realtime DB (WebRTC signaling) |
| Testing        | Jest (656 tests, 28 test suites)        |
| CI/CD          | GitHub Actions                          |

## Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

| Document                                       | Description                                                     |
| ---------------------------------------------- | --------------------------------------------------------------- |
| [API Documentation](docs/API_DOCUMENTATION.md) | Complete API reference with endpoints, request/response formats |
| [Architecture](docs/ARCHITECTURE.md)           | System architecture, data flow, and component diagrams          |
| [Deployment Guide](docs/DEPLOYMENT.md)         | Step-by-step deployment instructions for all platforms          |

### Additional Documentation

- [Test Documentation](tests/TEST_DOCUMENTATION.md) - Test suite overview and writing guides
- [Technical Documentation](plans/COMPREHENSIVE_TECHNICAL_DOCUMENTATION.md) - In-depth technical analysis

## Quick Start

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Twilio account
- Firebase project
- MongoDB Atlas account
- Backblaze B2 account

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/careflow.git
cd careflow

# Install dependencies
yarn install

# Copy environment template
cp .env.local.example .env.local

# Configure environment variables (see Environment Variables section)

# Start development server
yarn dev
```

Visit `http://localhost:3000` to access the application.

## Environment Variables

### Required Configuration

```env
# Firebase (Client)
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
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/careflow

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

## Testing

### Test Suite Overview

The project includes **535 unit and integration tests** across 25 test suites:

| Test Suite              | Tests | Coverage            |
| ----------------------- | ----- | ------------------- |
| API Response Utilities  | 7     | Lib modules         |
| CareFlow ID Generator   | 7     | ID validation       |
| Webhook Verification    | 11    | Security            |
| Backblaze Storage       | 10    | File operations     |
| Audio Processor         | 16    | Recording           |
| Recording Manager       | 15    | State management    |
| Call Manager            | 31    | Twilio/WebRTC       |
| Models (User/Recording) | 37    | Schema validation   |
| Authentication API      | 10    | Registration/login  |
| Recordings API          | 19    | CRUD operations     |
| WebRTC Manager          | 35    | P2P calling         |
| WebRTC Integration      | 20    | Signaling workflows |
| Components              | 50    | UI logic            |
| Library Integration     | 20    | Config/auth         |
| General API Tests       | 27    | Utilities           |

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test -- tests/lib/callManager.test.js

# Run in watch mode
npm run test:watch

# CI mode (no watch)
npm run test:ci
```

### Coverage Thresholds

| Metric     | Global | Lib Modules | API Endpoints |
| ---------- | ------ | ----------- | ------------- |
| Statements | 70%    | 80%         | 75%           |
| Branches   | 70%    | 80%         | 75%           |
| Functions  | 70%    | 80%         | 75%           |
| Lines      | 70%    | 80%         | 75%           |

## Project Structure

```
careflow/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── calls/        # Call management
│   │   ├── recordings/   # Recording CRUD
│   │   ├── users/        # User lookup
│   │   └── webhooks/     # Twilio webhooks
│   ├── dashboard/       # Protected dashboard
│   ├── login/            # Authentication pages
│   └── signup/
├── components/           # React Components
│   └── dashboard/       # Dashboard UI components
├── lib/                  # Core utilities
│   ├── auth.js          # Authentication helpers
│   ├── backblaze.js     # B2 storage client
│   ├── callManager.js    # Unified call handling
│   ├── db.js            # MongoDB connection
│   └── webrtc.js        # WebRTC peer connection
├── models/              # Mongoose models
│   ├── Recording.js    # Call recording schema
│   └── User.js         # User schema
├── tests/              # Jest test suites
│   ├── api/           # API integration tests
│   ├── components/    # Component tests
│   └── lib/          # Unit tests
├── docs/              # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
└── plans/             # Planning documents
```

## API Overview

### Authentication

| Endpoint             | Method | Description       |
| -------------------- | ------ | ----------------- |
| `/api/auth/register` | POST   | Register new user |
| `/api/auth/login`    | POST   | Authenticate user |
| `/api/auth/logout`   | POST   | Sign out user     |

### Recordings

| Endpoint                 | Method | Description                  |
| ------------------------ | ------ | ---------------------------- |
| `/api/recordings`        | GET    | List recordings with filters |
| `/api/recordings/[id]`   | GET    | Get recording details        |
| `/api/recordings/upload` | POST   | Upload new recording         |
| `/api/recordings/[id]`   | DELETE | Delete recording             |

### Calls

| Endpoint             | Method | Description      |
| -------------------- | ------ | ---------------- |
| `/api/calls/history` | GET    | Get call history |
| `/api/calls/[id]`    | GET    | Get call details |

### Webhooks

| Endpoint                         | Method | Description                  |
| -------------------------------- | ------ | ---------------------------- |
| `/api/webhooks/twilio/voice`     | POST   | Handle incoming Twilio calls |
| `/api/webhooks/twilio/status`    | POST   | Twilio call status updates   |
| `/api/webhooks/twilio/voicemail` | POST   | Voicemail recording webhook  |

See [API Documentation](docs/API_DOCUMENTATION.md) for complete reference.

## Deployment

### Vercel (Recommended)

```bash
# Connect repository to Vercel
vercel --prod

# Or deploy via GitHub integration
# Push to main branch → automatic deployment
```

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

### Docker

```bash
docker build -t careflow .
docker run -p 3000:3000 careflow
```

## Security

- ✅ Firebase Auth with JWT token verification
- ✅ MongoDB injection protection via Mongoose
- ✅ Request validation on all API endpoints
- ✅ Twilio webhook signature verification
- ✅ Environment variables for all secrets
- ✅ HTTPS/TLS enforced in production
- ✅ Rate limiting (100 req/min per user)
- ✅ CORS configuration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Before Submitting

- Run all tests: `npm test`
- Ensure coverage thresholds are met
- Run linting: `npm run lint`
- Add tests for new functionality

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- 📧 Email: support@careflow.app
- 📖 Documentation: [docs/](docs/)
- 🐛 Issues: GitHub Issues
- 💬 Discord: [CareFlow Community](https://discord.gg/careflow)

---

Built with ❤️ using Next.js, Twilio, Firebase, and MongoDB
