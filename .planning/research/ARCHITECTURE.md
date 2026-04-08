# Architecture Research: SMS Auth Integration

**Project:** nova-agents SMS login/register
**Researched:** 2026-04-08
**Confidence:** HIGH

## Executive Summary

SMS auth integration requires a **global user-level auth layer** distinct from the existing **session-level sidecar architecture**. The auth state is fundamentally different from session state: it's shared across all tabs, persists across sessions, and represents user identity rather than AI conversation context.

**Core architectural decision:** Introduce `AuthContext` at App-level (above TabProvider) with a custom `TokenStorage` implementation that reads/writes to the disk-first config system (`~/.nova-agents/config.json`). The SDK's native `fetch()` must be intercepted and routed through the existing Rust proxy layer (`proxy_http_request`).

---

## Key Findings

### 1. Auth State is Global, Not Session-Scoped

**Current architecture:**
- `TabContext` / `TabProvider` — per-Tab, session-level state
- `apiFetch.ts` — Global Sidecar for Settings/Launcher (no Tab)
- `AppConfig` — disk-first config in `~/.nova-agents/config.json`

**Auth requirements:**
- User identity persists across app restarts
- All Tabs share the same auth state
- Login page is a standalone route (no TabProvider)
- Auth state is **user-level**, not workspace-level

**Implication:** Auth state must live above TabProvider, likely in a new `AuthContext` at the App level, synchronized with the disk-first config system.

### 2. SDK Fetch Must Route Through Rust Proxy

**Current SDK behavior** (`src/SDK/nova-auth-sdk/src/client/AuthClient.ts` line 715):
```typescript
const response = await fetch(url, { ... });  // Native fetch!
```

**Architecture constraint:** All frontend HTTP must go through `invoke('cmd_proxy_http')` → Rust → reqwest → destination.

**Options:**
| Approach | Pros | Cons |
|----------|------|------|
| Wrap SDK with proxy wrapper | Minimal SDK changes | Dual fetch layers, complexity |
| Custom `window.fetch` interceptor | Transparent to SDK | Risky, may affect other code |
| Rust-level auth API endpoint | SDK untouched, Rust handles proxy | More implementation work |

**Recommendation:** Create a Tauri-specific SDK wrapper that intercepts fetch calls and routes them through `proxy_http_request`. The SDK's `baseURL` points to the actual auth server, and the wrapper redirects through Rust.

### 3. Token Storage: Disk-First Pattern Required

**Current SDK storage:**
```typescript
// Default: localStorage adapter
createTokenStorage('localStorage' | 'memory' | 'custom', customStorage?)
```

**Project constraint:** Config system is disk-first (`~/.nova-agents/config.json`).

**Recommendation:** Create a custom `TokenStorage` implementation that:
1. Reads/writes tokens to a dedicated section in `AppConfig` (or separate `auth.json`)
2. Uses the existing `atomicModifyConfig()` pattern for safe writes
3. Syncs with the SDK's `TokenManager` via the custom storage adapter

**Storage location decision:**
- **Option A — `auth.json` in `~/.nova-agents/`**: Clean separation, auth-specific file
- **Option B — `AppConfig.auth` field**: Leverages existing infrastructure, single config file

**Recommendation:** Option B (`AppConfig.auth`) — aligns with disk-first pattern, leverages existing `loadAppConfig()` / `saveAppConfig()`, no new file to manage.

### 4. HTTP Flow for Auth API Calls

```
┌─────────────────────────────────────────────────────────────────────┐
│  React Frontend (Login Page)                                         │
│  ┌─────────────────┐    ┌─────────────────┐                          │
│  │  AuthContext    │───►│  SDK Wrapper    │───► window.fetch()     │
│  │  (App-level)    │    │  (proxyFetch)   │    (intercepted)        │
│  └─────────────────┘    └─────────────────┘                          │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ invoke('cmd_proxy_http')
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Rust Tauri Layer                                                   │
│  ┌─────────────────┐    ┌─────────────────┐                        │
│  │  proxy_http     │───►│  local_http     │───► NO_PROXY, no proxy │
│  │  (command)      │    │  .builder()     │    interception        │
│  └─────────────────┘    └─────────────────┘                        │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ reqwest HTTP
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  External Auth Server                                               │
│  POST /auth/sms/send  |  POST /auth/sms/login  |  POST /auth/sms/register │
└─────────────────────────────────────────────────────────────────────┘
```

**Note:** Auth server is external (not Bun Sidecar). The Rust proxy routes directly to the auth server URL, bypassing the sidecar entirely for auth operations.

---

## Component Architecture

### New Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `AuthContext` | `src/renderer/context/AuthContext.tsx` | Global auth state, login/logout actions |
| `useAuth` hook | `src/renderer/hooks/useAuth.ts` | Access auth state from any component |
| `authConfigService` | `src/renderer/config/services/authConfigService.ts` | Disk-first token storage |
| `TauriAuthClient` wrapper | `src/SDK/nova-auth-sdk/src/tauri-client.ts` | Fetch interceptor for Rust proxy |
| `CustomTokenStorage` | `src/SDK/nova-auth-sdk/src/utils/customTokenStorage.ts` | Token adapter for disk storage |

### Component Boundaries

```
App.tsx
├── AuthContext (App-level provider)
│   └── TabProvider (Session-level, children)
│       └── Chat.tsx / Settings.tsx / Launcher.tsx
│           └── useAuth() — reads from AuthContext
│
├── LoginPage (standalone route, no TabProvider)
│   └── AuthPage (SMS login/register UI)
│       └── useAuth() — reads/writes AuthContext
```

