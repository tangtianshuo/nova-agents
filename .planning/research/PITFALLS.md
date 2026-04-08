# Domain Pitfalls: SMS Authentication in nova-agents

**Domain:** Tauri Desktop App SMS Authentication
**Project:** nova-agents user login/register module
**Researched:** 2026-04-08
**Confidence:** HIGH (based on deep codebase analysis)

---

## Critical Pitfalls

Mistakes that cause rewrites, security breaches, or broken user flows.

---

### Pitfall 1: SDK fetch() Bypasses Rust Proxy Layer

**What goes wrong:** `AuthClient.fetchWithTimeout()` uses native `window.fetch()` (line 715 of `AuthClient.ts`), sending HTTP directly from the WebView to the auth server. This violates the core architecture constraint that ALL frontend HTTP MUST route through Rust (`invoke('cmd_proxy_http')` -> reqwest -> upstream).

**Why it happens:** The `nova-auth-sdk` is a web SDK designed for browsers. Its `fetchWithTimeout` method constructs a full URL and calls `fetch()` directly. In a Tauri WebView, this bypasses:
- The `local_http` module's `.no_proxy()` protection against system proxies (Clash/V2Ray will cause 502 on localhost auth requests)
- The `proxy_config` injection for sub-process HTTP_PROXY/NO_PROXY environment variables
- Any auth token header injection that Rust middleware expects to perform

**Consequences:**
- Auth requests fail with 502 when user has a system proxy configured
- Auth tokens visible in WebView network inspector (security exposure)
- No centralized error handling for auth HTTP errors
- Token refresh race conditions with Sidecar processes

**Prevention:**
- Wrap `AuthClient` methods in a Tauri invoke bridge that routes through Rust
- Create `src/renderer/api/authApi.ts` with methods like `authSendSms(phone, type)` that call `invoke('cmd_proxy_http', { url, method, body })`
- Pass the wrapped client to UI components, never the raw SDK
- Alternatively: fork the SDK and replace `fetchWithTimeout` with a Tauri invoke call

**Detection:** Logs show `[RUST]` HTTP errors like `502 Bad Gateway` for auth endpoints, but not for Sidecar endpoints (which correctly use Rust proxy).

---

### Pitfall 2: Token Storage Fragmentation (localStorage vs Disk-First Config)

**What goes wrong:** The SDK defaults to `localStorage` for tokens (`LocalStorageAdapter` uses `window.localStorage`). The app's config system is disk-first (`~/.nova-agents/config.json`). After app restart, the auth token exists in localStorage but the app's config system does not know about it.

**Why it happens:**
- `createTokenStorage('localStorage')` -> `LocalStorageAdapter` writes to `window.localStorage` under keys `nova_access_token` / `nova_refresh_token`
- nova-agents config is managed by `ConfigStore` which reads/writes `~/.nova-agents/config.json`
- No synchronization between these two storage locations
- SDK's `isAuthenticated()` checks localStorage; app logic checks disk config

