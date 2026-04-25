# Feature Research: Store/Marketplace for Desktop AI Agent

**Domain:** Desktop AI Agent Application Store
**Researched:** 2026-04-25
**Confidence:** MEDIUM

*Note: Web search was unavailable during research. Findings are based on known patterns from VSCode, JetBrains, Figma, Slack/Discord stores, and Tauri v2 capabilities.*

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any marketplace/store experience.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Store entry point | Users expect a "Store" or "Marketplace" button in Settings or nav | LOW | Button in Settings page; opens Store WebView |
| Separate Store window | Multi-window workflow; doesn't interrupt current work | LOW | Tauri `WebviewWindow`; independent from main Chat window |
| Browse items | Visual catalog of Providers/Skills/MCP with descriptions | MEDIUM | Remote web page; content fetched from backend |
| One-click install | No manual download → extract → install steps | MEDIUM | WebView sends install command via IPC; Tauri executes Admin API |
| Install progress feedback | User needs to know something is happening | MEDIUM | IPC event stream back to WebView; progress indicators |
| Installed list updates | After install, the item appears in Settings without manual refresh | LOW | Config hot reload via SSE broadcast |
| Authentication persistence | Login state survives across Store sessions | MEDIUM | Token stored in secure config; WebView receives via Tauri IPC |

### Differentiators (Competitive Advantage)

Features that set nova-agents Store apart.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Native install UX | Feels like part of the app, not a website | LOW | WebView styled to match app; seamless IPC |
| Unified auth with main app | Users don't re-login to Store | LOW | Shared auth token via Tauri secure storage |
| Hot-update Settings lists | No jarring page reload after install | MEDIUM | SSE `config:updated` event triggers React state refresh |
| Sidecar-aware installation | MCP/Skills install into correct runtime context | HIGH | Must route to Bun Sidecar's Admin API; not just file copy |
| Background install | User can browse more while install completes | MEDIUM | Async install with progress events |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Store embedded in main window | "Easier" than separate window | Breaks user workflow; z-index issues; back button confusion | Separate WebView window with independent navigation |
| Offline store browsing | "What if I'm on a plane?" | Complexity for v1; store server is source of truth | Defer; acknowledge as limitation |
| In-Store search across installed items | Seems logical | Duplicates existing Settings search | Link to Settings from Store; don't replicate |
| Store ratings/reviews | "Everyone has this" | Requires moderation; fake reviews; backend complexity | Defer to later version |

## Feature Dependencies

```
Store WebView Window
    └──requires──> WebviewWindow creation (Tauri)
                       └──requires──> Window label registration

Store IPC Install Command
    └──requires──> Tauri invoke handler (cmd_install_from_store)
                       └──requires──> Admin API endpoint (/api/admin/install)
                                               └──requires──> Config disk write
                                                               └──requires──> Config SSE broadcast
                                                                               └──requires──> Settings React state update

Auth Token Sharing
    └──requires──> Token in app config (not WebView localStorage)
               └──requires──> Tauri IPC to fetch token
               └──requires──> Token injected into WebView URL or window payload
```

### Dependency Notes

- **Store window requires WebviewWindow:** Tauri v2's multi-window model; window must be created before loading URL
- **Install command requires Admin API:** Installation isn't just file copy — it goes through the same API the CLI uses
- **Hot reload requires SSE:** Settings page already listens to SSE; install completion must emit event
- **Auth token cannot use localStorage:** WebView is isolated; token must come via IPC or URL injection

## MVP Definition

### Launch With (v1.1)

Minimum viable product — validates Store concept.

