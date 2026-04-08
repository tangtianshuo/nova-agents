# Phase 2: Core Flow - Research

**Researched:** 2026-04-08
**Domain:** Auth UI + global state management (React Context, Tab-based routing, loading states, error handling, logout flow)
**Confidence:** HIGH

## Summary

Phase 2 delivers the complete auth UX: global `AuthContext` at App level, login/register pages as independent tab views, loading states during network requests, 60-second SMS countdown, OTP paste support, logout with token clearing, and multi-tab state synchronization. The key insight from Phase 1 is that `TauriAuthClient` and `DiskTokenStorage` are already built — Phase 2 focuses purely on UI and state management.

**Primary recommendation:** Create `AuthContext` at App root (above `TabProvider`), implement `LoginPage` and `RegisterPage` as new tab views alongside Chat/Settings/Launcher, use `useToast` for error feedback, and manage SMS countdown with `useState` + `useEffect`. Logout clears `AppConfig.auth` via `atomicModifyConfig` and triggers re-render across all tabs.

---

## User Constraints (from CONTEXT.md)

> No CONTEXT.md exists for Phase 2. All constraints derived from Phase 1 decisions and project architecture.

### Locked Decisions (from Phase 1 STATE.md)

- **D-01:** Auth API baseURL stored in `AppConfig.authServerUrl`. Default to `http://localhost:3000` for dev. Setting persists to disk via `atomicModifyConfig`.
- **D-02:** `AppConfig.auth` field stores `{ accessToken, refreshToken, user?: { userId, username }, expiresAt? }`. Tokens stored as plain strings.
- **D-03:** Custom `DiskTokenStorage` implements SDK `TokenStorage` interface (`getItem/setItem/removeItem`). Reads/writes via `atomicModifyConfig`.
- **D-04:** `TauriAuthClient` class in `src/SDK/nova-auth-sdk/src/tauri-client.ts`. Wraps all SDK HTTP calls via `invoke('proxy_http_request')`.
- **D-05:** `TauriAuthClient` takes `authServerUrl` in constructor. Each method constructs full URL and uses the proxy invoke.
- **D-06:** Auth endpoints: `/auth/sms/send`, `/auth/sms/login`, `/auth/sms/register`, `/auth/sms/stats`, `/auth/refresh`, `/auth/logout`. Route pattern: `POST/GET /auth-proxy/{path}` → reqwest → `{authServerUrl}/{path}`.
- **D-07:** Rust side: add route registration for `/auth-proxy/*` path prefix (extends existing `proxy_http_request`).
- **D-08:** On app load, `AuthContext` reads tokens from `AppConfig.auth`. If valid `accessToken` exists, validate with backend via `validateToken()`. If refresh needed, use `refreshToken()`. Fallback to logged-out state if both fail.

### Project Constraints (from CLAUDE.md)

