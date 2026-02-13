/**
 * Call System Initialization Verification Script
 *
 * This script checks the initialization status of the call system
 * and verifies all required services are properly configured.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
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
  satellite: '🛰️',
};

/**
 * Check if .env.local file exists
 */
function checkEnvFile() {
  console.log(`\n${COLORS.cyan}${ICONS.gear} Checking Environment Configuration...${COLORS.reset}`);

  const envPath = path.join(process.cwd(), '.env.local');
  const exists = fs.existsSync(envPath);

  if (exists) {
    console.log(`  ${ICONS.success} .env.local file found`);
    return { status: 'ready', exists: true };
  }
  console.log(`  ${ICONS.error} .env.local file NOT found`);
  console.log(`  ${ICONS.warning} Copy .env.local.example to .env.local and configure`);
  return { status: 'missing', exists: false };
}

/**
 * Check required environment variables
 */
function checkEnvironmentVariables() {
  console.log(`\n${COLORS.cyan}${ICONS.gear} Checking Environment Variables...${COLORS.reset}`);

  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    return { status: 'missing', variables: {} };
  }

  // Parse .env.local file
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  });

  // Check critical variables
  const criticalVars = {
    // Firebase (required for both modes)
    NEXT_PUBLIC_FIREBASE_API_KEY: { required: true, service: 'Firebase' },
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: { required: true, service: 'Firebase' },
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: { required: false, service: 'WebRTC' },

    // Twilio (required for Twilio mode)
    TWILIO_ACCOUNT_SID: { required: false, service: 'Twilio' },
    TWILIO_API_KEY: { required: false, service: 'Twilio' },
    TWILIO_API_SECRET: { required: false, service: 'Twilio' },
    TWILIO_TWIML_APP_SID: { required: false, service: 'Twilio' },

    // Backend services
    MONGODB_URI: { required: true, service: 'MongoDB' },
    FIREBASE_ADMIN_PRIVATE_KEY: { required: true, service: 'Firebase Admin' },
  };

  const results = {
    allSet: true,
    missing: [],
    configured: [],
    byService: {},
  };

  Object.entries(criticalVars).forEach(([varName, config]) => {
    const value = envVars[varName];
    const isConfigured = value && !value.includes('your_') && value.length > 5;

    if (!isConfigured) {
      if (config.required) {
        results.allSet = false;
      }
      results.missing.push({
        name: varName,
        service: config.service,
        required: config.required,
      });
      console.log(
        `  ${config.required ? ICONS.error : ICONS.warning} ${varName}: ${config.required ? 'REQUIRED' : 'optional'} - not configured`
      );
    } else {
      results.configured.push({ name: varName, service: config.service });
      console.log(`  ${ICONS.success} ${varName}: configured`);
    }

    // Track by service
    if (!results.byService[config.service]) {
      results.byService[config.service] = { configured: 0, missing: 0 };
    }
    if (isConfigured) {
      results.byService[config.service].configured++;
    } else {
      results.byService[config.service].missing++;
    }
  });

  return {
    status: results.allSet ? 'ready' : 'incomplete',
    ...results,
  };
}

/**
 * Determine call mode based on configuration
 */
function determineCallMode(envResults) {
  console.log(`\n${COLORS.cyan}${ICONS.phone} Determining Call Mode...${COLORS.reset}`);

  const twilioVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_API_KEY',
    'TWILIO_API_SECRET',
    'TWILIO_TWIML_APP_SID',
  ];
  const webrtcVars = ['NEXT_PUBLIC_FIREBASE_DATABASE_URL'];

  const twilioReady = twilioVars.every((v) => envResults.configured.some((c) => c.name === v));

  const webrtcReady = webrtcVars.every((v) => envResults.configured.some((c) => c.name === v));

  let mode = 'none';
  const capabilities = [];

  if (twilioReady) {
    mode = 'twilio';
    capabilities.push(
      'PSTN calls (phone numbers)',
      'Inbound calls',
      'Outbound calls',
      'Call recording'
    );
    console.log(`  ${ICONS.success} Twilio mode: READY`);
  } else {
    console.log(`  ${ICONS.warning} Twilio mode: NOT CONFIGURED`);
  }

  if (webrtcReady) {
    mode = twilioReady ? 'hybrid' : 'webrtc';
    capabilities.push('Browser-to-browser calls', 'CareFlow ID calls');
    console.log(`  ${ICONS.success} WebRTC mode: READY`);
  } else {
    console.log(`  ${ICONS.warning} WebRTC mode: NOT CONFIGURED`);
  }

  if (mode === 'none') {
    console.log(`  ${ICONS.error} No call mode available!`);
    return { status: 'unavailable', mode: null, capabilities: [] };
  }

  return { status: 'ready', mode, capabilities };
}

/**
 * Check CallManager initialization requirements
 */
