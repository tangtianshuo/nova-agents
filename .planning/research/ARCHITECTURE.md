# Architecture Research: Store Feature Integration

**Domain:** Desktop AI Agent Application (Tauri v2 + React 19 + Bun Sidecar)
**Researched:** 2026-04-25
**Confidence:** HIGH

## Executive Summary

The Store feature integrates with nova-agents as a secondary WebView window that loads a remote Store URL. The WebView communicates with Tauri via IPC commands to trigger installations (MCP/Provider/Skill), which flow through the existing Admin API. Config changes automatically propagate to the frontend via the existing SSE event system, ensuring Settings lists update without manual refresh.

**Key architectural decisions:**
1. **Store WebView window** - Created via `WebviewWindowBuilder`, follows existing overlay window pattern
2. **IPC bridge** - New `cmd_store_install` command handles WebView-to-Rust communication
3. **Config auto-refresh** - Existing `nova-agents:config-changed` event listener handles hot update
4. **Global Sidecar** - Store uses Global Sidecar (no tab context), Admin API for installations

## Research Findings

### Integration Points Identified

| Integration Point | File | Purpose |
|-------------------|------|---------|
| Settings entry | `src/renderer/pages/Settings.tsx` | Store button/entry point |
| Store window | `src-tauri/src/lib.rs` | Window creation via WebviewWindowBuilder |
| Store IPC | `src-tauri/src/commands.rs` | cmd_store_install command |
| Admin API | `src/server/admin-api.ts` | Installation handlers (mcp add, provider add) |
| Config context | `src/renderer/config/ConfigProvider.tsx` | Auto-refresh on config change |
| SSE broadcast | `src/server/sse.ts` | Frontend sync after install |
| Auth token | `src-tauri/src/commands.rs` | Token sharing via IPC |

### Existing Patterns to Reuse

1. **Overlay window pattern** (`lib.rs` lines 281-297)
   - `WebviewWindowBuilder::new()` with unique label, external URL, standard decorations
   - Used for splash screen, same pattern applies to Store

2. **Overlay hide/show** (`commands.rs` cmd_hide_overlay)
   - `get_webview_window("label")` + `.hide()` / `.show()`
   - Store window can reuse same pattern

3. **Admin API handlers** (`admin-api.ts`)
   - MCP add/remove/enable patterns already exist
   - Store can call same handlers or extend with store-specific variants

4. **Config event listener** (`ConfigProvider.tsx` lines 331-343)
   - `window.addEventListener('nova-agents:config-changed', handler)`
   - Store installation triggers this automatically

5. **IPC command structure** (`commands.rs`)
   - Async command with validation, returns Result
   - Store needs similar command structure

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Tauri Desktop App                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                           React Frontend                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐     │
│  │   Tab 1     │  │   Tab 2     │  │  Settings   │  │ Store Window │     │
│  │ session_123 │  │ session_456 │  │             │  │ (WebView)    │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘     │
│         │                │                │                │               │
├─────────┼────────────────┼────────────────┼────────────────┼───────────────┤
│         │                │                │                │    Rust       │
│   ┌─────┴────────────────┴─────┐         │         ┌──────┴─────────────┐ │
│   │     SidecarManager         │         │         │  Store IPC Handler  │ │
│   │  Session-Centric Model   │         │         │  cmd_store_install  │ │
│   └─────┬────────────────┬─────┘         │         └──────┬─────────────┘ │
│         │                │                │                │               │
│         ▼                ▼                ▼                ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Sidecar A   │  │ Sidecar B   │  │Global Sidecar│  │  Admin API  │     │
│  │ :31415      │  │ :31416      │  │             │  │ (install)   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────┬──────┘     │
│                                                              │              │
│                                              ┌───────────────┴────────────┐ │
│                                              │   SSE Broadcast          │ │
│                                              │   'config-changed' event  │ │
│                                              └───────────────┬────────────┘ │
│                                              ┌───────────────┴────────────┐ │
│                                              │   ConfigDataContext        │ │
│                                              │   (auto-refresh on change)│ │
│                                              └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| Settings page | Entry point with Store button | `src/renderer/pages/Settings.tsx` - add Store button |
| Store WebView window | Remote Store UI container | Tauri `WebviewWindowBuilder` (like overlay pattern) |
| Store IPC handler | Bridge WebView to Rust | New command `cmd_store_install` in `commands.rs` |
| Admin API | Installation logic | `src/server/admin-api.ts` handlers |
| ConfigDataContext | Config state + auto-refresh | Listens to `nova-agents:config-changed` event |
| SSE broadcast | Frontend sync after install | `broadcast('config-changed', ...)` in admin-api |

## Project Structure

```
src/
├── renderer/
│   ├── pages/
│   │   └── Settings/
│   │       └── index.tsx       # Add Store navigation item
│   ├── windows/
│   │   └── StoreWindow.tsx     # NEW: Store WebView wrapper
│   └── hooks/
│       └── useStoreWindow.ts    # NEW: Store window lifecycle
├── server/
│   └── admin-api.ts            # Existing: add store handlers
src-tauri/
├── src/
│   ├── commands.rs             # Existing: add cmd_store_* commands
│   ├── lib.rs                  # Existing: add store window builder
│   └── store.rs                # NEW: Store-specific Rust logic
```