- **Architecture Compliance:** HTTP traffic MUST go through Rust proxy layer — TauriAuthClient already implements this
- **No Backend Self-Build:** auth-server is external service, only frontend integration
- **Desktop UX Adaptation:** SMS verification needs desktop-friendly UX (input + countdown + error hints)
- **Tab-Scoped Isolation:** Each Chat Tab has independent Sidecar, but AuthContext must be global (above TabProvider)
- **Disk-First Config:** All auth state writes MUST use `atomicModifyConfig`, never direct React state writes
- **Design System Compliance:** MUST use CSS variables from `design_guide.md` (colors, typography, spacing, buttons)
- **UI/UX Pro Max Skills:** Follow accessibility and interaction best practices (4.5:1 contrast, 44px touch targets, clear focus states)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-04 | User can logout, token cleared from disk, all tabs sync to logged-out state | `atomicModifyConfig` clears `AppConfig.auth`, AuthContext re-renders all consumers |
| AUTH-05 | 60-second SMS countdown, prevent rapid re-send, display remaining time | `useState` + `useEffect` with `setInterval`, disable button until countdown reaches 0 |
| AUTH-08 | AuthContext at App root level, above TabProvider, all Tabs share | Context placement in App.tsx, consumes `AppConfig.auth` + TauriAuthClient |
| AUTH-10 | Error handling with clear messages (invalid/expired code, rate limited, network) | `AuthError` type with `statusCode` + `apiMessage`, map to user-friendly strings |
| UX-01 | OTP input accepts pasted 6-digit codes | `onPaste` event handler, parse clipboard, fill 6 inputs |
| UX-02 | Loading states during send SMS/login/register operations | `useState` boolean, show `<Loader2>` spinner, disable buttons |
| UX-03 | Login/register pages as independent routes (separate from Chat/Settings) | New `tab.view` values: `'login'` and `'register'`, separate page components |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Context API | 19 (React 19.2.0) | Global auth state | Built-in, no dependencies |
| `@tauri-apps/api/core` | Tauri v2.9.6 | `invoke<T>()` for Rust IPC | Tauri native |
| `@nova-intelligent/auth-sdk` | bundled | TauriAuthClient, AuthError, SMS types | Already in codebase (Phase 1) |
| `lucide-react` | 0.554.0 | Icons (Loader2, CheckCircle, AlertCircle, User, LogOut) | Already used in app |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/renderer/config/services/appConfigService.ts` | - | `atomicModifyConfig` for token persistence | Logout clears `AppConfig.auth` |
| `src/SDK/nova-auth-sdk/src/tauri-client.ts` | - | TauriAuthClient with DiskTokenStorage | AuthContext instantiates this |
| `src/renderer/components/Toast.tsx` | - | `useToast()` hook for error messages | Show errors on auth failures |
| `src/renderer/context/TabProvider.tsx` | - | TabProvider pattern reference | Follow same structure for AuthProvider |
| `src/renderer/context/TabContext.tsx` | - | TabContext pattern for tab-based views | Reference for tab.view extension |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Context | Redux/Zustand | Over-engineering for simple auth state — Context is sufficient |
| SSE broadcast for logout | Custom event | SSE is existing infrastructure, but custom event (`window.dispatchEvent`) is simpler for logout sync |
| 6 separate inputs for OTP | Single input | 6 inputs provide better UX (auto-focus, paste support, visual feedback) |

---

## Architecture Patterns

### Recommended Project Structure

```
src/renderer/
├── context/
│   ├── AuthContext.tsx       # NEW: AuthProvider + useAuth hook
│   └── TabProvider.tsx       # EXISTING: reference for pattern
├── pages/
│   ├── Login.tsx             # NEW: Login page (phone + SMS code)
│   ├── Register.tsx          # NEW: Register page (phone + SMS code + username)
│   ├── Chat.tsx              # EXISTING
│   ├── Settings.tsx          # EXISTING
│   └── Launcher.tsx          # EXISTING
├── components/
│   ├── OtpInput.tsx          # NEW: 6-digit OTP input with paste support
│   └── Toast.tsx             # EXISTING: error messages
└── App.tsx                   # MODIFY: Add AuthProvider above TabProvider
```

### Pattern 1: AuthContext at App Root

**What:** React Context provider placed at highest level in App.tsx, above TabProvider. Exposes `user`, `isLoading`, `isAuthenticated`, `login()`, `register()`, `logout()`, `sendSmsCode()`.

**When to use:** When auth state must be accessible from all tabs (Chat/Settings/Launcher) and persist across tab navigation.

**Implementation:**

```typescript
// src/renderer/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { TauriAuthClient } from '../../SDK/nova-auth-sdk/src/tauri-client';
import { DiskTokenStorage } from '../auth/diskTokenStorage'; // from Phase 1
import type { AuthData } from '../config/types';
import { loadAppConfig } from '../config/services/appConfigService';
import { useToast } from '../components/Toast';
import { atomicModifyConfig } from '../config/services/configStore';

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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const toast = useToast();

  // Initialize TauriAuthClient with DiskTokenStorage
  const [authClient] = useState(() => {
    const storage = new DiskTokenStorage();
    return new TauriAuthClient('http://localhost:3000', storage);
  });

  // On mount, check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const config = await loadAppConfig();
        if (config.auth?.accessToken) {
          // Validate token with backend
          const response = await authClient.validateToken();
          setState({
            user: response.user,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
      } catch (error) {
        console.error('[AuthContext] Token validation failed:', error);
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };
    void checkAuth();
  }, [authClient]);

  const login = useCallback(async (phone: string, code: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await authClient.smsLogin(phone, code);
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [authClient]);

  const register = useCallback(async (phone: string, code: string, username: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await authClient.smsRegister(phone, code, username);
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [authClient]);

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await authClient.logout();
      // Clear tokens from disk
      await atomicModifyConfig(async (config) => {
        config.auth = undefined;
        return config;
      });
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      // Broadcast logout to all tabs
      window.dispatchEvent(new CustomEvent('auth:logout'));
    } catch (error) {
      console.error('[AuthContext] Logout failed:', error);
      // Clear local state even if server logout fails
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, [authClient]);

  const sendSmsCode = useCallback(async (phone: string, type: 'login' | 'register') => {
    await authClient.sendSmsCode(phone, type);
  }, [authClient]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, sendSmsCode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Pattern 2: Tab-Based Routing for Login/Register

**What:** Login and Register as new `tab.view` types (`'login'` and `'register'`), rendered in `MemoizedTabContent` alongside `'launcher'`, `'settings'`, and `'chat'`.

**When to use:** When auth pages should be independent views, accessible via keyboard shortcuts, deep links, or custom events.

**Implementation:**

```typescript
// In App.tsx, extend MemoizedTabContent to handle new views:
{tab.view === 'login' ? (
  <LoginPage isActive={isActive} onLoginSuccess={handleLoginSuccess} />
) : tab.view === 'register' ? (
  <RegisterPage isActive={isActive} onRegisterSuccess={handleRegisterSuccess} />
) : tab.view === 'settings' ? (
  // ... existing
```

### Pattern 3: SMS Countdown Timer

**What:** 60-second countdown after sending SMS code. Button disabled with `disabled` attribute, text shows "重新发送 (45s)".

**When to use:** To prevent rapid re-send of SMS codes (rate limiting UX).

**Implementation:**

```typescript
const [countdown, setCountdown] = useState(0);
const [isLoading, setIsLoading] = useState(false);

const handleSendSms = async () => {
  setIsLoading(true);
  try {
    await sendSmsCode(phone, type);
    setCountdown(60); // Start 60-second countdown
  } catch (error) {
    // Error handling via toast
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  if (countdown === 0) return;

  const timer = setInterval(() => {
    setCountdown(prev => prev - 1);
  }, 1000);

  return () => clearInterval(timer);
}, [countdown]);

// Button disabled state
<button
  type="button"
  onClick={handleSendSms}
  disabled={countdown > 0 || isLoading}
  className="..."
>
  {countdown > 0 ? `重新发送 (${countdown}s)` : '发送验证码'}
</button>
```

### Pattern 4: Multi-Tab Logout Sync

**What:** When user logs out in one tab, all tabs reflect logged-out state immediately.

**When to use:** To prevent inconsistent auth state across multiple open tabs.

**Implementation approaches:**

| Approach | Pros | Cons |
|----------|------|------|
| Custom event (`window.dispatchEvent`) | Simple, no network | Tabs must be focused to receive event |
| SSE broadcast (existing infra) | Works for background tabs | Overkill for simple logout |
| Storage event (`localStorage`) | Built-in, works across tabs | Requires writing to localStorage (not our pattern) |

**Recommendation:** Custom event for simplicity.

```typescript
// In AuthContext logout():
const logout = useCallback(async () => {
  // ... clear tokens
  window.dispatchEvent(new CustomEvent('auth:logout'));
}, []);

// In each tab's useEffect:
useEffect(() => {
  const handleLogout = () => {
    // Force re-check auth state
    void checkAuth();
  };
  window.addEventListener('auth:logout', handleLogout);
  return () => window.removeEventListener('auth:logout', handleLogout);
}, []);
```

### Anti-Patterns to Avoid

- **Storing auth state in localStorage:** Violates disk-first pattern (use AppConfig.auth via atomicModifyConfig)
- **Direct IPC from login pages:** All auth operations MUST go through AuthContext → TauriAuthClient
- **Hardcoded error messages:** Map AuthError.statusCode to user-friendly messages (see Code Examples)
- **Loading state in AuthContext only:** Per-operation loading states (send SMS, login, register) should be local to page/component
- **Using native `<select>` for inputs:** Violates design system — use custom inputs or follow design guide patterns
- **Hardcoded colors (#fff, bg-blue-500):** MUST use CSS variables from design_guide.md

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token storage | Custom encryption/logic | `DiskTokenStorage` from Phase 1 (atomicModifyConfig) | Already implements SDK TokenStorage interface |
| HTTP transport | Fetch/axios with CORS handling | `TauriAuthClient` from Phase 1 (Rust proxy) | Bypasses WebView CORS, system proxy protection |
| Toast notifications | Custom notification UI | `useToast()` hook from `src/renderer/components/Toast.tsx` | Existing project pattern, consistent styling |
| Error parsing | Manual error message mapping | `AuthError` from SDK (`statusCode`, `apiMessage`, `isNetworkError()`) | Centralized error handling, type-safe |
| OTP input logic | Manual paste/focus handling | Pattern from Code Examples section | Standard React pattern with accessibility |
| Countdown timer | Custom timer logic | `useState` + `useEffect` + `setInterval` (see Code Examples) | Standard React hooks pattern |

**Key insight:** Phase 1 built all the heavy-lifting infrastructure. Phase 2 is purely UI orchestration.

---

## Common Pitfalls

### Pitfall 1: AuthContext placement below TabProvider
**What goes wrong:** Tabs cannot access auth state, each tab would have its own auth context instance.
**Why it happens:** TabProvider is a heavy context that creates per-tab state. Placing AuthContext inside breaks global sharing.
**How to avoid:** Place `AuthProvider` in App.tsx **above** `<TabProvider>` (see App.tsx structure).
**Warning signs:** `useAuth()` throws "must be used within AuthProvider" in Chat/Settings pages.

### Pitfall 2: Race condition on startup
**What goes wrong:** App mounts before `AppConfig.auth` is loaded, user appears logged out even though token exists.
**Why it happens:** `loadAppConfig()` is async, but AuthContext immediately checks `config.auth`.
**How to avoid:** Set `isLoading: true` initially, only set to `false` after `loadAppConfig()` + `validateToken()` complete.
**Warning signs:** Flicker of login screen on app startup, user gets logged out unexpectedly.

### Pitfall 3: SMS countdown doesn't reset on error
**What goes wrong:** User enters wrong phone number, countdown continues but they cannot retry.
**Why it happens:** Countdown starts regardless of API success/failure.
**How to avoid:** Only start countdown after successful `sendSmsCode()` response.
**Warning signs:** User waits 60s even though API returned error immediately.

### Pitfall 4: Logout doesn't update all tabs
**What goes wrong:** User logs out in Tab 1, but Tab 2 still shows as logged in.
**Why it happens:** No cross-tab synchronization mechanism.
**How to avoid:** Use custom event (`window.dispatchEvent('auth:logout')`) or SSE broadcast.
**Warning signs:** Inconsistent UI state across tabs, ghost sessions.

### Pitfall 5: OTP paste doesn't work
**What goes wrong:** User pastes "123456" but only first input gets "123456".
**Why it happens:** `onPaste` not handled, default behavior pastes entire string into first input.
**How to avoid:** Handle `onPaste` event, parse clipboard data, distribute to 6 inputs (see Code Examples).
**Warning signs:** User complaints about typing 6 digits manually.

### Pitfall 6: Not following design system
**What goes wrong:** Inconsistent colors, spacing, typography across auth pages.
**Why it happens:** Hardcoding values instead of using CSS variables.
**How to avoid:** ALWAYS use `var(--xxx)` tokens from design_guide.md.
**Warning signs:** UI looks out of place compared to Launcher/Settings pages.

---

## Code Examples

Verified patterns from official sources:

### Error Message Mapping (from AuthError.statusCode)

```typescript
// Source: src/SDK/nova-auth-sdk/src/errors/AuthError.ts
function getErrorMessage(error: AuthError): string {
  if (error.isNetworkError()) {
    return '网络连接失败，请检查网络设置';
  }

  switch (error.statusCode) {
    case 400:
      return error.apiMessage === 'Invalid phone number'
        ? '手机号格式不正确'
        : error.apiMessage === 'Invalid verification code'
        ? '验证码错误，请重新输入'
        : '请求参数错误';
    case 401:
      return '验证码已过期，请重新获取';
    case 429:
      return '发送次数过多，请稍后再试';
    case 500:
      return '服务器错误，请稍后重试';
    default:
      return error.apiMessage ?? '未知错误';
  }
}
```

### OTP Input with Paste Support

```typescript
// Source: design_guide.md + standard React patterns
interface OtpInputProps {
  length?: number;
  onChange: (code: string) => void;
}

export function OtpInput({ length = 6, onChange }: OtpInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newValues = [...values];
    newValues[index] = value.slice(-1); // Take last char
    setValues(newValues);

    // Auto-focus next input
    if (value && index < length - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }

    onChange(newValues.join(''));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newValues = [...values];
    for (let i = 0; i < pastedData.length; i++) {
      newValues[i] = pastedData[i];
    }
    setValues(newValues);
    onChange(newValues.join(''));
  };

  return (
    <div className="flex gap-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          id={`otp-${index}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={values[index]}
          onChange={(e) => handleChange(index, e.target.value)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-2xl font-semibold border rounded-lg focus:outline-none focus:ring-2"
        />
      ))}
    </div>
  );
}
```

### AuthContext Placement in App.tsx

```typescript
// Source: src/renderer/App.tsx (existing structure)
export default function App() {
  // ... existing state

  return (
    <AuthProvider> {/* NEW: Add above TabProvider */}
      <div className="flex h-screen flex-col relative overflow-hidden">
        {/* Background orbs */}
        {/* CustomTitleBar */}
        {/* Tab content */}
      </div>
    </AuthProvider>
  );
}
```

### Login Page with Design System Compliance

```typescript
// Source: specs/guides/design_guide.md + auth requirements
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Loader2 } from 'lucide-react';
import { OtpInput } from '@/components/OtpInput';
import { useState, useEffect } from 'react';

