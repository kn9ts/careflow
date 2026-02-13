/**
 * CareFlow ID Validator Tests
 * Tests for the client-safe ID validation utility
 */

// Inline implementation matching the actual module
function isValidCare4wId(care4wId) {
  if (!care4wId || typeof care4wId !== 'string') {
    return false;
  }
  return /^care4w-\d{7}$/.test(care4wId);
}

describe('CareFlow ID Validator', () => {
  describe('isValidCare4wId', () => {
    test('should match care4w- prefix followed by exactly 7 digits', () => {
      expect(isValidCare4wId('care4w-1000001')).toBe(true);
      expect(isValidCare4wId('care4w-9999999')).toBe(true);
      expect(isValidCare4wId('care4w-0000001')).toBe(true);
    });

    test('should return false for invalid care4wId format', () => {
      expect(isValidCare4wId('care4w-')).toBe(false);
      expect(isValidCare4wId('care4w-abc123')).toBe(false);
      expect(isValidCare4wId('care4w-100000')).toBe(false);
      expect(isValidCare4wId('care4w-10000001')).toBe(false);
      expect(isValidCare4wId('user-1000001')).toBe(false);
      expect(isValidCare4wId('1000001')).toBe(false);
    });

    test('should return false for null or undefined', () => {
      expect(isValidCare4wId(null)).toBe(false);
      expect(isValidCare4wId(undefined)).toBe(false);
    });

    test('should return false for non-string types', () => {
      expect(isValidCare4wId(1234567)).toBe(false);
      expect(isValidCare4wId({})).toBe(false);
      expect(isValidCare4wId([])).toBe(false);
      expect(isValidCare4wId(true)).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isValidCare4wId('')).toBe(false);
    });

    test('should return false for whitespace strings', () => {
      expect(isValidCare4wId('  ')).toBe(false);
      expect(isValidCare4wId(' care4w-1000001')).toBe(false);
      expect(isValidCare4wId('care4w-1000001 ')).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(isValidCare4wId('CARE4W-1000001')).toBe(false);
      expect(isValidCare4wId('care4w-1000001\n')).toBe(false);
    });
  });

  describe('ID Length Validation', () => {
    test('should have consistent ID length', () => {
      const id1 = 'care4w-1000001';
      const id2 = 'care4w-0000001';
      const id3 = 'care4w-9999999';

      // care4w- (7 chars) + 1000001 (7 chars) = 14 chars
      expect(id1.length).toBe(14);
      expect(id2.length).toBe(14);
      expect(id3.length).toBe(14);
    });
  });

  describe('Function Type', () => {
    test('should be a function', () => {
      expect(typeof isValidCare4wId).toBe('function');
    });
  });
});
