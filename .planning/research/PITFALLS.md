# Pitfalls Research

**Domain:** Store/Marketplace Feature for Tauri v2 Desktop Application
**Researched:** 2026-04-25
**Confidence:** MEDIUM

> Note: External documentation sources (Tauri v2 official docs, web search) were inaccessible due to network restrictions. Findings are grounded in codebase patterns observed in nova-agents and general desktop application development best practices.

## Critical Pitfalls

### Pitfall 1: WebView Authentication Token Leakage via URL Parameters

**What goes wrong:**
Authentication tokens are exposed in browser history, server logs, and can be intercepted via referrer headers when passing tokens through URL query parameters in the WebView URL.

**Why it happens:**
The most straightforward way to pass auth to a WebView is appending `?token=xxx` to the URL. Developers choose this because it works immediately without additional infrastructure. However, URLs are logged everywhere: browser history, server access logs, proxy logs, referrer headers, and bookmarks.

**How to avoid:**
- **Use `WebviewWindowBuilder` with `data` attribute injection** instead of URL parameters
- Pass tokens via Tauri IPC (`invoke`) after window creation, then have the WebView JavaScript retrieve via `window.__TAURI__` bridge
- For external URLs: use a server-side proxy endpoint that validates the session and issues a short-lived HttpOnly cookie
- If URL params are unavoidable, use one-time tokens with server-side validation and immediate invalidation

**Warning signs:**
- URL contains `?token=`, `?auth=`, or `?session=`
- Console logs or error messages include full URLs with credentials
- Server access logs show requests with token parameters in query strings

**Phase to address:**
Phase 1 (Store WebView Window) must implement secure token passing before any auth-related features.

---

### Pitfall 2: IPC Message Format Mismatch Between WebView and Tauri

**What goes wrong:**
WebView sends messages that Tauri cannot parse, or Tauri responses are misinterpreted by WebView, causing silent failures or crashes. Common symptoms: "Unknown command" errors, JSON parse failures, or the WebView appears to freeze.

**Why it happens:**
The WebView is a remote context (potentially third-party storefront) sending messages via `postMessage` or Tauri invoke calls. Type mismatches occur when:
- Rust expects `&str` but receives JSON string that needs parsing
- Frontend sends `number` but Rust expects `i32` vs `u32`
- Optional fields are missing vs expected `null` vs absent
- Event names don't match registered handlers exactly (case sensitivity)

**How to avoid:**
- Define a strict IPC contract with explicit TypeScript interfaces for all commands
- Validate all incoming payloads with explicit type checking in Rust handlers
- Use serde's `#[serde(default)]` for optional fields to handle missing/null consistently
- Register all IPC events in a whitelist (like the existing `JSON_EVENTS` pattern in `SseConnection.ts`)
- Write integration tests that verify the WebView can send each command and receive correct responses

**Warning signs:**
- Rust handler uses `#[tauri::command]` without validating payload structure
- TypeScript IPC calls don't have explicit return type annotations
- New invoke handlers aren't added to the `generate_handler!` macro
- WebView uses `any` types for message payloads

**Phase to address:**
Phase 2 (IPC Communication) must establish the contract before Phase 3 (Admin API Integration).

---

### Pitfall 3: Admin API Error Handling Silently Fails Frontend Updates

**What goes wrong:**
Store installation or configuration changes succeed on the backend but the frontend Settings page doesn't reflect them. Users install a Provider/Skill/MCP from the store, see no change, and reinstall repeatedly.

**Why it happens:**
The admin-api.ts pattern writes config to disk and broadcasts SSE events, but:
- SSE event `config:changed` isn't registered in the WebView's `JSON_EVENTS` whitelist
- The Settings page uses a stale in-memory copy of config instead of re-loading
- Error handling catches exceptions but returns success responses
- The installation succeeds but triggers an error in the broadcast step, which is ignored

**How to avoid:**
- Always return explicit error responses from Admin API: `{ success: false, error: "具体的错误信息" }`
- Wrap all broadcast calls in try/catch that at minimum log the failure
- Ensure frontend has a `config:changed` event listener that triggers `loadAppConfig()`
- Verify the SSE event whitelist includes `config:changed` before deploying
- Add a post-install verification step: fetch the installed item and confirm it appears in the list

