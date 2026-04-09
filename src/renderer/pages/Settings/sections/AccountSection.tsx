import React, { useState } from 'react';
import { LogOut, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { CUSTOM_EVENTS } from '@/shared/constants';

export interface AccountSectionProps {
  /** Optional override for user data (for testing) */
  user?: {
    userId?: string;
    username?: string;
  };
}

/**
 * AccountSection - Display user account information and logout functionality
 *
 * Extracted from original Settings.tsx (lines 2250-2320).
 * Uses useAuth hook for user data and logout function.
 */
export default function AccountSection({ user: userProp }: AccountSectionProps) {
  const { user: authUser, logout } = useAuth();
  const toast = useToast();

  // Use prop user if provided (for testing), otherwise use auth context
  const user = userProp ?? authUser;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      toast.success('已退出登录');
    } catch (error) {
      console.error('[AccountSection] Logout failed:', error);
      toast.error('退出登录失败');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogin = () => {
    window.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.NAVIGATE_TO_LOGIN));
  };

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <h2 className="mb-8 text-lg font-semibold text-[var(--ink)]">账户</h2>

      {user ? (
        // Logged in state
        <div className="space-y-6">
          {/* User info card */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-warm-subtle)]">
                <User className="h-6 w-6 text-[var(--accent-warm)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--ink)]">{user.username || `用户 ${user.userId.slice(0, 8)}`}</p>
                <p className="text-sm text-[var(--ink-muted)]">ID: {user.userId}</p>
              </div>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-[var(--error)] hover:bg-[var(--error-bg)] disabled:opacity-50 transition-colors"
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            退出登录
          </button>
        </div>
      ) : (
        // Not logged in state
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-6">
            <p className="mb-4 text-sm text-[var(--ink-muted)]">
              登录后可同步您的个人设置和订阅信息
            </p>
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 rounded-full bg-[var(--button-primary-bg)] px-5 py-2.5 text-sm font-medium text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)] transition-colors"
            >
              登录 / 注册
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
