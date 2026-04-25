# Project Research Summary

**Project:** Store/Marketplace Feature for nova-agents
**Domain:** Desktop AI Agent Application Store
**Researched:** 2026-04-25
**Confidence:** MEDIUM-HIGH

## Executive Summary

The Store feature is a secondary WebView window that loads a remote Store URL, allowing users to browse and install Providers/Skills/MCP servers without leaving the app. It integrates with the existing architecture via IPC commands (`cmd_store_install`) that route through the Admin API, with config changes automatically propagating to the frontend via the SSE event system.

Experts build this using Tauri v2's `WebviewWindowBuilder` with `WebviewUrl::External` - the same pattern used for the overlay window. The Store WebView communicates via Tauri invoke commands, not direct HTTP, respecting the "Rust proxy layer" architecture principle. No new npm packages are needed; everything reuses existing APIs (`@tauri-apps/api`, existing event system, existing Admin API).

Key risks center on secure token injection into the WebView (Pitfall 1), IPC contract stability (Pitfall 2), and proper window lifecycle management (Pitfall 5). These are all addressable in Phase 1 with correct patterns from the start.

## Key Findings

### Recommended Stack

**Core technologies:**
- `@tauri-apps/api` (~2.10) - WebView creation and IPC via `invoke`/`emit`
- `tauri` (2.9.6) - Runtime with `WebviewUrl::External` support for remote Store URL
- `core:webview` permissions - Required for creating secondary WebView windows
- `core:webview:allow-create-webview-window` + `core:webview:allow-post-message` - New permissions needed
- No new npm packages required

**What NOT to use:**
- `WebviewWindowBuilder::remote` (deprecated) - use `WebviewUrl::External`
- Raw `window.postMessage` without Tauri event bridge - use `emit`/`listen`
- Direct HTTP from WebView - violates Rust proxy layer principle

### Expected Features

**Must have (table stakes):**
- Store entry button in Settings sidebar - P1
- Store WebView window opens with remote URL - P1
- Basic install flow: WebView -> IPC -> Admin API -> success/failure - P1
- Auth token injected into Store WebView on open - P1
- Installed lists refresh after successful install - P1

**Should have (competitive):**
- Hot-update Settings lists without page reload - P2
- Install progress indicator (loading state during install) - P2
- Background install (user can browse while install completes) - P2

**Defer (v2+):**
- Offline store browsing/caching
- Search within Store
- Ratings and reviews
- Featured/promoted items
- Store notifications for updates to installed items

### Architecture Approach

The Store feature follows the existing overlay window pattern from `lib.rs` lines 281-297. A new `"store"` labeled WebView window is created via `WebviewWindowBuilder`, loading a remote Store URL via `WebviewUrl::External`. The WebView communicates with Tauri via IPC (`invoke`) commands, not direct HTTP. Install commands route to `cmd_store_install` which calls the Admin API via Global Sidecar HTTP. Config changes propagate via SSE broadcast (`config-changed` event), which `ConfigDataContext` already listens to, triggering automatic React state refresh.

**Major components:**
1. **Store WebView window** (`lib.rs`) - Secondary window via `WebviewWindowBuilder`, standard decorations, ~1000x700 centered
2. **Store IPC handler** (`commands.rs` / `store.rs`) - `cmd_store_install`, `cmd_get_store_auth_token` bridging WebView to Admin API
3. **Admin API extension** (`admin-api.ts`) - Installation handlers reusing existing MCP/Provider patterns with SSE broadcast
4. **ConfigDataContext** - Existing auto-refresh on `nova-agents:config-changed` event (no new code needed)

### Critical Pitfalls

1. **Token leakage via URL parameters** - Never pass auth tokens in URL query params. Use IPC post-creation injection via `window.__TAURI__` or Tauri event bridge. Address in Phase 1.

2. **IPC message format mismatch** - Define strict TypeScript interfaces for all commands. Use serde `#[serde(default)]` for optional fields. Register events in JSON_EVENTS whitelist. Address in Phase 2.

3. **Admin API silent failures** - Always return explicit `{ success: false, error }` responses. Wrap broadcast calls in try/catch that log failures. Address in Phase 3.

4. **Hot update race conditions** - Implement debounced config reload (300-500ms) to batch rapid SSE events. Track reload state to prevent concurrent refreshes. Address in Phase 4.