**Consequences:**
- App restart: UI shows "not logged in" even though SDK has valid localStorage token (disk config doesn't know user is logged in)
- Logout from one location (localStorage clear vs disk config update) leaves the other in a stale state
- If localStorage is cleared but disk config still has user data, the app and SDK disagree on auth state
- Token stored in localStorage is accessible to WebView JavaScript (XSS risk); disk config can be protected by Rust filesystem permissions

**Prevention:**
- Use SDK's `custom` storage type with a `TokenStorage` implementation backed by the disk config
- Create `src/renderer/config/authTokenStorage.ts` implementing `TokenStorage` interface, reading/writing to the same disk config the app uses
- After successful SMS login/register, explicitly sync to disk: call SDK's `setToken/setRefreshToken` then also persist to disk config via Tauri invoke
- On app startup: check disk config for auth state first, then hydrate SDK's token manager from disk

**Phase mapping:** Storage strategy MUST be decided in Phase 1 (Foundation). Disk-backed token storage is a prerequisite for all auth features.

---

### Pitfall 3: Dual-"Session" Concept Collision

**What goes wrong:** The app already has a concept of "Session" meaning an AI chat conversation (`SessionMetadata`, `SessionSidecar`, per-tab session state). Adding "logged-in user session" (access token / refresh token) creates two incompatible uses of the word "session" that engineers and code will conflate.

**Why it happens:** `sessionId` refers to AI conversation sessions. Adding auth tokens introduces `accessToken`, `refreshToken` which are ALSO called "sessions" in auth terminology. The `SidecarOwner` enum has `Tab`, `CronTask`, `BackgroundCompletion`, `Agent` - none of these know about a logged-in user identity.

**Consequences:**
- `SessionSidecar` has no field for "authenticated user ID" - the AI doesn't know who is logged in
- Session IDs (chat) and auth tokens are completely independent systems
- Functions like `getSessionPort()` return a port but no user identity context
- When AI calls tools that require auth (future: paid APIs), there is no user-scoped token to use

**Prevention:**
- Rename auth tokens to `userToken` / `userRefreshToken` in the wrapping layer to avoid collision
- Create a `LoggedInUser` context (React Context) separate from `TabContext`
- The auth user identity lives in a distinct layer above the Sidecar/chat session layer
- SDK methods that need auth user context receive it as a parameter, not from global state

**Detection:** Code search for `session` produces both chat-session results and auth-session results with no way to distinguish.

---

### Pitfall 4: Multi-Tab Auth State Divergence

**What goes wrong:** If User logs in via Tab A, Tab B (open simultaneously) still shows "not logged in" state. If User logs out in Tab B, Tab A continues making authenticated API calls with a now-invalid token.

**Why it happens:**
- Each tab has independent React context trees
- SDK token storage (`window.localStorage`) IS shared across tabs (same origin), but React state is NOT
- No mechanism to broadcast auth state changes across tabs
- `TabContext` manages per-tab state independently; there is no global auth state broadcast

**Consequences:**
- Tab B logs out, Tab A continues using the logged-in session (stale UI state, then 401 errors)
- Token refresh in Tab A updates localStorage, but Tab B's in-memory React state still has the old token
- Race: Tab A and Tab B both attempt token refresh simultaneously (double refresh, one overwrites the other)

**Prevention:**
- Use a broadcast channel or storage event listener to sync auth state across tabs
- Wrap `AuthContext` in an event emitter that fires on login/logout/refresh
- Before any SDK call, re-read token from storage (not from React state cache)
- On logout: immediately clear localStorage AND disk config AND broadcast to all tabs
- On token refresh: write to storage before resolving the Promise, so other tabs can read the new value

**Phase mapping:** Multi-tab sync is a Phase 2 concern (after single-tab auth flow works). Phase 1 can assume single-tab usage.

---

### Pitfall 5: SMS Rate Limit Killing the UX

**What goes wrong:** User clicks "Send Code" repeatedly because no clear feedback, or the app does not show the rate limit countdown, or the rate limit error is displayed in English but the rest of the app is localized.

**Why it happens:**
- SMS endpoints have strict rate limits (e.g., 5 codes per phone per day, 1 per 60 seconds)
- The SDK's `sendSmsCode()` returns a generic 429 or error response
- The UI may show "SMS sent" even when the server rejected it due to rate limiting
- No client-side throttle to prevent wasted API calls

**Consequences:**
- User exhausts daily SMS quota during testing, cannot complete login
- Frustrating UX: "Send Code" appears to work (no error shown), but the SMS never arrives
- Server rate limit triggers, app shows cryptic error, user doesn't know when they can retry

**Prevention:**
- Call `getSmsStats(phone)` BEFORE allowing send to check remaining quota
- Show quota information in the UI: "3 codes remaining today" or "Wait 47s before resending"
- Implement client-side throttle: disable button for 60s after send, show countdown timer
- On 429 response, parse `Retry-After` header and display the retry countdown
- Store send timestamp in sessionStorage to survive component remounts but not tab closes
- For register flow: validate phone format client-side BEFORE calling send (avoid wasting quota on bad input)

**Phase mapping:** UX for rate limiting is Phase 2. Phase 1 can use basic disabled-button + countdown.

---

### Pitfall 6: Auth HTTP Route Not Registered in Rust Proxy

**What goes wrong:** The Rust proxy (`src-tauri/src/sse_proxy.rs` or a new `auth_proxy.rs`) does not have routes for `/auth/sms/*`. Auth requests return 404 from the proxy, or are forwarded to the wrong upstream (Sidecar instead of auth server).

**Why it happens:**
- Existing Rust proxy routes `/api/*` to Bun Sidecar
- Auth endpoints (`/auth/sms/send`, `/auth/sms/login`) have a different path prefix
- If the proxy does pattern matching on path prefix, auth routes might not match any handler
- Auth server may be at a different host/port than the Sidecar

**Consequences:**
- `invoke('cmd_proxy_http')` for auth endpoints returns 404 or wrong data
- The auth SDK's requests go to the wrong server (Sidecar instead of auth-server)
- Even if requests reach the auth server, responses don't route back correctly

**Prevention:**
- Designate a path prefix for auth requests (e.g., `/auth-proxy/*` or use a separate invoke command `cmd_proxy_auth_http`)
- Register auth routes in Rust proxy BEFORE Phase 1 ends
- Add a `baseURL` configuration for the auth server in `AppConfig`, passed to Rust on startup
- Test: with a system proxy running (Clash/V2Ray), send an auth request and verify it succeeds

---

## Moderate Pitfalls

---

### Pitfall 7: Token Refresh Tears in Persistent Session

**What goes wrong:** A chat session is running (AI is generating a long response), the access token expires mid-stream. The SDK triggers a token refresh. The refresh updates the token in storage, but the in-flight Sidecar request (using the old token) fails with 401.

**Why it happens:**
- `messageGenerator()` holds the session sidecar process with a fixed token
- SDK's `fetchWithAutoRetry` refreshes on 401 but only retries the specific failing request
- The Sidecar's subprocess is not notified of the refresh; it continues using the stale token
- If the Sidecar itself makes outbound API calls (tool use), those calls use the stale token

**Prevention:**
- After token refresh, broadcast a `user:token:refreshed` event that Sidecar can listen to
- Sidecar recreates its HTTP clients with the new token
- Alternatively: do not store auth tokens in the Sidecar at all; the Sidecar proxies to the Rust layer which injects the current token

---

### Pitfall 8: Logout Does Not Abort Active Sessions

**What goes wrong:** User is in the middle of an AI conversation. They log out. The Sidecar session continues running in the background, making API calls with the now-invalid token.

**Why it happens:**
- Logout clears tokens from SDK storage
- `abortPersistentSession()` is NOT called on the active chat session
- CronTask/Agent sessions that depend on auth tokens are not notified

**Prevention:**
- On logout: iterate all active Sidecar sessions and call `abortPersistentSession()`
- Notify Rust `ManagedAgents` and `ManagedImBots` that auth is revoked
- Consider: require confirmation dialog "You have active AI sessions. Are you sure you want to log out?"

---

### Pitfall 9: First Login After Fresh Install Creates Ghost Config

**What goes wrong:** First-time user logs in, the SDK stores tokens in localStorage. The disk config is never updated. User closes app, reopens - localStorage might be cleared by browser storage policies or the disk config still has no user record.

**Why it happens:**
- WebView localStorage can be cleared by OS storage pressure on some platforms
- Tauri v2's localStorage scope may differ from other apps
- The app config system was designed for provider/agent/mcp settings, not user identity

**Prevention:**
- On first successful SMS login: immediately write user identity to disk config
- On app startup: hydrate auth state from disk config, not from localStorage
- Treat disk config as the source of truth, localStorage as a cache

---

### Pitfall 10: Auth Page Living Outside TabProvider Context

**What goes wrong:** The login page is a standalone route (`/login`) rendered outside `TabProvider`. It uses the global `apiFetch` (not `useTabState()`). After logging in, navigating to a chat tab creates a new session but the logged-in user context is not available to the Sidecar.

**Why it happens:**
- Chat tabs live inside `TabProvider` which manages Sidecar lifecycle
- Login page is `Settings` or `Launcher`-style (outside TabProvider, uses Global Sidecar)
- After login, the AI in a chat tab cannot access the user's auth token because it lives in a different context

**Prevention:**
- Auth state (logged-in user) MUST be accessible to ALL Sidecar sessions
- Consider: store `userToken` and `userRefreshToken` in Rust-managed memory (accessible to all Sidecars) rather than in React Context
- Rust command `cmd_get_user_token` returns the current user's token (or null if not logged in)
- Sidecar receives user token via environment variable or startup config

---

## Minor Pitfalls

---

### Pitfall 11: Phone Number Input Allows Invalid Formats

**What goes wrong:** User enters `+86 138 0000 0000` (spaces) or `13800000000` (no country code). Backend rejects. Error message is cryptic or missing.

**Prevention:**
- Normalize phone input: strip spaces, validate with `libphonenumber` before sending
- Show real-time validation feedback: "Please enter a valid phone number"
- Default to user's country from system locale if available

---

### Pitfall 12: "Remember Me" vs "This Device" Confusion

**What goes wrong:** Desktop app has no concept of "device". User expects "stay logged in" to mean "until I explicitly log out". But token expiry still logs them out after N days.

**Prevention:**
- Use refresh token with long expiry (30 days) as the "stay logged in" mechanism
- If refresh token also expires, show re-auth screen but prefill the phone number
- Clearly communicate token expiry time in UI

---

## Phase-Specific Warnings

| Phase | Topic | Pitfall | Mitigation |
|-------|-------|---------|------------|
| Phase 1: Foundation | SDK HTTP bridge | Pitfall 1 (fetch bypass) | Must wrap SDK in Tauri invoke BEFORE any auth HTTP call is made |
| Phase 1: Foundation | Token storage | Pitfall 2 (localStorage vs disk) | Disk-backed storage implementation is prerequisite for Phase 2 |
| Phase 1: Foundation | Rust proxy routes | Pitfall 6 (auth routes) | Register `/auth-proxy/*` routes in Rust before Phase 1 ends |
| Phase 2: Core Flow | Multi-tab sync | Pitfall 4 (auth state divergence) | Add storage event listener + React context broadcast |
| Phase 2: Core Flow | Token refresh mid-stream | Pitfall 7 (tears) | Notify Sidecar of refresh events |
| Phase 2: Core Flow | Logout with active sessions | Pitfall 8 (abort sessions) | Call `abortPersistentSession()` on all sessions at logout |
| Phase 2: Core Flow | SMS rate limit UX | Pitfall 5 (rate limit) | `getSmsStats()` before send + countdown timer + 429 handling |
| Phase 3: Polish | Auth page context | Pitfall 10 (outside TabProvider) | Rust-managed user token storage accessible to all Sidecars |

---

## Sources

- Code analysis: `src/SDK/nova-auth-sdk/src/client/AuthClient.ts` (fetch bypass), `src/SDK/nova-auth-sdk/src/utils/tokenManager.ts` (localStorage default)
- Architecture: `specs/tech_docs/architecture.md` (Rust proxy requirement, local_http module)
- Config system: `src/renderer/config/configService.ts`, `src/renderer/config/services/configStore.ts`
- Project constraints: `.planning/PROJECT.md` (disk-first config requirement)
