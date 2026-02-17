import React, { useCallback, useMemo, useState, useEffect } from 'react';
import styles from './DialPad.module.css';

// Move dialPadKeys outside component to avoid recreation on every render
const dialPadKeys = [
  ['1', '', ''],
  ['2', 'ABC', 'abc'],
  ['3', 'DEF', 'def'],
  ['4', 'GHI', 'ghi'],
  ['5', 'JKL', 'jkl'],
  ['6', 'MNO', 'mno'],
  ['7', 'PQRS', 'pqrs'],
  ['8', 'TUV', 'tuv'],
  ['9', 'WXYZ', 'wxyz'],
  ['*', '', ''],
  ['0', '+', '+'],
  ['#', '', ''],
];

// Memoized formatDuration utility
export const formatPhoneNumber = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Memoized formatDuration for recording
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

function DialPad({ phoneNumber, setPhoneNumber, onDigitPress, disabled, placeholder, helpText }) {
  // Use local state as fallback if setPhoneNumber is not provided
  const [localPhoneNumber, setLocalPhoneNumber] = useState(phoneNumber || '');

  // Use the provided setPhoneNumber or fall back to local state
  const activeSetPhoneNumber = setPhoneNumber || setLocalPhoneNumber;
  const activePhoneNumber = (setPhoneNumber ? phoneNumber : localPhoneNumber) || '';

  // Update local state when prop phoneNumber changes (only if using local state)
  // Also sync when phoneNumber prop changes from undefined to defined value
  useEffect(() => {
    if (!setPhoneNumber && phoneNumber !== localPhoneNumber) {
      setLocalPhoneNumber(phoneNumber || '');
    }
  }, [phoneNumber, setPhoneNumber, localPhoneNumber]);

  // Memoize sanitized number calculation
  const sanitizedNumber = useMemo(
    () => (activePhoneNumber || '').replace(/\s+/g, ''),
    [activePhoneNumber]
  );

  // Memoize digit count to avoid recalculation
  const digitCount = useMemo(() => sanitizedNumber.length, [sanitizedNumber]);

  // Stable callback for digit press
  // Only call onDigitPress if setPhoneNumber is NOT provided (to avoid double updates)
  const handleDigitPress = useCallback(
    (digit) => {
      if (disabled) return;

      activeSetPhoneNumber((prev) => (prev || '') + digit);
      // Only call external onDigitPress when using local state (not controlled)
      if (!setPhoneNumber && onDigitPress) {
        onDigitPress(digit);
      }
    },
    [disabled, activeSetPhoneNumber, setPhoneNumber, onDigitPress]
  );

  const handleClear = useCallback(() => {
    activeSetPhoneNumber('');
  }, [activeSetPhoneNumber]);

  const handleBackspace = useCallback(() => {
    activeSetPhoneNumber((prev) => (prev || '').slice(0, -1));
  }, [activeSetPhoneNumber]);

  const handleInputChange = useCallback(
    (e) => {
      activeSetPhoneNumber(e.target.value);
    },
    [activeSetPhoneNumber]
  );

  return (
    <div className={styles.dialPadCard} data-testid="dial-pad">
      {/* Header with status */}
      <div className={styles.dialPadHeader}>
        <h2 className={styles.dialPadTitle}>Dial Pad</h2>
        <span className={disabled ? styles.statusLocked : styles.statusReady}>
          <span className={styles.statusDot} />
          {disabled ? 'Locked' : 'Ready'}
        </span>
      </div>

      {/* Phone number input */}
      <div className={styles.inputSection}>
        <div className={styles.inputWrapper}>
          <input
            type="tel"
            value={activePhoneNumber}
            onChange={handleInputChange}
            data-testid="phone-input"
            placeholder={placeholder || 'Enter phone number or CareFlow ID'}
            className={styles.phoneInput}
            disabled={disabled}
            aria-label="Phone number input"
          />
        </div>

        {/* Helper text row */}
        <div className={styles.helperRow}>
          <span className={styles.digitCount}>{digitCount} digits</span>
          <span className={styles.helpTip}>{helpText || 'Tip: include country code'}</span>
        </div>

        {/* Action buttons */}
        <div className={styles.actionButtons}>
          <button
            onClick={handleClear}
            disabled={disabled}
            data-testid="clear-button"
            className={styles.clearButton}
            aria-label="Clear phone number"
          >
            Clear
          </button>
          <button
            onClick={handleBackspace}
            disabled={disabled || !(activePhoneNumber || '').length}
            data-testid="backspace-button"
            className={styles.backspaceButton}
            aria-label="Delete last digit"
          >
            Backspace
          </button>
        </div>
      </div>

      {/* Dial pad grid */}
      <div className={styles.dialPadGrid}>
        {dialPadKeys.map(([digit, letters, smallLetters], index) => (
          <button
            key={index}
            onClick={() => handleDigitPress(digit)}
            disabled={disabled}
            data-testid={`dial-button-${digit}`}
            className={styles.dialButton}
            aria-label={`Dial ${digit}`}
          >
            <span className={styles.dialDigit}>{digit}</span>
            {letters && <span className={styles.dialLetters}>{letters}</span>}
            {smallLetters && <span className={styles.dialSmallLetters}>{smallLetters}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default React.memo(DialPad);
