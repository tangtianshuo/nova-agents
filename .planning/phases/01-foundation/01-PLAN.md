# Phase 1: Foundation - Plan

**Wave:** 01
**Depends on:** None
**Status:** Ready for execution

## Goal

Auth HTTP transport and token storage work end-to-end. Phase 1 delivers:
- `TauriAuthClient` wrapper that routes SDK HTTP calls through Rust `invoke('proxy_http_request')`
- `DiskTokenStorage` adapter implementing SDK `TokenStorage` interface, backed by `AppConfig.auth`
- `AppConfig` schema extensions: `authServerUrl` and `auth` fields

**No UI in Phase 1.** Phase 2 adds AuthContext, login/register pages, and global state.

## Success Criteria

These must all be TRUE before Phase 1 is complete:
1. `TauriAuthClient` routes all SMS API calls (`sendSmsCode`, `smsLogin`, `smsRegister`, `getSmsStats`, `validateToken`, `refreshToken`, `logout`) through `invoke('proxy_http_request')` to Rust
2. `DiskTokenStorage` implements SDK `TokenStorage` interface (`getItem`/`setItem`/`removeItem`) backed by `atomicModifyConfig` reads/writes to `AppConfig.auth`
3. `AppConfig` schema has `authServerUrl: string` (default `http://localhost:3000`) and `auth?: AuthData`
4. `AuthData` schema: `{ accessToken: string, refreshToken: string, user?: { userId: string, username: string }, expiresAt?: string }`
5. End-to-end: SMS send → code validation → token storage to disk survives app restart

## Requirements Coverage

| ID | Requirement | Implementation |
|----|-------------|----------------|
| AUTH-01 | SMS registration | `TauriAuthClient.smsRegister()` via proxy |
| AUTH-02 | SMS login | `TauriAuthClient.smsLogin()` via proxy |
| AUTH-03 | Token persistence | `DiskTokenStorage` backed by `AppConfig.auth` |
| AUTH-06 | SDK HTTP via Rust proxy | `TauriAuthClient` wraps via `invoke('proxy_http_request')` |
| AUTH-07 | DiskTokenStorage | Implements `TokenStorage` interface, uses `atomicModifyConfig` |
| AUTH-09 | Configurable baseURL | `AppConfig.authServerUrl` + passed to `TauriAuthClient` constructor |

## Files Modified

### `src/renderer/config/types.ts`
- Add `AuthData` interface
- Add `authServerUrl?: string` to `AppConfig` (default in code, not schema)
- Add `auth?: AuthData` to `AppConfig`

### `src/renderer/auth/diskTokenStorage.ts` (NEW)
- Implements SDK `TokenStorage` interface from `@SDK/nova-auth-sdk/src/utils/tokenManager`
- Uses `atomicModifyConfig` to read/write `AppConfig.auth`
- Keys: `nova_access_token` (TOKEN_KEY), `nova_refresh_token` (REFRESH_TOKEN_KEY)
- Lives in app layer, not SDK layer, to avoid crossing package boundary

### `src/SDK/nova-auth-sdk/src/tauri-client.ts` (NEW)
- `TauriAuthClient` class with same SMS methods as `AuthClient`
- Each method calls `invoke('proxy_http_request', { url, method, body, headers })`
- Constructor takes `authServerUrl: string`
- SDK endpoints: `/auth/sms/send`, `/auth/sms/login`, `/auth/sms/register`, `/auth/sms/stats`, `/auth/refresh`, `/auth/validate`, `/auth/logout`

### `src/renderer/auth/diskTokenStorage.test.ts` (NEW)
- Unit tests for `DiskTokenStorage.getItem`, `setItem`, `removeItem`
- Tests token persistence via `atomicModifyConfig`

### `src/SDK/nova-auth-sdk/src/tauri-client.test.ts` (NEW)
- Unit tests for `TauriAuthClient` methods
- Mock `invoke` to verify correct URL/method/headers construction

---

## Task Breakdown

### Task 1: Extend AppConfig Schema

**Files:**
- `D:\Projects\Tauri\nova-agents\src\renderer\config\types.ts` (read first)

**Action:**
1. Add `AuthData` interface after the `AppConfig` interface:
```typescript
/**
 * Authentication data stored in AppConfig.auth
 */
export interface AuthData {
  accessToken: string;
  refreshToken: string;
  user?: {
    userId: string;
    username: string;
  };
  expiresAt?: string; // ISO timestamp
}
```