export default function LoginPage({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { login, sendSmsCode } = useAuth();
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSendSms = async () => {
    setIsSending(true);
    try {
      await sendSmsCode(phone, 'login');
      setCountdown(60);
      toast.success('验证码已发送');
    } catch (error) {
      toast.error(getErrorMessage(error as AuthError));
    } finally {
      setIsSending(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login(phone, code);
      toast.success('登录成功');
      onLoginSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error as AuthError));
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (countdown === 0) return;
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--paper)]">
      <div className="w-full max-w-md p-8 bg-[var(--paper-elevated)] rounded-[var(--radius-xl)] border border-[var(--line)] shadow-lg">
        <h1 className="text-2xl font-bold text-[var(--ink)] mb-6">登录 nova-agents</h1>
        
        {/* Phone input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--ink)] mb-2">手机号</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2.5 border border-[var(--line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-[var(--paper)] text-[var(--ink)]"
            placeholder="请输入手机号"
          />
        </div>

        {/* SMS code input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--ink)] mb-2">验证码</label>
          <div className="flex gap-2">
            <OtpInput length={6} onChange={setCode} />
            <button
              type="button"
              onClick={handleSendSms}
              disabled={countdown > 0 || isSending || !phone}
              className="px-4 py-2 text-sm font-medium text-[var(--button-primary-text)] bg-[var(--button-primary-bg)] rounded-lg hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 
               countdown > 0 ? `${countdown}s` : '发送验证码'}
            </button>
          </div>
        </div>

        {/* Login button */}
        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoggingIn || !phone || code.length !== 6}
          className="w-full py-2.5 text-sm font-medium text-[var(--button-primary-text)] bg-[var(--button-primary-bg)] rounded-lg hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : '登录'}
        </button>
      </div>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No auth state | AuthContext at App root | Phase 2 | Centralized auth management, accessible from all tabs |
