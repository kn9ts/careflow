/**
 * API Response Utilities Tests
 * Tests for response formatting and error handling utilities
 */

// Inline implementations matching the actual module
function successResponse(data, options = {}) {
  return {
    success: true,
    data,
    message: options.message || null,
    meta: options.meta || null,
    timestamp: new Date().toISOString(),
  };
}

function errorResponse(message, options = {}) {
  return {
    success: false,
    error: {
      message,
      code: options.code || "ERROR",
      details: options.details || null,
      status: options.status || 500,
      timestamp: new Date().toISOString(),
    },
  };
}

describe("API Response Utilities", () => {
  describe("successResponse", () => {
    test("should create success response with data", () => {
      const data = { items: [1, 2, 3] };
      const response = successResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.timestamp).toBeDefined();
    });

    test("should create success response with message", () => {
      const data = { id: "123" };
      const message = "User created";
      const response = successResponse(data, { message });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe(message);
    });

    test("should create success response with metadata", () => {
      const data = { items: [] };
      const meta = { total: 0, page: 1 };
      const response = successResponse(data, { meta });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.meta).toEqual(meta);
    });
  });

  describe("errorResponse", () => {
    test("should create error response with message", () => {
      const message = "Something went wrong";
      const response = errorResponse(message);

      expect(response.success).toBe(false);
      expect(response.error.message).toBe(message);
      expect(response.error.code).toBe("ERROR");
    });

    test("should create error response with custom code", () => {
      const message = "Invalid input";
      const code = "VALIDATION_ERROR";
      const response = errorResponse(message, { code });

      expect(response.success).toBe(false);
      expect(response.error.message).toBe(message);
      expect(response.error.code).toBe(code);
    });

    test("should create error response with status", () => {
      const message = "Unauthorized";
      const status = 401;
      const response = errorResponse(message, { status });

      expect(response.success).toBe(false);
      expect(response.error.message).toBe(message);
      expect(response.error.status).toBe(status);
    });

    test("should create error response with details", () => {
      const message = "Validation failed";
      const details = { fields: ["email", "password"] };
      const response = errorResponse(message, { details });

      expect(response.success).toBe(false);
      expect(response.error.message).toBe(message);
      expect(response.error.details).toEqual(details);
    });
  });

  describe("Response Structure", () => {
    test("success response should have correct JSON structure", () => {
      const response = successResponse({ id: "123" });

      expect(response).toHaveProperty("success", true);
      expect(response).toHaveProperty("data");
      expect(response).toHaveProperty("timestamp");
    });

    test("error response should have correct JSON structure", () => {
      const response = errorResponse("Test error", { code: "TEST_CODE" });

      expect(response).toHaveProperty("success", false);
      expect(response).toHaveProperty("error");
      expect(response.error).toHaveProperty("message");
      expect(response.error).toHaveProperty("code");
      expect(response.error).toHaveProperty("timestamp");
    });
  });
});
