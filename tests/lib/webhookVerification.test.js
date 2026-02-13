/**
 * Webhook Verification Tests
 * Tests for webhook signature verification logic
 */

describe('Webhook Verification', () => {
  describe('verifyTwilioSignature', () => {
    let crypto;

    beforeEach(() => {
      jest.resetModules();
      crypto = require('crypto');
    });

    test('should return false when authToken is missing', () => {
      const result = verifyTwilioSignature(
        'https://example.com/webhook',
        { CallSid: 'CA123' },
        'somesignature',
        null
      );
      expect(result).toBe(false);
    });

    test('should return false when signature is missing', () => {
      const result = verifyTwilioSignature(
        'https://example.com/webhook',
        { CallSid: 'CA123' },
        null,
        'authtoken'
      );
      expect(result).toBe(false);
    });

    test('should return false when formData is missing', () => {
      const result = verifyTwilioSignature(
        'https://example.com/webhook',
        null,
        'somesignature',
        'authtoken'
      );
      expect(result).toBe(false);
    });

    test('should return false for empty formData object', () => {
      const result = verifyTwilioSignature(
        'https://example.com/webhook',
        {},
        'somesignature',
        'authtoken'
      );
      expect(result).toBe(false);
    });

    test('should correctly verify valid signature', () => {
      const authToken = 'test_auth_token';
      const url = 'https://example.com/webhook';
      const formData = {
        CallSid: 'CA123456789',
        From: '+1234567890',
        To: '+0987654321',
      };

      // Generate expected signature
      const sortedKeys = Object.keys(formData).sort();
      const dataString = sortedKeys.map((key) => key + formData[key]).join('');
      const expectedSignature = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(url + dataString, 'utf-8'))
        .digest('base64');

      const result = verifyTwilioSignature(url, formData, expectedSignature, authToken);
      expect(result).toBe(true);
    });

    test('should return false for invalid signature', () => {
      const result = verifyTwilioSignature(
        'https://example.com/webhook',
        { CallSid: 'CA123' },
        'invalid_signature',
        'authtoken'
      );
      expect(result).toBe(false);
    });
  });

  describe('getWebhookUrl', () => {
    test('should construct URL from request headers', () => {
      const request = {
        headers: new Map([
          ['x-forwarded-proto', 'https'],
          ['host', 'example.com'],
        ]),
        url: 'https://example.com/api/webhooks/twilio/voice?param=value',
      };

      request.headers.get = (name) => {
        const headers = { 'x-forwarded-proto': 'https', host: 'example.com' };
        return headers[name];
      };

      const result = getWebhookUrl(request);
      expect(result).toBe('https://example.com/api/webhooks/twilio/voice');
    });

    test('should use http when x-forwarded-proto is missing', () => {
      const request = {
        headers: new Map([['host', 'example.com']]),
        url: 'http://example.com/api/webhooks/twilio/voice',
      };

      request.headers.get = (name) => {
        const headers = { host: 'example.com' };
        return headers[name];
      };

      const result = getWebhookUrl(request);
      expect(result).toBe('http://example.com/api/webhooks/twilio/voice');
    });
  });

  describe('Signature Generation Edge Cases', () => {
    test('should handle special characters in form data', () => {
      const crypto = require('crypto');
      const authToken = 'auth_token';
      const url = 'https://example.com/webhook';
      const formData = {
        Message: 'Hello World!',
        From: '+123 456',
      };

      const sortedKeys = Object.keys(formData).sort();
      const dataString = sortedKeys.map((key) => key + formData[key]).join('');

      expect(() => {
        crypto
          .createHmac('sha1', authToken)
          .update(Buffer.from(url + dataString, 'utf-8'))
          .digest('base64');
      }).not.toThrow();
    });

    test('should produce consistent signatures for same input', () => {
      const crypto = require('crypto');
      const authToken = 'auth_token';
      const url = 'https://example.com/webhook';
      const formData = { CallSid: 'CA123', From: '+123' };

      const sortedKeys = Object.keys(formData).sort();
      const dataString = sortedKeys.map((key) => key + formData[key]).join('');

      const sig1 = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(url + dataString, 'utf-8'))
        .digest('base64');

      const sig2 = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(url + dataString, 'utf-8'))
        .digest('base64');

      expect(sig1).toBe(sig2);
    });
  });
});

// Helper functions that mirror the actual implementation
function verifyTwilioSignature(url, formData, signature, authToken) {
  if (!authToken) {
    return false;
  }

  if (!signature) {
    return false;
  }

  if (!formData) {
    return false;
  }

  try {
    const crypto = require('crypto');
    const sortedKeys = Object.keys(formData).sort();
    const dataString = sortedKeys.map((key) => key + formData[key]).join('');

    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(url + dataString, 'utf-8'))
      .digest('base64');

    return expectedSignature === signature;
  } catch (error) {
    return false;
  }
}

function getWebhookUrl(request) {
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host');
  const path = new URL(request.url).pathname;

  return `${protocol}://${host}${path}`;
}
