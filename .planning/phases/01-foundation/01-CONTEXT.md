# Phase 1: Foundation - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers: TauriAuthClient wrapper, DiskTokenStorage adapter, AppConfig.auth schema, configurable API baseURL. No UI in this phase. The goal is end-to-end working auth HTTP transport with disk-backed token storage.

</domain>

<decisions>
## Implementation Decisions

### Auth API URL Configuration
- **D-01:** Auth API baseURL stored in `AppConfig.authServerUrl`. Default to `http://localhost:3000` for dev. Setting persists to disk via `atomicModifyConfig`.

### Token Storage Schema
- **D-02:** `AppConfig.auth` field stores `{ accessToken, refreshToken, user?: { userId, username }, expiresAt? }`. Tokens stored as plain strings (config.json is user-writable, not encrypted).
- **D-03:** Custom `DiskTokenStorage` implements SDK `TokenStorage` interface (`getItem/setItem/removeItem`). Reads/writes via `atomicModifyConfig` to avoid race conditions.

### SDK HTTP Interception
- **D-04:** Create `TauriAuthClient` class in `src/SDK/nova-auth-sdk/src/tauri-client.ts`. Wraps all SDK HTTP calls (sendSmsCode, smsLogin, smsRegister, etc.) via `invoke('cmd_proxy_http')` → Rust → reqwest → auth server. SDK internal `fetch()` is never called directly.
- **D-05:** `TauriAuthClient` takes `authServerUrl` in constructor. Each method constructs full URL and uses the proxy invoke.

### Rust Proxy Route
- **D-06:** Auth endpoints: `/auth/sms/send`, `/auth/sms/login`, `/auth/sms/register`, `/auth/sms/stats`, `/auth/refresh`, `/auth/logout`. Route pattern: `POST/GET /auth-proxy/{path}` → reqwest → `{authServerUrl}/{path}`.
- **D-07:** Rust side: add `proxy_http_request` route registration for `/auth-proxy/*` path prefix in `sse_proxy.rs` or `lib.rs`.

### Auth State on App Startup
- **D-08:** On app load, `AuthContext` reads tokens from `AppConfig.auth`. If valid `accessToken` exists, validate with backend via `validateToken()`. If refresh needed, use `refreshToken()`. Fallback to logged-out state if both fail.

### Claude's Discretion
- Session-sidecar integration with auth user token is deferred to Phase 2 (after foundation). Phase 1 focuses purely on HTTP transport + storage.
- Specific error handling messages for each auth API error code — deferred to Phase 2.

</decisions>

<canonical_refs>
## Canonical References

### Architecture & Config
- `src/renderer/config/types.ts` — AppConfig schema, extend with `authServerUrl` and `auth` fields
- `src/renderer/config/services/appConfigService.ts` — `atomicModifyConfig` pattern for disk-first writes
- `src-tauri/src/sse_proxy.rs` — existing `proxy_http_request` command to wrap
- `src-tauri/src/lib.rs` — where to register new proxy route handlers

### SDK Source
- `src/SDK/nova-auth-sdk/src/client/AuthClient.ts` — source of truth for API endpoints and types
- `src/SDK/nova-auth-sdk/src/types/auth.types.ts` — SmsSendRequest, SmsLoginRequest, SmsRegisterRequest, etc.
- `src/SDK/nova-auth-sdk/src/utils/tokenManager.ts` — TokenStorage interface to implement

### Design System
- `specs/guides/design_guide.md` — CSS token usage if any UI is needed (Phase 2)

### Project Constraints
- `CLAUDE.md` — Rust proxy layer constraint (no direct HTTP from WebView)
- `specs/tech_docs/architecture.md` — Tab-scoped vs global state patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `atomicModifyConfig` in `appConfigService.ts` — thread-safe disk config writes, use for token persistence
- `proxy_http_request` in `sse_proxy.rs` — existing HTTP proxy, extend with auth route prefix
- SDK's `TokenStorage` interface in `tokenManager.ts` — implement to replace localStorage default

### Established Patterns
- Config extensions use `Record<string, T>` or optional fields on `AppConfig` interface
- Tauri invoke wrapper pattern: `invoke<T>('cmd_name', { param })`

### Integration Points
- New `TauriAuthClient` instantiated in `AuthContext` (Phase 2), not in Phase 1
- Phase 1 only produces `src/SDK/nova-auth-sdk/src/tauri-client.ts` and `src/SDK/nova-auth-sdk/src/utils/diskTokenStorage.ts`

</code_context>

<specifics>
## Specific Ideas

- Use SDK's `SmsSendRequest`, `SmsLoginRequest`, `SmsRegisterRequest` types directly
- Phone number: no country code selector in Phase 1 — plain text input, assume +86 China for now
- Error handling: Phase 1 returns raw SDK errors; Phase 2 wraps with user-friendly messages

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-08*
