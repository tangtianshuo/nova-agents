import { useRef, useEffect, useMemo, type ChangeEvent, type KeyboardEvent, type ClipboardEvent } from 'react';

// ============================================================
// Types
// ============================================================

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

// ============================================================
// Component
// ============================================================

export default function OtpInput({
  length = 6,
  value,
  onChange,
  error = false,
  disabled = false,
  autoFocus = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array for individual inputs
  const values = useMemo(() => {
    const arr = value.split('').slice(0, length);
    // Pad with empty strings if value is shorter than length
    while (arr.length < length) {
      arr.push('');
    }
    return arr;
  }, [value, length]);

  // ============================================================
  // Focus first empty input on mount if autoFocus
  // ============================================================

  useEffect(() => {
    if (autoFocus && !disabled) {
      // Find first empty input
      const firstEmptyIndex = values.findIndex(v => v === '');
      const indexToFocus = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex;
      inputRefs.current[indexToFocus]?.focus();
    }
  }, [autoFocus, disabled, values, length]);

  // ============================================================
  // Handlers
  // ============================================================

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Only allow digits
    if (!/^\d*$/.test(inputValue)) {
      return;
    }

    // Take only the last character if user pasted multiple digits
    const digit = inputValue.slice(-1);

    // Create new values array
    const newValues = [...values];
    newValues[index] = digit;

    // Join and call onChange
    const newValue = newValues.join('');
    onChange(newValue);

    // Auto-focus next input if digit was entered
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // On Backspace with empty input, focus previous input
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    // Get pasted text
    const pastedText = e.clipboardData.getData('text');

    // Extract only digits
    const digits = pastedText.replace(/\D/g, '').slice(0, length);

    if (!digits) {
      return;
    }

    // Fill all inputs with pasted digits
    onChange(digits);

    // Focus the input after the last pasted digit
    const nextEmptyIndex = Math.min(digits.length, length - 1);
    inputRefs.current[nextEmptyIndex]?.focus();
  };

  const handleFocus = (index: number) => {
    // Select all text when focusing an input
    inputRefs.current[index]?.select();
  };

  // ============================================================
  // Render
  // ============================================================

  const baseInputClasses = `
    w-12 h-14
    text-center text-2xl font-semibold
    border border-[var(--line)]
    rounded-[var(--radius-sm)]
    bg-[var(--paper)]
    transition-all
    focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const filledClasses = values.some(v => v !== '')
    ? 'bg-[var(--paper-inset)] border-[var(--line-strong)]'
    : '';

  const errorClasses = error
    ? 'border-[var(--error)] focus:ring-[var(--error)]'
    : '';

  return (
    <div
      className="flex gap-2"
      role="group"
      aria-label="验证码"
    >
      {values.map((digit, index) => (
        <input
          key={index}
          ref={el => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(index, e)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={`${baseInputClasses} ${filledClasses} ${errorClasses}`.trim().replace(/\s+/g, ' ')}
          aria-label={`验证码第${index + 1}位`}
        />
      ))}
    </div>
  );
}
