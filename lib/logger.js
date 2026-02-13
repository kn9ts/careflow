/**
 * CareFlow Logger Utility
 * Playful, colorful logging for development mode only
 */

// Color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  // Foreground colors
  fgBlack: '\x1b[30m',
  fgRed: '\x1b[31m',
  fgGreen: '\x1b[32m',
  fgYellow: '\x1b[33m',
  fgBlue: '\x1b[34m',
  fgMagenta: '\x1b[35m',
  fgCyan: '\x1b[36m',
  fgWhite: '\x1b[37m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// Emojis for playful logging
const EMOJIS = {
  rocket: '🚀',
  sparkles: '✨',
  phone: '📞',
  wave: '👋',
  check: '✅',
  cross: '❌',
  clock: '🕐',
  gear: '⚙️',
  fire: '🔥',
  trophy: '🏆',
  brain: '🧠',
  satellite: '🛰️',
  musical: '🎵',
  recording: '🎙️',
  lock: '🔒',
  key: '🔑',
  灯泡: '💡',
  party: '🎉',
  alert: '⚠️',
  construction: '🚧',
};

// Development mode check
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Structured log function
export function log(service, message, status = 'info', emoji = '✨') {
  if (!isDevelopment) return;

  const timestamp = new Date().toISOString();
  const color = getStatusColor(status);
  const statusIcon = getStatusIcon(status);

  console.log(
    `${COLORS.fgCyan}${COLORS.dim}[${timestamp}]${COLORS.reset} ` +
      `${color}${emoji} ${COLORS.fgWhite}${COLORS.bright}[${service}]${COLORS.reset} ` +
      `${statusIcon} ${message}`
  );
}

// Get color based on status
function getStatusColor(status) {
  const colors = {
    start: COLORS.fgGreen,
    success: COLORS.fgGreen,
    complete: COLORS.fgGreen,
    done: COLORS.fgGreen,
    info: COLORS.fgBlue,
    init: COLORS.fgMagenta,
    pending: COLORS.fgYellow,
    loading: COLORS.fgYellow,
    warn: COLORS.fgYellow,
    warning: COLORS.fgYellow,
    error: COLORS.fgRed,
    fail: COLORS.fgRed,
    debug: COLORS.fgCyan,
    trace: COLORS.dim,
  };
  return colors[status] || COLORS.fgWhite;
}

// Get icon based on status
function getStatusIcon(status) {
  const icons = {
    start: EMOJIS.rocket,
    success: EMOJIS.check,
    complete: EMOJIS.trophy,
    done: EMOJIS.sparkles,
    info: EMOJIS.bulb,
    init: EMOJIS.gear,
    pending: EMOJIS.clock,
    loading: EMOJIS.spinner,
    warn: EMOJIS.alert,
    warning: EMOJIS.alert,
    error: EMOJIS.cross,
    fail: EMOJIS.cross,
    debug: EMOJIS.construction,
    trace: EMOJIS.wave,
  };
  return icons[status] || EMOJIS.sparkles;
}

// Convenience methods
export const logger = {
  // Initialization methods
  init: (service) => log(service, '🔧 Initializing...', 'init', EMOJIS.gear),
  started: (service) => log(service, '🎬 Started!', 'start', EMOJIS.rocket),
  complete: (service) => log(service, '✅ All set!', 'complete', EMOJIS.trophy),
  ready: (service) => log(service, '✨ Ready to rock!', 'success', EMOJIS.party),

  // State changes
  loading: (service, message) => log(service, message, 'loading', EMOJIS.clock),
  success: (service, message) => log(service, message, 'success', EMOJIS.check),
  warning: (service, message) => log(service, message, 'warning', EMOJIS.alert),
  warn: (service, message) => log(service, message, 'warn', EMOJIS.alert),
  error: (service, message) => log(service, message, 'error', EMOJIS.cross),

  // Call-specific methods
  callStart: (service, number) => log(service, `📞 Calling ${number}...`, 'info', EMOJIS.phone),
  callConnect: (service) => log(service, '🎉 Connected!', 'success', EMOJIS.party),
  callEnd: (service) => log(service, '👋 Call ended', 'info', EMOJIS.wave),
  incomingCall: (service, from) =>
    log(service, `📳 Incoming call from ${from}`, 'info', EMOJIS.satellite),

  // Audio/Recording
  recordingStart: (service) => log(service, '🎙️ Recording started', 'info', EMOJIS.recording),
  recordingStop: (service) => log(service, '🛑 Recording stopped', 'success', EMOJIS.recording),

  // Auth
  authStart: (service) => log(service, '🔐 Authenticating...', 'pending', EMOJIS.lock),
  authComplete: (service) => log(service, '🔓 Authenticated!', 'success', EMOJIS.key),

  // Debug/Trace
  debug: (service, message) => log(service, message, 'debug', EMOJIS.construction),
  trace: (service, message) => log(service, message, 'trace', EMOJIS.wave),

  // Custom
  log: (service, message, status = 'info') => log(service, message, status),
};

export default logger;