**Warning signs:**
- Admin API handlers return `{ success: true }` even when disk write fails
- No error is logged when SSE broadcast fails
- Frontend uses `config` state directly instead of re-loading from disk after events

**Phase to address:**
Phase 4 (Settings Hot Update) must implement and test the full config refresh cycle.

---

### Pitfall 4: List Hot Update Triggers Infinite Re-render or Stale Data

**What goes wrong:**
After installing an item from the Store, the Settings list either shows duplicate entries, shows the old list, or enters an infinite loading loop.

**Why it happens:**
The hot update mechanism has race conditions:
- SSE event arrives before the disk write completes (async ordering issue)
- Frontend has multiple event listeners that all trigger the refresh
- ConfigContext provider re-renders children unnecessarily, causing child components to re-mount
- React strict mode double-invokes effects, causing duplicate fetches

**How to avoid:**
- Implement a debounced config reload (300-500ms) to batch rapid SSE events
- Use React `useConfig` pattern with explicit refresh triggers rather than automatic reload
- Track reload state to prevent concurrent refreshes (isLoading flag)
- Add response caching so repeated requests return immediately if data hasn't changed
- Test with rapid install/uninstall cycles to expose race conditions

**Warning signs:**
- React DevTools shows excessive re-render counts after store operations
- Console shows multiple `loadAppConfig()` calls in quick succession
- The Settings page flickers or shows loading indicators during hot updates

**Phase to address:**
Phase 4 (Settings Hot Update) must implement debouncing and state management for hot updates.

---

### Pitfall 5: Store WebView Window Becomes Orphaned on App Exit

**What goes wrong:**
The Store WebView window doesn't close when the main application closes, or closes too early interrupting operations. Memory leaks accumulate if windows aren't properly cleaned up.

**Why it happens:**
Unlike the main window (which has explicit lifecycle management in `lib.rs`), a secondary WebView window for the Store may not be registered in the window event handlers. This happens because:
- Secondary windows are created via `WebviewWindowBuilder` but not tracked in the cleanup handlers
- The `on_window_event` handler only processes `"main"` window events
- `cleanup_done` flag isn't shared with the secondary window's lifecycle
- Window close during active download leaves partial state

**How to avoid:**
- Register all WebView windows in a `HashMap<String, WebviewWindow>` for tracking
- Add all windows to the same cleanup handlers in `on_window_event`
- Use `window.close()` with proper async/await in cleanup
- Implement a window registry that tracks which windows are open
- Handle the `Destroyed` event for ALL windows, not just "main"
- Consider using `tauri_plugin_single_instance` to prevent multiple store windows

**Warning signs:**
- Multiple store windows can be opened simultaneously
- Process manager shows bun.exe or node.exe processes remaining after app close
- App exit is delayed or hangs when store window is open
- Memory usage grows with each store open/close cycle

