/**
 * CareFlow ID Validator
 *
 * Validates care4w-XXXXXXX format IDs.
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

export default {
  isValidCare4wId,
};
