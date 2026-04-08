# Research Summary: SMS Authentication Desktop UX

**Project:** nova-agents SMS login/register module
**Synthesized:** 2026-04-08
**Domain:** Tauri v2 Desktop App SMS Authentication

---

## Executive Summary

SMS authentication for nova-agents requires a **global user-level auth layer** distinct from the existing **session-level sidecar architecture**. The auth state is fundamentally different from chat session state: it is shared across all tabs, persists across app restarts, and represents user identity rather than AI conversation context.

The core technical challenge is that the existing `@nova-intelligent/auth-sdk` uses native `fetch()` internally, which bypasses the Rust proxy layer required by the architecture. This must be solved by creating a Tauri-specific wrapper that intercepts SDK HTTP calls and routes them through `invoke('proxy_http_request')`. Additionally, the SDK defaults to localStorage for tokens, but the project uses disk-first config (`~/.nova-agents/config.json`) - a custom `TokenStorage` adapter backed by `AppConfig.auth` is required.

The recommended implementation order is: (1) Foundation: token storage + Rust proxy routes; (2) Core Flow: auth context + login/register UI; (3) Polish: multi-tab sync + token refresh handling. Six critical pitfalls have been identified, with the SDK fetch bypass being the most severe - it causes auth failures when users have system proxies configured.

---

## Key Findings

### From STACK.md

| Technology | Decision | Rationale |
|------------|----------|-----------|
| `@nova-intelligent/auth-sdk` | Use existing | Already in codebase, reduces custom code |
| `proxy_http_request` (Rust) | Use existing | Routes HTTP through Rust, bypassing WebView CORS |
| Custom `TauriAuthClient` wrapper | Create new | Intercepts SDK fetch, routes through Rust proxy |
| `DiskTokenStorage` adapter | Create new | Implements SDK's `ITokenStorage`, backed by `AppConfig.auth` |
| `AppConfig.auth` field | Extend existing | Disk-first storage aligns with project patterns |

**No new npm packages required.** All infrastructure already exists.

### From FEATURES.md

**Table Stakes (Phase 1 - Must Have):**
- Phone input with country code selector
- 6-digit verification code input (single field with paste support)
- Send code + 60s countdown timer + resend button
- Login flow (`smsLogin`) + Register flow (`smsRegister` with username)
- Error handling: invalid code, expired code, rate limited
- Loading states + success confirmation
- Token persistence (disk-first override)
- Logout + auth state indicator in UI

**Differentiators (Phase 2+):**
- Single-digit OTP boxes with auto-advance
- Auto-submit when all digits filled
- SMS quota warning via `getSmsStats()`
- Phone number auto-formatting as user types

**Anti-Features (Explicitly Not Building):**
- Password login (SMS-only per PROJECT.md)
- OAuth third-party login
- SMS on every launch (token persistence)
- Countdown > 60s

### From ARCHITECTURE.md

**Core architectural insight:** Auth state must live at App level (above `TabProvider`), not in session-scoped context.

**New components required:**
| Component | Location | Responsibility |
|-----------|----------|----------------|
| `AuthContext` | `src/renderer/context/AuthContext.tsx` | Global auth state, login/logout actions |
| `useAuth` hook | `src/renderer/hooks/useAuth.ts` | Access auth state from any component |
| `authConfigService` | `src/renderer/config/services/authConfigService.ts` | Disk-first token storage |
| `TauriAuthClient` wrapper | `src/SDK/nova-auth-sdk/src/tauri-client.ts` | Fetch interceptor for Rust proxy |
| `DiskTokenStorage` | `src/SDK/nova-auth-sdk/src/utils/diskTokenStorage.ts` | Token adapter for disk storage |

**Build order (from ARCHITECTURE.md):**
1. Phase 1: Add `auth` field to `AppConfig` types + `authConfigService.ts` + `DiskTokenStorage`
2. Phase 2: Create `TauriAuthClient` wrapper + route through `invoke('proxy_http_request')`
3. Phase 3: Create `AuthContext` at App level + integrate with `App.tsx` + login page
4. Phase 4: Persist auth state to disk on every change + load on startup + handle refresh/logout

### From PITFALLS.md

**Top 3 Critical Pitfalls:**

| Pitfall | Severity | Prevention |
|---------|----------|------------|
| SDK `fetch()` bypasses Rust proxy | CRITICAL | Wrap SDK methods in `invoke('cmd_proxy_http')` before any auth HTTP call |
| Token storage fragmentation (localStorage vs disk) | CRITICAL | Custom `TokenStorage` backed by `AppConfig.auth`, not localStorage |
| Multi-tab auth state divergence | MODERATE | Storage event listener + React context broadcast |

**Other pitfalls requiring mitigation:**
- Dual-"Session" concept collision: Rename auth tokens to `userToken`/`userRefreshToken`
- SMS rate limit killing UX: `getSmsStats()` before send + countdown timer
- Auth HTTP route not registered in Rust proxy: Register `/auth-proxy/*` routes before Phase 1 ends
- Token refresh tears in persistent session: Broadcast `user:token:refreshed` event to Sidecar
- Logout does not abort active sessions: Call `abortPersistentSession()` on all sessions at logout
- Auth page living outside TabProvider context: Store user token in Rust-managed memory accessible to all Sidecars