**Phase to address:**
Phase 1 (Store WebView Window) must implement proper window lifecycle from the start.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using URL params for auth | Works immediately, no backend changes | Token exposure, security audit failures | Never - security risk |
| Skipping input validation in IPC | Faster initial development | Hard-to-debug runtime crashes, security vulnerabilities | Only in proof-of-concept |
| Returning generic errors | Simpler code | User sees unhelpful messages, hard to diagnose | Only for truly unrecoverable errors |
| Loading config on every render | Data always fresh | Performance issues, complexity in useConfig | Never - use event-driven updates |
| Not tracking window lifecycle | Works for simple cases | Memory leaks, orphan processes | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Store WebView | Passing tokens via URL | Use Tauri IPC post-creation to inject tokens |
| Store Backend | Not validating CORS for desktop | Use Rust proxy for all store API calls |
| Admin API | Silent failures in broadcast | Always log broadcast failures, even if non-fatal |
| Config System | Multiple concurrent reloads | Use debounce + loading state to prevent races |
| Window Management | No cleanup for secondary windows | Track all windows in registry, cleanup on exit |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unbounded config reloads | 100% CPU during rapid store operations | Debounce SSE events 300-500ms | At 10+ rapid install/uninstall |
| WebView memory leak | Memory grows 50MB per store open | Explicit window.destroy() on close | After 5+ store sessions |
| SSE connection flood | Multiple SSE connections for same tab | Single SSE connection per tab, reuse | When store causes tab re-creation |
| Large config file | Slow loadAppConfig on every change | Load only changed section, cache | At 50+ MCP servers |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Tokens in URL | Token stolen via logs/referer | Use IPC injection or HttpOnly cookies |
| No CSP for WebView | XSS in store content | Configure `csp` in WebviewWindowBuilder |
| Store URL not validated | Phishing via malicious store | Validate store domain against allowlist |
| No window isolation | Store can access main window APIs | Use `webviewAttributes` to disable context isolation |
| Sensitive data in WebView storage | Data persists after close | Clear WebView storage on window close |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Store window opens but no feedback | Users think nothing happened | Show store window immediately, loading indicator while it loads |
| Install progress unclear | Users don't know if install succeeded | Show explicit success/error toast with item name |
| Store closes during install | Lost work, confusion | Disable close button during operations, show cancel confirmation |
| No way to return to store | Can't browse more items | Store window should have back navigation, not just close |
| List doesn't update after install | User reinstalls repeatedly | Always show updated list within 1 second of install completion |

---

## "Looks Done But Isn't" Checklist

- [ ] **Token Passing:** Store window appears but token isn't actually injected — verify WebView can make authenticated requests
- [ ] **IPC Contract:** IPC handler registered but not tested with actual WebView payloads — verify with integration test
- [ ] **Error Handling:** Admin API returns success but disk write failed silently — verify by corrupting config file during install
- [ ] **Hot Update:** List appears to update but uses stale cache — clear cache and verify fresh load
- [ ] **Window Cleanup:** Store window was closed but process still running — check process manager after closing
- [ ] **SSE Events:** New events added but not in JSON_EVENTS whitelist — frontend silently drops them

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Token exposure via URL | HIGH | Invalidate exposed tokens, implement proper token injection, audit logs for token usage |
| IPC format mismatch | MEDIUM | Add type validation in Rust, update TypeScript interfaces, redeploy store integration |
| Silent config write failure | LOW | Check disk permissions, verify config.json is valid JSON, manually trigger config reload |
| Orphan window | MEDIUM | Kill remaining process via task manager, add cleanup to next startup |
| Infinite re-render | LOW | Hard refresh (Ctrl+Shift+R), disable store hot update temporarily |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| WebView Token Leakage | Phase 1 (Store WebView Window) | Security review of token passing mechanism |
| IPC Message Format Mismatch | Phase 2 (IPC Communication) | Integration tests with mock WebView payloads |
| Admin API Silent Failure | Phase 3 (Admin API Integration) | Error injection testing during install |
| List Hot Update Race | Phase 4 (Settings Hot Update) | Rapid install/uninstall stress test |
| Orphan Window on Exit | Phase 1 (Store WebView Window) | Open/close store 10 times, check process manager |

---

## Sources

**Codebase Evidence (nova-agents):**
- `src/renderer/api/SseConnection.ts` lines 25-62: JSON_EVENTS whitelist pattern
- `src-tauri/src/lib.rs` lines 255-297: Main window and overlay lifecycle management
- `src-tauri/src/lib.rs` lines 555-594: Window event handling with cleanup
- `src/server/admin-api.ts` lines 1-10: Admin API pattern with SSE broadcast
- `src/server/sse.ts`: Broadcast mechanism for config updates

**General Desktop Application Patterns:**
- Tauri v2 WebviewWindowBuilder documentation (inaccessible during research)
- Desktop marketplace integration patterns from Electron ecosystem
- IPC security best practices for desktop applications

**Confidence Assessment:**
- Stack patterns: MEDIUM (codebase patterns verified, external docs inaccessible)
- Architecture: MEDIUM (follows existing nova-agents patterns)
- Pitfalls: MEDIUM (based on common desktop app patterns, not external research)

---

*Pitfalls research for: Store/Marketplace Feature*
*Researched: 2026-04-25*
