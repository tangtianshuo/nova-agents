# Phase 1: Foundation - Research

**Researched:** 2026-04-08
**Domain:** Auth HTTP transport + token storage (TauriAuthClient wrapper, DiskTokenStorage, AppConfig schema)
**Confidence:** HIGH

## Summary

Phase 1 delivers the foundational auth transport layer: a `TauriAuthClient` that wraps SDK HTTP calls through the Rust `proxy_http_request` command, a `DiskTokenStorage` adapter that persists tokens to `AppConfig.auth` in `config.json`, and the AppConfig schema extensions (`authServerUrl`, `auth`). No UI in this phase. The goal is end-to-end working HTTP transport with disk-backed token persistence.

**Primary recommendation:** Build `TauriAuthClient` as a thin wrapper around the existing `AuthClient` that intercepts `fetchWithTimeout` and routes via `invoke('proxy_http_request')`. Build `DiskTokenStorage` as a `TokenStorage` implementation backed by `atomicModifyConfig` reads/writes to `AppConfig.auth`.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Auth API baseURL stored in `AppConfig.authServerUrl`. Default to `http://localhost:3000` for dev. Setting persists to disk via `atomicModifyConfig`.
- **D-02:** `AppConfig.auth` field stores `{ accessToken, refreshToken, user?: { userId, username }, expiresAt? }`. Tokens stored as plain strings.
- **D-03:** Custom `DiskTokenStorage` implements SDK `TokenStorage` interface (`getItem/setItem/removeItem`). Reads/writes via `atomicModifyConfig`.
- **D-04:** `TauriAuthClient` class in `src/SDK/nova-auth-sdk/src/tauri-client.ts`. Wraps all SDK HTTP calls via `invoke('cmd_proxy_http')` (the existing `proxy_http_request` command).
- **D-05:** `TauriAuthClient` takes `authServerUrl` in constructor. Each method constructs full URL and uses the proxy invoke.
- **D-06:** Auth endpoints: `/auth/sms/send`, `/auth/sms/login`, `/auth/sms/register`, `/auth/sms/stats`, `/auth/refresh`, `/auth/logout`. Route pattern: `POST/GET /auth-proxy/{path}` -> reqwest -> `{authServerUrl}/{path}`.
- **D-07:** Rust side: add route registration for `/auth-proxy/*` path prefix (extends existing `proxy_http_request`).
- **D-08:** On app load, `AuthContext` reads tokens from `AppConfig.auth`. If valid `accessToken` exists, validate with backend via `validateToken()`. If refresh needed, use `refreshToken()`. Fallback to logged-out state if both fail.

### Claude's Discretion

- Session-sidecar integration with auth user token is deferred to Phase 2. Phase 1 focuses purely on HTTP transport + storage.
- Specific error handling messages for each auth API error code - deferred to Phase 2.

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within Phase 1 scope.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | SMS registration (phone -> SMS code -> username -> register) | `smsRegister(phone, code, username)` in AuthClient.ts, SmsRegisterRequest type |
| AUTH-02 | SMS login (phone -> SMS code -> login) | `smsLogin(phone, code)` in AuthClient.ts, SmsLoginRequest type |
| AUTH-03 | Login state persistence (token to disk) | DiskTokenStorage backed by AppConfig.auth via atomicModifyConfig |
| AUTH-06 | SDK HTTP via Rust proxy - TauriAuthClient wrapper | `invoke('proxy_http_request')` -> Rust reqwest -> auth server |
| AUTH-07 | Custom DiskTokenStorage - SDK TokenStorage interface | `TokenStorage { getItem, setItem, removeItem }` backed by atomicModifyConfig |
| AUTH-09 | Configurable Auth API baseURL | `AppConfig.authServerUrl` default `http://localhost:3000` |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nova-intelligent/auth-sdk` | bundled | AuthClient, TokenManager, SMS types | Already in codebase |
| `@tauri-apps/api/core` | (Tauri v2) | `invoke<T>()` for Rust IPC | Tauri native |
| `@tauri-apps/plugin-fs` | 2.4.5 | Config file I/O via configStore | Already used in appConfigService.ts |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/renderer/config/services/appConfigService.ts` | - | `atomicModifyConfig` for thread-safe config writes | Token persistence |
| `src-tauri/src/sse_proxy.rs` | - | `proxy_http_request` command | HTTP proxy for auth API |

