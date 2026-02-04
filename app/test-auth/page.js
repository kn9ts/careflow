"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function TestAuthPage() {
  const router = useRouter();
  const { currentUser, token, loading, error, login, logout, resetPassword } =
    useAuth();
  const [testResults, setTestResults] = useState([]);
  const [testEmail, setTestEmail] = useState("test@example.com");
  const [testPassword, setTestPassword] = useState("test123");

  const addTestResult = (test, success, message) => {
    setTestResults((prev) => [
      ...prev,
      {
        test,
        success,
        message,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const runTests = async () => {
    setTestResults([]);

    // Test 1: Firebase Configuration
    try {
      const { isConfigured, configMessage } = await import("@/lib/firebase");
      addTestResult(
        "Firebase Configuration",
        isConfigured,
        isConfigured ? "Firebase properly configured" : configMessage,
      );
    } catch (err) {
      addTestResult("Firebase Configuration", false, err.message);
    }

    // Test 2: Authentication State
    addTestResult(
      "Authentication State",
      !loading && !error,
      loading
        ? "Still loading authentication state"
        : error
          ? `Auth error: ${error}`
          : "Authentication state loaded successfully",
    );

    // Test 3: User Object Structure
    if (currentUser) {
      const requiredFields = ["uid", "email"];
      const hasRequiredFields = requiredFields.every(
        (field) => currentUser[field] !== undefined,
      );
      addTestResult(
        "User Object Structure",
        hasRequiredFields,
        hasRequiredFields
          ? "User object has all required fields"
          : "User object missing required fields",
      );
    } else {
      addTestResult("User Object Structure", false, "No current user");
    }

    // Test 4: Token Validation
    if (token) {
      try {
        // Basic token format check
        const tokenParts = token.split(".");
        const isValidFormat = tokenParts.length === 3;
        addTestResult(
          "Token Format",
          isValidFormat,
          isValidFormat ? "Token has valid JWT format" : "Invalid token format",
        );
      } catch (err) {
        addTestResult("Token Format", false, err.message);
      }
    } else {
      addTestResult("Token Format", false, "No token available");
    }

    // Test 5: Protected API Access
    try {
      const response = await fetch("/api/calls/history", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      addTestResult(
        "Protected API Access",
        response.ok,
        response.ok
          ? "Successfully accessed protected endpoint"
          : `API returned ${response.status}`,
      );
    } catch (err) {
      addTestResult("Protected API Access", false, err.message);
    }

    // Test 6: Session Persistence
    try {
      // Test that we can access auth state after a brief delay
      await new Promise((resolve) => setTimeout(resolve, 100));
      const hasPersistentAuth = !!currentUser || !!token;
      addTestResult(
        "Session Persistence",
        hasPersistentAuth,
        hasPersistentAuth
          ? "Authentication state persists"
          : "Authentication state not persistent",
      );
    } catch (err) {
      addTestResult("Session Persistence", false, err.message);
    }
  };

  const testLogin = async () => {
    try {
      const result = await login(testEmail, testPassword);
      addTestResult(
        "Login Test",
        result.success,
        result.success ? "Login successful" : result.error,
      );
    } catch (err) {
      addTestResult("Login Test", false, err.message);
    }
  };

  const testLogout = async () => {
    try {
      const result = await logout();
      addTestResult(
        "Logout Test",
        result.success,
        result.success ? "Logout successful" : result.error,
      );
    } catch (err) {
      addTestResult("Logout Test", false, err.message);
    }
  };

  const testPasswordReset = async () => {
    try {
      const result = await resetPassword(testEmail);
      addTestResult(
        "Password Reset Test",
        result.success,
        result.success ? "Password reset email sent" : result.error,
      );
    } catch (err) {
      addTestResult("Password Reset Test", false, err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-red"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-primary-blue/10 to-background-dark">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-background-card rounded-xl border border-white/10 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Authentication Test Suite
              </h1>
              <p className="text-gray-400">
                Comprehensive testing of Firebase Authentication implementation
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:opacity-90 transition-all"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 bg-primary-red text-white rounded-lg hover:opacity-90 transition-all"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-background-card rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              Current User
            </h3>
            <p className="text-gray-400 text-sm">
              {currentUser
                ? `Logged in as ${currentUser.email}`
                : "Not authenticated"}
            </p>
          </div>
          <div className="bg-background-card rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Token</h3>
            <p className="text-gray-400 text-sm">
              {token ? "Token available" : "No token"}
            </p>
          </div>
          <div className="bg-background-card rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Error</h3>
            <p className="text-gray-400 text-sm">
              {error ? error : "No errors"}
            </p>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-background-card rounded-xl border border-white/10 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Authentication Tests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <button
              onClick={runTests}
              className="px-4 py-2 bg-gradient-to-r from-primary-red to-primary-blue text-white rounded-lg hover:opacity-90 transition-all"
            >
              Run All Tests
            </button>
            <button
              onClick={testLogin}
              className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:opacity-90 transition-all"
            >
              Test Login
            </button>
            <button
              onClick={testLogout}
              className="px-4 py-2 bg-primary-cyan text-white rounded-lg hover:opacity-90 transition-all"
            >
              Test Logout
            </button>
            <button
              onClick={testPasswordReset}
              className="px-4 py-2 bg-primary-green text-white rounded-lg hover:opacity-90 transition-all"
            >
              Test Password Reset
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-background-card rounded-xl border border-white/10 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Test Results
          </h2>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.success
                    ? "bg-green-500/20 border-green-500/50 text-green-200"
                    : "bg-red-500/20 border-red-500/50 text-red-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold">{result.test}</span>
                    <p className="text-sm mt-1">{result.message}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {result.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {testResults.length === 0 && (
              <p className="text-gray-400 text-sm">
                Run tests to see results here
              </p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-background-card rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Test Instructions
          </h3>
          <div className="text-gray-400 space-y-2 text-sm">
            <p>
              1. <strong>Configuration Test:</strong> Verifies Firebase
              configuration is properly set up
            </p>
            <p>
              2. <strong>Authentication State:</strong> Checks if user is
              authenticated and error-free
            </p>
            <p>
              3. <strong>User Object Structure:</strong> Validates user object
              has required fields
            </p>
            <p>
              4. <strong>Token Validation:</strong> Checks if authentication
              token is properly formatted
            </p>
            <p>
              5. <strong>Protected API Access:</strong> Tests access to
              protected endpoints
            </p>
            <p>
              6. <strong>Session Persistence:</strong> Verifies authentication
              state persists
            </p>
            <p className="mt-4 text-yellow-400">
              Note: This is a testing page. Use real credentials only in
              development environment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