### Structure Rationale

- **`renderer/windows/StoreWindow.tsx`:** Isolates WebView logic from Settings, follows existing panel patterns
- **`src-tauri/src/store.rs`:** Centralizes Store-specific Rust code, avoids command.rs bloat
- **`useStoreWindow` hook:** Manages window lifecycle (open/close/focus), reuses existing patterns

## Architectural Patterns

### Pattern 1: WebView Window Creation (Overlay Pattern)

**What:** Creating a secondary window to host remote content
**When to use:** When loading external web content that needs native window chrome
**Trade-offs:** + Sandboxed content, + Native window controls, + Standard navigation

**Example:**
```rust
// From lib.rs lines 281-297 - overlay window pattern (store follows same)
match WebviewWindowBuilder::new(
    app,
    "store",  // unique label
    tauri::WebviewUrl::External(store_url.parse().unwrap()),
)
.decorations(true)
.resizable(true)
.inner_size(1000.0, 700.0)
.center()
.visible(true)
.build()
```

### Pattern 2: IPC Command Handler

**What:** Tauri command bridging frontend/secondary window to Rust backend
**When to use:** When WebView needs to trigger native functionality
**Trade-offs:** + Type-safe, + Async, + Follows existing patterns

**Example:**
```rust
// New command in commands.rs
#[tauri::command]
pub async fn cmd_store_install(
    app: AppHandle,
    item: StoreInstallItem,
) -> Result<StoreInstallResult, String> {
    // 1. Validate item type
    // 2. Call Admin API via HTTP to Global Sidecar
    // 3. Broadcast SSE event for frontend sync
    // 4. Return result
}
```

### Pattern 3: Config Auto-Refresh via Custom Event

**What:** Frontend automatically refreshes config when backend signals change
**When to use:** When external changes modify config
**Trade-offs:** + Automatic sync, + No manual refresh, + Already implemented

**Example:**
```typescript
// From ConfigProvider.tsx lines 331-343
useEffect(() => {
    const handler = () => {
        loadAppConfig().then(latest => {
            if (isMountedRef.current) setConfig(latest);
        });
    };
    window.addEventListener('nova-agents:config-changed', handler);
    return () => window.removeEventListener('nova-agents:config-changed', handler);
}, []);
```

### Pattern 4: Tab-Scoped vs Global API

**What:** Distinguishing between per-tab and global API endpoints
**When to use:** Store window should always use Global Sidecar (no session context)
**Trade-offs:** + Correct routing, + Isolation

**Example:**
```typescript
// StoreWindow uses global API (no TabProvider wrapper)
import { apiFetch } from '@/api/apiFetch';  // Global Sidecar client
// NOT useTabState() which is tab-scoped
```

## Data Flow

### Store Installation Flow

```
[User clicks Store in Settings]
    │
    ▼
[StoreWindow opens] → [WebView loads remote Store URL]
    │
    ▼
[User browses Store, clicks "Install" on item]
    │
    ▼
[WebView calls window.__TAURI__.core.invoke('cmd_store_install', { item })]
    │
    ▼
[Rust cmd_store_install validates + calls Admin API]
    │
    ├──► [HTTP POST to Global Sidecar /api/admin/*]
    │
    ▼
[Admin API handler writes config + broadcasts SSE]
    │
    ▼
[SSE event 'config-changed' emitted]
    │
    ▼
[ConfigDataContext listener fires] → [config state auto-refreshes]
    │
    ▼
[Settings lists (MCP/Provider/Skill) automatically update]
```

### Authentication Token Sharing Flow

```
[Store WebView needs auth token for API calls]
    │
    ▼
[WebView retrieves token via IPC]
    │
    ├──► invoke('cmd_get_store_auth_token') → [Rust reads from secure storage]
    │
    ▼
[Token injected into Store WebView context via URL params or JS bridge]
    │
    ▼
[Store WebView uses token for authenticated API calls]
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Remote Store URL | External WebView window | URL configured in app config |
| Auth token | IPC command to Rust | Token stored securely, retrieved via `cmd_get_store_auth_token` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Store WebView to Rust | `invoke()` IPC | New `cmd_store_*` commands |
| Rust to Global Sidecar | HTTP via `local_http` | Admin API endpoints |
| Global Sidecar to Config | Disk write + SSE | `atomicModifyConfig` + `broadcast()` |
| ConfigContext to React | Context + useEffect | Auto-refresh on `nova-agents:config-changed` event |

## Key Technical Decisions

### Window Management

| Decision | Rationale |
|----------|-----------|
| Store window label: `"store"` | Unique identifier for `get_webview_window("store")` |
| Standard decorations | User expects native window controls |
| Resizable, ~1000x700 | Matches typical web app dimensions |
| Centered on open | Consistent with overlay pattern |
| Hidden on close (not destroyed) | Quick re-open without reload |

### IPC Command Design

```typescript
// Proposed command signatures
interface StoreInstallItem {
  type: 'mcp' | 'provider' | 'skill';
  id: string;
  version?: string;
  metadata?: Record<string, unknown>;
}

