/**
 * Authentication Error Messages
 *
 * A comprehensive mapping of standard authentication error codes and exceptions
 * to clear, empathetic, and actionable user-facing messages.
 *
 * Each error scenario provides:
 * - A concise title for quick recognition
 * - A detailed description that guides the user toward resolution
 * - Suggested actions the user can take
 */

/**
 * Error severity levels for UI styling
 */
export const ERROR_SEVERITY = {
  ERROR: 'error', // Critical - requires immediate action
  WARNING: 'warning', // Important but not blocking
  INFO: 'info', // Informational guidance
};

/**
 * Error categories for grouping and analytics
 */
export const ERROR_CATEGORIES = {
  CREDENTIALS: 'credentials',
  ACCOUNT: 'account',
  TOKEN: 'token',
  NETWORK: 'network',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  SYSTEM: 'system',
};

/**
 * Comprehensive authentication error message mapping
 *
 * Structure for each error:
 * {
 *   code: string           - The error code identifier
 *   title: string          - Concise, user-friendly title
 *   description: string    - Detailed explanation of what happened
 *   action: string         - Clear guidance on what to do next
 *   severity: string       - Error severity level
 *   category: string       - Error category for grouping
 *   icon: string           - Suggested icon name for UI
 *   helpLink: string|null  - Optional link to help documentation
 * }
 */
