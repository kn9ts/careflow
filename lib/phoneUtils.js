/**
 * Phone Number Utility Functions
 *
 * Provides parsing, validation, and formatting for phone numbers.
 * Uses E.164 format for international phone numbers.
 */

/**
 * Common country codes with their calling codes
 */
export const COUNTRY_CODES = {
  KE: { name: 'Kenya', code: '254', pattern: /^0?([17]\d{8})$/ },
  US: { name: 'United States', code: '1', pattern: /^1?(\d{10})$/ },
  GB: { name: 'United Kingdom', code: '44', pattern: /^0?(\d{10})$/ },
  NG: { name: 'Nigeria', code: '234', pattern: /^0?([789]\d{9})$/ },
  ZA: { name: 'South Africa', code: '27', pattern: /^0?(\d{9})$/ },
  UG: { name: 'Uganda', code: '256', pattern: /^0?(\d{9})$/ },
  TZ: { name: 'Tanzania', code: '255', pattern: /^0?(\d{9})$/ },
  RW: { name: 'Rwanda', code: '250', pattern: /^0?(\d{9})$/ },
  GH: { name: 'Ghana', code: '233', pattern: /^0?(\d{9})$/ },
  EG: { name: 'Egypt', code: '20', pattern: /^0?(\d{10})$/ },
  IN: { name: 'India', code: '91', pattern: /^0?(\d{10})$/ },
  CN: { name: 'China', code: '86', pattern: /^0?(\d{11})$/ },
  DE: { name: 'Germany', code: '49', pattern: /^0?(\d{10,11})$/ },
  FR: { name: 'France', code: '33', pattern: /^0?(\d{9})$/ },
  CA: { name: 'Canada', code: '1', pattern: /^1?(\d{10})$/ },
  AU: { name: 'Australia', code: '61', pattern: /^0?(\d{9})$/ },
  JP: { name: 'Japan', code: '81', pattern: /^0?(\d{10})$/ },
  BR: { name: 'Brazil', code: '55', pattern: /^0?(\d{10,11})$/ },
  MX: { name: 'Mexico', code: '52', pattern: /^0?(\d{10})$/ },
};

/**
 * Parse a phone number to extract country code and national number
 * @param {string} phoneNumber - Phone number in any format
 * @param {string} defaultCountryCode - Default country code if not in number
 * @returns {{ full: string, national: string, countryCode: string, valid: boolean }}
 */
export function parsePhoneNumber(phoneNumber, defaultCountryCode = '254') {
  if (!phoneNumber) {
    return {
      full: null,
      national: null,
      countryCode: null,
      valid: false,
      error: 'Phone number is required',
    };
  }

  // Remove all non-digit characters except leading +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // Remove leading + if present
  let hasPlus = cleaned.startsWith('+');
  if (hasPlus) {
    cleaned = cleaned.substring(1);
  }

  // If number starts with 00, it's international format
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
    hasPlus = true;
  }

  let countryCode = null;
  let nationalNumber = null;

  if (hasPlus || cleaned.length > 10) {
    // Try to match country code
    // Sort by code length descending to match longer codes first
    const sortedCountries = Object.entries(COUNTRY_CODES).sort(
      (a, b) => b[1].code.length - a[1].code.length
    );

    for (const [, info] of sortedCountries) {
      if (cleaned.startsWith(info.code)) {
        countryCode = info.code;
        nationalNumber = cleaned.substring(info.code.length);
        break;
      }
    }

    // If no country code matched, use the default
    if (!countryCode) {
      countryCode = defaultCountryCode;
      nationalNumber = cleaned;
    }
  } else {
    // Local format - use default country code
    countryCode = defaultCountryCode;
    nationalNumber = cleaned;
  }

  // Remove leading zero from national number if present
  if (nationalNumber.startsWith('0')) {
    nationalNumber = nationalNumber.substring(1);
  }

  // Validate national number length (typically 7-15 digits)
  if (nationalNumber.length < 7 || nationalNumber.length > 15) {
    return {
      full: null,
      national: null,
      countryCode: null,
      valid: false,
      error: 'Invalid phone number length',
    };
  }

  // Validate that national number contains only digits
  if (!/^\d+$/.test(nationalNumber)) {
    return {
      full: null,
      national: null,
      countryCode: null,
      valid: false,
      error: 'Phone number must contain only digits',
    };
  }

  const full = `+${countryCode}${nationalNumber}`;

  return {
    full,
    national: nationalNumber,
    countryCode,
    valid: true,
  };
}

