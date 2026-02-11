import React, { useCallback, useMemo, useState, useEffect } from "react";

// Move dialPadKeys outside component to avoid recreation on every render
const dialPadKeys = [
  ["1", "", ""],
  ["2", "ABC", "abc"],
  ["3", "DEF", "def"],
  ["4", "GHI", "ghi"],
  ["5", "JKL", "jkl"],
  ["6", "MNO", "mno"],
  ["7", "PQRS", "pqrs"],
  ["8", "TUV", "tuv"],
  ["9", "WXYZ", "wxyz"],
  ["*", "", ""],
  ["0", "+", "+"],
  ["#", "", ""],
];

// Memoized formatDuration utility
export const formatPhoneNumber = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Memoized formatDuration for recording
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

function DialPad({
  phoneNumber,
  setPhoneNumber,
  onDigitPress,
  disabled,
  placeholder,
  helpText,
}) {
  // Use local state as fallback if setPhoneNumber is not provided
  const [localPhoneNumber, setLocalPhoneNumber] = useState(phoneNumber || "");

  // Use the provided setPhoneNumber or fall back to local state
  const activeSetPhoneNumber = setPhoneNumber || setLocalPhoneNumber;
  const activePhoneNumber = setPhoneNumber ? phoneNumber : localPhoneNumber;

  // Update local state when prop phoneNumber changes (only if using local state)
  useEffect(() => {
    if (!setPhoneNumber && phoneNumber !== localPhoneNumber) {
      setLocalPhoneNumber(phoneNumber);
    }
  }, [phoneNumber, setPhoneNumber, localPhoneNumber]);

  // Memoize sanitized number calculation
  const sanitizedNumber = useMemo(
    () => (activePhoneNumber || "").replace(/\s+/g, ""),
    [activePhoneNumber],
  );

  // Memoize digit count to avoid recalculation
  const digitCount = useMemo(() => sanitizedNumber.length, [sanitizedNumber]);

  // Stable callback for digit press
  const handleDigitPress = useCallback(
    (digit) => {
      if (disabled) return;

      activeSetPhoneNumber((prev) => (prev || "") + digit);
      if (onDigitPress) {
        onDigitPress(digit);
      }
    },
    [disabled, activeSetPhoneNumber, onDigitPress],
  );

  const handleClear = useCallback(() => {
    activeSetPhoneNumber("");
  }, [activeSetPhoneNumber]);

  const handleBackspace = useCallback(() => {
    activeSetPhoneNumber((prev) => (prev || "").slice(0, -1));
  }, [activeSetPhoneNumber]);

  const handleInputChange = useCallback(
    (e) => {
      activeSetPhoneNumber(e.target.value);
    },
    [activeSetPhoneNumber],
  );

  return (
    <div className="bg-background-card rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Dial Pad</h2>
        <span className="text-xs text-gray-400">
          {disabled ? "Locked" : "Ready"}
        </span>
      </div>

      <div className="mb-4">
        <div className="bg-background-input rounded-lg p-4 mb-2 border border-white/5">
          <input
            type="tel"
            value={activePhoneNumber}
            onChange={handleInputChange}
            placeholder={placeholder || "Enter phone number or CareFlow ID"}
            className="w-full bg-transparent text-white text-lg font-mono outline-none"
            disabled={disabled}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>{digitCount} digits</span>
          <span>{helpText || "Tip: include country code"}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            disabled={disabled}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleBackspace}
            disabled={disabled || !(activePhoneNumber || "").length}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Backspace
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {dialPadKeys.map(([digit, letters, smallLetters], index) => (
          <button
            key={index}
            onClick={() => handleDigitPress(digit)}
            disabled={disabled}
            className="aspect-square bg-background-input rounded-lg flex flex-col items-center justify-center hover:bg-background-input/80 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
          >
            <span className="text-white text-2xl font-bold">{digit}</span>
            {letters && (
              <span className="text-gray-400 text-xs mt-1">{letters}</span>
            )}
            {smallLetters && (
              <span className="text-gray-500 text-xs">{smallLetters}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default React.memo(DialPad);