### No Alternatives

The decisions lock in `@nova-intelligent/auth-sdk` for the auth logic and `atomicModifyConfig` for token persistence. These are project constraints from CONTEXT.md.

---

## Architecture Patterns

### Recommended Project Structure

```
src/SDK/nova-auth-sdk/src/
├── tauri-client.ts       # NEW: TauriAuthClient - wraps AuthClient HTTP via Rust proxy
└── utils/
    └── diskTokenStorage.ts   # NEW: DiskTokenStorage - TokenStorage backed by AppConfig.auth
```

```
src/renderer/config/
├── types.ts              # MODIFY: Add authServerUrl and auth fields to AppConfig
└── services/
    └── appConfigService.ts   # ALREADY EXISTS: atomicModifyConfig
```

```
src-tauri/src/
├── lib.rs                # MODIFY: Add /auth-proxy/* route handler
└── sse_proxy.rs          # EXAMINE: Existing proxy_http_request for pattern
```

### Pattern 1: TauriAuthClient Wrapper

**What:** A thin subclass or wrapper around `AuthClient` that intercepts all HTTP calls and routes them through `invoke('proxy_http_request')` instead of direct `fetch()`.

**When to use:** When SDK methods (sendSmsCode, smsLogin, smsRegister, etc.) need to bypass WebView CORS and system proxy by routing through Rust.

**Implementation approach:**

Option A (composition): Create `TauriAuthClient` that holds an `AuthClient` instance but overrides `fetchWithTimeout` behavior.

Option B (delegate): Create `TauriAuthClient` with same public API as `AuthClient`, delegates to `AuthClient` types but makes raw `invoke('proxy_http_request')` calls instead.

Decision D-04/D-05 says "wraps all SDK HTTP calls" - this suggests Option B (delegate pattern) where TauriAuthClient has the same methods but uses invoke instead of fetch.

**Key insight:** The SDK's `AuthClient.fetchWithTimeout` is private. The TauriAuthClient should expose the same SMS methods (`sendSmsCode`, `smsLogin`, `smsRegister`, `getSmsStats`, `validateToken`, `refreshToken`, `logout`) but construct the full URL from `authServerUrl` and call `invoke('proxy_http_request')` directly.

### Pattern 2: DiskTokenStorage Adapter

**What:** Implements SDK `TokenStorage` interface (`getItem/setItem/removeItem`) backed by `AppConfig.auth` in `config.json`.

**When to use:** When tokens must survive app restarts and be stored in the existing config file.

**Implementation:**

```typescript
// TokenStorage keys (from tokenManager.ts)
const TOKEN_KEY = 'nova_access_token';
const REFRESH_TOKEN_KEY = 'nova_refresh_token';

// DiskTokenStorage reads/writes AppConfig.auth via atomicModifyConfig
// Auth field: { accessToken, refreshToken, user?: { userId, username }, expiresAt? }
```

### Pattern 3: AppConfig Schema Extension

**What:** Add `authServerUrl: string` and `auth?: AuthData` to `AppConfig` interface.

**When to use:** When auth configuration must be persisted alongside existing app config.

**Schema:**

