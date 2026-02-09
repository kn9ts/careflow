/**
 * ErrorBoundary Component
 * Catches and handles React component errors
 */

import { Component } from "react";
import { RefreshCw, AlertCircle, Home } from "lucide-react";
import Link from "next/link";
import styles from "./ErrorBoundary.module.css";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error caught by boundary:", error, errorInfo);
    }

    // Send to error reporting service if configured
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorContent}>
            <div className={styles.errorIconWrapper}>
              <AlertCircle size={48} className="text-red-500" />
            </div>

            <h2 className={styles.errorTitle}>Something went wrong</h2>

            <p className={styles.errorMessage}>
              {this.state.error?.message || "An unexpected error occurred"}
            </p>

            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className={styles.errorDetails}>
                <summary className={styles.errorSummary}>Error Details</summary>
                <pre className={styles.errorStack}>
                  {this.state.error?.toString()}
                  {"\n\n"}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className={styles.errorActions}>
              <button
                onClick={this.handleRetry}
                className={styles.errorRetryBtn}
              >
                <RefreshCw size={16} />
                Try Again
              </button>

              <Link href="/" className={styles.errorHomeBtn}>
                <Home size={16} />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Simple error display component for functional components
 */
export function ErrorDisplay({ error, onRetry, className = "" }) {
  return (
    <div className={`${styles.errorDisplay} ${className}`}>
      <AlertCircle size={24} className={styles.errorDisplayIcon} />
      <p className={styles.errorDisplayMessage}>
        {error?.message || "An error occurred"}
      </p>
      {onRetry && (
        <button onClick={onRetry} className={styles.errorDisplayRetry}>
          <RefreshCw size={16} />
          Retry
        </button>
      )}
    </div>
  );
}
