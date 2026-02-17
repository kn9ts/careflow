# Authentication Error Messages Documentation

This document provides a comprehensive reference for all authentication error codes and their corresponding user-facing messages in CareFlow.

## Overview

The authentication error message system provides clear, empathetic, and actionable messages for all authentication-related errors. Each error is mapped to:

- **Title**: A concise, user-friendly heading
- **Description**: A detailed explanation of what happened
- **Action**: Clear guidance on what the user should do next
- **Severity**: The error level (error, warning, info)
- **Category**: The error category for grouping and analytics
- **Icon**: A suggested icon for UI display
- **Help Link**: Optional link to additional help resources

## Usage

### Importing

```javascript
import {
  getAuthErrorMessage,
  getAuthErrorMessageString,
  getAuthErrorShortMessage,
  isAuthErrorRetryable,
  doesAuthErrorRequireUserAction,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
} from '@/lib/authErrorMessages';
```

### Getting Error Details

```javascript
// Get full error object
const errorInfo = getAuthErrorMessage('auth/wrong-password');
console.log(errorInfo.title); // "Incorrect Password"
console.log(errorInfo.description); // Full description
console.log(errorInfo.action); // What to do next

// Get formatted string
const message = getAuthErrorMessageString('auth/wrong-password');
// Returns: description + action

// Get short message for compact UI
const shortMsg = getAuthErrorShortMessage('auth/wrong-password');
// Returns: "Incorrect Password"
```

### Using the React Component

```jsx
import { AuthError, AuthErrorInline, AuthErrorToast } from '@/components/common/AuthError';

// Full error display
<AuthError
  errorCode="auth/wrong-password"
  showAction={true}
  onRetry={handleRetry}
  onDismiss={handleDismiss}
/>

// Inline error for forms
<AuthErrorInline errorCode="auth/invalid-email" />

// Toast notification
<AuthErrorToast
  errorCode="auth/network-request-failed"
  visible={showToast}
  onDismiss={() => setShowToast(false)}
/>
```

## Error Categories

| Category      | Description                  | Examples                            |
| ------------- | ---------------------------- | ----------------------------------- |
| `credentials` | Login credential issues      | Wrong password, user not found      |
| `account`     | Account status issues        | Disabled, deactivated, locked       |
| `token`       | Session and token issues     | Expired token, invalid session      |
| `network`     | Connection problems          | Network failed, timeout             |
| `validation`  | Input validation errors      | Invalid email, weak password        |
| `permission`  | Access control issues        | Admin required, unauthorized        |
| `system`      | System/infrastructure errors | Internal error, service unavailable |

## Severity Levels

| Severity  | Use Case                                   | UI Styling             |
| --------- | ------------------------------------------ | ---------------------- |
| `error`   | Critical issues requiring immediate action | Red/danger styling     |
| `warning` | Important but not blocking issues          | Yellow/warning styling |
| `info`    | Informational guidance                     | Blue/info styling      |

## Complete Error Reference

### Credential Errors

#### `auth/wrong-password`

- **Title**: Incorrect Password
- **Description**: The password you entered doesn't match our records. This can happen if you recently changed your password or if caps lock was on while typing.
- **Action**: Please double-check your password and try again. If you've forgotten your password, use the "Forgot Password" link to reset it.
- **Severity**: Error

#### `auth/invalid-email`

- **Title**: Invalid Email Address
- **Description**: The email address you entered doesn't appear to be valid. Email addresses should follow the format: name@example.com
- **Action**: Please check for typos and ensure your email includes the @ symbol and a valid domain.
- **Severity**: Error

#### `auth/user-not-found`

- **Title**: Account Not Found
- **Description**: We couldn't find an account associated with this email address. This could mean you haven't created an account yet, or you might be using a different email.
- **Action**: Please verify your email address, or create a new account if you haven't registered before.
- **Severity**: Error

#### `auth/invalid-credential`

- **Title**: Invalid Credentials
- **Description**: The email or password you entered is incorrect. For your security, we can't specify which one is wrong.
- **Action**: Please double-check both your email and password. If you're still having trouble, try resetting your password.
- **Severity**: Error

#### `auth/missing-password`

- **Title**: Password Required
- **Description**: You haven't entered a password. A password is required to sign in to your account.
- **Action**: Please enter your password in the password field and try again.
- **Severity**: Error