```typescript
interface AuthData {
  accessToken: string;
  refreshToken: string;
  user?: { userId: string; username: string };
  expiresAt?: string; // ISO timestamp
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP proxy to auth server | Build new proxy module | Extend existing `proxy_http_request` in `sse_proxy.rs` | Already handles HTTP/HTTPS, binary responses, timeout, error logging |
| Thread-safe config writes | Build new lock mechanism | `atomicModifyConfig` from appConfigService.ts | Already implements async lock with queue, atomic .tmp/.bak/.rename pattern |
| Token storage | Build custom encrypted storage | Plain `AppConfig.auth` field per D-02 | Config file is user-writable, not security-sensitive |

---

## Common Pitfalls

### Pitfall 1: Token read race on startup
**What goes wrong:** `AuthContext` reads tokens from `AppConfig.auth` on startup, but config may not be loaded yet.
**Why it happens:** App initialization order - React mounts before config is hydrated.
**How to avoid:** Phase 2 AuthContext must await config load before checking `AppConfig.auth`.

### Pitfall 2: Stale token after network error
**What goes wrong:** Token refresh fails due to network error, but old tokens are cleared from storage, leaving user logged out unexpectedly.
**Why it happens:** `performRefresh()` clears tokens on any error (including network timeout).
**How to avoid:** The SDK's `performRefresh()` already clears tokens on failure. TauriAuthClient should let the SDK handle this - Phase 1 just provides the transport.

### Pitfall 3: Config write race with multiple tabs
**What goes wrong:** Multiple tabs try to write `AppConfig.auth` simultaneously via `atomicModifyConfig`.
**Why it happens:** Each `atomicModifyConfig` call re-reads latest config, but concurrent writes can still interleave.
**How to avoid:** `atomicModifyConfig` uses `withConfigLock` which is an async queue - writes are serialized. This is already handled.

### Pitfall 4: Token expiry not checked locally
**What goes wrong:** App relies solely on 401 from backend to trigger refresh, but if backend is unreachable, stale tokens are used indefinitely.
**Why it happens:** No local expiry check in Phase 1.
**How to avoid:** D-08 says "If valid accessToken exists, validate with backend via validateToken()" - this is deferred to Phase 2 when AuthContext exists.

---

## Code Examples

### SDK TokenStorage Interface (from `src/SDK/nova-auth-sdk/src/types/common.types.ts`)

```typescript
export interface TokenStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

### TokenManager Keys (from `src/SDK/nova-auth-sdk/src/utils/tokenManager.ts`)

```typescript
const TOKEN_KEY = 'nova_access_token';
const REFRESH_TOKEN_KEY = 'nova_refresh_token';
```

### existing proxy_http_request signature (from `src-tauri/src/sse_proxy.rs`)

```rust
#[derive(serde::Deserialize)]
pub struct HttpRequest {
    pub url: String,
    pub method: String,
    pub body: Option<String>,
    pub headers: Option<std::collections::HashMap<String, String>>,
}

#[derive(serde::Serialize)]
pub struct HttpResponse {
    pub status: u16,
    pub body: String,
    pub headers: std::collections::HashMap<String, String>,
    pub is_base64: bool,
}

#[tauri::command]
pub async fn proxy_http_request(app: AppHandle, request: HttpRequest) -> Result<HttpResponse, String>
```

### atomicModifyConfig pattern (from `src/renderer/config/services/appConfigService.ts`)

```typescript
export async function atomicModifyConfig(
    modifier: (config: AppConfig) => AppConfig,
): Promise<AppConfig> {
    return withConfigLock(async () => {
        const latest = await loadAppConfig();
        const modified = modifier(latest);
        await _writeAppConfigLocked(modified);
        return modified;
    });
}
```

### SMS Types from SDK (from `src/SDK/nova-auth-sdk/src/types/auth.types.ts`)