/**
 * Validate a phone number in E.164 format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    return { valid: false, error: 'Phone number is required' };
  }

  // E.164 format: +[country code][national number]
  // Total length: up to 15 digits (excluding +)
  const e164Pattern = /^\+[1-9]\d{1,14}$/;

  if (!e164Pattern.test(phoneNumber)) {
    return {
      valid: false,
      error: 'Invalid phone number format. Use E.164 format (e.g., +254712345678)',
    };
  }

  return { valid: true };
}

/**
 * Format a phone number to E.164 format
 * @param {string} nationalNumber - National number without country code
 * @param {string} countryCode - Country calling code
 * @returns {string} Phone number in E.164 format
 */
export function formatToE164(nationalNumber, countryCode) {
  // Remove leading zero if present
  let national = nationalNumber.replace(/^0/, '');
  // Remove all non-digits
  national = national.replace(/\D/g, '');

  return `+${countryCode}${national}`;
}

/**
 * Format a phone number for display
 * @param {string} phoneNumber - Phone number in E.164 format
 * @returns {string} Formatted phone number for display
 */
export function formatForDisplay(phoneNumber) {
  if (!phoneNumber) return '';

  const parsed = parsePhoneNumber(phoneNumber);
  if (!parsed.valid) return phoneNumber;

  const { national, countryCode } = parsed;

  // Format based on country
  if (countryCode === '254') {
    // Kenya: +254 7XX XXX XXX
    if (national.length === 9) {
      return `+${countryCode} ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
    }
  } else if (countryCode === '1') {
    // US/Canada: +1 (XXX) XXX-XXXX
    if (national.length === 10) {
      return `+${countryCode} (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
    }
  }

  // Default formatting: groups of 3-4 digits
  const groups = national.match(/.{1,4}/g) || [];
  return `+${countryCode} ${groups.join(' ')}`;
}

/**
 * Check if a string looks like a phone number
 * @param {string} input - Input string to check
 * @returns {boolean} True if input looks like a phone number
 */
export function looksLikePhoneNumber(input) {
  // Handle non-string inputs (null, undefined, objects, numbers, etc.)
  if (!input) return false;
  if (typeof input !== 'string') return false;

  // Remove common formatting characters
  const cleaned = input.replace(/[\s\-\(\)\.]/g, '');

  // Check if it's mostly digits with optional leading +
  // Require minimum 8 digits to avoid conflicts with care4wId 7-digit sequences
  if (/^\+?\d{8,15}$/.test(cleaned)) {
    return true;
  }

  // Check if it starts with a country code pattern (minimum 8 digits total)
  if (/^\+?[1-9]\d{7,14}$/.test(cleaned)) {
    return true;
  }

  return false;
}

/**
 * Get country info by code
 * @param {string} countryCode - Country calling code
 * @returns {{ code: string, name: string } | null}
 */
export function getCountryByCode(countryCode) {
  for (const [iso, info] of Object.entries(COUNTRY_CODES)) {
    if (info.code === countryCode) {
      return { iso, ...info };
    }
  }
  return null;
}

/**
 * Get list of all countries for dropdown
 * @returns {Array<{ code: string, name: string, iso: string }>}
 */
export function getCountryList() {
  return Object.entries(COUNTRY_CODES)
    .map(([iso, info]) => ({
      iso,
      code: info.code,
      name: info.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