### Data Flow

**Login Flow:**
1. User enters phone, clicks "Send Code"
2. `AuthContext.smsSendCode(phone)` called
3. SDK wrapper intercepts, routes through `invoke('cmd_proxy_http')`
4. Rust proxies to auth server
5. On success, SDK stores tokens via `CustomTokenStorage`
6. `CustomTokenStorage` writes to `AppConfig.auth` via `atomicModifyConfig()`
7. AuthContext updates `{ isAuthenticated: true, user: {...} }`
8. App navigates to Launcher

**Subsequent App Launch:**
1. `loadAppConfig()` loads config including `auth` field
2. `AuthContext` initializes from stored tokens
3. `AuthClient.validateToken()` called to verify token freshness
4. If valid, user is logged in; if expired, refresh attempted
5. If refresh fails, user sees login page

---

## Auth State Schema

**Proposed `AppConfig.auth` field:**

```typescript
interface AuthConfig {
  isAuthenticated: boolean;
  accessToken?: string;      // Encrypted at rest (future)
  refreshToken?: string;     // Encrypted at rest (future)
  user?: {
    id: string;
    phone: string;
    username?: string;
    createdAt?: string;
  };
  tokenExpiresAt?: number;   // Unix timestamp for expiry
}

interface AppConfig {
  // ... existing fields ...
  auth?: AuthConfig;         // New field
}
```

---

## Multi-Tab Auth Synchronization

**Problem:** Auth state is global, but React contexts are per-component-tree.

**Solution:** Two-layer synchronization:

1. **React Context layer:** `AuthContext` provides auth state to all components
2. **Storage layer:** Writes go through `atomicModifyConfig()` → disk
3. **SSE broadcast (optional):** Auth state changes broadcast via SSE to all tabs

**Implementation:**
```typescript
// On any auth state change:
async function updateAuth(newState: Partial<AuthConfig>) {
  await atomicModifyConfig(config => ({
    ...config,
    auth: { ...config.auth, ...newState }
  }));
  // AuthContext state update triggers re-render in all subscribed components
}
```

---

## Build Order Implications

### Phase 1: Foundation
1. Add `auth` field to `AppConfig` types
2. Create `authConfigService.ts` with `loadAuthConfig()` / `saveAuthConfig()`
3. Create `CustomTokenStorage` class implementing SDK's `TokenStorage` interface

**Dependency:** None (pure frontend changes)

### Phase 2: SDK Integration
4. Create `TauriAuthClient` wrapper that intercepts SDK fetch calls
5. Route through `invoke('cmd_proxy_http')`
6. Test auth API calls (send code, login, register)

**Dependency:** Phase 1 complete

### Phase 3: Auth Context
7. Create `AuthContext.tsx` at App level
8. Integrate with `App.tsx` (above `Router`)
9. Create `useAuth()` hook
10. Login page component

**Dependency:** Phase 1 + 2 complete

### Phase 4: State Synchronization
11. Persist auth state to disk on every change
12. Load auth state on app startup
13. Handle token refresh lifecycle
14. Handle logout (clear disk + memory)

**Dependency:** Phase 3 complete

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why | Correct Approach |
|--------------|-----|------------------|
| Storing tokens in localStorage | Violates disk-first config pattern; localStorage is browser-scoped | Custom `TokenStorage` backed by `AppConfig` |
| SDK fetch bypassing Rust proxy | Architecture constraint violation; system proxy may intercept | Tauri wrapper intercepts fetch, routes through `cmd_proxy_http` |
| Auth state in TabContext | Tab-scoped state doesn't share across tabs | `AuthContext` at App level |
| Direct config writes | Race conditions with concurrent writes | `atomicModifyConfig()` pattern |
| Tab-scoped API for auth | Login page has no Tab; auth is user-level | Global Sidecar / direct Rust command |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Auth state should be App-level | HIGH | Based on existing architecture analysis |
| Token storage in AppConfig | HIGH | Aligns with disk-first pattern |
| Rust proxy integration | HIGH | `proxy_http_request` already exists |
| Multi-tab sync approach | MEDIUM | SSE broadcast is optional enhancement |
| SDK wrapper approach | MEDIUM | Alternative: Rust-level auth endpoint |

---

## Open Questions

1. **Auth server URL:** Need confirmed deployment address (dev vs prod)
2. **Token encryption:** Should tokens be encrypted at rest in config.json?
3. **Logout behavior:** Should logout clear all tabs' SSE connections?
4. **Token refresh in background:** Should refresh happen lazily on next API call or pre-emptively?

---

## Sources

- `src/SDK/nova-auth-sdk/src/client/AuthClient.ts` — SDK uses native `fetch()`, pluggable storage
- `src/SDK/nova-auth-sdk/src/utils/tokenManager.ts` — TokenManager with `TokenStorage` interface
- `src/renderer/config/types.ts` — `AppConfig` schema (disk-first)
- `src/renderer/config/services/appConfigService.ts` — `atomicModifyConfig()` pattern
- `src/renderer/context/TabContext.tsx` — Tab-scoped context (contrast with auth)
- `src/renderer/api/apiFetch.ts` — Global Sidecar pattern (Settings/Launcher use case)
- `src-tauri/src/sse_proxy.rs` — `proxy_http_request` command
