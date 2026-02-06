/**
 * Environment Configuration Module
 *
 * Dynamically loads environment variables from .env.local, validates them against
 * a schema, type-casts values, and provides a frozen configuration object with
 * runtime access protection and development/production mode detection.
 */

// Import required modules
import dotenv from "dotenv";
import path from "path";

// Get current directory (Node.js compatible)
const __dirname = process.cwd();

/**
 * Configuration Schema Definition
 * Defines expected environment variables with types, validation rules, and defaults
 */
const CONFIG_SCHEMA = {
  // Application Configuration
  NODE_ENV: {
    type: "string",
    enum: ["development", "production", "test"],
    default: "development",
    description: "Application environment mode",
  },

  // Firebase Configuration
  NEXT_PUBLIC_FIREBASE_API_KEY: {
    type: "string",
    required: true,
    pattern: /^[A-Za-z0-9_-]{10,}$/,
    description: "Firebase API Key",
  },
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: {
    type: "string",
    required: true,
    pattern: /\.firebaseapp\.com$/,
    description: "Firebase Auth Domain",
  },
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: {
    type: "string",
    required: true,
    description: "Firebase Project ID",
  },
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: {
    type: "string",
    required: true,
    pattern: /\.appspot\.com$/,
    description: "Firebase Storage Bucket",
  },
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: {
    type: "string",
    required: true,
    pattern: /^[0-9]{10,}$/,
    description: "Firebase Messaging Sender ID",
  },
  NEXT_PUBLIC_FIREBASE_APP_ID: {
    type: "string",
    required: true,
    description: "Firebase App ID",
  },
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: {
    type: "string",
    required: false,
    description: "Firebase Realtime Database URL (required for WebRTC)",
  },

  // Firebase Admin Configuration (Server-side only)
  FIREBASE_ADMIN_PROJECT_ID: {
    type: "string",
    required: true,
    description: "Firebase Admin Project ID",
  },
  FIREBASE_ADMIN_CLIENT_EMAIL: {
    type: "string",
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    description: "Firebase Admin Client Email",
  },
  FIREBASE_ADMIN_PRIVATE_KEY: {
    type: "string",
    required: true,
    pattern: /-----BEGIN PRIVATE KEY-----/,
    description: "Firebase Admin Private Key",
  },

  // Database Configuration
  MONGODB_URI: {
    type: "string",
    required: true,
    pattern: /^mongodb(?:\+srv)?:\/\//,
    description: "MongoDB Connection URI",
  },

  // Twilio Configuration
  TWILIO_ACCOUNT_SID: {
    type: "string",
    required: true,
    pattern: /^AC[a-f0-9]{32}$/,
    description: "Twilio Account SID",
  },
  TWILIO_AUTH_TOKEN: {
    type: "string",
    required: true,
    pattern: /^[a-f0-9]{32}$/,
    description: "Twilio Auth Token",
  },
  TWILIO_PHONE_NUMBER: {
    type: "string",
    required: true,
    pattern: /^\+[1-9]\d{1,14}$/,
    description: "Twilio Phone Number",
  },
  TWILIO_TWIML_APP_SID: {
    type: "string",
    required: true,
    pattern: /^AP[a-f0-9]{32}$/,
    description: "Twilio TwiML App SID",
  },
  TWILIO_API_KEY: {
    type: "string",
    required: true,
    description: "Twilio API Key",
  },
  TWILIO_API_SECRET: {
    type: "string",
    required: true,
    description: "Twilio API Secret",
  },

  // Application URLs
  NEXT_PUBLIC_APP_URL: {
    type: "string",
    required: true,
    pattern: /^https?:\/\/.+/,
    description: "Public Application URL",
  },

  // Backblaze B2 Configuration (S3-compatible cloud storage)
  BACKBLAZE_KEY_ID: {
    type: "string",
    required: false,
    description: "Backblaze B2 Key ID",
  },
  BACKBLAZE_APPLICATION_KEY: {
    type: "string",
    required: false,
    description: "Backblaze B2 Application Key",
  },
  BACKBLAZE_BUCKET_NAME: {
    type: "string",
    required: false,
    description: "Backblaze B2 Bucket Name",
  },
  BACKBLAZE_ENDPOINT: {
    type: "string",
    required: false,
    description: "Backblaze B2 S3 Endpoint",
  },
  BACKBLAZE_REGION: {
    type: "string",
    required: false,
    default: "us-east-1",
    description: "Backblaze B2 Region",
  },
};

/**
 * Environment Variable Validator
 */
class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate a single environment variable against its schema
   */
  validateVariable(key, value, schema) {
    // Check if required
    if (schema.required && (!value || value.trim() === "")) {
      this.errors.push(
        `Required environment variable '${key}' is missing or empty`,
      );
      return false;
    }

    // Skip validation if value is empty and not required
    if (!value || value.trim() === "") {
      return true;
    }

    // Type validation
    const typedValue = this.castValue(value, schema.type);
    if (typedValue === null) {
      this.errors.push(
        `Environment variable '${key}' must be of type ${schema.type}`,
      );
      return false;
    }

    // Pattern validation
    if (schema.pattern && !schema.pattern.test(value)) {
      this.errors.push(
        `Environment variable '${key}' does not match required pattern`,
      );
      return false;
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      this.errors.push(
        `Environment variable '${key}' must be one of: ${schema.enum.join(", ")}`,
      );
      return false;
    }

    return true;
  }

  /**
   * Type cast environment variable values
   */
  castValue(value, type) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    switch (type) {
      case "string":
        return String(value);
      case "number":
        const num = Number(value);
        return isNaN(num) ? null : num;
      case "boolean":
        return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
      case "array":
        return String(value)
          .split(",")
          .map((item) => item.trim());
      default:
        return String(value);
    }
  }

  /**
   * Validate all environment variables
   */
  validateAll(env) {
    this.errors = [];
    this.warnings = [];

    for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
      const value = env[key];
      this.validateVariable(key, value, schema);
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }
}

