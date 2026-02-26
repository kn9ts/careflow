/**
 * Application Initialization Module
 *
 * Ensures environment configurations are loaded and validated during application startup.
 * This module should be imported first in the application entry points to guarantee
 * configuration is available throughout the application lifecycle.
 */

import appConfig from './env.config.integration.js';
import { configManager } from './env.config.js';
import { validateEnvironmentVariables } from './envValidator.js';

/**
 * Application Initialization Class
 *
 * Handles the complete application initialization sequence including
 * environment configuration loading, validation, and service setup.
 */
class ApplicationInitializer {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize the application with comprehensive configuration loading
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform the actual initialization sequence
   */
  async _performInitialization() {
    try {
      console.log('🚀 Starting CareFlow Application Initialization...');
      console.log('📋 Environment:', process.env.NODE_ENV || 'development');

      // Step 1: Validate environment variables
      console.log('🔧 Validating environment variables...');
      const envValidation = validateEnvironmentVariables();
      if (!envValidation.valid) {
        console.error('❌ Environment variable validation failed:');
        Object.entries(envValidation.errors).forEach(([name, errors]) => {
          console.error(`  ${name}: ${errors.join('; ')}`);
        });

        // Throw error in production, continue in development
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Invalid environment configuration');
        } else {
          console.warn('⚠️  Development mode: Continuing with invalid environment variables');
        }
      } else {
        console.log('✅ Environment variables validated successfully');
      }

      // Step 2: Load and validate environment configuration
      console.log('🔧 Loading environment configuration...');
      await appConfig.initialize();

      // Step 2: Validate all service dependencies
      console.log('🔍 Validating service dependencies...');
      const readiness = appConfig.validateDependencies();

      // Step 3: Log initialization status
      this._logInitializationStatus(readiness);

      // Step 4: Set up global application state
      this._setupGlobalState(readiness);

      // Step 5: Perform environment-specific setup
      await this._setupEnvironmentSpecificFeatures();

      this.isInitialized = true;
      console.log('✅ Application initialization completed successfully');

      return {
        success: true,
        environment: process.env.NODE_ENV || 'development',
        services: readiness,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Application initialization failed:', error);

      // In production, fail fast for configuration errors
      if (process.env.NODE_ENV === 'production') {
        console.error('💥 Production environment: Configuration errors are fatal');
        process.exit(1);
      }

      // In development, provide detailed error information
      if (process.env.NODE_ENV === 'development') {
        console.log('\n💡 Development Mode Error Details:');
        console.log('- Check your .env.local file exists and contains required variables');
        console.log('- Ensure all required environment variables are properly set');
        console.log('- Refer to .env.local.example for required variable names');
        console.log('- Configuration validation errors are shown above');
      }

      throw error;
    }
  }

  /**
   * Log initialization status and service readiness
   */
  _logInitializationStatus(readiness) {
    console.log('\n📊 Service Readiness Report:');
    console.log(`   Total Services: ${readiness.totalServices}`);
    console.log(`   Ready Services: ${readiness.readyCount}`);
    console.log(`   Missing Services: ${readiness.missingServices.length}`);

    if (readiness.readyServices.length > 0) {
      console.log(`   ✅ Ready: ${readiness.readyServices.join(', ')}`);
    }

    if (readiness.missingServices.length > 0) {
      console.log(`   ❌ Missing: ${readiness.missingServices.join(', ')}`);
    }

    if (readiness.allReady) {
      console.log('🎉 All services are ready!');
    } else {
      console.log('⚠️  Some services are missing - application may have limited functionality');
    }
  }

  /**
   * Set up global application state
   */
  _setupGlobalState(readiness) {
    // Set global application metadata
    global.APP_METADATA = {
      name: 'CareFlow',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      initialized: true,
      services: readiness,
      timestamp: new Date().toISOString(),
    };

    // Set up global configuration access
    global.APP_CONFIG = {
      get: (key) => {
        if (!this.isInitialized) {
          throw new Error('Application not initialized. Call appConfig.initialize() first.');
        }
        return require('./env.config.js').default[key];
      },
      all: () => {
        if (!this.isInitialized) {
          throw new Error('Application not initialized. Call appConfig.initialize() first.');
        }
        return require('./env.config.js').default;
      },
      isDevelopment: () => configManager.isDevelopment(),
      isProduction: () => configManager.isProduction(),
      isTest: () => configManager.isTest(),
    };

    // Set up service configurations
    global.SERVICE_CONFIGS = {
      firebase: appConfig.getFirebaseConfig(),
      firebaseAdmin: appConfig.getFirebaseAdminConfig(),
      mongodb: appConfig.getMongoDBConfig(),
      twilio: appConfig.getTwilioConfig(),
      backblaze: appConfig.getBackblazeConfig(),
      urls: appConfig.getURLs(),
    };

    console.log('🌍 Global application state configured');
  }