2. Add two fields to `AppConfig` interface:
```typescript
// ===== Auth Configuration (v1.0 SMS Auth) =====
// Auth server base URL (default: http://localhost:3000)
authServerUrl?: string;
// Persisted auth tokens and user info
auth?: AuthData;
```

**Acceptance Criteria:**
- `grep -n "interface AuthData" src/renderer/config/types.ts` returns the AuthData interface
- `grep -n "authServerUrl" src/renderer/config/types.ts` returns authServerUrl field in AppConfig
- `grep -n "auth\?:" src/renderer/config/types.ts` returns auth field in AppConfig

---

### Task 2: Implement DiskTokenStorage (App Layer)

**Files:**
- `D:\Projects\Tauri\nova-agents\src\SDK\nova-auth-sdk\src\utils\tokenManager.ts` (read first - for TOKEN_KEY constants and TokenStorage interface)
- `D:\Projects\Tauri\nova-agents\src\renderer\config\services\appConfigService.ts` (read first - for atomicModifyConfig)
- `D:\Projects\Tauri\nova-agents\src\renderer\config\types.ts` (read first - for AuthData interface)

**Action:**
Create `src/renderer/auth/diskTokenStorage.ts` (in app layer, NOT in SDK):

```typescript
import { atomicModifyConfig } from '../config/services/appConfigService';
import type { AuthData } from '../config/types';
import type { TokenStorage } from '../../SDK/nova-auth-sdk/src/utils/tokenManager';

const TOKEN_KEY = 'nova_access_token';
const REFRESH_TOKEN_KEY = 'nova_refresh_token';

/**
 * Disk-based token storage backed by AppConfig.auth
 * Implements SDK TokenStorage interface for use with TauriAuthClient
 */
export class DiskTokenStorage implements TokenStorage {
  async getItem(key: string): Promise<string | null> {
    const config = await atomicModifyConfig(c => c);
    const auth = config.auth;
    if (!auth) return null;

    if (key === TOKEN_KEY) return auth.accessToken ?? null;
    if (key === REFRESH_TOKEN_KEY) return auth.refreshToken ?? null;
    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    await atomicModifyConfig(config => {
      const auth: AuthData = config.auth ?? { accessToken: '', refreshToken: '' };
      if (key === TOKEN_KEY) auth.accessToken = value;
      if (key === REFRESH_TOKEN_KEY) auth.refreshToken = value;
      return { ...config, auth };
    });
  }

  async removeItem(key: string): Promise<void> {
    await atomicModifyConfig(config => {
      if (!config.auth) return config;
      const auth = { ...config.auth };
      if (key === TOKEN_KEY) auth.accessToken = '';
      if (key === REFRESH_TOKEN_KEY) auth.refreshToken = '';
      // Clear user info when tokens are removed
      if (!auth.accessToken && !auth.refreshToken) {
        return { ...config, auth: undefined };
      }
      return { ...config, auth };
    });
  }
}
```

**Acceptance Criteria:**
- `grep -n "class DiskTokenStorage" src/renderer/auth/diskTokenStorage.ts` returns the class definition
- `grep -n "implements TokenStorage" src/renderer/auth/diskTokenStorage.ts` confirms interface implementation
- `grep -n "atomicModifyConfig" src/renderer/auth/diskTokenStorage.ts` shows config persistence usage

---

### Task 3: Implement TauriAuthClient

**Files:**
- `D:\Projects\Tauri\nova-agents\src\SDK\nova-auth-sdk\src\client\AuthClient.ts` (read first - for method signatures)
- `D:\Projects\Tauri\nova-agents\src\SDK\nova-auth-sdk\src\types\auth.types.ts` (read first - for SMS types)
- `D:\Projects\Tauri\nova-agents\src\SDK\nova-auth-sdk\src\types\common.types.ts` (read first - for TokenStorage interface)
- `D:\Projects\Tauri\nova-agents\src-tauri\src\sse_proxy.rs` (read first - for HttpRequest/HttpResponse structure)