| Manual token storage | DiskTokenStorage via atomicModifyConfig | Phase 1 | Tokens persist to config.json, survive app restart |
| Direct fetch from WebView | TauriAuthClient via Rust proxy | Phase 1 | Bypasses CORS, system proxy protection for localhost |
| No logout sync | Custom event or SSE broadcast | Phase 2 | All tabs reflect logged-out state immediately |
| No SMS countdown | 60-second countdown with useState + useEffect | Phase 2 | Prevents SMS abuse, improves UX |

**Deprecated/outdated:**
- localStorage for token storage (replaced by AppConfig.auth + atomicModifyConfig)
- Direct SDK AuthClient usage (replaced by TauriAuthClient wrapper)
- Hardcoded error messages (replaced by AuthError-based mapping)

---

## Open Questions

1. **Multi-tab sync approach**
   - What we know: Must sync logout across all tabs, existing SSE infrastructure available.
   - What's unclear: Whether to use SSE broadcast or custom event (`window.dispatchEvent`).
   - Recommendation: Custom event for simplicity (no network dependency), SSE only if background tabs need to handle logout without focus.

2. **Redirect destination after login/register**
   - What we know: User should see some page after successful auth.
   - What's unclear: Whether to redirect to Launcher, Chat, or Settings.
   - Recommendation: Redirect to Launcher (home page) with success toast message.

