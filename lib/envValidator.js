/**
 * Environment Variable Validator
 *
 * Provides strict validation for all required environment variables
 * with type checking and error handling.
 */

const requiredEnvVars = {
  // Application Configuration
  NODE_ENV: {
    required: true,
    type: 'string',
    allowedValues: ['development', 'production', 'test'],
    defaultValue: 'development',
  },

  // Firebase Configuration (Client Side)
  NEXT_PUBLIC_FIREBASE_API_KEY: {
    required: true,
    type: 'string',
    minLength: 10,
  },
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: {
    required: true,
    type: 'string',
    pattern: /\.firebaseapp\.com$/,
  },
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: {
    required: true,
    type: 'string',
  },
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: {
    required: true,
    type: 'string',
    pattern: /\.(appspot\.com|firebasestorage\.app)$/,
  },
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: {
    required: true,
    type: 'string',
    pattern: /^[0-9]{10,}$/,
  },
  NEXT_PUBLIC_FIREBASE_APP_ID: {
    required: true,
    type: 'string',
  },

  // Firebase Admin Configuration (Server Side)
  FIREBASE_ADMIN_PROJECT_ID: {
    required: true,
    type: 'string',
  },
  FIREBASE_ADMIN_CLIENT_EMAIL: {
    required: true,
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  FIREBASE_ADMIN_PRIVATE_KEY: {
    required: true,
    type: 'string',
    pattern: /-----BEGIN PRIVATE KEY-----/,
  },

  // Twilio Configuration
  TWILIO_ACCOUNT_SID: {
    required: false,
    type: 'string',
    pattern: /^AC[0-9a-f]{32}$/,
  },
  TWILIO_AUTH_TOKEN: {
    required: false,
    type: 'string',
  },
  TWILIO_API_KEY: {
    required: false,
    type: 'string',
    pattern: /^SK[0-9a-f]{32}$/,
  },
  TWILIO_API_SECRET: {
    required: false,
    type: 'string',
  },
  TWILIO_TWIML_APP_SID: {
    required: false,
    type: 'string',
    pattern: /^AP[0-9a-f]{32}$/,
  },

  // Database Configuration
  MONGODB_URI: {
    required: true,
    type: 'string',
    pattern: /^mongodb(?:\+srv)?:\/\//,
  },

  // Backblaze B2 Storage Configuration
  BACKBLAZE_KEY_ID: {
    required: false,
    type: 'string',
  },
  BACKBLAZE_APPLICATION_KEY: {
    required: false,
    type: 'string',
  },
  BACKBLAZE_BUCKET_NAME: {
    required: false,
    type: 'string',
  },
  BACKBLAZE_ENDPOINT: {
    required: false,
    type: 'string',
    pattern: /^https?:\/\//,
  },
  BACKBLAZE_REGION: {
    required: false,
    type: 'string',
  },

  // TURN Server Configuration
  NEXT_PUBLIC_TURN_SERVER_URL: {
    required: false,
    type: 'string',
    pattern: /^turn:.*$/,
  },
  NEXT_PUBLIC_TURN_USERNAME: {
    required: false,
    type: 'string',
  },
  NEXT_PUBLIC_TURN_CREDENTIAL: {
    required: false,
    type: 'string',
  },

  // CORS Configuration
  NEXT_PUBLIC_ALLOWED_ORIGINS: {
    required: false,
    type: 'string',
  },
};

/**
 * Validates a single environment variable
 */
function validateEnvVar(name, config, value) {
  const errors = [];

  // Check if required
  if (config.required && (!value || value.trim() === '' || value.includes('your_'))) {
    errors.push('Required variable is missing or contains default value');
    return errors;
  }

  // Skip validation if variable is optional and not provided
  if (!config.required && (!value || value.trim() === '')) {
    return [];
  }

  // Type check
  switch (config.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`Must be a string, got ${typeof value}`);
      }

      if (config.minLength && value.length < config.minLength) {
        errors.push(`Must be at least ${config.minLength} characters long`);
      }

      if (config.maxLength && value.length > config.maxLength) {
        errors.push(`Must be at most ${config.maxLength} characters long`);
      }

      if (config.pattern && !config.pattern.test(value)) {
        errors.push(`Invalid format`);
      }

      if (config.allowedValues && !config.allowedValues.includes(value)) {
        errors.push(`Must be one of: ${config.allowedValues.join(', ')}`);
      }
      break;

    case 'number':
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push('Must be a valid number');
      }

      if (typeof config.min !== 'undefined' && numValue < config.min) {
        errors.push(`Must be at least ${config.min}`);
      }

      if (typeof config.max !== 'undefined' && numValue > config.max) {
        errors.push(`Must be at most ${config.max}`);
      }
      break;

    case 'boolean':
      const boolValue = String(value).toLowerCase().trim();
      if (!['true', 'false', '1', '0'].includes(boolValue)) {
        errors.push('Must be a boolean value (true/false)');
      }
      break;

    default:
      errors.push(`Unknown type: ${config.type}`);
  }

  return errors;
}