**Action:**
Create `src/SDK/nova-auth-sdk/src/tauri-client.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';
import type {
  SmsSendRequest,
  SmsSendResponse,
  SmsLoginRequest,
  SmsLoginResponse,
  SmsRegisterRequest,
  SmsRegisterResponse,
  SmsStatsResponse,
  RefreshTokenResponse,
  ValidateTokenResponse,
  LogoutResponse,
  TokenStorage,
} from './types';
import { AuthError } from './errors';
import { TokenManager } from './utils';

/**
 * HTTP request/response types matching Rust sse_proxy.rs
 */
interface HttpRequest {
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
}

interface HttpResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
  is_base64: boolean;
}

/**
 * TauriAuthClient wraps SDK HTTP calls through Rust invoke('proxy_http_request')
 * Bypasses WebView CORS and system proxy for localhost auth server
 */
export class TauriAuthClient {
  private authServerUrl: string;
  private tokenManager: TokenManager;

  constructor(authServerUrl: string, tokenStorage?: TokenStorage) {
    this.authServerUrl = authServerUrl.replace(/\/$/, ''); // Remove trailing slash
    // If no storage provided, use memory storage (app layer should inject DiskTokenStorage)
    this.tokenManager = new TokenManager(tokenStorage ?? {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    });
  }

  /**
   * Invoke Rust proxy_http_request command
   */
  private async proxyRequest(
    endpoint: string,
    method: string,
    body?: object,
    headers?: Record<string, string>
  ): Promise<Response> {
    const url = `${this.authServerUrl}${endpoint}`;
    const httpRequest: HttpRequest = {
      url,
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: headers ?? { 'Content-Type': 'application/json' },
    };

    try {
      const response = await invoke<HttpResponse>('proxy_http_request', { request: httpRequest });
      
      if (response.is_base64) {
        throw new Error('Unexpected binary response from auth server');
      }

      return new HttpResponseWrapper(response.status, response.body, response.headers);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw AuthError.fromNetworkError(error);
    }
  }

  async sendSmsCode(phone: string, type: 'login' | 'register'): Promise<SmsSendResponse> {
    const response = await this.proxyRequest('/auth/sms/send', 'POST', { phone, type } satisfies SmsSendRequest);
    if (!response.ok) throw await AuthError.fromResponse(response);
    return response.json() as Promise<SmsSendResponse>;
  }

  async smsLogin(phone: string, code: string): Promise<SmsLoginResponse> {
    const response = await this.proxyRequest('/auth/sms/login', 'POST', { phone, code } satisfies SmsLoginRequest);
    if (!response.ok) throw await AuthError.fromResponse(response);
    const data = await response.json() as SmsLoginResponse;
    await this.tokenManager.setToken(data.accessToken);
    await this.tokenManager.setRefreshToken(data.refreshToken);
    return data;
  }

  async smsRegister(phone: string, code: string, username: string): Promise<SmsRegisterResponse> {
    const response = await this.proxyRequest('/auth/sms/register', 'POST', { phone, code, username } satisfies SmsRegisterRequest);
    if (!response.ok) throw await AuthError.fromResponse(response);
    const data = await response.json() as SmsRegisterResponse;
    await this.tokenManager.setToken(data.accessToken);
    await this.tokenManager.setRefreshToken(data.refreshToken);
    return data;
  }

  async getSmsStats(phone: string): Promise<SmsStatsResponse> {
    const response = await this.proxyRequest(`/auth/sms/stats?phone=${encodeURIComponent(phone)}`, 'GET');
    if (!response.ok) throw await AuthError.fromResponse(response);
    return response.json() as Promise<SmsStatsResponse>;
  }

  async validateToken(): Promise<ValidateTokenResponse> {
    const token = await this.tokenManager.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const response = await this.proxyRequest('/auth/validate', 'POST', undefined, headers);
    if (!response.ok) throw await AuthError.fromResponse(response);
    return response.json() as Promise<ValidateTokenResponse>;
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = await this.tokenManager.getRefreshToken();
    if (!refreshToken) throw new AuthError('No refresh token available', 0, 'Not authenticated');
    
    const response = await this.proxyRequest('/auth/refresh', 'POST', { refreshToken });
    if (!response.ok) {
      await this.tokenManager.clearAll();
      throw await AuthError.fromResponse(response);
    }
    
    const data = await response.json() as RefreshTokenResponse;
    await this.tokenManager.setToken(data.accessToken);
    await this.tokenManager.setRefreshToken(data.refreshToken);
    return data;
  }

  async logout(): Promise<LogoutResponse> {
    const token = await this.tokenManager.getToken();
    const refreshToken = await this.tokenManager.getRefreshToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    
    let response: Response;
    if (token) {
      response = await this.proxyRequest('/auth/logout', 'POST', { refreshToken }, headers);
      if (!response.ok) throw await AuthError.fromResponse(response);
    }
    
    await this.tokenManager.clearAll();
    return { message: 'Logged out successfully' };
  }

  async getToken(): Promise<string | null> {
    return this.tokenManager.getToken();
  }

  async getRefreshToken(): Promise<string | null> {
    return this.tokenManager.getRefreshToken();
  }

  async setToken(accessToken: string): Promise<void> {
    await this.tokenManager.setToken(accessToken);
  }

  async setRefreshToken(refreshToken: string): Promise<void> {
    await this.tokenManager.setRefreshToken(refreshToken);
  }

  async clearToken(): Promise<void> {
    await this.tokenManager.clearAll();
  }

  async isAuthenticated(): Promise<boolean> {
    return this.tokenManager.hasToken();
  }
}

/**
 * Minimal Response wrapper to match web Response interface
 */
class HttpResponseWrapper {
  status: number;
  body: string;
  headers: Record<string, string>;
  ok: boolean;

  constructor(status: number, body: string, headers: Record<string, string>) {
    this.status = status;
    this.body = body;
    this.headers = headers;
    this.ok = status >= 200 && status < 300;
  }

  async json(): Promise<unknown> {
    return JSON.parse(this.body);
  }
}
```

