#!/usr/bin/env node
/**
 * Twilio Integration Test Script
 *
 * This script tests the Twilio integration by:
 * 1. Checking environment variables
 * 2. Validating credential formats
 * 3. Testing API connectivity
 * 4. Generating a test access token
 * 5. Checking phone numbers and TwiML apps
 *
 * Usage: node scripts/test-twilio.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value;
      }
    }
  });
}

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bright: '\x1b[1m',
};

// Status icons
const ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  loading: '⏳',
  rocket: '🚀',
  gear: '⚙️',
  phone: '📞',
  key: '🔑',
  check: '✔️',
  cross: '✖️',
  dim: '  ', // Indentation for sub-items
};

/**
 * Print a formatted message
 */
function print(icon, message, status = 'info') {
  const colorMap = {
    success: COLORS.green,
    error: COLORS.red,
    warning: COLORS.yellow,
    info: COLORS.blue,
  };
  const color = colorMap[status] || COLORS.reset;
  console.log(`  ${color}${icon} ${message}${COLORS.reset}`);
}

/**
 * Print section header
 */
function printSection(title) {
  console.log(`\n${COLORS.cyan}${COLORS.bright}${'─'.repeat(50)}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${COLORS.bright}  ${title}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${COLORS.bright}${'─'.repeat(50)}${COLORS.reset}\n`);
}

/**
 * Check environment variables
 */
function checkEnvironmentVariables() {
  printSection('📋 Environment Variables Check');

  const vars = {
    TWILIO_ACCOUNT_SID: { prefix: 'AC', required: true },
    TWILIO_AUTH_TOKEN: { length: 32, required: true },
    TWILIO_API_KEY: { prefix: 'SK', required: true },
    TWILIO_API_SECRET: { length: 32, required: true },
    TWILIO_TWIML_APP_SID: { prefix: 'AP', required: true },
    TWILIO_PHONE_NUMBER: { pattern: /^\+[1-9]\d{1,14}$/, required: false },
  };

  const results = { passed: 0, failed: 0, warnings: 0 };

  for (const [varName, config] of Object.entries(vars)) {
    const value = process.env[varName];

    if (!value || value.includes('your_') || value.length < 5) {
      if (config.required) {
        print(ICONS.error, `${varName}: NOT SET (required)`, 'error');
        results.failed++;
      } else {
        print(ICONS.warning, `${varName}: NOT SET (optional)`, 'warning');
        results.warnings++;
      }
      continue;
    }

    // Validate format
    let valid = true;
    let issue = '';

    if (config.prefix && !value.startsWith(config.prefix)) {
      valid = false;
      issue = `should start with "${config.prefix}"`;
    } else if (config.length && value.length !== config.length) {
      valid = false;
      issue = `should be ${config.length} characters (got ${value.length})`;
    } else if (config.pattern && !config.pattern.test(value)) {
      valid = false;
      issue = 'should be E.164 format (e.g., +1234567890)';
    }

    if (valid) {
      // Mask the value for security
      const masked =
        value.length > 8
          ? value.substring(0, 4) + '****' + value.substring(value.length - 4)
          : '****';
      print(ICONS.success, `${varName}: ${masked}`, 'success');
      results.passed++;
    } else {
      print(ICONS.error, `${varName}: INVALID - ${issue}`, 'error');
      results.failed++;
    }
  }

  return results;
}

/**
 * Test Twilio API connectivity
 */
