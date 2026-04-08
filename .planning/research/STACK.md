# Technology Stack: SMS Authentication for Tauri v2 Desktop App

**Project:** nova-agents SMS login/register
**Researched:** 2026-04-08
**Confidence:** MEDIUM-HIGH (based on codebase patterns + general auth best practices)

---

## Recommended Stack

### Core SDK

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@nova-intelligent/auth-sdk` | existing | SMS login/register flow | Already implemented, reduces custom code |
| Tauri v2 | current | Desktop framework | Project constraint |
| React 19 | current | Frontend | Project constraint |

### HTTP Proxy Layer

| Technology | Purpose | Why |
|------------|---------|-----|
| `proxyFetch()` from `tauriClient.ts` | Wrap SDK `fetch()` through Rust proxy | Bypasses WebView CORS, uses existing `invoke('proxy_http_request')` pattern |
| `sse_proxy::proxy_http_request` | Rust command that routes HTTP | Already implemented in `src-tauri/src/sse_proxy.rs`, handles all HTTP methods |

### Token Storage

| Technology | Purpose | Why |
|------------|---------|-----|
| Disk-based config (`~/.nova-agents/config.json`) | Store auth tokens | Project uses disk-first config; tokens should live alongside existing config |
| Custom `TokenStorage` adapter | Implement SDK's `ITokenStorage` interface | Aligns SDK storage with disk-based config system |

---

## Architecture for Wrapping SDK HTTP Through Rust Proxy

### The Problem

The `nova-auth-sdk` uses native `fetch()` internally (see `AuthClient.ts` line 715):

```typescript
// AuthClient.ts - what the SDK does internally
private async fetchWithTimeout(endpoint: string, options: RequestInit): Promise<Response> {
  const url = `${this.baseURL}${endpoint}`;
  const response = await fetch(url, { ... });  // Native fetch - CORS blocked in Tauri WebView
  return response;
}
```

In Tauri WebView, native `fetch()` to external domains will be blocked by CORS. The SDK must route through the Rust proxy.

### The Solution: TauriAuthClient Wrapper

Create a `TauriAuthClient` that wraps `AuthClient` and replaces its HTTP transport:

```
Frontend                         Rust                          External
   │                               │                              │
   │  TauriAuthClient              │                              │
   │    │                          │                              │
   │    ├─ sendSmsCode()           │                              │
   │    │    │                      │                              │
   │    │    └─ proxyFetch() ─────►│ invoke('proxy_http_request') │
   │    │                          │    │                          │
   │    │                          │    └─ reqwest ───────────────►│ auth-server
   │    │                          │                               │
   │    ├─ smsLogin()              │                              │
   │    ├─ smsRegister()           │                              │
   │    └─ token management        │                              │
```

### Implementation Pattern

```typescript
// src/auth/TauriAuthClient.ts

import { AuthClient, AuthClientConfig } from '@/SDK/nova-auth-sdk';
import { proxyFetch } from '@/api/tauriClient';
import { proxyConfig } from '@/config'; // Auth server baseURL

/**
 * Tauri-specific HTTP wrapper that routes SDK fetch() through Rust proxy.
 * Replaces the SDK's native fetch() transport layer.
 */
class TauriAuthClient extends AuthClient {
  constructor(config: AuthClientConfig = {}) {
    // Point SDK to a proxy endpoint that doesn't exist - we intercept all requests
    super({
      ...config,
      baseURL: 'http://localhost:0', // SDK will prepend this, but we intercept
    });
  }

  // Override fetchWithTimeout to use proxyFetch
  // However, AuthClient doesn't expose this - we need to intercept at a lower level
  // Instead, we create a wrapper that doesn't use AuthClient's internal fetch
}

// Better approach: Create auth-specific fetch wrapper
export async function authProxyFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${proxyConfig.authServerBaseURL}${endpoint}`;
  return proxyFetch(url, options);
}
```

### Alternative: SDK Fetch Interceptor

The SDK calls `fetchWithTimeout()` which is private. The cleanest approach is to create a standalone auth API layer:

```typescript
// src/auth/authApi.ts
// Direct implementation of auth endpoints using proxyFetch
// Mirrors AuthClient interface but uses Tauri proxy transport

import { proxyFetch } from '@/api/tauriClient';
import type {
  SmsSendResponse, SmsLoginResponse, SmsRegisterResponse, SmsStatsResponse
} from '@/SDK/nova-auth-sdk/types';

const AUTH_BASE = proxyConfig.authServerBaseURL; // e.g., https://auth.example.com

export const authApi = {
  async sendSmsCode(phone: string, type: 'login' | 'register'): Promise<SmsSendResponse> {
    const res = await authProxyFetch('/auth/sms/send', {
      method: 'POST',
      body: JSON.stringify({ phone, type }),
    });
    if (!res.ok) throw await AuthError.fromResponse(res);
    return res.json();
  },

  async smsLogin(phone: string, code: string): Promise<SmsLoginResponse> {
    const res = await authProxyFetch('/auth/sms/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
    if (!res.ok) throw await AuthError.fromResponse(res);
    return res.json();
  },

  async smsRegister(phone: string, code: string, username: string): Promise<SmsRegisterResponse> {
    const res = await authProxyFetch('/auth/sms/register', {
      method: 'POST',
      body: JSON.stringify({ phone, code, username }),
    });
    if (!res.ok) throw await AuthError.fromResponse(res);
    return res.json();
  },

  async getSmsStats(phone: string): Promise<SmsStatsResponse> {
    const res = await authProxyFetch(`/auth/sms/stats?phone=${encodeURIComponent(phone)}`);
    if (!res.ok) throw await AuthError.fromResponse(res);
    return res.json();
  },
};
```

