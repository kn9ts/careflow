/**
 * PhoneNumberModal Component
 *
 * A modal dialog that prompts users to add their personal phone number.
 * This phone number is used for identity/lookup purposes and maps to
 * the user's care4wId for WebRTC calls when Twilio is not active.
 *
 * Features:
 * - Country code selector
 * - Real-time phone number validation
 * - Uniqueness check (debounced)
 * - Loading and error states
 * - Skip for now option
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Phone, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { getCountryList } from '@/lib/phoneUtils';
import styles from './PhoneNumberModal.module.css';

// Debounce helper
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function PhoneNumberModal({
  isOpen,
  onClose,
  onSuccess,
  token,
  defaultCountryCode = '254',
}) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);
  // null, 'valid', 'invalid', 'taken'
  const [validationStatus, setValidationStatus] = useState(null);
  const [skipRequested, setSkipRequested] = useState(false);

  const closeButtonRef = useRef(null);
  const inputRef = useRef(null);
  const countries = getCountryList();

  // Debounce phone number for uniqueness check
  const debouncedPhone = useDebounce(phoneNumber, 500);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhoneNumber('');
      setError(null);
      setValidationStatus(null);
      setSkipRequested(false);
      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Check uniqueness when phone number changes
  useEffect(() => {
    const checkUniqueness = async () => {
      if (!debouncedPhone || debouncedPhone.length < 7 || !token) {
        setValidationStatus(null);
        return;
      }

      setIsChecking(true);
      setError(null);

      try {
        const response = await fetch('/api/users/phone/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            phoneNumber: debouncedPhone,
            countryCode,
          }),
        });

        const data = await response.json();

        if (data.success && data.data.available) {
          setValidationStatus('valid');
        } else if (data.success && !data.data.available) {
          setValidationStatus('taken');
          setError('This phone number is already registered by another user');
        } else {
          setValidationStatus('invalid');
          setError(data.message || 'Invalid phone number');
        }
      } catch (err) {
        console.error('Phone check error:', err);
        setValidationStatus('invalid');
        setError('Failed to verify phone number');
      } finally {
        setIsChecking(false);
      }
    };

    checkUniqueness();
  }, [debouncedPhone, countryCode, token]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!phoneNumber || validationStatus !== 'valid') {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/users/phone', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            phoneNumber,
            countryCode,
          }),
        });

        const data = await response.json();

        if (data.success) {
          if (onSuccess) {
            onSuccess(data.data);
          }
          onClose();
        } else {
          setError(data.message || 'Failed to save phone number');
        }
      } catch (err) {
        console.error('Phone save error:', err);
        setError('Failed to save phone number. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [phoneNumber, countryCode, token, validationStatus, onSuccess, onClose]
  );

  // Handle skip
  const handleSkip = useCallback(() => {
    setSkipRequested(true);
    onClose();
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      handleSkip();
    }
  };

  // Handle phone number input change
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setPhoneNumber(value);
    setValidationStatus(null);
    setError(null);
  };

  // Handle country code change
  const handleCountryChange = (e) => {
    setCountryCode(e.target.value);
    setValidationStatus(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-modal-title"
      onClick={handleBackdropClick}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Phone className="w-5 h-5" />
          </div>
          <h2 id="phone-modal-title" className={styles.title}>
            Add Your Phone Number
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleSkip}
            className={styles.closeButton}
            aria-label="Close"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <p className={styles.description}>
            Your phone number helps other users find and call you on CareFlow. It will be used to
            map to your CareFlow ID for WebRTC calls.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Country Code Selector */}
            <div className={styles.inputGroup}>
              <label htmlFor="country-code" className={styles.label}>
                Country
              </label>
              <select
                id="country-code"
                value={countryCode}
                onChange={handleCountryChange}
                className={styles.select}
                disabled={isLoading}
              >
                {countries.map((country) => (
                  <option key={country.iso} value={country.code}>
                    {country.name} (+{country.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Phone Number Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="phone-number" className={styles.label}>
                Phone Number
              </label>
              <div className={styles.phoneInputWrapper}>
                <span className={styles.countryCodePrefix}>+{countryCode}</span>
                <div className={styles.inputWithIcon}>
                  <input
                    ref={inputRef}
                    id="phone-number"
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="712345678"
                    className={`${styles.phoneInput} ${
                      validationStatus === 'valid'
                        ? styles.inputValid
                        : validationStatus === 'invalid' || validationStatus === 'taken'
                          ? styles.inputInvalid
                          : ''
                    }`}
                    disabled={isLoading}
                    autoComplete="tel"
                  />
                  {isChecking && <Loader2 className={`${styles.inputIcon} ${styles.spinning}`} />}
                  {!isChecking && validationStatus === 'valid' && (
                    <Check className={`${styles.inputIcon} ${styles.iconValid}`} />
                  )}
                  {!isChecking &&
                    (validationStatus === 'invalid' || validationStatus === 'taken') && (
                      <AlertCircle className={`${styles.inputIcon} ${styles.iconInvalid}`} />
                    )}
                </div>
              </div>
              <p className={styles.hint}>Enter your phone number without the country code</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className={styles.error}>
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
              <button
                type="button"
                onClick={handleSkip}
                className={styles.skipButton}
                disabled={isLoading}
              >
                Skip for now
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading || validationStatus !== 'valid'}
              >
                {isLoading ? (
                  <>
                    <Loader2 className={`${styles.buttonIcon} ${styles.spinning}`} />
                    Saving...
                  </>
                ) : (
                  'Save Phone Number'
                )}
              </button>
            </div>
          </form>

          {/* Privacy Note */}
          <p className={styles.privacyNote}>
            Your phone number is used for identity purposes only and will not be shared with other
            users. It helps them find you on CareFlow.
          </p>
        </div>
      </div>
    </div>
  );
}