```typescript
export interface SmsSendRequest {
  phone: string;
  type: 'login' | 'register';
}

export interface SmsLoginRequest {
  phone: string;
  code: string;
}

export interface SmsRegisterRequest {
  phone: string;
  code: string;
  username: string;
}

export interface SmsLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SDK AuthClient uses browser fetch() directly | TauriAuthClient wraps via Rust invoke | Phase 1 | Bypasses WebView CORS, system proxy protection for localhost |
| Tokens in localStorage | Tokens in AppConfig.auth (disk) | Phase 1 | Tokens survive app restart, unified with app config |

**Deprecated/outdated:**
- None in this phase domain.

---

## Open Questions

1. **Auth server URL routing**
   - What we know: D-06 says route `/auth-proxy/{path}` -> `{authServerUrl}/{path}` via reqwest. The existing `proxy_http_request` takes a full URL, not a path prefix.
   - What's unclear: Should we add a new Rust command `proxy_auth_request` specific to auth, or reuse `proxy_http_request` with URL construction in TypeScript?
   - Recommendation: Reuse `proxy_http_request` - TauriAuthClient constructs full URL from `authServerUrl + endpoint`. No new Rust command needed.

2. **Token expiry validation**
   - What we know: `AppConfig.auth.expiresAt` is optional per D-02.
   - What's unclear: Whether to check expiry locally before calling backend validateToken.
   - Recommendation: Phase 1 trusts backend validation (D-08). Local expiry check deferred to Phase 2.

3. **Rust route registration for /auth-proxy/**
   - What we know: `proxy_http_request` already exists and handles arbitrary URLs.
   - What's unclear: Whether `/auth-proxy/*` needs explicit route registration or the existing command is sufficient.
   - Recommendation: Existing `proxy_http_request` handles arbitrary URLs - no new route registration needed. TauriAuthClient constructs full URL client-side.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified for Phase 1 - purely code/config changes)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing project test framework) |
| Config file | `vitest.config.ts` (if exists) or `package.json` vitest section |
| Quick run command | `bun test src/SDK/nova-auth-sdk/` |
| Full suite command | `bun test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|---------------|
| AUTH-06 | TauriAuthClient routes via invoke | unit | `bun test src/SDK/nova-auth-sdk/tauri-client.test.ts` | NEEDS CREATION |
| AUTH-07 | DiskTokenStorage persists to AppConfig.auth | unit | `bun test src/SDK/nova-auth-sdk/diskTokenStorage.test.ts` | NEEDS CREATION |
| AUTH-09 | authServerUrl configurable | unit | `bun test src/renderer/config/` | existing |
| AUTH-01/02/03 | End-to-end SMS flow (transport only, no UI) | integration | `bun test src/SDK/nova-auth-sdk/` | NEEDS CREATION |

### Sampling Rate
- **Per task commit:** Task-level unit tests
- **Per wave merge:** Full SDK test suite
- **Phase gate:** All Phase 1 tests green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/SDK/nova-auth-sdk/src/tauri-client.ts` - TauriAuthClient implementation
- [ ] `src/SDK/nova-auth-sdk/src/utils/diskTokenStorage.ts` - DiskTokenStorage implementation
- [ ] `src/SDK/nova-auth-sdk/src/tauri-client.test.ts` - TauriAuthClient tests
- [ ] `src/SDK/nova-auth-sdk/src/utils/diskTokenStorage.test.ts` - DiskTokenStorage tests
- [ ] `src/renderer/config/types.ts` - Add authServerUrl and auth fields to AppConfig
- [ ] Framework install: Vitest already in project devDependencies

---

## Sources

### Primary (HIGH confidence)
- `src/SDK/nova-auth-sdk/src/client/AuthClient.ts` - SDK AuthClient with SMS methods, fetchWithTimeout pattern
- `src/SDK/nova-auth-sdk/src/utils/tokenManager.ts` - TokenManager with TOKEN_KEY/REFRESH_TOKEN_KEY constants, TokenStorage interface
- `src/SDK/nova-auth-sdk/src/types/common.types.ts` - TokenStorage interface definition
- `src/SDK/nova-auth-sdk/src/types/auth.types.ts` - SmsSendRequest, SmsLoginRequest, SmsRegisterRequest types
- `src-tauri/src/sse_proxy.rs` - proxy_http_request command implementation
- `src/renderer/config/services/appConfigService.ts` - atomicModifyConfig pattern
- `src/renderer/config/services/configStore.ts` - withConfigLock async lock implementation

### Secondary (MEDIUM confidence)
- `src/renderer/config/types.ts` - AppConfig interface structure (verified existing pattern for extending)
- `src-tauri/src/lib.rs` - Invoke handler registration pattern (verified for adding commands)
- `src/SDK/nova-auth-sdk/src/index.ts` - SDK exports (verified what types are available)

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - all libraries/patterns already in codebase
- Architecture: HIGH - decisions locked in CONTEXT.md
- Pitfalls: MEDIUM - edge cases around startup timing deferred to Phase 2

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days - stable domain)