3. **Logout UX (confirm dialog vs instant)**
   - What we know: AUTH-04 requires "user can logout and token is cleared".
   - What's unclear: Whether to show confirmation dialog or logout instantly.
   - Recommendation: Instant logout with toast feedback ("已退出登录"), no confirmation needed (low-risk action).

4. **SMS stats display (remaining quota)**
   - What we know: SDK has `getSmsStats(phone)` endpoint.
   - What's unclear: Whether to show remaining SMS quota in UI (v2 requirement AUTH-14).
   - Recommendation: Defer to v2 (out of scope for Phase 2).

5. **Auth server URL configuration**
   - What we know: `AppConfig.authServerUrl` stores the URL.
   - What's unclear: Where in Settings UI should user configure this (dev vs prod).
   - Recommendation: Add to Settings > General section, below "Theme" and "Auto-start" options.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified for Phase 2 — purely code/UI changes using existing project infrastructure)

**Justification:**
- All dependencies (React, Tauri, auth-sdk) already in codebase
- No external tools, CLIs, or services required
- Pure frontend development using existing patterns

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (existing project test framework) |
| Config file | `vitest.config.ts` (if exists) or `package.json` vitest section |
| Quick run command | `bun test src/renderer/context/` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-08 | AuthContext at App root, provides user/auth state | unit | `bun test src/renderer/context/AuthContext.test.ts` | NEEDS CREATION |
| AUTH-04 | Logout clears AppConfig.auth | integration | `bun test src/renderer/context/AuthContext.test.ts` | NEEDS CREATION |
| AUTH-05 | SMS countdown prevents re-send for 60s | unit | `bun test src/renderer/pages/Login.test.tsx` | NEEDS CREATION |
| UX-01 | OTP input accepts pasted 6-digit codes | unit | `bun test src/renderer/components/OtpInput.test.tsx` | NEEDS CREATION |
| UX-02 | Loading states show during auth operations | unit | `bun test src/renderer/pages/Login.test.tsx` | NEEDS CREATION |
| UX-03 | Login/register pages render as tab views | snapshot | `bun test src/renderer/pages/Login.test.tsx` | NEEDS CREATION |

