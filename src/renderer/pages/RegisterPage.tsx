import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import OtpInput from '../components/OtpInput';
import { CUSTOM_EVENTS } from '../../shared/constants';

// ============================================================
// Types
// ============================================================

interface RegisterPageProps {
  isActive: boolean;
  onRegisterSuccess: () => void;
}

// ============================================================
// Component
// ============================================================

export default function RegisterPage({ isActive, onRegisterSuccess }: RegisterPageProps) {
  const { register, sendSmsCode } = useAuth();
  const toast = useToast();

  // Form state
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation errors
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // ============================================================
  // Phone validation
  // ============================================================

  const validatePhone = useCallback((value: string) => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!value) {
      setPhoneError('');
      return false;
    }
    if (!phoneRegex.test(value)) {
      setPhoneError('手机号格式不正确');
      return false;
    }
    setPhoneError('');
    return true;
  }, []);

  // ============================================================
  // Username validation
  // ============================================================

  const validateUsername = useCallback((value: string) => {
    if (!value) {
      setUsernameError('');
      return false;
    }
    const usernameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]{2,20}$/;
    if (!usernameRegex.test(value)) {
      setUsernameError('用户名长度为2-20个字符');
      return false;
    }
    setUsernameError('');
    return true;
  }, []);

  // ============================================================
  // SMS countdown timer
  // ============================================================

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // ============================================================
  // Send SMS code
  // ============================================================

  const handleSendSms = async () => {
    if (!validatePhone(phone)) {
      return;
    }

    if (countdown > 0) {
      return;
    }

    setIsSendingSms(true);
    try {
      await sendSmsCode(phone, 'register');
      setCountdown(60);
    } catch (error) {
      // Error already shown in toast by sendSmsCode
      console.error('[RegisterPage] Send SMS failed:', error);
    } finally {
      setIsSendingSms(false);
    }
  };

  // ============================================================
  // Handle register submit
  // ============================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone
    if (!validatePhone(phone)) {
      return;
    }

    // Validate code
    if (code.length !== 6) {
      setCodeError('请输入6位验证码');
      return;
    }

    // Validate username
    if (!validateUsername(username)) {
      return;
    }

    setIsSubmitting(true);
    setCodeError('');
    setUsernameError('');

    try {
      await register(phone, code, username);
      onRegisterSuccess();
    } catch (error) {
      // Error already shown in toast by register
      console.error('[RegisterPage] Register failed:', error);
      if ((error as any)?.message?.includes('验证码')) {
        setCodeError('验证码错误，请重新输入');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // Navigation to login / close
  // ============================================================

  const handleNavigateToLogin = () => {
    window.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.NAVIGATE_TO_LOGIN));
  };

  const handleClose = () => {
    window.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.NAVIGATE_TO_LAUNCHER));
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[200] bg-black/30 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-[var(--paper-elevated)] border border-[var(--line)] rounded-[var(--radius-xl)] shadow-lg w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-[var(--text-xl)] font-semibold text-[var(--ink)]">
            注册新账号
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNavigateToLogin}
              className="text-[var(--ink-muted)] text-sm hover:text-[var(--ink)] transition-colors"
            >
              去登录
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-inset)] transition-colors"
              title="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Phone input */}
          <div>
            <label className="text-[var(--text-sm)] font-medium text-[var(--ink)] mb-2 block">
              手机号
            </label>
            <input
              type="tel"
              inputMode="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) validatePhone(e.target.value);
              }}
              onBlur={() => validatePhone(phone)}
              disabled={isSubmitting}
              className="w-full bg-transparent border border-[var(--line)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors disabled:opacity-50"
            />
            {phoneError && (
              <div className="text-[var(--text-sm)] text-[var(--error)] mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{phoneError}</span>
              </div>
            )}
          </div>

          {/* SMS code input */}
          <div>
            <label className="text-[var(--text-sm)] font-medium text-[var(--ink)] mb-2 block">
              验证码
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSendSms}
                disabled={countdown > 0 || isSendingSms || !phone || isSubmitting}
                className="bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] rounded-full px-4 py-2 text-[13px] font-medium hover:bg-[var(--button-secondary-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
              >
                {isSendingSms ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin inline-block mr-1" />
                    发送中...
                  </>
                ) : countdown > 0 ? (
                  `重新发送 (${countdown}s)`
                ) : (
                  '发送验证码'
                )}
              </button>
              <div className="flex-1">
                <OtpInput
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    if (codeError) setCodeError('');
                  }}
                  error={!!codeError}
                  disabled={isSubmitting}
                  autoFocus={false}
                />
              </div>
            </div>
            {codeError && (
              <div className="text-[var(--text-sm)] text-[var(--error)] mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{codeError}</span>
              </div>
            )}
          </div>

          {/* Username input */}
          <div>
            <label className="text-[var(--text-sm)] font-medium text-[var(--ink)] mb-2 block">
              用户名
            </label>
            <input
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (usernameError) validateUsername(e.target.value);
              }}
              onBlur={() => validateUsername(username)}
              disabled={isSubmitting}
              className="w-full bg-transparent border border-[var(--line)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors disabled:opacity-50"
            />
            {usernameError && (
              <div className="text-[var(--text-sm)] text-[var(--error)] mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{usernameError}</span>
              </div>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!phone || !username || code.length < 6 || isSubmitting}
            className="w-full bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] rounded-full px-6 py-2.5 text-[13px] font-medium hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                注册中...
              </>
            ) : (
              '注册'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-5 text-center text-sm text-[var(--ink-muted)]">
          已有账号？{' '}
          <button
            type="button"
            onClick={handleNavigateToLogin}
            className="text-[var(--accent)] hover:underline"
          >
            去登录
          </button>
        </div>
      </div>
    </div>
  );
}
