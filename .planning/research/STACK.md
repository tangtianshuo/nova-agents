# Stack Research: Store Feature WebView

**Domain:** Tauri v2 WebView window for Store feature
**Researched:** 2026-04-25
**Confidence:** HIGH (based on existing codebase patterns and Tauri v2 API verification)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|----------------|
| `@tauri-apps/api` | ~2.10 | WebView creation & IPC | Already in use; `WebviewWindowBuilder` enables multi-window Store |
| `tauri` | 2.9.6 | WebView runtime | Existing version supports `WebviewUrl::External` for remote Store URL |
| `core:webview` | Tauri v2 built-in | WebView permissions | Required for creating Store webview window |

### What IS Needed (Stack Additions)

| Addition | Purpose | How to Add |
|----------|---------|------------|
| `core:webview:allow-create-webview-window` | Permission to create new webview windows | Add to `capabilities/default.json` |
| `core:webview:allow-post-message` | Cross-window postMessage | Add to capabilities |
| Window capability entry | "store" window label | Add to `windows` array in capabilities |
| New Tauri command | `cmd_open_store_window` | Rust command using `WebviewWindowBuilder` |

### What Is NOT Needed (Reuse Existing)

| Existing Tech | How It's Used |
|---------------|---------------|
| `tauri::WebviewWindowBuilder` | Same pattern as main/overlay windows (lib.rs lines 258-297) |
| `@tauri-apps/api/event` (`listen`, `emit`) | Existing SSE/event system for IPC |
| Admin API (`/api/admin/*`) | Token passing via existing config system |
| `tauri::WebviewUrl::External` | Store URL loaded via External variant |

## Key Implementation Patterns

### 1. WebView Window Creation (Rust)

```rust
// Pattern from lib.rs lines 258-297 - reuse for Store window
use tauri::WebviewWindowBuilder;
use tauri::WebviewUrl;

WebviewWindowBuilder::new(
    app,
    "store",                    // unique window label
    WebviewUrl::External("https://store.example.com".parse().unwrap()),
)
.title("Store")
.inner_size(1000.0, 700.0)
.center()
.decorations(true)
.visible(true)
.build()
```

### 2. IPC: Tauri Events (Recommended over postMessage)

```typescript
// In Store WebView (frontend)
// Listen for install commands from Store
import { listen } from '@tauri-apps/api/event';
const unlisten = await listen('store:install', (event) => {
  const { packageId, packageType } = event.payload;
  // Call Admin API to install
});

// Emit events back to main window
import { emit } from '@tauri-apps/api/event';
emit('store:install-complete', { packageId });
```

```rust
// In main window Rust side - listen for Store events
app.listen("store:install-complete", move |event| {
    // Trigger Settings hot-update via existing SSE broadcast
});
```

### 3. Alternative IPC: postMessage (If Store URL needs browser-like messaging)

```typescript
// In Store WebView (if using web postMessage)
window.parent.postMessage({ type: 'install', packageId: 'xxx' }, '*');

// In main window frontend
window.addEventListener('message', (event) => {
  if (event.data.type === 'install') {
    // Handle via Tauri invoke
  }
});
```

Note: Tauri events are preferred over postMessage because they integrate with the existing event system and don't require CSP adjustments.

### 4. Token Sharing

Token sharing is handled via the existing Admin API / config system:

- Store WebView calls `invoke('cmd_get_store_token')` to retrieve stored token
- Store WebView includes token in API requests to Store backend
- Store backend validates and returns installation instructions
- Main window Admin API executes installation

```rust
// New command in commands.rs
#[tauri::command]
async fn cmd_get_store_token(app_handle: AppHandle) -> Result<String, String> {
    // Read from existing config provider - reuse Admin API token
    let config = load_app_config().map_err(|e| e.to_string())?;
    Ok(config.provider_auth_token)  // Or appropriate token field
}
```

## Capability Changes Required

```json
// src-tauri/capabilities/default.json - add to windows array
{
  "windows": ["main", "overlay", "store"],
  "permissions": [
    // ... existing permissions ...
    "core:webview:default",
    "core:webview:allow-create-webview-window",
    "core:webview:allow-post-message"
  ]
}
```

## CSP Considerations

Current CSP in `tauri.conf.json`:
```
connect-src 'self' ipc: tauri: asset: http://ipc.localhost http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://download.nova-agents.io
```

For Store WebView loading remote URL, no CSP changes needed if Store URL is in the existing allowlist or uses `https://download.nova-agents.io`.

If Store has separate domain, add to:
- `connect-src`
- `fetch-src`
- `img-src` (if Store has images)

## Alternatives Considered

| Approach | Why Not | Recommendation |
|----------|---------|----------------|
| iframe instead of WebView | CSP restrictions, security concerns with cross-origin iframes | WebView window is correct Tauri v2 approach |
| postMessage only | Doesn't integrate with existing event system; requires additional message routing | Use Tauri events as primary, postMessage as fallback |
| Custom IPC protocol | Reinventing wheel; Tauri events work well | Reuse existing event system |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `tauri::WebviewWindowBuilder::remote` | Deprecated in Tauri v2 | `WebviewUrl::External` |
| Raw `window.postMessage` without Tauri event bridge | Doesn't integrate with Rust event system | `emit`/`listen` from `@tauri-apps/api/event` |
| Direct HTTP from WebView | Violates "Rust proxy layer" architecture principle | Tauri invoke -> Rust -> Admin API |

## Stack Addition Summary

**Minimal additions for Store feature:**

1. **Capabilities**: Add `core:webview:*` permissions + "store" window entry
2. **Rust command**: `cmd_open_store_window` using existing `WebviewWindowBuilder` pattern
3. **Rust command**: `cmd_get_store_token` for token sharing
4. **Event handling**: `store:install` / `store:install-complete` events
5. **No new npm packages** - reuse `@tauri-apps/api` (already at ~2.10)

## Sources

- **Tauri v2 WebView API**: `src-tauri/src/lib.rs` lines 257-297 (existing multi-window pattern)
- **Tauri v2 WebViewUrl**: `tauri::WebviewUrl::External` (line 284 reference)
- **Event system**: `src/renderer/api/sseClient.ts` (existing `listen`/`emit` pattern)
- **Capabilities security model**: `src-tauri/capabilities/default.json` (existing permission structure)
- **tauri.conf.json CSP**: Lines 15-16 (existing security configuration)

---
*Stack research for: Store WebView feature*
*Researched: 2026-04-25*