function checkCallManagerRequirements(envResults, modeResults) {
  console.log(`\n${COLORS.cyan}${ICONS.gear} Checking CallManager Requirements...${COLORS.reset}`);

  const requirements = {
    mode: modeResults.mode !== null,
    firebase: envResults.byService.Firebase?.configured > 0,
    backend:
      envResults.byService.MongoDB?.configured > 0 &&
      envResults.byService['Firebase Admin']?.configured > 0,
  };

  const allMet = Object.values(requirements).every(Boolean);

  Object.entries(requirements).forEach(([name, met]) => {
    console.log(`  ${met ? ICONS.success : ICONS.error} ${name}: ${met ? 'ready' : 'missing'}`);
  });

  return {
    status: allMet ? 'ready' : 'incomplete',
    requirements,
    allMet,
  };
}

/**
 * Check WebRTC Manager requirements
 */
function checkWebRTCRequirements(envResults) {
  console.log(
    `\n${COLORS.cyan}${ICONS.satellite} Checking WebRTC Manager Requirements...${COLORS.reset}`
  );

  const requirements = {
    firebase: envResults.byService.Firebase?.configured > 0,
    database: envResults.configured.some((c) => c.name === 'NEXT_PUBLIC_FIREBASE_DATABASE_URL'),
    browser: true, // Assumed true since we're running in Node
  };

  const allMet = requirements.firebase && requirements.database;

  Object.entries(requirements).forEach(([name, met]) => {
    console.log(`  ${met ? ICONS.success : ICONS.error} ${name}: ${met ? 'ready' : 'missing'}`);
  });

  // Check TURN server (optional but recommended)
  const turnConfigured =
    process.env.NEXT_PUBLIC_TURN_SERVER_URL ||
    envResults.configured.some((c) => c.name === 'NEXT_PUBLIC_TURN_SERVER_URL');

  if (turnConfigured) {
    console.log(`  ${ICONS.success} TURN server: configured (NAT traversal enabled)`);
  } else {
    console.log(`  ${ICONS.warning} TURN server: not configured (may fail behind NAT/firewall)`);
  }

  return {
    status: allMet ? 'ready' : 'incomplete',
    requirements,
    allMet,
    turnConfigured,
  };
}

/**
 * Generate initialization report
 */
function generateReport(results) {
  console.log(`\n${COLORS.bright}${'='.repeat(60)}${COLORS.reset}`);
  console.log(`${COLORS.bright}📊 CALL SYSTEM INITIALIZATION REPORT${COLORS.reset}`);
  console.log(`${COLORS.bright}${'='.repeat(60)}${COLORS.reset}\n`);

  // Overall status
  const allReady =
    results.envFile.exists &&
    results.envVars.allSet &&
    results.callManager.allMet &&
    results.mode.status === 'ready';

  if (allReady) {
    console.log(`${COLORS.green}${ICONS.success} OVERALL STATUS: READY${COLORS.reset}`);
    console.log(
      `${COLORS.green}The call system is fully initialized and operational.${COLORS.reset}`
    );
  } else {
    console.log(`${COLORS.yellow}${ICONS.warning} OVERALL STATUS: INCOMPLETE${COLORS.reset}`);
    console.log(`${COLORS.yellow}Some initialization steps are missing.${COLORS.reset}`);
  }

  // Mode information
  console.log(`\n${COLORS.cyan}📞 Call Mode: ${results.mode.mode || 'None'}${COLORS.reset}`);
  if (results.mode.capabilities.length > 0) {
    console.log(`   Capabilities:`);
    results.mode.capabilities.forEach((cap) => console.log(`   - ${cap}`));
  }

  // Required actions
  if (!allReady) {
    console.log(`\n${COLORS.yellow}🔧 Required Actions:${COLORS.reset}`);

    if (!results.envFile.exists) {
      console.log(`   1. Create .env.local file from .env.local.example`);
    }

    const missingRequired = results.envVars.missing.filter((v) => v.required);
    if (missingRequired.length > 0) {
      console.log(`   2. Configure required environment variables:`);
      missingRequired.forEach((v) => console.log(`      - ${v.name} (${v.service})`));
    }

    if (!results.callManager.allMet) {
      console.log(`   3. Ensure backend services are configured`);
    }
  }

  console.log(`\n${COLORS.bright}${'='.repeat(60)}${COLORS.reset}\n`);

  return allReady;
}

/**
 * Main verification function
 */
async function main() {
  console.log(
    `\n${COLORS.bright}${ICONS.rocket} CareFlow Call System Initialization Verification${COLORS.reset}`
  );
  console.log(`${COLORS.dim}Running checks...${COLORS.reset}`);

  const results = {
    envFile: checkEnvFile(),
    envVars: checkEnvironmentVariables(),
  };

  results.mode = determineCallMode(results.envVars);
  results.callManager = checkCallManagerRequirements(results.envVars, results.mode);
  results.webrtc = checkWebRTCRequirements(results.envVars);

  const isReady = generateReport(results);

  // Exit with appropriate code
  process.exit(isReady ? 0 : 1);
}

// Run the verification
main().catch((error) => {
  console.error(`${ICONS.error} Verification failed:`, error);
  process.exit(1);
});