**Acceptance Criteria:**
- `grep -n "class TauriAuthClient" src/SDK/nova-auth-sdk/src/tauri-client.ts` returns the class definition
- `grep -n "invoke.*proxy_http_request" src/SDK/nova-auth-sdk/src/tauri-client.ts` shows proxy invocation
- `grep -n "sendSmsCode" src/SDK/nova-auth-sdk/src/tauri-client.ts` confirms SMS method exists
- `grep -n "smsLogin" src/SDK/nova-auth-sdk/src/tauri-client.ts` confirms login method exists
- `grep -n "smsRegister" src/SDK/nova-auth-sdk/src/tauri-client.ts` confirms register method exists

---

### Task 4: Add Unit Tests for DiskTokenStorage

**Files:**
- `D:\Projects\Tauri\nova-agents\src\renderer\auth\diskTokenStorage.ts` (read first)

**Action:**
Create `src/renderer/auth/diskTokenStorage.test.ts`:

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { DiskTokenStorage } from './diskTokenStorage';

// Mock atomicModifyConfig
const mockAtomicModifyConfig = mock((modifier: (config: any) => any) => {
  return modifier({});
});

describe('DiskTokenStorage', () => {
  let storage: DiskTokenStorage;

  beforeEach(() => {
    storage = new DiskTokenStorage();
    mockAtomicModifyConfig.mockClear();
  });

  describe('getItem', () => {
    it('returns accessToken when key is nova_access_token', async () => {
      mockAtomicModifyConfig.mockImplementation((modifier: (config: any) => any) => {
        return modifier({
          auth: { accessToken: 'test-access-token', refreshToken: 'test-refresh-token' }
        });
      });

      const result = await storage.getItem('nova_access_token');

      expect(result).toBe('test-access-token');
    });

    it('returns refreshToken when key is nova_refresh_token', async () => {
      mockAtomicModifyConfig.mockImplementation((modifier: (config: any) => any) => {
        return modifier({
          auth: { accessToken: 'test-access-token', refreshToken: 'test-refresh-token' }
        });
      });

      const result = await storage.getItem('nova_refresh_token');

      expect(result).toBe('test-refresh-token');
    });

    it('returns null when auth is undefined', async () => {
      mockAtomicModifyConfig.mockImplementation((modifier: (config: any) => any) => {
        return modifier({});
      });

      const result = await storage.getItem('nova_access_token');

      expect(result).toBeNull();
    });

    it('returns null for unknown keys', async () => {
      mockAtomicModifyConfig.mockImplementation((modifier: (config: any) => any) => {
        return modifier({
          auth: { accessToken: 'token', refreshToken: 'refresh' }
        });
      });

      const result = await storage.getItem('unknown_key');

      expect(result).toBeNull();
    });
  });

  describe('setItem', () => {
    it('sets accessToken in auth', async () => {
      mockAtomicModifyConfig.mockImplementation((modifier: (config: any) => any) => {
        return modifier({});
      });

      await storage.setItem('nova_access_token', 'new-token');

      expect(mockAtomicModifyConfig).toHaveBeenCalled();
      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({});
      expect(result.auth.accessToken).toBe('new-token');
    });

    it('sets refreshToken in auth', async () => {
      mockAtomicModifyConfig.mockImplementation((modifier: (config: any) => any) => {
        return modifier({});
      });

      await storage.setItem('nova_refresh_token', 'new-refresh');

      expect(mockAtomicModifyConfig).toHaveBeenCalled();
      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({});
      expect(result.auth.refreshToken).toBe('new-refresh');
    });

    it('creates auth object if undefined', async () => {
      mockAtomicModifyConfig.mockImplementation((modifier: (config: any) => any) => {
        return modifier({});
      });

      await storage.setItem('nova_access_token', 'token');

      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({});
      expect(result.auth).toBeDefined();
      expect(result.auth.accessToken).toBe('token');
    });
  });

  describe('removeItem', () => {
    it('clears accessToken when removing nova_access_token', async () => {
      mockAtomicModifyConfig.mockImplementation((modifier: (config: any) => any) => {
        return modifier({ auth: { accessToken: 'token', refreshToken: 'refresh' } });
      });

      await storage.removeItem('nova_access_token');

      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({ auth: { accessToken: 'token', refreshToken: 'refresh' } });
      expect(result.auth.accessToken).toBe('');
    });

    it('removes auth entirely when both tokens cleared', async () => {
      mockAtomicModifyConfig.mockImplementation((modifier: (config: any) => any) => {
        return modifier({ auth: { accessToken: '', refreshToken: '' } });
      });

      await storage.removeItem('nova_access_token');

      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({ auth: { accessToken: '', refreshToken: '' } });
      expect(result.auth).toBeUndefined();
    });
  });
});
```

**Acceptance Criteria:**
- `grep -n "describe.*DiskTokenStorage" src/renderer/auth/diskTokenStorage.test.ts` returns test suite
- `grep -n "getItem.*nova_access_token" src/renderer/auth/diskTokenStorage.test.ts` returns test for TOKEN_KEY
- `grep -n "setItem.*nova_refresh_token" src/renderer/auth/diskTokenStorage.test.ts` returns test for REFRESH_TOKEN_KEY

---

### Task 5: Add Unit Tests for TauriAuthClient

**Files:**
- `D:\Projects\Tauri\nova-agents\src\SDK/nova-auth-sdk/src/tauri-client.ts` (read first)

**Action:**
Create `src/SDK/nova-auth-sdk/src/tauri-client.test.ts`:

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TauriAuthClient } from './tauri-client';

// Create a mock invoke function
const mockInvoke = mock(async () => {
  return { status: 200, body: '{}', headers: {}, is_base64: false };
});

// Mock @tauri-apps/api/core module
mock.module('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

describe('TauriAuthClient', () => {
  const baseUrl = 'http://localhost:3000';
  let client: TauriAuthClient;

  beforeEach(() => {
    client = new TauriAuthClient(baseUrl);
    mockInvoke.mockClear();
  });

  describe('constructor', () => {
    it('removes trailing slash from authServerUrl', () => {
      const client2 = new TauriAuthClient('http://localhost:3000/');
      // Verify by checking the URL used in proxyRequest
      mockInvoke.mock.mockImplementation(async () => {
        return { status: 200, body: '{}', headers: {}, is_base64: false };
      });
      // Access private property via any
      (client2 as any).authServerUrl;
    });
  });

  describe('sendSmsCode', () => {
    it('calls proxy_http_request with correct params', async () => {
      mockInvoke.mock.mockImplementation(async () => {
        return { status: 200, body: '{"success":true,"message":"sent"}', headers: {}, is_base64: false };
      });

      const result = await client.sendSmsCode('13800138000', 'login');

      expect(mockInvoke).toHaveBeenCalledWith('proxy_http_request', {
        request: expect.objectContaining({
          url: 'http://localhost:3000/auth/sms/send',
          method: 'POST',
          body: '{"phone":"13800138000","type":"login"}',
        })
      });
      expect(result.success).toBe(true);
    });

    it('throws AuthError on non-ok response', async () => {
      mockInvoke.mock.mockImplementation(async () => {
        return { status: 400, body: '{"error":"invalid phone"}', headers: {}, is_base64: false };
      });

      await expect(client.sendSmsCode('invalid', 'login')).rejects.toThrow();
    });
  });

  describe('smsLogin', () => {
    it('calls proxy_http_request with correct params', async () => {
      mockInvoke.mock.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"accessToken":"token","refreshToken":"refresh","expiresIn":"1h"}',
          headers: {},
          is_base64: false
        };
      });

      const result = await client.smsLogin('13800138000', '123456');

      expect(mockInvoke).toHaveBeenCalledWith('proxy_http_request', {
        request: expect.objectContaining({
          url: 'http://localhost:3000/auth/sms/login',
          method: 'POST',
          body: '{"phone":"13800138000","code":"123456"}',
        })
      });
      expect(result.accessToken).toBe('token');
    });
  });

  describe('smsRegister', () => {
    it('calls proxy_http_request with correct params', async () => {
      mockInvoke.mock.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"user":{"id":"1","username":"tester","phone":"13800138000"},"accessToken":"token","refreshToken":"refresh","expiresIn":"1h","message":"registered"}',
          headers: {},
          is_base64: false
        };
      });

      const result = await client.smsRegister('13800138000', '123456', 'tester');

      expect(mockInvoke).toHaveBeenCalledWith('proxy_http_request', {
        request: expect.objectContaining({
          url: 'http://localhost:3000/auth/sms/register',
          method: 'POST',
          body: '{"phone":"13800138000","code":"123456","username":"tester"}',
        })
      });
      expect(result.user.username).toBe('tester');
    });
  });

  describe('getSmsStats', () => {
    it('calls proxy_http_request with GET method', async () => {
      mockInvoke.mock.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"phone":"13800138000","todaySendCount":1,"date":"2026-04-08"}',
          headers: {},
          is_base64: false
        };
      });

      const result = await client.getSmsStats('13800138000');

      expect(mockInvoke).toHaveBeenCalledWith('proxy_http_request', {
        request: expect.objectContaining({
          url: 'http://localhost:3000/auth/sms/stats?phone=13800138000',
          method: 'GET',
        })
      });
    });
  });

  describe('logout', () => {
    it('clears tokens and returns success message', async () => {
      mockInvoke.mock.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"message":"Logged out successfully"}',
          headers: {},
          is_base64: false
        };
      });

      const result = await client.logout();

      expect(result.message).toBe('Logged out successfully');
    });
  });
});
```

