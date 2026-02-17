'use client';

import React, { useEffect, useState } from 'react';
import styles from './ErrorToast.module.css';

/**
 * ErrorToast Component
 *
 * A toast-style notification for displaying error messages.
 * Auto-dismisses after a specified duration.
 *
 * @param {Object} props
 * @param {string} props.message - The error message to display
 * @param {boolean} props.visible - Whether the toast is visible
 * @param {Function} props.onDismiss - Dismiss callback
 * @param {number} props.autoHideDuration - Auto-hide duration in ms (default: 5000)
 * @param {string} props.type - Toast type:
 * 'error' | 'success' | 'warning' | 'info' (default: 'error')
 */

const icons = {
  error: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  success: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  warning: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

export default function ErrorToast({
  message,
  visible,
  onDismiss,
  autoHideDuration = 5000,
  type = 'error',
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  useEffect(() => {
    if (isVisible && autoHideDuration > 0 && onDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHideDuration, onDismiss]);

  if (!isVisible || !message) return null;

  return (
    <div className={`${styles.toast} ${styles[type]}`} role="alert">
      <div className={styles.toastIcon}>{icons[type]}</div>
      <div className={styles.toastContent}>
        <p className={styles.toastMessage}>{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            onDismiss();
          }}
          className={styles.toastDismiss}
          aria-label="Dismiss"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
