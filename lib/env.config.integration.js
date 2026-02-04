/**
 * Environment Configuration Integration
 *
 * This module demonstrates how to integrate the env.config.js module
 * into the existing CareFlow application architecture.
 */

import config from "./env.config.js";
import { configManager } from "./env.config.js";

/**
 * Application Configuration Integration
 *
 * Integrates environment configuration with the existing application
 * architecture, replacing direct process.env usage with validated config.
 */
class ApplicationConfig {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize application configuration
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Validate configuration
      const validation = configManager.validate();

      if (!validation.valid) {
        console.error("❌ Configuration validation failed:");
        validation.errors.forEach((error) => console.error(`  - ${error}`));

        if (configManager.isProduction()) {
          throw new Error("Invalid configuration in production environment");
        }
      }

      // Log configuration status
      console.log(`✅ Configuration loaded for ${config.NODE_ENV} environment`);

      if (config._meta.warnings.length > 0) {
        console.warn("⚠️  Configuration warnings:");
        config._meta.warnings.forEach((warning) =>
          console.warn(`  - ${warning}`),
        );
      }

      this.isInitialized = true;
    } catch (error) {
      console.error(
        "❌ Failed to initialize application configuration:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get Firebase configuration
   */
  getFirebaseConfig() {
    return {
      apiKey: config.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: config.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: config.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: config.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: config.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: config.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
  }

  /**
   * Get Firebase Admin configuration
   */
  getFirebaseAdminConfig() {
    return {
      projectId: config.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: config.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: config.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  /**
   * Get MongoDB configuration
   */
  getMongoDBConfig() {
    return {
      uri: config.MONGODB_URI,
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      },
    };
  }

  /**
   * Get Twilio configuration
   */
  getTwilioConfig() {
    return {
      accountSid: config.TWILIO_ACCOUNT_SID,
      authToken: config.TWILIO_AUTH_TOKEN,
      phoneNumber: config.TWILIO_PHONE_NUMBER,
      twimlAppSid: config.TWILIO_TWIML_APP_SID,
      apiKey: config.TWILIO_API_KEY,
      apiSecret: config.TWILIO_API_SECRET,
    };
  }

  /**
   * Get AWS S3 configuration
   */
  getAWSConfig() {
    return {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      region: config.AWS_REGION,
      bucket: config.AWS_S3_BUCKET,
    };
  }

  /**
   * Get application URLs
   */
  getURLs() {
    return {
      appUrl: config.NEXT_PUBLIC_APP_URL,
      apiUrl: `${config.NEXT_PUBLIC_APP_URL}/api`,
      authUrl: `${config.NEXT_PUBLIC_APP_URL}/api/auth`,
    };
  }

  /**
   * Get application metadata
   */
  getMetadata() {
    return {
      environment: config.NODE_ENV,
      version: process.env.npm_package_version || "1.0.0",
      name: "CareFlow",
      loadedAt: config._meta.loadedAt,
      validation: config._meta.validation,
    };
  }

  /**
   * Check if all required services are configured
   */
  checkServiceReadiness() {
    const services = {
      firebase: !!config.NEXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAdmin: !!config.FIREBASE_ADMIN_PRIVATE_KEY,
      mongodb: !!config.MONGODB_URI,
      twilio: !!config.TWILIO_ACCOUNT_SID,
      aws: !!config.AWS_ACCESS_KEY_ID,
    };

    const readyServices = Object.entries(services).filter(
      ([_, ready]) => ready,
    );
    const missingServices = Object.entries(services).filter(
      ([_, ready]) => !ready,
    );

    return {
      allReady: missingServices.length === 0,
      readyServices: readyServices.map(([name]) => name),
      missingServices: missingServices.map(([name]) => name),
      totalServices: Object.keys(services).length,
      readyCount: readyServices.length,
    };
  }

  /**
   * Get development-specific configuration
   */
  getDevelopmentConfig() {
    if (!configManager.isDevelopment()) {
      return null;
    }

    return {
      debug: true,
      hotReload: true,
      mockServices: false,
      verboseLogging: true,
      corsOrigins: ["http://localhost:3000", "http://localhost:3001"],
    };
  }

  /**
   * Get production-specific configuration
   */
  getProductionConfig() {
    if (!configManager.isProduction()) {
      return null;
    }

    return {
      debug: false,
      compression: true,
      securityHeaders: true,
      rateLimiting: true,
      corsOrigins: config.NEXT_PUBLIC_APP_URL,
    };
  }

  /**
   * Get test-specific configuration
   */
  getTestConfig() {
    if (!configManager.isTest()) {
      return null;
    }

    return {
      debug: false,
      mockServices: true,
      testDatabase: true,
      silentLogging: true,
      corsOrigins: "*",
    };
  }

  /**
   * Validate service dependencies
   */
  validateDependencies() {
    const readiness = this.checkServiceReadiness();

    if (!readiness.allReady) {
      console.warn("⚠️  Some services are not configured:");
      readiness.missingServices.forEach((service) => {
        console.warn(`  - ${service} service missing`);
      });

      if (configManager.isProduction()) {
        throw new Error(
          `Missing required services in production: ${readiness.missingServices.join(", ")}`,
        );
      }
    }

    return readiness;
  }
}

// Create singleton instance
const appConfig = new ApplicationConfig();

// Export configuration instance
export default appConfig;

// Auto-initialize on import
appConfig.initialize().catch((error) => {
  console.error("❌ Failed to initialize application configuration:", error);
  process.exit(1);
});

/**
 * Integration Examples
 */

/**
 * Example: Replace direct process.env usage
 */
export function replaceProcessEnvUsage() {
  // Before (direct process.env usage):
  // const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  // After (using validated configuration):
  const apiKey = config.NEXT_PUBLIC_FIREBASE_API_KEY;

  return { apiKey };
}

/**
 * Example: Initialize Firebase with validated config
 */
export async function initializeFirebase() {
  await appConfig.initialize();

  const firebaseConfig = appConfig.getFirebaseConfig();

  // Use firebaseConfig to initialize Firebase
  console.log("Firebase configuration ready:", !!firebaseConfig.apiKey);

  return firebaseConfig;
}

/**
 * Example: Initialize database with validated config
 */
export async function initializeDatabase() {
  await appConfig.initialize();

  const dbConfig = appConfig.getMongoDBConfig();

  // Use dbConfig to connect to MongoDB
  console.log("Database configuration ready:", !!dbConfig.uri);

  return dbConfig;
}

/**
 * Example: Environment-specific middleware
 */
export function createEnvironmentMiddleware() {
  return (req, res, next) => {
    // Add environment information to request
    req.appConfig = appConfig.getMetadata();
    req.isDevelopment = configManager.isDevelopment();
    req.isProduction = configManager.isProduction();
    req.isTest = configManager.isTest();

    next();
  };
}

/**
 * Example: Health check endpoint
 */
export function createHealthCheckEndpoint() {
  return (req, res) => {
    const readiness = appConfig.checkServiceReadiness();
    const metadata = appConfig.getMetadata();

    const health = {
      status: readiness.allReady ? "healthy" : "degraded",
      environment: metadata.environment,
      services: readiness,
      timestamp: new Date().toISOString(),
      version: metadata.version,
    };

    res.status(readiness.allReady ? 200 : 503).json(health);
  };
}

/**
 * Example: Configuration endpoint (development only)
 */
export function createConfigEndpoint() {
  return (req, res) => {
    if (!configManager.isDevelopment()) {
      return res.status(404).json({ error: "Not found" });
    }

    const readiness = appConfig.checkServiceReadiness();
    const metadata = appConfig.getMetadata();

    const configInfo = {
      environment: metadata.environment,
      services: readiness,
      validation: config._meta.validation,
      warnings: config._meta.warnings,
      loadedAt: metadata.loadedAt,
    };

    res.json(configInfo);
  };
}

/**
 * Example: Error handling with configuration context
 */
export function createErrorMiddleware() {
  return (error, req, res, next) => {
    const isDevelopment = configManager.isDevelopment();

    const errorResponse = {
      message: error.message,
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
    };

    if (isDevelopment) {
      errorResponse.stack = error.stack;
      errorResponse.config = {
        warnings: config._meta.warnings,
        validation: config._meta.validation,
      };
    }

    console.error("Application error:", errorResponse);
    res.status(error.status || 500).json(errorResponse);
  };
}

/**
 * Example: Application startup sequence
 */
export async function startApplication() {
  try {
    console.log("🚀 Starting CareFlow application...");

    // 1. Initialize configuration
    await appConfig.initialize();

    // 2. Validate dependencies
    const readiness = appConfig.validateDependencies();

    // 3. Initialize services
    await initializeFirebase();
    await initializeDatabase();

    // 4. Start application
    console.log("✅ Application started successfully");
    console.log(`📍 Environment: ${config.NODE_ENV}`);
    console.log(
      `📊 Services ready: ${readiness.readyCount}/${readiness.totalServices}`,
    );

    return true;
  } catch (error) {
    console.error("❌ Application startup failed:", error);
    process.exit(1);
  }
}
