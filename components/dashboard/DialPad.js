import React, { useCallback, useMemo, useState, useEffect } from 'react';

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
    <div className="card" data-testid="dial-pad">
      {/* Header with status */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="card-title">Dial Pad</h2>
        <span className={`badge ${disabled ? 'badge-warning' : 'badge-success'}`}>
          {disabled ? 'Locked' : 'Ready'}
        </span>
      </div>

      {/* Phone number input */}
      <div className="mb-4">
        <div className="bg-background-input rounded-xl p-4 mb-3 border border-white/5 focus-within:border-primary-red/30 focus-within:ring-1 focus-within:ring-primary-red/20 transition-all">
          <input
            type="tel"
            value={activePhoneNumber}
            onChange={handleInputChange}
            data-testid="phone-input"
            placeholder={placeholder || 'Enter phone number or CareFlow ID'}
            className="w-full bg-transparent text-white text-lg font-mono outline-none placeholder-gray-500"
            disabled={disabled}
            aria-label="Phone number input"
          />
        </div>

        {/* Helper text row */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <span className="font-medium">{digitCount} digits</span>
          <span>{helpText || 'Tip: include country code'}</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClear}
            disabled={disabled}
            data-testid="clear-button"
            className="flex-1 px-4 py-2.5 bg-gray-600 text-white font-medium rounded-xl hover:bg-gray-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background-card"
            aria-label="Clear phone number"
          >
            Clear
          </button>
          <button
            onClick={handleBackspace}
            disabled={disabled || !(activePhoneNumber || '').length}
            data-testid="backspace-button"
            className="flex-1 px-4 py-2.5 bg-red-600/80 text-white font-medium rounded-xl hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-card"
            aria-label="Delete last digit"
          >
            Backspace
          </button>
        </div>
      </div>

      {/* Dial pad grid */}
      <div className="grid grid-cols-3 gap-3">
        {dialPadKeys.map(([digit, letters, smallLetters], index) => (
          <button
            key={index}
            onClick={() => handleDigitPress(digit)}
            disabled={disabled}
            data-testid={`dial-button-${digit}`}
            className="aspect-square bg-background-input rounded-xl flex flex-col items-center justify-center
                       hover:bg-white/10 active:scale-95
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-150
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-red focus-visible:ring-offset-2 focus-visible:ring-offset-background-card"
            aria-label={`Dial ${digit}`}
          >
            <span className="text-white text-2xl font-bold">{digit}</span>
            {letters && (
              <span className="text-gray-400 text-xs mt-0.5 tracking-wider">{letters}</span>
            )}
            {smallLetters && (
              <span className="text-gray-500 text-xs tracking-wider">{smallLetters}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default React.memo(DialPad);