- [ ] Store entry button in Settings sidebar
- [ ] Store WebView window opens with remote URL
- [ ] Basic install flow: WebView → IPC → Admin API → success/failure
- [ ] Auth token injected into Store WebView on open
- [ ] Installed lists refresh after successful install

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Install progress indicator (loading state during install)
- [ ] Store → Settings deep link (click item → opens relevant Settings panel)
- [ ] Error handling with user-friendly messages
- [ ] Install confirmation for paid items

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Offline store browsing/caching
- [ ] Search within Store
- [ ] Ratings and reviews
- [ ] Featured/promoted items
- [ ] Store notifications for updates to installed items

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Store entry button | HIGH | LOW | P1 |
| Store WebView window | HIGH | MEDIUM | P1 |
| Basic install flow | HIGH | MEDIUM | P1 |
| Auth token injection | HIGH | MEDIUM | P1 |
| Hot-update lists | MEDIUM | MEDIUM | P2 |
| Install progress feedback | MEDIUM | MEDIUM | P2 |
| Deep links to Settings | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | VSCode Marketplace | JetBrains Plugins | Slack App Directory | Our Approach |
|---------|--------------------|--------------------|---------------------|--------------|
| Entry point | Icon in sidebar | Menu → Plugins | Tab in settings | Settings sidebar button |
| Store rendering | External browser (deep link) | Embedded browser | Embedded webview | Tauri WebView window |
| Install trigger | VSIX download + install command | One-click in browser | API call to backend | IPC invoke → Admin API |
| Auth | Microsoft account (browser cookie) | JetBrains account | Slack workspace auth | App config token → IPC |
| Post-install | Extension appears, activate button | Plugin installed, restart prompt | App added to workspace | Settings list hot-updates |
| Progress feedback | Notification in Extensions view | Progress bar in dialog | Spinner on install button | IPC events → WebView |

## Technical Implementation Notes

### Store Window Architecture (Tauri v2)

```typescript
// Create store window via Tauri
const storeWindow = await WebviewWindow.getByLabel('store');
if (!storeWindow) {
  const webview = new WebviewWindow('store', {
    url: 'https://store.example.com',  // Remote store URL
    title: 'nova-agents Store',
    width: 1000,
    height: 700,
    center: true,
    decorations: true,  // Use native window frame
    focus: true,
  });

  // Inject auth token when ready
  webview.once('tauri://ready', () => {
    webview.emit('init', { token: getStoreAuthToken() });
  });
}
```

### IPC Install Flow

```typescript
// In Tauri command handler
#[tauri::command]
async fn cmd_install_from_store(
  item_id: String,
  item_type: String,  // "provider" | "skill" | "mcp"
) -> Result<InstallResult, String> {
  // 1. Validate item exists in store (optional, or trust WebView)
  // 2. Call Admin API via Bun Sidecar HTTP
  let client = local_http::json_client(sidecar_port);
  let response = client.post("/api/admin/install")
    .json(&InstallRequest { item_id, item_type })
    .send().await?;

  // 3. Return result (success/failure/details)
  response.json().await.map_err(|e| e.to_string())
}
```

### Auth Token Sharing

| Approach | Pros | Cons |
|----------|------|------|
| URL injection (`?token=xxx`) | Simple, works immediately | Token in URL (logs, referrer) |
| Tauri event injection | Secure, one-way | WebView must listen for event |
| window.__TAURI__ access | Direct Tauri API from WebView | Requires store page to include Tauri JS |

**Recommended:** URL injection with short-lived token + Tauri event for security-sensitive operations.

### Hot Update After Install

The existing SSE system already broadcasts `config:updated` events. The Admin API's `/api/admin/install` endpoint should trigger this after successful install. Settings pages already listen to SSE — they will re-render automatically.

```typescript
// In Settings component (already implemented pattern)
useEffect(() => {
  const unsubscribe = listen('sse:config:updated', (event) => {
    refreshConfig(); // Re-read from disk, update React state
  });
  return unsubscribe;
}, []);
```

## Sources

- VSCode Marketplace behavior (extension installation flow)
- JetBrains IDE Plugin ecosystem patterns
- Tauri v2 WebviewWindow documentation (known API)
- Slack App Directory integration patterns
- nova-agents existing architecture (Admin API, SSE system, Config hot reload)

---
*Feature research for: nova-agents Store/Marketplace*
*Researched: 2026-04-25*
