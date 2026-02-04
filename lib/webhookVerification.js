/**
 * Twilio Webhook Verification
 * Verifies that incoming webhook requests are actually from Twilio
 */

import crypto from "crypto";

/**
 * Verify Twilio webhook signature
 * @param {string} url - The full URL of the webhook endpoint
 * @param {Object} formData - The form data from the request
 * @param {string} signature - The X-Twilio-Signature header value
 * @param {string} authToken - The Twilio Auth Token from environment
 * @returns {boolean} - Whether the signature is valid
 */
export function verifyTwilioSignature(url, formData, signature, authToken) {
  if (!authToken) {
    console.error("TWILIO_AUTH_TOKEN not configured");
    return false;
  }

  if (!signature) {
    console.error("Missing X-Twilio-Signature header");
    return false;
  }

  if (!formData) {
    console.error("Invalid form data");
    return false;
  }

  try {
    // Sort the form data keys alphabetically
    const sortedKeys = Object.keys(formData).sort();

    // Create the data string: URL + sorted key-value pairs
    const dataString = sortedKeys
      .map((key) => `${key}${formData[key]}`)
      .join("");

    // Create the signature
    const expectedSignature = crypto
      .createHmac("sha1", authToken)
      .update(Buffer.from(url + dataString, "utf-8"))
      .digest("base64");

    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );
  } catch (error) {
    console.error("Error verifying Twilio signature:", error);
    return false;
  }
}

/**
 * Verify webhook request from Next.js Request object
 * @param {Request} request - Next.js Request object
 * @returns {Object} - Verification result with valid flag and formData
 */
export async function verifyWebhookRequest(request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    return {
      valid: false,
      error: "TWILIO_AUTH_TOKEN not configured",
    };
  }

  const signature = request.headers.get("x-twilio-signature");

  if (!signature) {
    return {
      valid: false,
      error: "Missing X-Twilio-Signature header",
    };
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const formDataObj = {};

    for (const [key, value] of formData.entries()) {
      formDataObj[key] = value;
    }

    // Get the full URL for verification
    const url = getWebhookUrl(request);

    // Verify signature
    const isValid = verifyTwilioSignature(
      url,
      formDataObj,
      signature,
      authToken,
    );

    if (!isValid) {
      return {
        valid: false,
        error: "Invalid webhook signature",
      };
    }

    return {
      valid: true,
      formData: formDataObj,
    };
  } catch (error) {
    console.error("Error verifying webhook request:", error);
    return {
      valid: false,
      error: "Failed to verify webhook",
    };
  }
}

/**
 * Get full URL for webhook verification
 * @param {Request} request - Next.js Request object
 * @returns {string} - The full URL
 */
export function getWebhookUrl(request) {
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host");
  const path = new URL(request.url).pathname;

  return `${protocol}://${host}${path}`;
}

export default {
  verifyTwilioSignature,
  verifyWebhookRequest,
  getWebhookUrl,
};
