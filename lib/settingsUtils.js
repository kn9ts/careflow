/**
 * Settings-aware formatting utilities
 * These functions use user display settings for consistent formatting
 */

import { DEFAULT_SETTINGS } from '@/hooks/useSettings';

/**
 * Format a date according to user's display settings
 * @param {Date|string|number} date - The date to format
 * @param {Object} displaySettings - User's display settings
 * @returns {string} Formatted date string
 */
export function formatDate(date, displaySettings = DEFAULT_SETTINGS.display) {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  switch (displaySettings.dateFormat) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
}

/**
 * Format time according to user's display settings
 * @param {Date|string|number} date - The date/time to format
 * @param {Object} displaySettings - User's display settings
 * @returns {string} Formatted time string
 */
export function formatTime(date, displaySettings = DEFAULT_SETTINGS.display) {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return 'Invalid time';
  }

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (displaySettings.timeFormat === '12h') {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    return `${hours}:${minutes} ${ampm}`;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Format date and time according to user's display settings
 * @param {Date|string|number} date - The date/time to format
 * @param {Object} displaySettings - User's display settings
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date, displaySettings = DEFAULT_SETTINGS.display) {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }

  // Convert to user's timezone if specified
  let displayDate = d;
  if (displaySettings.timezone && displaySettings.timezone !== 'UTC') {
    try {
      // Use Intl.DateTimeFormat to get the time in the target timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: displaySettings.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: displaySettings.timeFormat === '12h',
      });
      return formatter.format(d);
    } catch {
      // Fallback to local time if timezone is invalid
    }
  }

  return `${formatDate(d, displaySettings)} ${formatTime(d, displaySettings)}`;
}

/**
 * Format a timestamp for display in the user's timezone
 * @param {Date|string|number} date - The date/time to format
 * @param {Object} displaySettings - User's display settings
 * @returns {string} Formatted timestamp string
 */
export function formatTimestamp(date, displaySettings = DEFAULT_SETTINGS.display) {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return 'Invalid timestamp';
  }

  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Show relative time for recent timestamps
  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  // Show formatted date for older timestamps
  return formatDateTime(d, displaySettings);
}

/**
 * Format duration in seconds to a human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) {
    return '0:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}:${String(remainingMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get the user's timezone offset in hours
 * @param {string} timezone - IANA timezone string
 * @returns {string} Timezone offset string (e.g., "+03:00")
 */
export function getTimezoneOffset(timezone) {
  if (!timezone || timezone === 'UTC') {
    return '+00:00';
  }

  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const diff = (tzDate - utcDate) / 3600000; // diff in hours

    const sign = diff >= 0 ? '+' : '-';
    const absDiff = Math.abs(diff);
    const hours = Math.floor(absDiff);
    const mins = Math.round((absDiff - hours) * 60);

    return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  } catch {
    return '+00:00';
  }
}

/**
 * Get a list of common timezones
 * @returns {Array} Array of timezone objects with value and label
 */
export function getCommonTimezones() {
  return [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
    { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)', offset: '+03:00' },
    { value: 'America/New_York', label: 'America/New_York (EST/EDT)', offset: '-05:00' },
    { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)', offset: '-06:00' },
    { value: 'America/Denver', label: 'America/Denver (MST/MDT)', offset: '-07:00' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)', offset: '-08:00' },
    { value: 'Europe/London', label: 'Europe/London (GMT/BST)', offset: '+00:00' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)', offset: '+01:00' },
    { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)', offset: '+01:00' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)', offset: '+04:00' },
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)', offset: '+05:30' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)', offset: '+08:00' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)', offset: '+09:00' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)', offset: '+10:00' },
    { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST/NZDT)', offset: '+12:00' },
  ];
}

export default {
  formatDate,
  formatTime,
  formatDateTime,
  formatTimestamp,
  formatDuration,
  getTimezoneOffset,
  getCommonTimezones,
};
