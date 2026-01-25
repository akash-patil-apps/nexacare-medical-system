import React, { useRef, useState, useEffect } from 'react';
import { Input } from 'antd';
import './OTPInput.css';

interface OTPInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  mobileNumber?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value = '',
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  mobileNumber,
  otpSent,
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Sync with external value prop
    if (value) {
      const valueArray = value.split('').slice(0, length);
      const newOtp = [...otp];
      valueArray.forEach((char, index) => {
        if (index < length) {
          newOtp[index] = char;
        }
      });
      setOtp(newOtp);
    } else if (!value && otp.some(digit => digit !== '')) {
      // Clear if value is empty
      setOtp(new Array(length).fill(''));
    }
  }, [value, length]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        const input = inputRefs.current[0];
        if (input) {
          input.focus();
          input.select();
        }
      }, 150);
    }
  }, [autoFocus]);

  // Auto-focus when OTP step becomes visible (when otpSent changes)
  useEffect(() => {
    if (otpSent !== undefined) {
      const firstEmptyIndex = otp.findIndex(digit => digit === '');
      const indexToFocus = firstEmptyIndex >= 0 ? firstEmptyIndex : 0;
      setTimeout(() => {
        const input = inputRefs.current[indexToFocus];
        if (input && !disabled) {
          input.focus();
          // Create a text range to show cursor
          if (input.setSelectionRange) {
            input.setSelectionRange(0, 0);
          }
        }
      }, 250);
    }
  }, [otpSent, disabled]);

  const handleChange = (index: number, inputValue: string) => {
    if (disabled) return;

    // Only allow numbers
    const numericValue = inputValue.replace(/[^0-9]/g, '');
    
    if (numericValue.length > 1) {
      // Handle paste
      const pastedDigits = numericValue.slice(0, length - index).split('');
      const newOtp = [...otp];
      
      pastedDigits.forEach((digit, i) => {
        if (index + i < length) {
          newOtp[index + i] = digit;
        }
      });
      
      setOtp(newOtp);
      const otpString = newOtp.join('');
      onChange?.(otpString);
      
      // Focus next empty input or last input
      const nextIndex = Math.min(index + pastedDigits.length, length - 1);
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
      }
      
      if (otpString.length === length) {
        onComplete?.(otpString);
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = numericValue;
    setOtp(newOtp);
    
    const otpString = newOtp.join('');
    onChange?.(otpString);

    // Move to next input if value entered
    if (numericValue && index < length - 1) {
      setTimeout(() => {
        const nextInput = inputRefs.current[index + 1];
        if (nextInput) {
          nextInput.focus();
          if (nextInput.setSelectionRange) {
            nextInput.setSelectionRange(0, 0);
          }
        }
      }, 10);
    }

    // Check if OTP is complete
    if (otpString.length === length && otpString.split('').every(d => d !== '')) {
      onComplete?.(otpString);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
    
    if (pastedData) {
      const newOtp = [...otp];
      pastedData.split('').forEach((digit, i) => {
        if (i < length) {
          newOtp[i] = digit;
        }
      });
      setOtp(newOtp);
      const otpString = newOtp.join('');
      onChange?.(otpString);
      
      // Focus last filled input or last input
      const lastFilledIndex = Math.min(pastedData.length - 1, length - 1);
      if (inputRefs.current[lastFilledIndex]) {
        inputRefs.current[lastFilledIndex].focus();
      }
      
      if (otpString.length === length) {
        onComplete?.(otpString);
      }
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      // Indian format: +91-98300 00003
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
  };

  return (
    <div className="otp-input-container">
      {mobileNumber && (
        <div className="otp-phone-message">
          We sent it to the number +91-{formatPhoneNumber(mobileNumber)}
        </div>
      )}
      <div className="otp-input-wrapper">
        {otp.map((digit, index) => (
          <div key={index} className="otp-digit-container">
            <div className="otp-digit-value">{digit || ''}</div>
            <Input
              ref={(el) => {
                // Ant Design Input ref: get the actual input element
                if (el && 'input' in el) {
                  inputRefs.current[index] = (el as any).input;
                } else {
                  inputRefs.current[index] = el as any;
                }
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={disabled}
              className="otp-digit-input"
              autoComplete="off"
              autoFocus={index === 0 && autoFocus}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
