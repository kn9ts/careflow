"use client";

import { useEffect, useState } from "react";
import { initializeApp } from "@/lib/init";

export default function AppInitializer({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeApp();
        setIsReady(true);
      } catch (err) {
        setError(err);
        console.error("App initialization failed:", err);
      }
    };

    init();
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    setError(null);
    try {
      await initializeApp();
      setIsReady(true);
    } catch (err) {
      setError(err);
    } finally {
      setIsRetrying(false);
    }
  };

  // Show error UI
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="max-w-md w-full mx-4 p-8 bg-background-card rounded-xl border border-white/10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Initialization Failed
          </h2>
          <p className="text-gray-400 mb-6">
            {error.message ||
              "An error occurred while initializing the application."}
          </p>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-6 py-3 bg-primary-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isRetrying ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Retrying...
              </span>
            ) : (
              "Try Again"
            )}
          </button>
          <p className="mt-4 text-xs text-gray-500">
            If the problem persists, check your environment configuration.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-center">
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-primary-red rounded-full opacity-20 animate-ping" />
            <div className="relative animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-red" />
          </div>
          <p className="mt-4 text-gray-400 text-sm">Initializing CareFlow...</p>
        </div>
      </div>
    );
  }

  return children;
}
