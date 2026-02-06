# CareFlow Test Documentation

## Test Suite Overview

This document describes the comprehensive test suite for the CareFlow application, covering authentication, API endpoints, WebRTC fallback, Backblaze B2 storage, and UI components.

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/api/api.test.js

# Run in watch mode
npm test -- --watch
```

## Test Structure

```
tests/
├── setup.js                 # Global test setup and mocks
├── api/
│   └── api.test.js          # API endpoint tests
└── lib/
    ├── library.test.js      # Library module tests
    ├── webrtc.test.js       # WebRTC manager tests
    └── callManager.test.js  # CallManager tests
```

## Test Coverage

### API Endpoints (`tests/api/api.test.js`)

| Endpoint             | Method | Description             | Status |
| -------------------- | ------ | ----------------------- | ------ |
| `/api/auth/register` | POST   | User registration       | ✓      |
| `/api/auth/login`    | POST   | User login              | ✓      |
| `/api/calls/history` | GET    | Retrieve call history   | ✓      |
| `/api/analytics`     | GET    | Analytics data          | ✓      |
| `/api/users/lookup`  | GET    | User lookup by care4wId | ✓      |

### Library Modules (`tests/lib/library.test.js`)

| Module                | Tests                        | Status |
| --------------------- | ---------------------------- | ------ |
| `careFlowIdGenerator` | Generate/validate care4w IDs | ✓      |
| `backblaze.js`        | Storage configuration        | ✓      |
| `apiResponse.js`      | Response utilities           | ✓      |
| `env.config.js`       | Configuration schema         | ✓      |

### WebRTC Tests (`tests/lib/webrtc.test.js`)

| Feature           | Description                 | Status |
| ----------------- | --------------------------- | ------ |
| Peer Connection   | ICE server configuration    | ✓      |
| Signaling         | Offer/Answer/ICE messages   | ✓      |
| Connection States | Connection state management | ✓      |
| Media Constraints | Audio/video settings        | ✓      |
| Data Channels     | Peer-to-peer data transfer  | ✓      |

## Test Utilities

### Mock Data Generators

Located in `tests/setup.js`:

```javascript
// Create mock user
createMockUser({
  displayName: "Test User",
  email: "test@example.com",
  care4wId: "care4w-1000001",
});

// Create mock recording
createMockRecording({
  duration: 120,
  callId: "CA123456",
});

// Create API response
createApiResponse({ success: true, data: {} });
```

### Firebase Mocks

The test setup includes comprehensive Firebase mocking:

- `initializeApp` - Mock Firebase app initialization
- `getAuth` - Mock authentication module
- `signInWithEmailAndPassword` - Mock sign-in
- `createUserWithEmailAndPassword` - Mock registration
- `signOut` - Mock sign-out
- `onAuthStateChanged` - Mock auth state changes

### Environment Mocking

Tests use Jest's environment mocking to simulate different configurations:

- `process.env` variables for configuration
- Development/Production mode detection
- Missing required environment variables

## Writing New Tests

### API Endpoint Tests

```javascript
describe("Endpoint Name", () => {
  let routeHandler;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Mock dependencies
    jest.doMock("../../lib/auth.js", () => ({
      requireAuth: jest.fn().mockResolvedValue({
        success: true,
        user: createMockUser(),
      }),
    }));

    routeHandler = (await import("../../app/api/endpoint/route.js")).POST;
  });

  test("should handle valid request", async () => {
    const request = new Request("http://localhost:3000/api/endpoint", {
      method: "POST",
      body: JSON.stringify({ data: "test" }),
    });

    const response = await routeHandler(request);
    expect(response.status).toBe(200);
  });
});
```

### Library Module Tests

```javascript
describe("Module Name", () => {
  let module;

  beforeEach(async () => {
    module = await import("../../lib/module.js");
  });

  test("should export expected functions", () => {
    expect(typeof module.functionName).toBe("function");
  });
});
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm install
      - run: npm test
        env:
          CI: true
```

## Coverage Requirements

- **Statements**: > 70%
- **Branches**: > 60%
- **Functions**: > 70%
- **Lines**: > 70%

## Troubleshooting

### Common Issues

1. **Module caching**: Use `jest.resetModules()` between tests
2. **Firebase initialization errors**: Ensure mocks are set up before import
3. **Environment variables**: Set required vars in test setup
4. **Async timing**: Use `async/await` properly with Jest

### Debug Mode

```bash
# Run with verbose output
npm test -- --verbose

# Run single test
npm test -- --testNamePattern="should return"
```

## Mock Reference

### Firebase Admin Mock

```javascript
{
  auth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: "test-uid" }),
    createCustomToken: jest.fn().mockResolvedValue("custom-token"),
    getUser: jest.fn().mockResolvedValue({ uid: "test-uid" }),
  },
}
```

### MongoDB Mock

```javascript
{
  connectDB: jest.fn().mockResolvedValue({}),
  models: {
    User: { findOne: jest.fn(), create: jest.fn() },
    Recording: { find: jest.fn(), create: jest.fn() },
  },
}
```

### Twilio Mock

```javascript
{
  twilioClient: {
    calls: {
      create: jest.fn().mockResolvedValue({ sid: "CA123" }),
    },
    recordings: {
      create: jest.fn().mockResolvedValue({ sid: "RE123" }),
    },
  },
}
```

## Performance Testing

Load testing endpoints with `k6`:

```javascript
// script.js
import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  vus: 10,
  duration: "30s",
};

export default function () {
  let res = http.get("http://localhost:3000/api/calls/history");
  check(res, {
    "status is 200": (r) => r.status === 200,
    "has data": (r) => JSON.parse(r.body).calls,
  });
  sleep(1);
}
```

## Security Testing

### Authentication Tests

- Invalid token handling
- Expired token handling
- Missing authorization header
- Insufficient permissions

### Input Validation Tests

- SQL injection attempts
- XSS payloads
- Invalid data types
- Missing required fields

---

Last updated: February 2026
CareFlow v1.0.0