async function testTwilioConnectivity() {
  printSection('🔌 API Connectivity Test');

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;

  if (!accountSid || !apiKey || !apiSecret) {
    print(ICONS.error, 'Missing credentials - skipping connectivity test', 'error');
    return { passed: 0, failed: 1 };
  }

  try {
    // Dynamic import for ESM compatibility - twilio uses default export
    const twilioModule = await import('twilio');
    const Twilio = twilioModule.default || twilioModule;
    const client = new Twilio(apiKey, apiSecret, { accountSid });

    const results = { passed: 0, failed: 0 };

    // Test 1: Fetch account details
    print(ICONS.loading, 'Fetching account details...', 'info');
    try {
      const account = await client.api.accounts(accountSid).fetch();
      print(ICONS.success, `Account: ${account.friendlyName}`, 'success');
      print(ICONS.info, `   Status: ${account.status}`, 'info');
      print(ICONS.info, `   Type: ${account.type}`, 'info');
      results.passed++;
    } catch (error) {
      print(ICONS.error, `Failed to fetch account: ${error.message}`, 'error');
      results.failed++;
    }

    // Test 2: List phone numbers
    print(ICONS.loading, 'Fetching phone numbers...', 'info');
    try {
      const numbers = await client.incomingPhoneNumbers.list({ limit: 10 });
      if (numbers.length === 0) {
        print(ICONS.warning, 'No phone numbers configured', 'warning');
      } else {
        print(ICONS.success, `Found ${numbers.length} phone number(s):`, 'success');
        numbers.forEach((n) => {
          print(ICONS.phone, `   ${n.phoneNumber} (${n.friendlyName || 'unnamed'})`, 'info');
        });
      }
      results.passed++;
    } catch (error) {
      print(ICONS.error, `Failed to fetch phone numbers: ${error.message}`, 'error');
      results.failed++;
    }

    // Test 3: Check TwiML apps
    print(ICONS.loading, 'Checking TwiML apps...', 'info');
    try {
      const apps = await client.applications.list({ limit: 10 });
      const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
      const targetApp = apps.find((a) => a.sid === twimlAppSid);

      if (targetApp) {
        print(
          ICONS.success,
          `TwiML App found: ${targetApp.friendlyName || targetApp.sid}`,
          'success'
        );
        print(ICONS.info, `   Voice URL: ${targetApp.voiceUrl || 'not configured'}`, 'info');
        print(ICONS.info, `   Voice Method: ${targetApp.voiceMethod || 'POST'}`, 'info');
      } else if (twimlAppSid) {
        print(ICONS.warning, `TwiML App ${twimlAppSid} not found in account`, 'warning');
      }
      results.passed++;
    } catch (error) {
      print(ICONS.error, `Failed to fetch TwiML apps: ${error.message}`, 'error');
      results.failed++;
    }

    // Test 4: Check account balance
    print(ICONS.loading, 'Checking account balance...', 'info');
    try {
      const balance = await client.balance.fetch();
      print(ICONS.success, `Balance: ${balance.currency} ${balance.balance}`, 'success');
      if (parseFloat(balance.balance) < 5) {
        print(ICONS.warning, '   Low balance - consider topping up', 'warning');
      }
      results.passed++;
    } catch (error) {
      print(ICONS.warning, `Could not fetch balance: ${error.message}`, 'warning');
      // Don't count as failure - balance endpoint may not be available
    }

    return results;
  } catch (error) {
    print(ICONS.error, `Failed to initialize Twilio client: ${error.message}`, 'error');
    return { passed: 0, failed: 1 };
  }
}

/**
 * Test token generation
 */
async function testTokenGeneration() {
  printSection('🔑 Access Token Generation Test');

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

  if (!accountSid || !apiKey || !apiSecret) {
    print(ICONS.error, 'Missing credentials - skipping token test', 'error');
    return { passed: 0, failed: 1 };
  }

  try {
    // Dynamic import for ESM compatibility - twilio uses default export
    const twilioModule = await import('twilio');
    const Twilio = twilioModule.default || twilioModule;

    // AccessToken is accessed directly from the Twilio import, not from client instance
    const AccessToken = Twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create access token
    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity: `test-user-${Date.now()}`,
      ttl: 300, // 5 minutes
    });

    // Add voice grant
    if (twimlAppSid) {
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: true,
      });
      token.addGrant(voiceGrant);
    }

    const jwt = token.toJwt();

    print(ICONS.success, 'Token generated successfully!', 'success');
    print(ICONS.info, `   Token length: ${jwt.length} characters`, 'info');
    print(ICONS.info, `   Token preview: ${jwt.substring(0, 50)}...`, 'info');
    print(ICONS.info, `   TTL: 300 seconds (5 minutes)`, 'info');

    // Decode and verify token structure
    const parts = jwt.split('.');
    if (parts.length === 3) {
      print(ICONS.success, 'Token structure: Valid JWT (3 parts)', 'success');

      // Decode payload
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        print(ICONS.info, `   Identity: ${payload.identity}`, 'info');
        print(ICONS.info, `   Expires: ${new Date(payload.exp * 1000).toISOString()}`, 'info');
      } catch (e) {
        print(ICONS.warning, 'Could not decode token payload', 'warning');
      }
    } else {
      print(ICONS.error, 'Token structure: Invalid JWT', 'error');
      return { passed: 0, failed: 1 };
    }

    return { passed: 1, failed: 0 };
  } catch (error) {
    print(ICONS.error, `Token generation failed: ${error.message}`, 'error');
    return { passed: 0, failed: 1 };
  }
}

/**
 * Test webhook configuration
 */
