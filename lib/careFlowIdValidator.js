/**
 * CareFlow ID Validator
 *
 * Validates care4w-XXXXXXX format IDs and phone numbers.
 * This module is safe for client-side use (no mongoose/server dependencies).
 */

/**
 * Validate a care4wId format
 * @param {string} care4wId - The ID to validate
 * @returns {boolean} True if valid format
 */
export function isValidCare4wId(care4wId) {
  if (!care4wId || typeof care4wId !== "string") {
    return false;
  }
  return /^care4w-\d{7}$/.test(care4wId);
}

/**
 * Validate phone number format (E.164)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} True if valid format
 */
export function isValidPhoneNumber(phone) {
  if (!phone || phone === "") {
    return true; // Empty is valid (optional field)
  }
  if (typeof phone !== "string") {
    return false;
  }
  // E.164 format: +[country code][number], minimum 7 digits total
  return /^\+?[1-9]\d{6,14}$/.test(phone);
}

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate display name
 * @param {string} displayName - The display name to validate
 * @returns {boolean} True if valid format
 */
export function isValidDisplayName(displayName) {
  if (!displayName || typeof displayName !== "string") {
    return false;
  }
  return displayName.length >= 2 && displayName.length <= 50;
}

/**
 * Generate a care4wId with timestamp-based sequence
 * @param {number} timestamp - Optional timestamp (defaults to now)
 * @returns {string} Generated care4wId
 */
export function generateCare4wId(timestamp = Date.now()) {
  const sequence = timestamp.toString().slice(-7);
  return `care4w-${sequence}`;
}

export default {
  isValidCare4wId,
  isValidPhoneNumber,
  isValidEmail,
  isValidDisplayName,
  generateCare4wId,
};
