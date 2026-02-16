'use client';

import { useEffect, useState } from 'react';
import { getInitializationStatus, isInitialized } from '@/lib/init';

/**
 * Initialization Status Component
 *
 * Displays the current initialization status of the application,
 * including environment configuration loading and service readiness.
 * This component is useful for debugging and monitoring application startup.
 */
export default function InitializationStatus({ showDetails = false, className = '' }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkStatus = () => {
      try {
        const currentStatus = getInitializationStatus();
        setStatus(currentStatus);

        // Check if initialization is complete
        if (!currentStatus.initialized) {
          // Retry after a short delay
          setTimeout(checkStatus, 1000);
        }
      } catch (err) {
        setError(err?.message || err || 'Unknown error');
      }
    };

    checkStatus();
  }, []);

  // Don't render if we don't want to show details and initialization is complete
  if (!showDetails && status?.initialized) {
    return null;
  }

  const getStatusColor = () => {
    if (error) return 'text-red-400';
    if (!status?.initialized) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusIcon = () => {
    if (error) return '❌';
    if (!status?.initialized) return '⏳';
    return '✅';
  };

  const getStatusText = () => {
    if (error) return 'Initialization Error';
    if (!status?.initialized) return 'Initializing...';
    return 'Initialized';
  };

  return (
    <div className={`border border-white/10 bg-background-card rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <span className="font-semibold text-white">Application Status</span>
        </div>
        <span className={`text-sm font-medium ${getStatusColor()}`}>{getStatusText()}</span>
      </div>

      {showDetails && (
        <div className="space-y-2 text-sm text-gray-400">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-gray-500">Environment:</span>
            <span className="text-white">{status?.environment || 'Unknown'}</span>

            <span className="text-gray-500">Initialized:</span>
            <span className="text-white">{status?.initialized ? 'Yes' : 'No'}</span>

            {status?.timestamp && (
              <>
                <span className="text-gray-500">Last Check:</span>
                <span className="text-white">{new Date(status.timestamp).toLocaleString()}</span>
              </>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
              <span className="text-red-400 font-medium">Error:</span>
              <p className="text-red-300 mt-1 text-xs">{error}</p>
            </div>
          )}

          {global.APP_METADATA && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
              <span className="text-blue-400 font-medium">Global Metadata:</span>
              <div className="mt-1 text-xs space-y-1">
                <div>App: {global.APP_METADATA.name}</div>
                <div>Version: {global.APP_METADATA.version}</div>
                <div>Environment: {global.APP_METADATA.environment}</div>
              </div>
            </div>
          )}

          {global.SERVICE_CONFIGS && (
            <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
              <span className="text-green-400 font-medium">Service Configs:</span>
              <div className="mt-1 text-xs space-y-1">
                {Object.keys(global.SERVICE_CONFIGS).map((service) => (
                  <div key={service} className="flex justify-between">
                    <span>{service}:</span>
                    <span className="text-green-300">Configured</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!status?.initialized && !error && (
        <div className="mt-2 text-xs text-gray-500">
          Initializing application configuration... This may take a moment.
        </div>
      )}
    </div>
  );
}

/**
 * Initialization Provider Component
 *
 * A wrapper component that ensures initialization is complete before rendering children.
 * Useful for critical components that require configuration to be loaded.
 */
export function InitializationProvider({ children, fallback = null }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkReady = async () => {
      try {
        // Wait for initialization to complete
        await new Promise((resolve) => {
          const check = () => {
            if (isInitialized()) {
              resolve();
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });

        setIsReady(true);
      } catch (err) {
        setError(err?.message || err || 'Unknown error');
      }
    };

    checkReady();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 text-center">
          <h2 className="text-red-400 text-lg font-semibold mb-2">Initialization Failed</h2>
          <p className="text-red-300 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      fallback || (
        <div className="min-h-screen bg-background-dark flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-red mx-auto mb-4" />
            <p className="text-gray-400">Initializing application...</p>
          </div>
        </div>
      )
    );
  }

  return children;
}

/**
 * Development-only initialization monitor
 *
 * Displays real-time initialization status for development debugging.
 */
export function DevelopmentInitializationMonitor() {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <InitializationStatus showDetails />
    </div>
  );
}