/**
 * Validates all required environment variables
 */
export function validateEnvironmentVariables() {
  const errors = {};

  Object.entries(requiredEnvVars).forEach(([name, config]) => {
    const value = process.env[name];
    const varErrors = validateEnvVar(name, config, value);

    if (varErrors.length > 0) {
      errors[name] = varErrors;
    }
  });

  // Check if Twilio credentials are complete if any are provided
  const twilioVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_API_KEY',
    'TWILIO_API_SECRET',
    'TWILIO_TWIML_APP_SID',
  ];
  const hasTwilioVars = twilioVars.some(
    (varName) =>
      process.env[varName] && process.env[varName].trim() && !process.env[varName].includes('your_')
  );
  const missingTwilioVars = twilioVars.filter(
    (varName) =>
      !process.env[varName] ||
      process.env[varName].trim() === '' ||
      process.env[varName].includes('your_')
  );

  if (hasTwilioVars && missingTwilioVars.length > 0) {
    missingTwilioVars.forEach((varName) => {
      if (!errors[varName]) {
        errors[varName] = [];
      }
      errors[varName].push('Required when other Twilio credentials are provided');
    });
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    summary: {
      totalVariables: Object.keys(requiredEnvVars).length,
      validVariables: Object.keys(requiredEnvVars).length - Object.keys(errors).length,
      invalidVariables: Object.keys(errors).length,
    },
  };
}

/**
 * Validates and returns a properly formatted environment object
 */
export function getValidatedEnvironment() {
  const validation = validateEnvironmentVariables();

  if (!validation.valid) {
    console.error('Environment variable validation failed:');
    Object.entries(validation.errors).forEach(([name, varErrors]) => {
      console.error(`  ${name}:`, varErrors.join('; '));
    });

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration');
    }
  }

  return {
    // Application
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Firebase Client
    FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,

    // Firebase Admin
    FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),

    // Twilio
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_API_KEY: process.env.TWILIO_API_KEY,
    TWILIO_API_SECRET: process.env.TWILIO_API_SECRET,
    TWILIO_TWIML_APP_SID: process.env.TWILIO_TWIML_APP_SID,

    // Database
    MONGODB_URI: process.env.MONGODB_URI,

    // Backblaze B2
    BACKBLAZE_KEY_ID: process.env.BACKBLAZE_KEY_ID,
    BACKBLAZE_APPLICATION_KEY: process.env.BACKBLAZE_APPLICATION_KEY,
    BACKBLAZE_BUCKET_NAME: process.env.BACKBLAZE_BUCKET_NAME,
    BACKBLAZE_ENDPOINT: process.env.BACKBLAZE_ENDPOINT,
    BACKBLAZE_REGION: process.env.BACKBLAZE_REGION,

    // TURN Server
    TURN_SERVER_URL: process.env.NEXT_PUBLIC_TURN_SERVER_URL,
    TURN_USERNAME: process.env.NEXT_PUBLIC_TURN_USERNAME,
    TURN_CREDENTIAL: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,

    // CORS
    ALLOWED_ORIGINS: process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],

    // Feature Flags
    FEATURE_TWILIO_ENABLED: process.env.FEATURE_TWILIO_ENABLED !== 'false',
    FEATURE_WEBRTC_ENABLED: process.env.FEATURE_WEBRTC_ENABLED !== 'false',
    FEATURE_RECORDINGS_ENABLED: process.env.FEATURE_RECORDINGS_ENABLED !== 'false',
  };
}

/**
 * Validates environment variables for Twilio functionality
 */
export function isTwilioConfigured() {
  return [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_API_KEY',
    'TWILIO_API_SECRET',
    'TWILIO_TWIML_APP_SID',
  ].every(
    (varName) =>
      process.env[varName] && process.env[varName].trim() && !process.env[varName].includes('your_')
  );
}

/**
 * Validates environment variables for WebRTC functionality
 */
export function isWebRTCConfigured() {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL &&
    !process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL.includes('your_')
  );
}

/**
 * Validates environment variables for Backblaze B2 storage
 */
export function isBackblazeConfigured() {
  return [
    'BACKBLAZE_KEY_ID',
    'BACKBLAZE_APPLICATION_KEY',
    'BACKBLAZE_BUCKET_NAME',
    'BACKBLAZE_ENDPOINT',
  ].every(
    (varName) =>
      process.env[varName] && process.env[varName].trim() && !process.env[varName].includes('your_')
  );
}

export default {
  validateEnvironmentVariables,
  getValidatedEnvironment,
  isTwilioConfigured,
  isWebRTCConfigured,
  isBackblazeConfigured,
};