export const AUTH_ERROR_MESSAGES = {
  // ============================================
  // CREDENTIAL ERRORS
  // ============================================

  'auth/wrong-password': {
    code: 'auth/wrong-password',
    title: 'Incorrect Password',
    description:
      "The password you entered doesn't match our records. This can happen if you recently changed your password or if caps lock was on while typing.",
    action:
      'Please double-check your password and try again. If you\'ve forgotten your password, use the "Forgot Password" link to reset it.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.CREDENTIALS,
    icon: 'key',
    helpLink: null,
  },

  'auth/invalid-email': {
    code: 'auth/invalid-email',
    title: 'Invalid Email Address',
    description:
      "The email address you entered doesn't appear to be valid. Email addresses should follow the format: name@example.com",
    action:
      'Please check for typos and ensure your email includes the @ symbol and a valid domain (like gmail.com or outlook.com).',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.VALIDATION,
    icon: 'mail',
    helpLink: null,
  },

  'auth/user-not-found': {
    code: 'auth/user-not-found',
    title: 'Account Not Found',
    description:
      "We couldn't find an account associated with this email address. This could mean you haven't created an account yet, or you might be using a different email than the one you registered with.",
    action:
      "Please verify your email address, or create a new account if you haven't registered before.",
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.CREDENTIALS,
    icon: 'user-x',
    helpLink: null,
  },

  'auth/invalid-credential': {
    code: 'auth/invalid-credential',
    title: 'Invalid Credentials',
    description:
      "The email or password you entered is incorrect. For your security, we can't specify which one is wrong.",
    action:
      'Please double-check both your email and password. If you\'re still having trouble, try resetting your password using the "Forgot Password" link.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.CREDENTIALS,
    icon: 'shield-alert',
    helpLink: null,
  },

  'auth/missing-password': {
    code: 'auth/missing-password',
    title: 'Password Required',
    description:
      "You haven't entered a password. A password is required to sign in to your account.",
    action: 'Please enter your password in the password field and try again.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.VALIDATION,
    icon: 'key',
    helpLink: null,
  },

  'auth/missing-email': {
    code: 'auth/missing-email',
    title: 'Email Required',
    description:
      "You haven't entered an email address. Your email is required to identify your account.",
    action: 'Please enter the email address associated with your account.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.VALIDATION,
    icon: 'mail',
    helpLink: null,
  },

  // ============================================
  // ACCOUNT STATUS ERRORS
  // ============================================

  'auth/user-disabled': {
    code: 'auth/user-disabled',
    title: 'Account Disabled',
    description:
      'Your account has been disabled by an administrator. This may be due to a policy violation, security concern, or at your request.',
    action:
      'Please contact our support team to understand why your account was disabled and what steps you can take to restore access.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.ACCOUNT,
    icon: 'user-x',
    helpLink: '/support',
  },

  'auth/account-deactivated': {
    code: 'auth/account-deactivated',
    title: 'Account Deactivated',
    description:
      'Your account has been deactivated. You may have requested this action, or it may have been deactivated due to inactivity.',
    action:
      'To reactivate your account, please contact our support team or follow the reactivation instructions sent to your email.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.ACCOUNT,
    icon: 'user-x',
    helpLink: '/support',
  },

  'auth/too-many-requests': {
    code: 'auth/too-many-requests',
    title: 'Too Many Attempts',
    description:
      "You've made too many sign-in attempts in a short period. For your security, we've temporarily locked access to prevent unauthorized access.",
    action:
      "Please wait a few minutes before trying again. If this wasn't you, consider resetting your password to secure your account.",
    severity: ERROR_SEVERITY.WARNING,
    category: ERROR_CATEGORIES.ACCOUNT,
    icon: 'clock',
    helpLink: null,
  },

  // ============================================
  // REGISTRATION ERRORS
  // ============================================

  'auth/email-already-in-use': {
    code: 'auth/email-already-in-use',
    title: 'Email Already Registered',
    description:
      'An account with this email address already exists. You may have registered previously with this email.',
    action:
      'Try signing in with your existing account instead. If you\'ve forgotten your password, use the "Forgot Password" link to recover access.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.ACCOUNT,
    icon: 'mail',
    helpLink: null,
  },

  'auth/weak-password': {
    code: 'auth/weak-password',
    title: 'Password Too Weak',
    description:
      "Your password doesn't meet our security requirements. Weak passwords are easier for attackers to guess or crack.",
    action:
      'Please create a stronger password with at least 6 characters. For best security, use a mix of uppercase and lowercase letters, numbers, and special characters.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.VALIDATION,
    icon: 'shield',
    helpLink: null,
  },

  'auth/operation-not-allowed': {
    code: 'auth/operation-not-allowed',
    title: 'Sign-Up Not Available',
    description:
      'New account registration is currently not available. This may be temporary due to maintenance or a permanent policy change.',
    action: 'Please contact our support team if you need to create an account, or try again later.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.PERMISSION,
    icon: 'lock',
    helpLink: '/support',
  },

  'auth/uid-already-exists': {
    code: 'auth/uid-already-exists',
    title: 'Account Already Exists',
    description: 'An account with this identifier already exists in our system.',
    action:
      'Please try signing in with your existing credentials instead of creating a new account.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.ACCOUNT,
    icon: 'user',
    helpLink: null,
  },

  // ============================================
  // TOKEN & SESSION ERRORS
  // ============================================

  'auth/expired-action-code': {
    code: 'auth/expired-action-code',
    title: 'Link Expired',
    description:
      'The link you clicked has expired. Password reset and email verification links are only valid for a limited time for security reasons.',
    action:
      "Please request a new link and use it promptly. Check your spam folder if you don't receive the email within a few minutes.",
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.TOKEN,
    icon: 'clock',
    helpLink: null,
  },

  'auth/invalid-action-code': {
    code: 'auth/invalid-action-code',
    title: 'Invalid Link',
    description:
      'This link is invalid or has already been used. Password reset and verification links can only be used once.',
    action: 'Please request a new link if you need to reset your password or verify your email.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.TOKEN,
    icon: 'link-x',
    helpLink: null,
  },

  'auth/expired-token': {
    code: 'auth/expired-token',
    title: 'Session Expired',
    description:
      'Your login session has expired due to inactivity or time limits. This is a security feature to protect your account.',
    action:
      'Please sign in again to continue. If you were working on something important, your data may need to be re-entered.',
    severity: ERROR_SEVERITY.INFO,
    category: ERROR_CATEGORIES.TOKEN,
    icon: 'clock',
    helpLink: null,
  },

  'auth/invalid-token': {
    code: 'auth/invalid-token',
    title: 'Invalid Session',
    description:
      'Your session token is invalid. This can happen if you signed in from another location or if there was a system issue.',
    action:
      'Please sign in again to establish a new session. If the problem persists, try clearing your browser cache.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.TOKEN,
    icon: 'shield-x',
    helpLink: null,
  },

  'auth/requires-recent-login': {
    code: 'auth/requires-recent-login',
    title: 'Please Sign In Again',
    description:
      'This action requires you to have signed in recently. For security, certain sensitive actions need fresh authentication.',
    action:
      "Please sign out and sign back in, then try this action again. This helps us ensure it's really you making changes to your account.",
    severity: ERROR_SEVERITY.WARNING,
    category: ERROR_CATEGORIES.TOKEN,
    icon: 'log-in',
    helpLink: null,
  },

  'auth/id-token-expired': {
    code: 'auth/id-token-expired',
    title: 'Authentication Expired',
    description:
      'Your authentication token has expired. This happens automatically after a period of time for security.',
    action: 'Please refresh the page or sign in again to continue using the application.',
    severity: ERROR_SEVERITY.INFO,
    category: ERROR_CATEGORIES.TOKEN,
    icon: 'refresh-cw',
    helpLink: null,
  },

  'auth/id-token-revoked': {
    code: 'auth/id-token-revoked',
    title: 'Session Revoked',
    description:
      'Your session has been revoked. This can happen if you changed your password, signed out from another device, or an administrator terminated your session.',
    action: 'Please sign in again to establish a new session.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.TOKEN,
    icon: 'shield-off',
    helpLink: null,
  },

  // ============================================
  // PASSWORD RESET ERRORS
  // ============================================

  'auth/invalid-verification-code': {
    code: 'auth/invalid-verification-code',
    title: 'Invalid Verification Code',
    description:
      'The verification code you entered is incorrect. This can happen if you typed it wrong or if it expired.',
    action:
      "Please check the code and try again. If you're having trouble, request a new verification code.",
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.VALIDATION,
    icon: 'hash',
    helpLink: null,
  },

  'auth/invalid-continue-uri': {
    code: 'auth/invalid-continue-uri',
    title: 'Invalid Redirect',
    description:
      'There was a problem with the redirect URL. The continue URL provided is not valid or not whitelisted.',
    action:
      'Please try the action again from the beginning. If the problem persists, contact support.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.SYSTEM,
    icon: 'link-x',
    helpLink: '/support',
  },

  'auth/unauthorized-continue-uri': {
    code: 'auth/unauthorized-continue-uri',
    title: 'Unauthorized Redirect',
    description:
      'The redirect URL is not authorized. This is a security measure to prevent phishing attacks.',
    action: 'Please try accessing the application through the official website or app.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.PERMISSION,
    icon: 'shield-alert',
    helpLink: null,
  },

  // ============================================
  // NETWORK & CONNECTION ERRORS
  // ============================================

  'auth/network-request-failed': {
    code: 'auth/network-request-failed',
    title: 'Connection Problem',
    description:
      "We couldn't reach our servers. This is usually due to a poor internet connection, network restrictions, or temporary service issues.",
    action:
      "Please check your internet connection and try again. If you're on a corporate or public network, certain ports might be blocked. Try switching to a different network if possible.",
    severity: ERROR_SEVERITY.WARNING,
    category: ERROR_CATEGORIES.NETWORK,
    icon: 'wifi-off',
    helpLink: null,
  },

  'auth/timeout': {
    code: 'auth/timeout',
    title: 'Request Timed Out',
    description:
      'The request took too long to complete. This can happen with slow internet connections or when our servers are experiencing high load.',
    action:
      'Please check your connection and try again. If the problem persists, wait a few minutes before retrying.',
    severity: ERROR_SEVERITY.WARNING,
    category: ERROR_CATEGORIES.NETWORK,
    icon: 'clock',
    helpLink: null,
  },

  'auth/service-unavailable': {
    code: 'auth/service-unavailable',
    title: 'Service Temporarily Unavailable',
    description:
      'Our authentication service is temporarily unavailable. This is usually due to maintenance or unexpected technical issues.',
    action:
      "Please wait a few minutes and try again. We're working to restore service as quickly as possible. Check our status page for updates.",
    severity: ERROR_SEVERITY.WARNING,
    category: ERROR_CATEGORIES.SYSTEM,
    icon: 'server-off',
    helpLink: '/status',
  },

  // ============================================
  // PERMISSION & ACCESS ERRORS
  // ============================================

  'auth/admin-restricted-operation': {
    code: 'auth/admin-restricted-operation',
    title: 'Admin Action Required',
    description:
      "This operation is restricted to administrators only. You don't have the necessary permissions to perform this action.",
    action:
      'If you believe you should have access, please contact your administrator to request the appropriate permissions.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.PERMISSION,
    icon: 'lock',
    helpLink: null,
  },

  'auth/insufficient-permission': {
    code: 'auth/insufficient-permission',
    title: 'Permission Denied',
    description:
      "You don't have permission to perform this action. Your account may not have the required role or privileges.",
    action: 'Please contact your administrator if you need access to this feature.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.PERMISSION,
    icon: 'shield-off',
    helpLink: null,
  },

  'auth/unauthorized-domain': {
    code: 'auth/unauthorized-domain',
    title: 'Domain Not Authorized',
    description:
      'This website is not authorized to use our authentication service. This is a security measure to prevent unauthorized access.',
    action:
      "If you're trying to access the official application, please use the correct website address. If you believe this is an error, contact support.",
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.PERMISSION,
    icon: 'globe',
    helpLink: '/support',
  },

  // ============================================
  // MFA & SECURITY ERRORS
  // ============================================

  'auth/multi-factor-auth-required': {
    code: 'auth/multi-factor-auth-required',
    title: 'Two-Factor Authentication Required',
    description:
      'Your account has two-factor authentication enabled. You need to provide a second form of verification to sign in.',
    action:
      'Please check your authenticator app or SMS for the verification code and enter it to complete sign-in.',
    severity: ERROR_SEVERITY.INFO,
    category: ERROR_CATEGORIES.ACCOUNT,
    icon: 'shield-check',
    helpLink: null,
  },

  'auth/multi-factor-auth-failed': {
    code: 'auth/multi-factor-auth-failed',
    title: 'Two-Factor Authentication Failed',
    description:
      'The verification code you entered is incorrect or has expired. Two-factor codes are time-sensitive.',
    action:
      "Please make sure your device's time is correct and try entering a fresh code from your authenticator app.",
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.ACCOUNT,
    icon: 'shield-x',
    helpLink: null,
  },

  'auth/second-factor-already-in-use': {
    code: 'auth/second-factor-already-in-use',
    title: 'Second Factor Already Enrolled',
    description:
      "This second factor is already enrolled on your account. You can't add the same factor twice.",
    action:
      'If you want to update your second factor, remove the existing one first, then add the new one.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.ACCOUNT,
    icon: 'shield',
    helpLink: null,
  },

  'auth/second-factor-limit-exceeded': {
    code: 'auth/second-factor-limit-exceeded',
    title: 'Too Many Second Factors',
    description: "You've reached the maximum number of second factors allowed on your account.",
    action: 'Please remove an existing second factor before adding a new one.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.ACCOUNT,
    icon: 'shield',
    helpLink: null,
  },

  // ============================================
  // EMAIL VERIFICATION ERRORS
  // ============================================

  'auth/email-not-verified': {
    code: 'auth/email-not-verified',
    title: 'Email Not Verified',
    description:
      "Your email address hasn't been verified yet. Some features require email verification for security.",
    action:
      'Please check your inbox for the verification email and click the link. You can request a new verification email if needed.',
    severity: ERROR_SEVERITY.WARNING,
    category: ERROR_CATEGORIES.ACCOUNT,
    icon: 'mail',
    helpLink: null,
  },

  'auth/verification-throttle': {
    code: 'auth/verification-throttle',
    title: 'Too Many Verification Emails',
    description:
      "You've requested too many verification emails recently. Please wait before requesting another.",
    action:
      "Please wait a few minutes before requesting a new verification email. Check your spam folder if you haven't received previous emails.",
    severity: ERROR_SEVERITY.WARNING,
    category: ERROR_CATEGORIES.ACCOUNT,
    icon: 'clock',
    helpLink: null,
  },

  // ============================================
  // SYSTEM ERRORS
  // ============================================

  'auth/internal-error': {
    code: 'auth/internal-error',
    title: 'Something Went Wrong',
    description:
      "An unexpected error occurred on our end. This isn't your fault - something went wrong with our systems.",
    action:
      'Please try again in a few moments. If the problem persists, contact our support team with details about what you were trying to do.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.SYSTEM,
    icon: 'alert-triangle',
    helpLink: '/support',
  },

  'auth/unknown-error': {
    code: 'auth/unknown-error',
    title: 'Unexpected Error',
    description:
      "An unexpected error occurred. We're not sure what happened, but our team has been notified.",
    action:
      'Please try again. If the problem persists, contact support and describe what you were doing when the error occurred.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.SYSTEM,
    icon: 'help-circle',
    helpLink: '/support',
  },

  'auth/app-deleted': {
    code: 'auth/app-deleted',
    title: 'Application Not Found',
    description:
      "The authentication service couldn't find the application. This is a configuration issue.",
    action: "Please contact support if you're trying to access a legitimate application.",
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.SYSTEM,
    icon: 'alert-circle',
    helpLink: '/support',
  },

  'auth/app-not-authorized': {
    code: 'auth/app-not-authorized',
    title: 'App Not Authorized',
    description:
      'This application is not authorized to use Firebase Authentication. Please verify app configuration in the Firebase Console.',
    action:
      'This is a configuration issue that needs to be resolved by the application owner. Please contact support.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.SYSTEM,
    icon: 'lock',
    helpLink: '/support',
  },

  'auth/argument-error': {
    code: 'auth/argument-error',
    title: 'Invalid Request',
    description: 'The request contained invalid arguments. This is usually a technical issue.',
    action:
      'Please try again. If the problem persists, try refreshing the page or clearing your browser cache.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.VALIDATION,
    icon: 'alert-circle',
    helpLink: null,
  },

  'auth/invalid-api-key': {
    code: 'auth/invalid-api-key',
    title: 'Configuration Error',
    description:
      'The application has an invalid API key configuration. This prevents authentication from working.',
    action:
      'This is a technical issue that needs to be resolved by the application owner. Please contact support.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.SYSTEM,
    icon: 'key',
    helpLink: '/support',
  },

  // ============================================
  // CUSTOM APPLICATION ERRORS
  // ============================================

  'auth/not-authenticated': {
    code: 'auth/not-authenticated',
    title: 'Not Signed In',
    description:
      "You need to be signed in to access this feature. Your session may have expired or you haven't signed in yet.",
    action: 'Please sign in to your account to continue.',
    severity: ERROR_SEVERITY.INFO,
    category: ERROR_CATEGORIES.CREDENTIALS,
    icon: 'log-in',
    helpLink: null,
  },

  'auth/admin-access-required': {
    code: 'auth/admin-access-required',
    title: 'Admin Access Required',
    description:
      "This feature is only available to administrators. Your account doesn't have admin privileges.",
    action: 'If you need access to this feature, please contact your system administrator.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.PERMISSION,
    icon: 'shield',
    helpLink: null,
  },

  'auth/user-not-in-database': {
    code: 'auth/user-not-in-database',
    title: 'Profile Not Found',
    description:
      "Your authentication was successful, but we couldn't find your user profile in our database.",
    action:
      'This may be a temporary issue. Please try signing out and signing back in. If the problem persists, contact support.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.SYSTEM,
    icon: 'user-x',
    helpLink: '/support',
  },

  'auth/firebase-not-configured': {
    code: 'auth/firebase-not-configured',
    title: 'Authentication Not Available',
    description:
      'The authentication service is not properly configured. This prevents sign-in from working.',
    action: 'This is a technical issue. Please contact support or try again later.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.SYSTEM,
    icon: 'settings',
    helpLink: '/support',
  },

  'auth/session-initialization-failed': {
    code: 'auth/session-initialization-failed',
    title: 'Session Setup Failed',
    description:
      "We couldn't set up your session. This can happen due to browser settings or network issues.",
    action:
      'Please make sure cookies are enabled, try clearing your browser cache, and attempt to sign in again.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.SYSTEM,
    icon: 'settings',
    helpLink: null,
  },

  'auth/password-mismatch': {
    code: 'auth/password-mismatch',
    title: "Passwords Don't Match",
    description: "The password and confirmation password you entered don't match.",
    action: 'Please make sure both password fields contain the same password.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.VALIDATION,
    icon: 'key',
    helpLink: null,
  },

  'auth/display-name-required': {
    code: 'auth/display-name-required',
    title: 'Name Required',
    description: 'Please provide your display name. This helps identify you in the application.',
    action: 'Enter your name in the display name field and try again.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.VALIDATION,
    icon: 'user',
    helpLink: null,
  },

  'auth/password-too-short': {
    code: 'auth/password-too-short',
    title: 'Password Too Short',
    description:
      'Your password is too short. Short passwords are easier to crack and put your account at risk.',
    action:
      'Please use a password with at least 6 characters. For better security, consider using a longer password with a mix of letters, numbers, and symbols.',
    severity: ERROR_SEVERITY.ERROR,
    category: ERROR_CATEGORIES.VALIDATION,
    icon: 'key',
    helpLink: null,
  },
};