interface StoreInstallResult {
  success: boolean;
  installedId?: string;
  name?: string;
  error?: string;
}

// Auth token command
interface StoreAuthResult {
  success: boolean;
  token?: string;
  error?: string;
}
```

### Config Hot Update Strategy

Store installation triggers config changes via Admin API:
1. **Write config** - `atomicModifyConfig` updates disk
2. **Broadcast SSE** - `broadcast('config-changed', {...})`
3. **Frontend auto-refresh** - ConfigDataContext listener fires

**No manual refresh needed** - follows existing pattern from CLI config changes.

### Security Considerations

| Concern | Mitigation |
|---------|------------|
| Store URL trust | Validate URL in CSP, restrict to configured domain |
| Token exposure | IPC bridge, not direct token access in WebView |
| Install validation | Server-side item validation + checksum verification |
| CSP compliance | Add Store domain to allowed connect sources in tauri.conf.json |

## Anti-Patterns

### Anti-Pattern 1: Direct Global Sidecar Access from WebView

**What people do:** Try to fetch directly to `127.0.0.1:{port}` from WebView
**Why it's wrong:** WebView doesn't have port knowledge, bypasses IPC security
**Do this instead:** Always use IPC commands (`invoke`) as bridge

### Anti-Pattern 2: Skipping SSE Broadcast After Install

**What people do:** Write config but forget to broadcast event
**Why it's wrong:** Frontend lists won't auto-refresh, user sees stale data
**Do this instead:** Always call `broadcast('config-changed', {...})` in Admin API handlers

### Anti-Pattern 3: Using Tab-scoped API in Store Window

**What people do:** Using `useTabState()` pattern in Store
**Why it's wrong:** Store window has no tab context, will fail/nullify
**Do this instead:** Use `apiFetch` (global) not `apiPost` (tab-scoped)

### Anti-Pattern 4: Storing Token in WebView URL

**What people do:** Pass auth token as URL query parameter
**Why it's wrong:** Token visible in browser history, logs, referrer headers
**Do this instead:** Use IPC to inject token via JavaScript bridge post-load

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|-------------------------|
| 0-1k users | Single Store window instance sufficient |
| 1k-100k users | Store backend caching, CDN for assets |
| 100k+ users | Store becomes separate microservice with auth |

### Scaling Priorities

1. **First bottleneck:** Store WebView loading time - mitigated by local cache headers
2. **Second bottleneck:** Config file locking on install - `atomicModifyConfig` already handles

## Phase Structure Recommendations

Based on this architecture research:

1. **Phase 1: Window Foundation**
   - Create Store window builder in lib.rs
   - Create `useStoreWindow` hook
   - Create `StoreWindow` component
   - Addresses: Window creation, lifecycle management

2. **Phase 2: IPC Bridge**
   - Create `cmd_store_install` command
   - Create `cmd_get_store_auth_token` command
   - Wire up WebView to Rust communication
   - Addresses: IPC communication, auth token sharing

3. **Phase 3: Admin API Integration**
   - Extend Admin API with store handlers
   - Wire up SSE broadcast
   - Test end-to-end install flow
   - Addresses: Installation logic, config hot update

4. **Phase 4: Settings Integration**
   - Add Store button to Settings
   - Connect Store button to window open
   - End-to-end testing
   - Addresses: User entry point

**Research flags:**
- Phase 2: May need deeper research on secure token injection into WebView
- Phase 3: May need research on install rollback/error recovery

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Window patterns | HIGH | Overlay pattern in lib.rs is direct reference |
| IPC structure | HIGH | Follows existing command patterns exactly |
| Config auto-refresh | HIGH | Already implemented in ConfigProvider |
| Admin API extension | HIGH | MCP/Provider handlers are direct templates |
| Auth token sharing | MEDIUM | IPC pattern clear, secure injection needs validation |

## Gaps to Address

1. **Secure token injection** - How to inject auth token into WebView without URL exposure
2. **Store URL configuration** - Where/how to configure the Store URL (env var, config, hardcoded)
3. **Install rollback** - What happens if install partially fails
4. **WebView lifecycle** - Should Store window be reused or recreated each open
5. **Close behavior** - Hide vs destroy, memory management

## Sources

### Project Code
- `src-tauri/src/lib.rs` (lines 256-297) - Overlay window pattern
- `src-tauri/src/commands.rs` (cmd_hide_overlay) - Window visibility pattern
- `src/server/admin-api.ts` - Installation logic patterns
- `src/renderer/config/ConfigProvider.tsx` (lines 331-343) - Config auto-refresh
- `src/server/sse.ts` - SSE broadcast mechanism
- `src/renderer/pages/Settings.tsx` - Settings structure (being refactored)

### Project Docs
- `.planning/PROJECT.md` - Store feature requirements
- `specs/tech_docs/architecture.md` - Project architecture constraints
- `specs/guides/design_guide.md` - Design system specifications

---

*Architecture research for: nova-agents Store feature integration*
*Researched: 2026-04-25*