#### `auth/missing-email`

- **Title**: Email Required
- **Description**: You haven't entered an email address. Your email is required to identify your account.
- **Action**: Please enter the email address associated with your account.
- **Severity**: Error

### Account Status Errors

#### `auth/user-disabled`

- **Title**: Account Disabled
- **Description**: Your account has been disabled by an administrator. This may be due to a policy violation, security concern, or at your request.
- **Action**: Please contact our support team to understand why your account was disabled.
- **Severity**: Error

#### `auth/account-deactivated`

- **Title**: Account Deactivated
- **Description**: Your account has been deactivated. You may have requested this action, or it may have been deactivated due to inactivity.
- **Action**: To reactivate your account, please contact our support team.
- **Severity**: Error

#### `auth/too-many-requests`

- **Title**: Too Many Attempts
- **Description**: You've made too many sign-in attempts in a short period. For your security, we've temporarily locked access.
- **Action**: Please wait a few minutes before trying again. If this wasn't you, consider resetting your password.
- **Severity**: Warning

### Registration Errors

#### `auth/email-already-in-use`

- **Title**: Email Already Registered
- **Description**: An account with this email address already exists. You may have registered previously.
- **Action**: Try signing in with your existing account instead. If you've forgotten your password, use "Forgot Password".
- **Severity**: Error

#### `auth/weak-password`

- **Title**: Password Too Weak
- **Description**: Your password doesn't meet our security requirements. Weak passwords are easier for attackers to guess.
- **Action**: Please create a stronger password with at least 6 characters. Mix uppercase, lowercase, numbers, and symbols.
- **Severity**: Error

#### `auth/operation-not-allowed`

- **Title**: Sign-Up Not Available
- **Description**: New account registration is currently not available. This may be temporary or a permanent policy change.
- **Action**: Please contact our support team if you need to create an account.
- **Severity**: Error

### Token & Session Errors

#### `auth/expired-action-code`

- **Title**: Link Expired
- **Description**: The link you clicked has expired. Password reset and verification links are only valid for a limited time.
- **Action**: Please request a new link and use it promptly.
- **Severity**: Error

#### `auth/invalid-action-code`

- **Title**: Invalid Link
- **Description**: This link is invalid or has already been used. Password reset and verification links can only be used once.
- **Action**: Please request a new link if you need to reset your password or verify your email.
- **Severity**: Error

#### `auth/expired-token`

- **Title**: Session Expired
- **Description**: Your login session has expired due to inactivity or time limits. This is a security feature.
- **Action**: Please sign in again to continue.
- **Severity**: Info

#### `auth/invalid-token`

- **Title**: Invalid Session
- **Description**: Your session token is invalid. This can happen if you signed in from another location.
- **Action**: Please sign in again to establish a new session.
- **Severity**: Error

#### `auth/requires-recent-login`

- **Title**: Please Sign In Again
- **Description**: This action requires you to have signed in recently. For security, certain actions need fresh authentication.
- **Action**: Please sign out and sign back in, then try this action again.
- **Severity**: Warning

### Network & Connection Errors

#### `auth/network-request-failed`

- **Title**: Connection Problem
- **Description**: We couldn't reach our servers. This is usually due to a poor internet connection or network restrictions.
- **Action**: Please check your internet connection and try again. Try switching networks if possible.
- **Severity**: Warning

#### `auth/timeout`

- **Title**: Request Timed Out
- **Description**: The request took too long to complete. This can happen with slow connections or high server load.
- **Action**: Please check your connection and try again. Wait a few minutes if the problem persists.
- **Severity**: Warning

#### `auth/service-unavailable`

- **Title**: Service Temporarily Unavailable
- **Description**: Our authentication service is temporarily unavailable due to maintenance or technical issues.
- **Action**: Please wait a few minutes and try again. Check our status page for updates.
- **Severity**: Warning

### Permission & Access Errors

#### `auth/admin-restricted-operation`

- **Title**: Admin Action Required
- **Description**: This operation is restricted to administrators only.
- **Action**: If you believe you should have access, please contact your administrator.
- **Severity**: Error

#### `auth/insufficient-permission`

- **Title**: Permission Denied
- **Description**: You don't have permission to perform this action.
- **Action**: Please contact your administrator if you need access to this feature.
- **Severity**: Error