5. **Orphaned WebView window on exit** - Register all WebView windows in a HashMap for tracking. Add all windows to cleanup handlers in `on_window_event`. Handle `Destroyed` event for ALL windows. Address in Phase 1.

## Implications for Roadmap

Based on research, a 4-phase structure is recommended:

### Phase 1: Window Foundation
**Rationale:** Window creation is the prerequisite for everything else. Must implement secure token injection and proper lifecycle from the start to avoid retrofitting security later.

**Delivers:** Store WebView window that opens/closes cleanly with proper lifecycle tracking
**Addresses:** Pitfalls 1 (token leakage) and 5 (orphan window)
**Uses:** `WebviewWindowBuilder`, new `core:webview` permissions

### Phase 2: IPC Bridge
**Rationale:** IPC contract must be stable before install flow can work. Auth token sharing via IPC is Phase 2, not Phase 1, because window must exist first to receive the token.

**Delivers:** `cmd_store_install` and `cmd_get_store_auth_token` commands wired to WebView
**Addresses:** Pitfall 2 (IPC format mismatch)
**Uses:** Existing command patterns from `commands.rs`

### Phase 3: Admin API Integration
**Rationale:** Installation logic depends on IPC bridge. Must wire up SSE broadcast so frontend auto-refreshes.

**Delivers:** End-to-end install flow: WebView -> IPC -> Admin API -> config write -> SSE broadcast -> Settings update
**Addresses:** Pitfall 3 (silent failure)
**Uses:** Admin API handlers, `broadcast()` pattern

### Phase 4: Settings Integration and Polish
**Rationale:** Entry point and end-to-end testing come last once all internals are stable.

**Delivers:** Store button in Settings sidebar, install progress feedback, deep-link to Settings panels
**Addresses:** Pitfall 4 (hot update race), P2 features

### Phase Ordering Rationale

- Window first because no other phase can be tested without it
- IPC second because install commands cannot flow without it
- Admin API third because it completes the install flow
- Settings last because it's the user-facing entry point on stable internals

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Secure token injection mechanism - needs validation with Tauri v2 WebView APIs to confirm `emit`/`listen` pattern works for token delivery
- **Phase 3:** Install rollback/error recovery - partial failure scenarios need defined recovery paths

Phases with standard patterns (skip research-phase):
- **Phase 1:** Window creation - direct reuse of overlay pattern from `lib.rs` lines 281-297
- **Phase 4:** Settings button - simple component addition, well-understood

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on verified codebase patterns from lib.rs overlay implementation |
| Features | MEDIUM | Based on known marketplace patterns (VSCode/JetBrains/Slack); web search unavailable |
| Architecture | HIGH | Follows existing nova-agents patterns exactly (overlay window, Admin API, SSE broadcast) |
| Pitfalls | MEDIUM | Based on common desktop app patterns; external Tauri docs inaccessible |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Secure token injection:** The recommended approach (IPC post-creation token injection) needs validation in Tauri v2 WebView context - confirm WebView JavaScript can access `window.__TAURI__` reliably
- **Store URL configuration:** Where/how to configure the Store URL (hardcoded vs config file vs env var) not yet determined
- **Install rollback:** Partial failure scenarios (config write succeeds but MCP tool install fails) need defined recovery paths
- **WebView lifecycle:** Whether Store window should be hidden on close (fast re-open) vs destroyed (clean slate) - affects memory management

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/lib.rs` lines 281-297 - Overlay window pattern (direct reference)
- `src-tauri/src/commands.rs` - Command structure patterns
- `src/server/admin-api.ts` - Installation logic patterns
- `src/renderer/config/ConfigProvider.tsx` lines 331-343 - Config auto-refresh
- `src/renderer/api/SseConnection.ts` - JSON_EVENTS whitelist pattern

### Secondary (MEDIUM confidence)
- VSCode Marketplace behavior - Extension installation flow
- JetBrains IDE Plugin ecosystem - One-click install patterns
- Tauri v2 WebViewUrl::External - Known API pattern

### Tertiary (LOW confidence)
- External Tauri v2 documentation - Inaccessible during research; assumptions based on existing codebase
- Store feature UX specifics - No web search available; competitor patterns used as proxy

---
*Research completed: 2026-04-25*
*Ready for roadmap: yes*