  /**
   * Set up environment-specific features
   */
  async _setupEnvironmentSpecificFeatures() {
    const environment = process.env.NODE_ENV || 'development';

    switch (environment) {
      case 'development':
        await this._setupDevelopmentFeatures();
        break;
      case 'production':
        await this._setupProductionFeatures();
        break;
      case 'test':
        await this._setupTestFeatures();
        break;
      default:
        console.warn(`⚠️  Unknown environment: ${environment}, using development defaults`);
        await this._setupDevelopmentFeatures();
    }
  }

  /**
   * Set up development-specific features
   */
  async _setupDevelopmentFeatures() {
    console.log('🔧 Setting up development features...');

    // Enable development logging
    process.env.DEBUG = process.env.DEBUG || 'careflow:*';

    // Set up development middleware configurations
    global.DEV_CONFIG = {
      hotReload: true,
      verboseLogging: true,
      mockServices: false,
      corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
    };

    console.log('✅ Development features enabled');
  }

  /**
   * Set up production-specific features
   */
  async _setupProductionFeatures() {
    console.log('🔒 Setting up production features...');

    // Disable development features
    process.env.DEBUG = '';

    // Set up production security configurations
    global.PROD_CONFIG = {
      compression: true,
      securityHeaders: true,
      rateLimiting: true,
      corsOrigins: process.env.NEXT_PUBLIC_APP_URL,
      strictMode: true,
    };

    console.log('✅ Production features enabled');
  }

  /**
   * Set up test-specific features
   */
  async _setupTestFeatures() {
    console.log('🧪 Setting up test features...');

    // Set up test configurations
    global.TEST_CONFIG = {
      mockServices: true,
      testDatabase: true,
      silentLogging: true,
      corsOrigins: '*',
      fastTimeouts: true,
    };

    console.log('✅ Test features enabled');
  }

  /**
   * Get initialization status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      timestamp: this.isInitialized ? new Date().toISOString() : null,
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Force re-initialization (useful for testing)
   */
  async reinitialize() {
    this.isInitialized = false;
    this.initializationPromise = null;
    return this.initialize();
  }
}

// Create singleton instance
const initializer = new ApplicationInitializer();

// Export the initializer
export default initializer;

// Auto-initialize on import (for server-side rendering and API routes)
if (typeof window === 'undefined') {
  // Only auto-initialize on server side to avoid client-side issues
  initializer.initialize().catch((error) => {
    console.error('❌ Failed to auto-initialize application:', error);
    // Don't exit process for auto-initialization failures
  });
}

/**
 * Utility functions for application initialization
 */

/**
 * Get application configuration with initialization check
 */
export function getAppConfig() {
  if (!initializer.isInitialized) {
    throw new Error('Application not initialized. Call initializer.initialize() first.');
  }
  return require('./env.config.js').default;
}

/**
 * Check if application is initialized
 */
export function isInitialized() {
  return initializer.isInitialized;
}

/**
 * Get initialization status
 */
export function getInitializationStatus() {
  return initializer.getStatus();
}

/**
 * Initialize application manually (for client-side or explicit initialization)
 */
export async function initializeApp() {
  return initializer.initialize();
}

/**
 * Re-initialize application (for testing)
 */
export async function reinitializeApp() {
  return initializer.reinitialize();
}

/**
 * Get service configuration
 */
export function getServiceConfig(service) {
  if (!initializer.isInitialized) {
    throw new Error('Application not initialized. Call initializer.initialize() first.');
  }

  const configs = {
    firebase: () => appConfig.getFirebaseConfig(),
    firebaseAdmin: () => appConfig.getFirebaseAdminConfig(),
    mongodb: () => appConfig.getMongoDBConfig(),
    twilio: () => appConfig.getTwilioConfig(),
    backblaze: () => appConfig.getBackblazeConfig(),
    urls: () => appConfig.getURLs(),
  };

  if (!configs[service]) {
    throw new Error(`Unknown service: ${service}`);
  }

  return configs[service]();
}

/**
 * Check service readiness
 */
export function checkServiceReadiness() {
  if (!initializer.isInitialized) {
    throw new Error('Application not initialized. Call initializer.initialize() first.');
  }
  return appConfig.checkServiceReadiness();
}

/**
 * Validate all configurations
 */
export function validateConfigurations() {
  if (!initializer.isInitialized) {
    throw new Error('Application not initialized. Call initializer.initialize() first.');
  }
  return appConfig.validateDependencies();
}