/**
 * Default error message for unknown error codes
 */
export const DEFAULT_AUTH_ERROR = {
  code: 'auth/unknown',
  title: 'Authentication Error',
  description:
    "An authentication error occurred. We're not sure what happened, but please try again.",
  action: 'If the problem persists, please contact our support team for assistance.',
  severity: ERROR_SEVERITY.ERROR,
  category: ERROR_CATEGORIES.SYSTEM,
  icon: 'alert-circle',
  helpLink: '/support',
};

/**
 * Get a formatted error message object for a given error code
 *
 * @param {string} code - The error code to look up
 * @returns {Object} The error message object with title, description, action, etc.
 */
export function getAuthErrorMessage(code) {
  if (!code) {
    return DEFAULT_AUTH_ERROR;
  }

  // Normalize the code (handle both Firebase format and custom format)
  const normalizedCode = code.startsWith('auth/') ? code : `auth/${code}`;

  return (
    AUTH_ERROR_MESSAGES[normalizedCode] || {
      ...DEFAULT_AUTH_ERROR,
      code: normalizedCode,
    }
  );
}

/**
 * Get a user-friendly error message string for display
 *
 * @param {string} code - The error code to look up
 * @param {Object} options - Options for formatting
 * @param {boolean} options.includeAction - Whether to include the action text
 * @returns {string} A formatted error message string
 */