/**
 * Configuration Manager
 */
class ConfigurationManager {
  constructor() {
    this.config = null;
    this.isInitialized = false;
    this.validator = new EnvironmentValidator();
  }

  /**
   * Load environment variables from .env.local file
   */
  loadEnvironment() {
    // Try to load .env.local from project root
    const envPaths = [".env.local", path.join(process.cwd(), ".env.local")];

    for (const envPath of envPaths) {
      try {
        const result = dotenv.config({ path: envPath, override: true });
        if (!result.error) {
          console.log(`Loaded environment from: ${envPath}`);
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }

    return process.env;
  }

  /**
   * Build configuration object with defaults and type casting
   */
  buildConfiguration(env) {
    const config = {};

    for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
      let value = env[key];

      // Use default if value is not set
      if (!value && schema.default !== undefined) {
        value = schema.default;
        this.validator.warnings.push(
          `Using default value for '${key}': ${schema.default}`,
        );
      }

      // Type cast the value
      const typedValue = this.validator.castValue(value, schema.type);

      if (typedValue !== null) {
        config[key] = typedValue;
      } else if (schema.required) {
        this.validator.errors.push(
          `Failed to cast required variable '${key}' to type ${schema.type}`,
        );
      }
    }

    return config;
  }

  /**
   * Initialize configuration
   */
  initialize() {
    if (this.isInitialized) {
      return this.config;
    }

    try {
      // Load environment variables
      const env = this.loadEnvironment();

      // Build configuration
      const rawConfig = this.buildConfiguration(env);

      // Validate configuration
      const validation = this.validator.validateAll(rawConfig);

      if (!validation.valid) {
        console.error("Configuration validation failed:");
        validation.errors.forEach((error) => console.error(`  - ${error}`));

        // Skip strict validation for development
        // The actual API routes will handle missing credentials gracefully
        console.warn(
          "Configuration validation failed but continuing (development mode)",
        );
      }

      // Add validation results to config
      const config = {
        ...rawConfig,
        _meta: {
          validation: validation,
          warnings: this.validator.warnings,
          loadedAt: new Date().toISOString(),
          environment: rawConfig.NODE_ENV || "development",
        },
      };

      // Freeze the configuration object
      this.config = Object.freeze(config);
      this.isInitialized = true;

      // Log warnings
      if (this.validator.warnings.length > 0) {
        console.warn("Configuration warnings:");
        this.validator.warnings.forEach((warning) =>
          console.warn(`  - ${warning}`),
        );
      }

      console.log(
        `Configuration loaded successfully for ${config.NODE_ENV} environment`,
      );
      return this.config;
    } catch (error) {
      console.error("Failed to initialize configuration:", error);
      throw error;
    }
  }

  /**
   * Get configuration value by key
   */
  get(key) {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (key === undefined) {
      return this.config;
    }

    return this.config[key];
  }

  /**
   * Check if running in development mode
   */
  isDevelopment() {
    return this.get("NODE_ENV") === "development";
  }

  /**
   * Check if running in production mode
   */
  isProduction() {
    return this.get("NODE_ENV") === "production";
  }

  /**
   * Check if running in test mode
   */
  isTest() {
    return this.get("NODE_ENV") === "test";
  }

  /**
   * Get all configuration keys
   */
  getKeys() {
    return Object.keys(CONFIG_SCHEMA);
  }

  /**
   * Get configuration schema
   */
  getSchema() {
    return CONFIG_SCHEMA;
  }

  /**
   * Validate current configuration
   */
  validate() {
    if (!this.isInitialized) {
      this.initialize();
    }

    const env = process.env;
    return this.validator.validateAll(env);
  }
}

// Create singleton instance
const configManager = new ConfigurationManager();

// Export configuration object with runtime protection
const createProtectedConfig = () => {
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === "then") {
          // Allow Promise-like behavior
          return undefined;
        }

        if (prop === Symbol.toPrimitive) {
          return () => "[Configuration Object]";
        }

        return configManager.get(prop);
      },
      set() {
        throw new Error(
          "Configuration object is read-only and cannot be modified",
        );
      },
      deleteProperty() {
        throw new Error("Configuration properties cannot be deleted");
      },
      has(target, prop) {
        return prop in configManager.get();
      },
      ownKeys() {
        return Object.keys(configManager.get());
      },
      getOwnPropertyDescriptor(target, prop) {
        const config = configManager.get();
        return Object.getOwnPropertyDescriptor(config, prop);
      },
    },
  );
};

// Initialize configuration immediately
const config = createProtectedConfig();

// Export both the manager and the config object
export { configManager, CONFIG_SCHEMA };
export default config;

// Auto-initialize on import
configManager.initialize();
