# CareFlow Testing Documentation

## Test Overview

CareFlow has comprehensive test coverage including:

### Unit Tests (Jest)

- **269 tests** across 15 test suites
- Tests for: authentication, API responses, ID validation, webhook verification, and more

### E2E Tests (Playwright)

- Browser-based tests for navigation, authentication, and dashboard features

## Running Tests

```bash
# Run all unit tests
npm test

# Run specific test categories
npm run test:lib        # Library unit tests
npm run test:api        # API integration tests
npm run test:components # Component tests

# Run E2E tests (requires dev server)
npm run test:e2e        # Run Playwright tests
npm run test:e2e:ui     # Run with UI mode
npm run test:e2e:install # Install Playwright browsers
```

## Test Files

### Unit Tests

- `tests/api/auth.test.js` - Authentication API validation
- `tests/api/recordings.test.js` - Recordings API validation
- `tests/lib/apiResponse.test.js` - API response utilities
- `tests/lib/careFlowIdValidator.test.js` - ID format validation
- `tests/lib/webhookVerification.test.js` - Twilio webhook verification
- `tests/lib/backblaze.test.js` - Backblaze B2 storage utilities
- `tests/lib/callManager.test.js` - Call management utilities
- `tests/lib/webrtc.test.js` - WebRTC utilities
- `tests/lib/audioProcessor.test.js` - Audio processing utilities
- `tests/lib/recordingManager.test.js` - Recording management utilities

### E2E Tests

- `tests/e2e/navigation.spec.js` - Page navigation tests
- `tests/e2e/dashboard.spec.js` - Dashboard and recording features

## Test Coverage

### Coverage Goals

- **Unit Tests**: Logic validation and edge case coverage
- **E2E Tests**: Browser-based feature coverage

### Key Test Areas

1. **Authentication**
   - Login form validation
   - Registration form validation
   - Protected route redirects
   - Token handling

2. **API Responses**
   - Success response structure
   - Error response structure
   - Custom status codes
   - Metadata support

3. **ID Validation**
   - CareFlow ID format (`care4w-XXXXXXX`)
   - Invalid format detection
   - Edge cases (null, empty, whitespace)

4. **Webhook Verification**
   - Twilio signature validation
   - URL construction from headers
   - Edge case handling

## CI/CD

Tests run automatically in CI with coverage reporting:

```bash
npm run test:ci  # CI mode with coverage thresholds
```

## Test Setup

See `jest.config.js` and `playwright.config.js` for configuration details.