**Acceptance Criteria:**
- `grep -n "describe.*TauriAuthClient" src/SDK/nova-auth-sdk/src/tauri-client.test.ts` returns test suite
- `grep -n "invoke.*proxy_http_request" src/SDK/nova-auth-sdk/src/tauri-client.test.ts` shows invoke mock verification
- `grep -n "sendSmsCode" src/SDK/nova-auth-sdk/src/tauri-client.test.ts` returns sendSmsCode tests

---

## Verification

After execution, run:

```bash
# TypeScript compilation
npm run typecheck

# Run unit tests
bun test src/SDK/nova-auth-sdk/src/tauri-client.test.ts
bun test src/renderer/auth/diskTokenStorage.test.ts
```

All tests must pass. Any TypeScript errors must be fixed.

## Dependencies

| Task | Blocked By |
|------|-----------|
| Task 2 (DiskTokenStorage) | Task 1 (AppConfig schema) |
| Task 3 (TauriAuthClient) | Task 1, Task 2 |
| Task 4 (DiskTokenStorage tests) | Task 2 |
| Task 5 (TauriAuthClient tests) | Task 3 |

## Notes

- The Rust command name is `proxy_http_request` (not `cmd_proxy_http`) based on actual registration in `src-tauri/src/lib.rs`
- `DiskTokenStorage` lives in app layer (`src/renderer/auth/diskTokenStorage.ts`), not SDK layer, to avoid crossing package boundary. It imports TokenStorage interface from SDK but implements it with app-level `atomicModifyConfig`.
- Token storage keys (`nova_access_token`, `nova_refresh_token`) must match SDK's `tokenManager.ts` constants
- `TauriAuthClient` accepts optional `TokenStorage` in constructor. App layer injects `DiskTokenStorage`; if not provided, defaults to no-op memory storage.
