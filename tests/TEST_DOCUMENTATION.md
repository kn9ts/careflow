# CareFlow Test Suite Documentation

## Overview

The CareFlow test suite is a comprehensive pure JavaScript testing setup designed for cross-environment compatibility. All tests have been converted from React-dependent tests to pure JavaScript for faster execution and broader compatibility.

## Test Structure

```
tests/
├── setup.js                    # Global test configuration and mocks
├── api/                        # API endpoint tests
│   ├── api.test.js            # API response utilities, user lookup, webhooks
│   ├── auth.test.js           # Authentication validation, error codes
│   └── recordings.test.js    # Recordings CRUD, query building, validation
├── components/                # Component logic tests
│   ├── dashboard.test.js      # Dialer, recording, history, analytics
│   ├── dialPad.test.js        # Phone validation, input handling, DTMF
│   └── protectedRoute.test.js # Auth state, token storage, access control
├── context/                    # Context/state management tests
│   └── authContext.test.js    # Auth state, token management, error codes
├── hooks/                      # Custom hook logic tests
│   ├── useCallManager.test.js # Timer, state transitions, event handlers
│   ├── useCallState.test.js   # Call status, duration, mute, computed values
│   └── useNotifications.test.js # FCM token, permissions, service worker
├── integration/                # Integration flow tests
│   ├── authFlow.test.js       # Login/signup flows, token management
│   └── callFlow.test.js       # Call lifecycle, WebRTC, recording
├── lib/                        # Library unit tests
│   └── apiResponse.test.js    # Response utilities, error handling
├── e2e/                        # Playwright E2E tests (separate config)
│   ├── dashboard.spec.js
│   └── navigation.spec.js
└── TEST_DOCUMENTATION.md      # This file
```

## Validation Utilities

### careFlowIdValidator.js

```javascript
import {
  isValidCare4wId,
  isValidPhoneNumber,
  isValidEmail,
  isValidDisplayName,
} from "@/lib/careFlowIdValidator";

// Validate care4w-XXXXXXX format
isValidCare4wId("care4w-1000001"); // true
isValidCare4wId("invalid"); // false

// Validate E.164 phone format (7-15 digits)
isValidPhoneNumber("+1234567890"); // true
isValidPhoneNumber(""); // true (optional)
isValidPhoneNumber("+1"); // false

// Validate email format
isValidEmail("test@example.com"); // true
isValidEmail("invalid"); // false

// Validate display name (2-50 characters)
isValidDisplayName("John"); // true
isValidDisplayName(""); // false
```

### apiResponse.js

```javascript
import {
  successResponse,
  errorResponse,
  handleAuthResult,
} from "@/lib/apiResponse";

// Success response
successResponse({ data: "test" });
// { success: true, data: "test", message: null, meta: null, timestamp: "..." }

// Error response
errorResponse("Not found", { code: "NOT_FOUND", status: 404 });
// { success: false, error: { message: "Not found", code: "NOT_FOUND", status: 404, ... } }

// Handle auth result
handleAuthResult({ success: true }); // null
handleAuthResult({ success: false, error: "Unauthorized" });
// { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED", status: 401 } }
```

### auth.js

```javascript
import {
  validateRegistrationInput,
  getAuthErrorMessage,
  AUTH_ERROR_CODES,
} from "@/lib/auth";

// Validate registration input
validateRegistrationInput({
  email: "test@example.com",
  displayName: "Test User",
  password: "password123",
});
// { isValid: true, errors: [] }

// Get user-friendly error message
getAuthErrorMessage("auth/user-not-found"); // "No account found with this email"

// Error codes
AUTH_ERROR_CODES.USER_NOT_FOUND; // "auth/user-not-found"
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/api/auth.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Test Coverage

Current coverage thresholds are defined in `jest.config.js`:

| Module           | Statements | Branches | Functions | Lines |
| ---------------- | ---------- | -------- | --------- | ----- |
| Global           | 55%        | 50%      | 60%       | 55%   |
| lib/\*_/_.js     | 60%        | 55%      | 65%       | 60%   |
| models/\*_/_.js  | 65%        | 60%      | 70%       | 65%   |
| context/\*_/_.js | 70%        | 65%      | 75%       | 70%   |
| hooks/\*_/_.js   | 65%        | 60%      | 70%       | 65%   |

## Common Test Patterns

### Pure JavaScript Test Structure

```javascript
describe("Module Name", function () {
  describe("Feature", function () {
    test("should do something", function () {
      // Arrange
      var input = "test";

      // Act
      var result = functionToTest(input);

      // Assert
      expect(result).toBe("expected");
    });
  });
});
```

### Validation Test Pattern

```javascript
describe("Validation", function () {
  test("should validate input format", function () {
    var isValid = function (input) {
      if (!input) return false;
      return /^[pattern]$/.test(input);
    };

    expect(isValid("valid")).toBe(true);
    expect(isValid("")).toBe(false);
    expect(isValid(null)).toBe(false);
  });
});
```

### State Machine Test Pattern

```javascript
describe("State Transitions", function () {
  test("should transition between states correctly", function () {
    var state = { status: "idle" };

    var transition = function (newStatus) {
      var validTransitions = {
        idle: ["connecting", "ready"],
        connecting: ["ringing", "connected", "disconnected"],
      };
      return validTransitions[state.status]?.includes(newStatus);
    };

    expect(transition("connecting")).toBe(true);
    expect(transition("connected")).toBe(false);
  });
});
```

## Mock Configuration

The `setup.js` file provides global mocks for:

- **Next.js Router**: `useRouter`, `usePathname`, `useSearchParams`
- **Firebase Auth**: `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, etc.
- **Firebase Database**: `getDatabase`, `ref`, `set`, `get`, `onValue`
- **Mongoose**: Connection, models, schemas with basic CRUD methods

## Known Limitations

1. **E2E Tests**: Playwright tests require separate execution with `npx playwright test`
2. **Component Tests**: Pure JS logic tests only; actual React component rendering not tested
3. **Integration Tests**: Full API integration tests require running server
4. **Twilio SDK**: Not mocked; requires actual credentials for integration tests

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Descriptive Names**: Use clear test names that describe what is being tested
3. **Single Assertion**: Aim for one main assertion per test
4. **Edge Cases**: Test empty values, null, undefined, and boundary conditions
5. **Pure Functions**: Tests should not have side effects
6. **Fast Execution**: Pure JS tests should complete quickly (<100ms each)

## Recent Changes

### 2024-02-12

- Converted all React-dependent tests to pure JavaScript
- Fixed phone number validation regex (now allows 1-9 as first digit after +)
- Fixed null comparison issues with `!!` operator
- Updated Jest configuration to exclude JSX files from coverage
- Enhanced validation utilities in `careFlowIdValidator.js`
- Added error handling utilities to `auth.js`
- Improved `apiResponse.js` with additional utility functions
