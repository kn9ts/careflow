import React from "react";

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

export default function DialPad({
  phoneNumber,
  setPhoneNumber,
  onDigitPress,
  disabled,
  placeholder,
  helpText,
}) {
  const sanitizedNumber = phoneNumber.replace(/\s+/g, "");
  const handleDigitPress = (digit) => {
    if (disabled) return;

    setPhoneNumber((prev) => prev + digit);
    if (onDigitPress) {
      onDigitPress(digit);
    }
  };

  const handleClear = () => {
    setPhoneNumber("");
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

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
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder={placeholder || "Enter phone number or CareFlow ID"}
            className="w-full bg-transparent text-white text-lg font-mono outline-none"
            disabled={disabled}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>{sanitizedNumber.length} digits</span>
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
            disabled={disabled || !phoneNumber}
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