export function getAuthErrorMessageString(code, options = {}) {
  const { includeAction = true } = options;
  const error = getAuthErrorMessage(code);

  if (includeAction) {
    return `${error.description} ${error.action}`;
  }

  return error.description;
}

/**
 * Get a short, concise error message for compact UI displays
 *
 * @param {string} code - The error code to look up
 * @returns {string} A short error message string
 */
export function getAuthErrorShortMessage(code) {
  const error = getAuthErrorMessage(code);
  return error.title;
}

/**
 * Determine if an error is retryable (user can try again)
 *
 * @param {string} code - The error code to check
 * @returns {boolean} True if the error is retryable
 */
export function isAuthErrorRetryable(code) {
  const retryableCodes = [
    'auth/network-request-failed',
    'auth/timeout',
    'auth/service-unavailable',
    'auth/internal-error',
    'auth/unknown-error',
    'auth/too-many-requests',
  ];

  return retryableCodes.includes(code);
}

/**
 * Determine if an error requires user action (vs just retrying)
 *
 * @param {string} code - The error code to check
 * @returns {boolean} True if the error requires user action
 */
export function doesAuthErrorRequireUserAction(code) {
  const userActionCodes = [
    'auth/wrong-password',
    'auth/invalid-email',
    'auth/user-not-found',
    'auth/invalid-credential',
    'auth/missing-password',
    'auth/missing-email',
    'auth/weak-password',
    'auth/email-already-in-use',
    'auth/password-mismatch',
    'auth/display-name-required',
    'auth/password-too-short',
    'auth/expired-action-code',
    'auth/invalid-action-code',
    'auth/multi-factor-auth-required',
    'auth/multi-factor-auth-failed',
    'auth/email-not-verified',
  ];

  return userActionCodes.includes(code);
}