function testWebhookConfiguration() {
  printSection('🌐 Webhook Configuration Check');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const results = { passed: 0, failed: 0, warnings: 0 };

  print(ICONS.info, `App URL: ${appUrl}`, 'info');
  print(ICONS.info, 'Required webhook endpoints:', 'info');

  const webhooks = [
    { path: '/api/webhooks/twilio/voice', purpose: 'Incoming voice calls' },
    { path: '/api/webhooks/twilio/status', purpose: 'Call status callbacks' },
    { path: '/api/webhooks/twilio/voicemail', purpose: 'Voicemail recordings' },
  ];

  webhooks.forEach(({ path, purpose }) => {
    print(ICONS.info, `   ${path}`, 'info');
    print(ICONS.dim, `      Purpose: ${purpose}`, 'info');
  });

  // Check if running locally
  if (appUrl.includes('localhost') || appUrl.includes('127.0.0.1')) {
    print(ICONS.warning, 'Running locally - webhooks require public URL', 'warning');
    print(ICONS.info, '   Use ngrok for testing: ngrok http 3000', 'info');
    results.warnings++;
  } else {
    print(ICONS.success, 'Production URL configured', 'success');
    results.passed++;
  }

  return results;
}

/**
 * Print summary and recommendations
 */
function printSummary(results) {
  printSection('📊 Test Summary');

  const total = results.passed + results.failed;
  const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;

  console.log(`  ${COLORS.bright}Total Tests:${COLORS.reset} ${total}`);
  console.log(`  ${COLORS.green}Passed:${COLORS.reset} ${results.passed}`);
  console.log(`  ${COLORS.red}Failed:${COLORS.reset} ${results.failed}`);
  console.log(`  ${COLORS.yellow}Warnings:${COLORS.reset} ${results.warnings}`);
  console.log(`  ${COLORS.bright}Pass Rate:${COLORS.reset} ${passRate}%`);

  if (results.failed === 0) {
    console.log(`\n  ${COLORS.green}${ICONS.rocket} Twilio is properly configured!${COLORS.reset}`);
    console.log(`  ${COLORS.dim}You can now make and receive calls.${COLORS.reset}`);
  } else {
    console.log(`\n  ${COLORS.red}${ICONS.cross} Twilio configuration has issues.${COLORS.reset}`);
    console.log(`\n  ${COLORS.bright}Recommendations:${COLORS.reset}`);

    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log(`  ${ICONS.warning} Set TWILIO_ACCOUNT_SID in .env.local`);
    }
    if (!process.env.TWILIO_API_KEY || !process.env.TWILIO_API_SECRET) {
      console.log(
        `  ${ICONS.warning} Create API keys at: https://console.twilio.com/us1/develop/sync/project/api-keys`
      );
    }
    if (!process.env.TWILIO_TWIML_APP_SID) {
      console.log(
        `  ${ICONS.warning} Create a TwiML app at: https://console.twilio.com/us1/develop/voice/twiml/apps`
      );
    }
    if (!process.env.TWILIO_PHONE_NUMBER) {
      console.log(
        `  ${ICONS.warning} Buy a phone number at: https://console.twilio.com/us1/develop/phone-numbers`
      );
    }
  }

  console.log(`\n  ${COLORS.dim}For more help, see: docs/TURN_CONFIGURATION.md${COLORS.reset}`);
}

/**
 * Main test runner
 */
async function main() {
  console.log(
    `\n${COLORS.bright}${COLORS.cyan}╔════════════════════════════════════════════════════════╗${COLORS.reset}`
  );
  console.log(
    `${COLORS.bright}${COLORS.cyan}║        CareFlow Twilio Integration Test Suite          ║${COLORS.reset}`
  );
  console.log(
    `${COLORS.bright}${COLORS.cyan}╚════════════════════════════════════════════════════════╝${COLORS.reset}`
  );

  const results = { passed: 0, failed: 0, warnings: 0 };

  // Run all tests
  const envResults = checkEnvironmentVariables();
  results.passed += envResults.passed;
  results.failed += envResults.failed;
  results.warnings += envResults.warnings;

  // Only run connectivity tests if credentials are present
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_API_KEY) {
    const connectivityResults = await testTwilioConnectivity();
    results.passed += connectivityResults.passed;
    results.failed += connectivityResults.failed;

    const tokenResults = await testTokenGeneration();
    results.passed += tokenResults.passed;
    results.failed += tokenResults.failed;
  } else {
    printSection('🔌 API Connectivity Test');
    print(ICONS.warning, 'Skipping - credentials not configured', 'warning');
  }

  const webhookResults = testWebhookConfiguration();
  results.passed += webhookResults.passed;
  results.failed += webhookResults.failed;
  results.warnings += webhookResults.warnings;

  // Print summary
  printSummary(results);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
main().catch((error) => {
  console.error(`\n${ICONS.error} Test suite failed:`, error.message);
  process.exit(1);
});