### MFA & Security Errors

#### `auth/multi-factor-auth-required`

- **Title**: Two-Factor Authentication Required
- **Description**: Your account has two-factor authentication enabled. You need to provide a second verification.
- **Action**: Please check your authenticator app or SMS for the verification code.
- **Severity**: Info

#### `auth/multi-factor-auth-failed`

- **Title**: Two-Factor Authentication Failed
- **Description**: The verification code you entered is incorrect or has expired.
- **Action**: Please make sure your device's time is correct and try entering a fresh code.
- **Severity**: Error

### System Errors

#### `auth/internal-error`

- **Title**: Something Went Wrong
- **Description**: An unexpected error occurred on our end. This isn't your fault.
- **Action**: Please try again in a few moments. Contact support if the problem persists.
- **Severity**: Error

#### `auth/unknown-error`

- **Title**: Unexpected Error
- **Description**: An unexpected error occurred. Our team has been notified.
- **Action**: Please try again. Contact support if the problem persists.
- **Severity**: Error

### Custom Application Errors

#### `auth/not-authenticated`

- **Title**: Not Signed In
- **Description**: You need to be signed in to access this feature.
- **Action**: Please sign in to your account to continue.
- **Severity**: Info

#### `auth/admin-access-required`

- **Title**: Admin Access Required
- **Description**: This feature is only available to administrators.
- **Action**: If you need access, please contact your system administrator.
- **Severity**: Error

#### `auth/password-mismatch`

- **Title**: Passwords Don't Match
- **Description**: The password and confirmation password you entered don't match.
- **Action**: Please make sure both password fields contain the same password.
- **Severity**: Error

## HTTP Status Code Mapping

| Error Code                    | HTTP Status |
| ----------------------------- | ----------- |
| `auth/user-not-found`         | 404         |
| `auth/wrong-password`         | 401         |
| `auth/invalid-email`          | 400         |
| `auth/email-already-in-use`   | 409         |
| `auth/weak-password`          | 400         |
| `auth/user-disabled`          | 403         |
| `auth/operation-not-allowed`  | 403         |
| `auth/too-many-requests`      | 429         |
| `auth/expired-action-code`    | 410         |
| `auth/invalid-action-code`    | 400         |
| `auth/network-request-failed` | 503         |
| `auth/service-unavailable`    | 503         |
| `auth/internal-error`         | 500         |

## Utility Functions

### `isAuthErrorRetryable(code)`

Returns `true` if the error is transient and the user can try again.

```javascript
if (isAuthErrorRetryable(errorCode)) {
  // Show retry button
}
```

### `doesAuthErrorRequireUserAction(code)`

Returns `true` if the error requires the user to take specific action (not just retry).

```javascript
if (doesAuthErrorRequireUserAction(errorCode)) {
  // Highlight the relevant form field or show detailed instructions
}
```

### `getAuthErrorHttpStatus(code)`

Returns the recommended HTTP status code for an error.

```javascript
const status = getAuthErrorHttpStatus('auth/user-not-found'); // 404
```

## Best Practices

1. **Always use the helper functions** rather than hardcoding error messages
2. **Use the AuthError component** for consistent UI presentation
3. **Log error codes** for debugging and analytics
4. **Provide retry options** for retryable errors
5. **Include help links** when available for complex issues
6. **Match severity to UI styling** for visual consistency

## Adding New Errors

To add a new error message, edit `lib/authErrorMessages.js`:

```javascript
'auth/new-error-code': {
  code: 'auth/new-error-code',
  title: 'Error Title',
  description: 'Detailed description of what happened.',
  action: 'Clear guidance on what to do next.',
  severity: ERROR_SEVERITY.ERROR, // or WARNING, INFO
  category: ERROR_CATEGORIES.VALIDATION, // appropriate category
  icon: 'alert-circle', // icon name
  helpLink: '/support', // or null
},
```

## File Locations

- **Error Messages**: `lib/authErrorMessages.js`
- **React Component**: `components/common/AuthError/AuthError.jsx`
- **Component Styles**: `components/common/AuthError/AuthError.module.css`
- **Component Index**: `components/common/AuthError/index.js`
- **Common Exports**: `components/common/index.js`