---

## Implications for Roadmap

### Suggested Phase Structure

| Phase | Name | Rationale | Key Deliverables |
|-------|------|-----------|------------------|
| **Phase 1** | Foundation | Pre-requisite for all auth features; cannot test anything without working HTTP transport | Rust proxy routes for `/auth/*` + `AppConfig.auth` schema + `DiskTokenStorage` + `TauriAuthClient` wrapper |
| **Phase 2** | Core Flow | Single-tab auth flow must work before multi-tab sync | `AuthContext` + login/register pages + token persistence + logout |
| **Phase 3** | Multi-Tab Sync | Multi-tab divergence is a moderate risk; can ship v1 as single-tab | Storage event listener + auth state broadcast + tab sync |
| **Phase 4** | Polish | Enhancements that improve UX but are not blocking | SMS quota warning + auto-submit + single-digit OTP boxes |

### Phase 1 Detailed Scope

**What it delivers:** A working auth HTTP transport layer with disk-backed token storage.

**Features from FEATURES.md:**
- Token storage (disk-first via `AppConfig.auth`)
- Tauri proxy wrapper for SDK HTTP calls

**Pitfalls to avoid:**
- Pitfall 1: SDK fetch bypass - MUST wrap before any HTTP call
- Pitfall 2: localStorage vs disk - MUST use disk-first storage
- Pitfall 6: Auth routes not in Rust proxy - MUST register `/auth-proxy/*` routes

**Research flags:** None for Phase 1 - patterns are well-documented (proxy_http_request exists, token storage pattern exists).

### Phase 2 Detailed Scope

**What it delivers:** Complete login/register flow with persistence.

**Features from FEATURES.md:**
- Phone input with country code selector
- Verification code input (6-digit, single field + paste)
- Send code + countdown timer + resend
- Login + register flows
- Error handling (invalid, expired, rate limited)
- Loading states + success confirmation
- Logout

**Pitfalls to avoid:**
- Pitfall 5: SMS rate limit UX - implement `getSmsStats()` + countdown
- Pitfall 3: Session concept collision - use `userToken` naming
- Pitfall 10: Auth page outside TabProvider - Rust-managed token storage

**Research flags:** None - SDK interface verified.

### Phase 3 Detailed Scope

**What it delivers:** Multi-tab auth synchronization.

**Pitfalls to avoid:**
- Pitfall 4: Multi-tab state divergence - storage event listener + broadcast
- Pitfall 7: Token refresh tears - Sidecar listens for refresh events
- Pitfall 8: Logout with active sessions - `abortPersistentSession()` on all

**Research flags:** MEDIUM - multi-tab sync approach (SSE broadcast vs storage events) not fully validated.

### Phase 4 Detailed Scope

**What it delivers:** UX enhancements.

**Features from FEATURES.md:**
- Single-digit OTP boxes with auto-advance
- Auto-submit on complete code
- SMS quota warning
- Phone number auto-formatting

**Research flags:** LOW - standard UX patterns, can be implemented with standard libraries.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified in codebase; proxy_http_request pattern confirmed |
| Features | MEDIUM | SDK interface verified; general UX patterns from training data (search tools unavailable) |
| Architecture | HIGH | Auth state global vs session-scoped clear; disk-first pattern confirmed |
| Pitfalls | HIGH | 6 pitfalls identified from deep codebase analysis |

### Gaps to Address

1. **Auth server URL** - Dev vs prod endpoint not confirmed
2. **Token expiry duration** - Affects logout/session management
3. **Token encryption at rest** - Should `AppConfig.auth` encrypt tokens?
4. **Multi-tab sync approach** - SSE broadcast vs storage events (needs decision)
5. **Username uniqueness validation** - Frontend validate before send or only on submit?
6. **Deep link handling** - Future OAuth consideration (out of scope for now)

---

## Research Flags

| Phase | Needs Deeper Research | Standard Patterns |
|-------|----------------------|-------------------|
| Phase 1 | No | Yes - proxy_http_request pattern exists |
| Phase 2 | No | Yes - SDK interface verified |
| Phase 3 | Yes - multi-tab sync approach | No - needs validation |
| Phase 4 | No | Yes - standard UX patterns |

---

## Sources

- `src/SDK/nova-auth-sdk/src/client/AuthClient.ts` - SDK HTTP transport (fetch bypass)
- `src/SDK/nova-auth-sdk/src/utils/tokenManager.ts` - TokenStorage interface
- `src/renderer/config/types.ts` - AppConfig schema (disk-first)
- `src/renderer/config/services/appConfigService.ts` - atomicModifyConfig pattern
- `src-tauri/src/sse_proxy.rs` - proxy_http_request command
- `src/renderer/context/TabContext.tsx` - Tab-scoped context pattern
- `src/renderer/api/apiFetch.ts` - Global Sidecar pattern
- `specs/tech_docs/architecture.md` - Project architecture
- `specs/guides/design_guide.md` - Design system tokens
- `.planning/PROJECT.md` - Project constraints