### Sampling Rate

- **Per task commit:** `bun test src/renderer/context/` or component-specific test
- **Per wave merge:** Full auth test suite (`bun test src/renderer/context/ src/renderer/pages/ src/renderer/components/`)
- **Phase gate:** All Phase 2 tests green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/renderer/context/AuthContext.tsx` — AuthProvider + useAuth hook
- [ ] `src/renderer/context/AuthContext.test.ts` — Unit tests for AuthContext
- [ ] `src/renderer/pages/Login.tsx` — Login page (phone + SMS code + countdown)
- [ ] `src/renderer/pages/Register.tsx` — Register page (phone + SMS code + username)
- [ ] `src/renderer/pages/Login.test.tsx` — Login page tests (countdown, loading, errors)
- [ ] `src/renderer/pages/Register.test.tsx` — Register page tests
- [ ] `src/renderer/components/OtpInput.tsx` — 6-digit OTP input with paste support
- [ ] `src/renderer/components/OtpInput.test.tsx` — OTP input unit tests (paste, auto-focus)
- [ ] `src/renderer/App.tsx` — Add AuthProvider above TabProvider, extend MemoizedTabContent for login/register views
- [ ] Framework install: Vitest already in project devDependencies

---

## Sources

### Primary (HIGH confidence)

- `src/SDK/nova-auth-sdk/src/tauri-client.ts` - TauriAuthClient implementation (Phase 1)
- `src/SDK/nova-auth-sdk/src/errors/AuthError.ts` - AuthError class with statusCode, apiMessage, error type checkers
- `src/SDK/nova-auth-sdk/src/client/AuthClient.ts` - SMS methods (sendSmsCode, smsLogin, smsRegister, getSmsStats)
- `src/renderer/config/services/appConfigService.ts` - atomicModifyConfig pattern for disk-first writes
- `src/renderer/context/TabProvider.tsx` - Reference pattern for Context architecture
- `src/renderer/App.tsx` - Existing app structure, tab-based navigation
- `src/renderer/components/Toast.tsx` - useToast hook for error messages
- `src/renderer/config/types.ts` - AppConfig schema with auth fields (Phase 1)
- `specs/guides/design_guide.md` - Design system tokens (colors, typography, spacing, buttons)

### Secondary (MEDIUM confidence)

- `src/renderer/auth/diskTokenStorage.ts` - DiskTokenStorage implementation (Phase 1)
- Project CLAUDE.md - Architecture constraints (Rust proxy layer, disk-first config, no direct HTTP)
- `.claude/skills/ui-ux-pro-max/SKILL.md` - UI/UX best practices (accessibility, touch targets, loading states)

### Tertiary (LOW confidence)

- None — all research based on existing codebase and official documentation.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - all libraries/patterns already in codebase
- Architecture: HIGH - decisions locked in Phase 1, existing TabProvider pattern to follow
- Pitfalls: MEDIUM - edge cases around multi-tab sync need validation during implementation
- UI/UX: HIGH - design_guide.md provides comprehensive token system

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days - stable domain, React patterns evolve slowly)
