import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { TauriAuthClient } from '@/SDK/nova-auth-sdk/src/tauri-client';
import { AuthError } from '@/SDK/nova-auth-sdk/src/errors';
import { DiskTokenStorage } from '@/renderer/auth/diskTokenStorage';
import { loadAppConfig, atomicModifyConfig } from '@/renderer/config/services/appConfigService';
import { useToast } from '@/components/Toast';

// ============================================================
// Types
// ============================================================

interface User {
  userId: string;
  username: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (phone: string, code: string) => Promise<void>;
  register: (phone: string, code: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  sendSmsCode: (phone: string, type: 'login' | 'register') => Promise<void>;
  refreshAuthState: () => Promise<void>;
}

// ============================================================
// Error Message Helper
// ============================================================

function getErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    const { statusCode, apiMessage } = error;

    // Use API message if available (server-provided Chinese messages)
    if (apiMessage) {
      return apiMessage;
    }

    // Fallback to status code mappings
    switch (statusCode) {
      case 400:
        return '请求参数错误，请检查输入';
      case 401:
        return '验证码错误或已过期';
      case 429:
        return '发送过于频繁，请稍后再试';
      case 500:
        return '服务器错误，请稍后重试';
      default:
        return `认证失败 (${statusCode})`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '未知错误';
}

// ============================================================
// Context
// ============================================================

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const toast = useToast();
  const [authClient, setAuthClient] = useState<TauriAuthClient | null>(null);
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // ============================================================
  // Initialize Auth Client
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const config = await loadAppConfig();
        const authServerUrl = config.authServerUrl || 'http://localhost:3000';

        const client = new TauriAuthClient(authServerUrl, new DiskTokenStorage());

        if (!mounted) return;

        setAuthClient(client);

        // Check if user is already authenticated
        const hasToken = await client.isAuthenticated();
        if (hasToken) {
          try {
            // Validate token and get user info
            const response = await client.validateToken();

            if (mounted) {
              setAuthState({
                user: response.user || null,
                isLoading: false,
                isAuthenticated: response.valid,
              });
            }
          } catch (validateError) {
            // Token is invalid or expired
            console.warn('[AuthContext] Token validation failed:', validateError);
            if (mounted) {
              setAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
              });
            }
          }
        } else {
          if (mounted) {
            setAuthState({
              user: null,
              isLoading: false,
              isAuthenticated: false,
            });
          }
        }
      } catch (error) {
        console.error('[AuthContext] Failed to initialize auth:', error);
        if (mounted) {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    };

    void initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // Listen for logout events from other tabs
  // ============================================================

  useEffect(() => {
    const handleLogoutEvent = () => {
      console.log('[AuthContext] Received auth:logout event, refreshing auth state');
      void refreshAuthState();
    };

    window.addEventListener('auth:logout', handleLogoutEvent);

    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);

  // ============================================================
  // Auth Actions
  // ============================================================

  const login = useCallback(async (phone: string, code: string) => {
    if (!authClient) {
      throw new Error('Auth client not initialized');
    }

    try {
      const response = await authClient.smsLogin(phone, code);

      setAuthState({
        user: response.user || null,
        isLoading: false,
        isAuthenticated: true,
      });

      toast.success('登录成功');
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      throw error;
    }
  }, [authClient, toast]);

  const register = useCallback(async (phone: string, code: string, username: string) => {
    if (!authClient) {
      throw new Error('Auth client not initialized');
    }

    try {
      const response = await authClient.smsRegister(phone, code, username);

      setAuthState({
        user: response.user || null,
        isLoading: false,
        isAuthenticated: true,
      });

      toast.success('注册成功');
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      throw error;
    }
  }, [authClient, toast]);

  const logout = useCallback(async () => {
    if (!authClient) {
      throw new Error('Auth client not initialized');
    }

    try {
      await authClient.logout();

      // Clear auth state
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      // Clear auth from config
      await atomicModifyConfig(config => ({
        ...config,
        auth: undefined,
      }));

      // Dispatch event for multi-tab sync
      window.dispatchEvent(new CustomEvent('auth:logout'));

      toast.success('已退出登录');
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      throw error;
    }
  }, [authClient, toast]);

  const sendSmsCode = useCallback(async (phone: string, type: 'login' | 'register') => {
    if (!authClient) {
      throw new Error('Auth client not initialized');
    }

    try {
      await authClient.sendSmsCode(phone, type);
      toast.success('验证码已发送');
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      throw error;
    }
  }, [authClient, toast]);

  const refreshAuthState = useCallback(async () => {
    if (!authClient) {
      return;
    }

    try {
      const hasToken = await authClient.isAuthenticated();
      if (hasToken) {
        const response = await authClient.validateToken();
        setAuthState({
          user: response.user || null,
          isLoading: false,
          isAuthenticated: response.valid,
        });
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('[AuthContext] Failed to refresh auth state:', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, [authClient]);

  // ============================================================
  // Context Value
  // ============================================================

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      login,
      register,
      logout,
      sendSmsCode,
      refreshAuthState,
    }),
    [authState, login, register, logout, sendSmsCode, refreshAuthState]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// ============================================================
// Hook
// ============================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