/**
 * Get suggested next steps for an error
 *
 * @param {string} code - The error code to look up
 * @returns {Array<string>} Array of suggested next steps
 */
export function getAuthErrorNextSteps(code) {
  const error = getAuthErrorMessage(code);
  const steps = [error.action];

  // Add additional context-specific steps
  if (isAuthErrorRetryable(code)) {
    steps.push('You can try again in a few moments.');
  }

  if (error.helpLink) {
    steps.push(`For more help, visit: ${error.helpLink}`);
  }

  return steps;
}

/**
 * Map Firebase error codes to HTTP status codes
 */
export const AUTH_ERROR_HTTP_STATUS = {
  'auth/user-not-found': 404,
  'auth/wrong-password': 401,
  'auth/invalid-email': 400,
  'auth/email-already-in-use': 409,
  'auth/weak-password': 400,
  'auth/user-disabled': 403,
  'auth/operation-not-allowed': 403,
  'auth/too-many-requests': 429,
  'auth/expired-action-code': 410,
  'auth/invalid-action-code': 400,
  'auth/network-request-failed': 503,
  'auth/service-unavailable': 503,
  'auth/internal-error': 500,
  'auth/requires-recent-login': 401,
  'auth/invalid-credential': 401,
  'auth/insufficient-permission': 403,
  'auth/admin-restricted-operation': 403,
};

/**
 * Get HTTP status code for an auth error
 *
 * @param {string} code - The error code to look up
 * @returns {number} The HTTP status code
 */
export function getAuthErrorHttpStatus(code) {
  return AUTH_ERROR_HTTP_STATUS[code] || 500;
}

export default {
  AUTH_ERROR_MESSAGES,
  DEFAULT_AUTH_ERROR,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
  AUTH_ERROR_HTTP_STATUS,
  getAuthErrorMessage,
  getAuthErrorMessageString,
  getAuthErrorShortMessage,
  isAuthErrorRetryable,
  doesAuthErrorRequireUserAction,
  getAuthErrorNextSteps,
  getAuthErrorHttpStatus,
};