---

## Token Storage Strategy

### The Constraint

| Source | Storage Behavior |
|--------|-----------------|
| SDK default | localStorage (browser-like) |
| Project config | Disk-first (`~/.nova-agents/config.json`) |

### Recommended: Disk-Based Token Storage

Tokens are sensitive credentials. Storing in `~/.nova-agents/config.json` alongside other app config ensures:
1. **Encryption at rest** (config system supports encryption)
2. **Single source of truth** - no localStorage/disk desync
3. **Consistent with project patterns** - all persistent state goes through config system

### Implementation

```typescript
// src/auth/tokenStorage.ts
// Custom TokenStorage implementation for disk-based config

import type { ITokenStorage } from '@/SDK/nova-auth-sdk/utils';
import { loadAppConfig } from '@/config'; // Disk-first config loader
import { saveAppConfig } from '@/config';

export class DiskTokenStorage implements ITokenStorage {
  async getToken(): Promise<string | null> {
    const config = await loadAppConfig();
    return config.auth?.accessToken ?? null;
  }

  async setToken(token: string): Promise<void> {
    const config = await loadAppConfig();
    config.auth = { ...config.auth, accessToken: token };
    await saveAppConfig(config);
  }

  async getRefreshToken(): Promise<string | null> {
    const config = await loadAppConfig();
    return config.auth?.refreshToken ?? null;
  }

  async setRefreshToken(token: string): Promise<void> {
    const config = await loadAppConfig();
    config.auth = { ...config.auth, refreshToken: token };
    await saveAppConfig(config);
  }

  async clearAll(): Promise<void> {
    const config = await loadAppConfig();
    delete config.auth;
    await saveAppConfig(config);
  }
}
```

### Config Schema Extension

```json
// ~/.nova-agents/config.json (新增 auth 节点)
{
  "auth": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "userId": "user_xxx",
    "expiresAt": "2026-04-08T12:00:00Z"
  }
}
```

---

## Auth Server BaseURL Configuration

### The Issue

The auth-server is **external** to the app (not the Bun Sidecar). The baseURL must be configurable for dev vs prod environments.

### Recommended Pattern

```typescript
// src/config/auth.ts
export const proxyConfig = {
  // Auth server base URL - must be configurable per environment
  get authServerBaseURL(): string {
    // Check config first (user may have custom server)
    const config = getAppConfigSync();
    if (config.authServerUrl) return config.authServerUrl;

    // Environment-based fallback
    if (import.meta.env.DEV) {
      return 'http://localhost:8080'; // Local dev auth server
    }
    return 'https://auth.nova-agents.com'; // Production
  },
};
```

---

## How proxy_http_request Works (Existing Pattern)

The Rust command `proxy_http_request` in `sse_proxy.rs`:

```rust
#[derive(serde::Deserialize)]
pub struct HttpRequest {
    pub url: String,
    pub method: String,
    pub body: Option<String>,
    pub headers: Option<std::collections::HashMap<String, String>>,
}

// Frontend calls:
const result = await invoke<ProxyHttpResponse>('proxy_http_request', {
  request: {
    url: 'https://auth-server.com/auth/sms/send',
    method: 'POST',
    body: JSON.stringify({ phone, type }),
    headers: { 'Content-Type': 'application/json' },
  }
});
```

Key behaviors:
1. **CORS bypass** - Request goes Rust -> reqwest -> auth server, not through WebView
2. **Binary support** - Returns base64 for images/binary
3. **Timeout** - 120s default (HTTP_PROXY_TIMEOUT_SECS)
4. **Error handling** - Detailed error messages with connect/timeout/request categorization

---

## Alternatives Considered

| Alternative | Why Not |
|-------------|---------|
| SDK direct fetch (no proxy) | CORS blocked in Tauri WebView to external domains |
| Custom Tauri command for each auth endpoint | Reinventing wheel when `proxy_http_request` handles generic HTTP |
| Store tokens in localStorage | Inconsistent with disk-first config system; less secure |
| Auth via Sidecar (Bun) | Adds unnecessary latency; auth is external service, not sidecar functionality |

---

## Dependencies to Add

No new npm packages required. The auth SDK is already available at `src/SDK/nova-auth-sdk/`.

Rust side already has all needed components:
- `proxy_http_request` in `sse_proxy.rs`
- `local_http::builder()` for localhost-safe reqwest clients
- `proxy_config` for system proxy handling

---

## Sources

| Source | Confidence | Relevance |
|--------|------------|-----------|
| `src-tauri/src/sse_proxy.rs` (proxy_http_request) | HIGH | Primary HTTP proxy implementation |
| `src/renderer/api/tauriClient.ts` (proxyFetch) | HIGH | Frontend proxy usage pattern |
| `src/SDK/nova-auth-sdk/src/client/AuthClient.ts` | HIGH | SDK HTTP transport (native fetch) |
| `src-tauri/src/local_http.rs` | HIGH | Localhost-safe HTTP client pattern |
| `src-tauri/src/proxy_config.rs` | HIGH | System proxy handling |
| OWASP Storage Cheat Sheet | MEDIUM | Token storage best practices |
| Tauri v2 Security Docs | MEDIUM | Desktop app security considerations |

---

## Open Questions

1. **Auth server URL** - Is there a dev auth server? What's the production endpoint?
2. **Config encryption** - Does the disk-based config system encrypt sensitive fields?
3. **Token format** - What does the auth server return (JWT? Opaque tokens?)? Needed for validation.
