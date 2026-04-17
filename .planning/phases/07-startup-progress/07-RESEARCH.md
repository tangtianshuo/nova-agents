# Phase 07: Startup Progress Bar - Research

**Researched:** 2026-04-16
**Domain:** Tauri v2 event-driven startup UI, CSS indeterminate progress animation
**Confidence:** HIGH

## Summary

This phase adds a branding-style startup progress overlay during app boot, showing Rust subsystem initialization and Global Sidecar startup. The implementation uses Tauri event-driven communication: Rust emits `startup:stage` events from `setup()` and async tasks, while the React frontend listens and updates the overlay accordingly.

**Primary recommendation:** Emit events from async spawns in `lib.rs` setup(), use a `StartupProgressOverlay` component that listens immediately on mount, handles the "frontend connects after events fired" case via a "latest stage" pattern, auto-dismisses on `startup:complete` or timeout.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-02**: Tauri event-driven: `emit("startup:stage", { stage, name, status })` pattern
- **D-03**: Branding-style full-screen overlay with logo, indeterminate progress, status text, step checklist, version
- **D-04**: Indeterminate (infinite loop) progress animation, not determinate 0-100%
- **D-05**: Auto-dismiss on completion, no cancel button
- **D-06**: Configurable timeout via `STARTUP_PROGRESS_TIMEOUT_MS` env var, default 15s
- **D-07**: 4 stages: System Core, Tray & Mgmt API, Scheduler & Monitors, Sidecar Ready
- **D-08**: Config via env var only (`STARTUP_PROGRESS_ENABLED`, `STARTUP_PROGRESS_TIMEOUT_MS`), not config.json
- **D-09**: Reuse ShutdownProgressOverlay.tsx as reference

### Deferred Ideas

None.

---

## Standard Stack

No new libraries needed. Existing stack covers all requirements.

| Library | Purpose | Used For |
|---------|---------|----------|
| `@tauri-apps/api/event` | Tauri event listen/emit | Rust→Frontend startup events |
| React 19 built-in | Component framework | StartupOverlay component |
| CSS keyframes | Indeterminate animation | Sliding progress bar |
| TailwindCSS v4 | Utility classes | Overlay layout, tokens |

---

## Architecture Patterns

### Event Emission Sequence (from lib.rs setup())

The `setup()` function in `lib.rs` runs synchronously first, then spawns async tasks:

```
[setup() synchronous]
  1. Plugin log initialization
  2. App handle logger init
  3. acquire_lock()
  4. cleanup_stale_sidecars()
  5. Boot banner
  6. tray::setup_tray()          → emit "startup:stage" (1, System Core, complete)
  [async tasks spawned via tauri::async_runtime::spawn]
  7. management_api::start_management_api() → emit (2, Tray & Mgmt API, active→complete)
  8. cron_task::initialize_cron_manager()  → emit (3, Scheduler & Monitors, active→complete) + cron:manager-ready
  9. monitor_global_sidecar() (background loop, not startup milestone)
  10. monitor_session_sidecars() (background loop, not startup milestone)
  11. monitor_agent_channels() (background loop, not startup milestone)
  [Frontend starts Global Sidecar via cmd_start_global_sidecar invoke]
  12. Sidecar health check passes → emit (4, Sidecar Ready, complete) + startup:complete
```

**Key insight:** The async tasks (7-11) complete AFTER the frontend has mounted and set up listeners. Events emitted from these tasks WILL be received by the frontend.

**The race condition:** Events emitted from the synchronous part (step 6) fire BEFORE the frontend webview has loaded. Frontend misses these.

**Solution for stage 1:** Emit stage 1 event from a late-running async task (e.g., the management API start, or an explicit "emit all 4 stages from async context" approach).

### Recommended Event Payload Format

```typescript
// startup:stage event
interface StartupStageEvent {
  stage: 1 | 2 | 3 | 4;
  name: string;        // e.g., "System Core"
  status: 'active' | 'complete';
}

// startup:complete event - no payload (empty object or null)
```

### Event Emission Points in lib.rs

```rust
// Stage 1: Emit after tray setup (async to avoid being before frontend listen)
tauri::async_runtime::spawn(async move {
    // Defer to let frontend settle
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    let _ = app.emit("startup:stage", serde_json::json!({
        "stage": 1, "name": "System Core", "status": "complete"
    }));
});

// Stage 2: After management API starts
tauri::async_runtime::spawn(async move {
    match management_api::start_management_api().await {
        Ok(port) => {
            let _ = app.emit("startup:stage", serde_json::json!({
                "stage": 2, "name": "Tray & Management API", "status": "active"
            }));
            log::info!("[App] Management API started on port {}", port);
            // Then emit complete
            let _ = app.emit("startup:stage", serde_json::json!({
                "stage": 2, "name": "Tray & Management API", "status": "complete"
            }));
        }
        Err(e) => log::error!("[App] Failed to start management API: {}", e),
    }
});

// Stage 3: After cron manager initialization
tauri::async_runtime::spawn(async move {
    cron_task::initialize_cron_manager(cron_app_handle).await;
    // initialize_cron_manager already emits cron:manager-ready
    // Add startup stage emission:
    let _ = app.emit("startup:stage", serde_json::json!({
        "stage": 3, "name": "Scheduler & Monitors", "status": "complete"
    }));
});

// Stage 4: Emitted from frontend after cmd_start_global_sidecar resolves
// In App.tsx startGlobalSidecarSilent() - emit after markGlobalSidecarReady()
```

### Frontend Listener Pattern

```typescript
// In StartupProgressOverlay or App.tsx
useEffect(() => {
  if (!isTauriEnvironment()) return;

  let unlisten: (() => void) | null = null;
  const setup = async () => {
    const { listen } = await import('@tauri-apps/api/event');
    unlisten = await listen<StartupStageEvent>('startup:stage', (event) => {
      const { stage, name, status } = event.payload;
      setStages(prev => prev.map(s =>
        s.stage === stage ? { ...s, status } : s
      ));
    });
  };
  setup();
  return () => { unlisten?.(); };
}, []);

// Timeout fallback
useEffect(() => {
  const timeout = setTimeout(() => {
    setVisible(false);
  }, STARTUP_PROGRESS_TIMEOUT);
  return () => clearTimeout(timeout);
}, []);
```

### Handling "Frontend Connects After Events Fired"

Three patterns in the codebase:

1. **Last-Value Cache** (SSE system): Store latest event value, replay to new listener. Applicable for recurring events.

2. **State Query** (cron recovery): Frontend calls `invoke()` to query current state after mounting. Best for startup.

3. **Deferred Emission** (chosen approach): For stage 1, emit from async context (100ms delay) to ensure frontend is listening. For stages 2-4, async tasks naturally complete after frontend mount.

**Implementation for stage 1:** Instead of emitting during synchronous setup(), schedule a deferred emission from an async task:

```rust
// At the END of setup() - defer stage 1 emission to async context
let app_for_deferred = app.handle().clone();
tauri::async_runtime::spawn(async move {
    // Wait for webview to initialize (rough estimate: 500ms)
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    let _ = app_for_deferred.emit("startup:stage", serde_json::json!({
        "stage": 1, "name": "System Core", "status": "complete"
    }));
});
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|------------|
| Event transport | Custom WebSocket for startup events | Tauri `emit()`/`listen()` |
| Progress timing | setInterval polling Rust for progress | Tauri event-driven updates |
| Overlay positioning | Inline styles | Tailwind CSS + design tokens |

---

## Common Pitfalls

### Pitfall 1: Events Emitted Before Frontend Listens
**What goes wrong:** Stage 1 event fires during synchronous `setup()` before the webview has mounted. Frontend never sees it.

**Why it happens:** Tauri `emit()` fires immediately. If no listener is registered on the frontend, the event is dropped.

**How to avoid:** Emit stage 1 from an async task with a small delay (100-500ms), or have the frontend invoke a command to get current stage on mount.

**Warning signs:** Startup overlay shows "Stage 1" briefly even though Rust already completed Stage 1.

### Pitfall 2: Blocking Startup with Synchronous Wait
**What goes wrong:** `setup()` awaits async tasks synchronously, blocking webview load.

**Why it happens:** Developer adds `block_on()` or `tokio::runtime::Builder::new().block_on()` inside setup().

**How to avoid:** Always `spawn()` async tasks, never `block_on()` in setup(). Let tasks run in background.

### Pitfall 3: Missing Timeout Handling
**What goes wrong:** If Global Sidecar takes too long, overlay hangs forever.

**How to avoid:** Always set a timeout (default 15s). If `startup:complete` not received within timeout, dismiss overlay.

### Pitfall 4: Event Name Collision
**What goes wrong:** `startup:stage` collides with other event naming.

**How to avoid:** Use prefix `startup:` consistently. Check existing events in codebase (no existing `startup:*` events found).

---

## Code Examples

### Indeterminate Progress Bar CSS Animation

Two common approaches:

**Approach A: Sliding indicator (recommended for branding style)**
```css
/* Track */
.progress-track {
  background: var(--paper-inset);
  border-radius: 9999px;
  height: 4px;
  overflow: hidden;
}

/* Sliding bar */
.progress-bar {
  background: var(--accent-warm);
  border-radius: 9999px;
  height: 100%;
  width: 30%;
  animation: slide 1.5s ease-in-out infinite;
}

@keyframes slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
```

**Approach B: Pulsing/opacity**
```css
.progress-bar {
  background: var(--accent-warm);
  border-radius: 9999px;
  height: 100%;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scaleX(0.8); }
  50% { opacity: 1; transform: scaleX(1); }
}
```

### ShutdownProgressOverlay Structure (reference)

```tsx
// Key structure from ShutdownProgressOverlay.tsx
<div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
  <div className="flex w-full max-w-xs flex-col items-center rounded-[var(--radius-xl)] bg-[var(--paper-elevated)] p-8 shadow-xl">
    <Loader2 className="h-12 w-12 animate-spin text-[var(--accent-warm)]" />
    <p className="mt-6 text-[14px] font-medium text-[var(--ink)]">{tip}</p>
    <div className="mt-4 w-full rounded-full bg-[var(--paper-inset)] p-[2px]">
      <div className="h-2 rounded-full bg-[var(--accent-warm)] transition-all duration-300" style={{ width: `${progress}%` }} />
    </div>
    <p className="mt-2 text-[12px] text-[var(--ink-muted)]">{Math.round(progress)}%</p>
  </div>
</div>
```

### StartupOverlay (new component, conceptual)

```tsx
interface StartupStage {
  stage: number;
  name: string;
  nameZh: string;  // Chinese name
  status: 'pending' | 'active' | 'complete';
}

const STARTUP_STAGES: StartupStage[] = [
  { stage: 1, name: 'System Core', nameZh: '系统核心', status: 'pending' },
  { stage: 2, name: 'Tray & Management API', nameZh: '托盘与管理 API', status: 'pending' },
  { stage: 3, name: 'Scheduler & Monitors', nameZh: '调度器与监控', status: 'pending' },
  { stage: 4, name: 'Sidecar Ready', nameZh: '助手就绪', status: 'pending' },
];

export default function StartupProgressOverlay({ visible }: { visible: boolean }) {
  const [stages, setStages] = useState(STARTUP_STAGES);
  const [currentTip, setCurrentTip] = useState('正在启动...');

  // Listen for startup events
  useEffect(() => {
    if (!visible) return;
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = listen<{ stage: number; name: string; status: string }>('startup:stage', (event) => {
      setStages(prev => prev.map(s =>
        s.stage === event.payload.stage ? { ...s, status: event.payload.status as any } : s
      ));
      // Update current tip
      const s = stages.find(x => x.stage === event.payload.stage);
      if (s) setCurrentTip(s.nameZh);
    });
    return () => { unlisten.then(fn => fn()); };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center rounded-[var(--radius-xl)] bg-[var(--paper-elevated)] p-8 shadow-xl">
        {/* Logo */}
        <div className="text-[28px] font-light text-[var(--ink)]">nova-agents</div>
        {/* Spinner */}
        <Loader2 className="mt-6 h-10 w-10 animate-spin text-[var(--accent-warm)]" />
        {/* Status */}
        <p className="mt-4 text-[14px] font-medium text-[var(--ink)]">{currentTip}</p>
        {/* Indeterminate progress bar */}
        <div className="mt-4 w-full overflow-hidden rounded-full bg-[var(--paper-inset)] p-[2px]">
          <div className="h-2 w-1/3 rounded-full bg-[var(--accent-warm)]" style={{ animation: 'slide 1.5s ease-in-out infinite' }} />
        </div>
        {/* Step checklist */}
        <div className="mt-6 w-full space-y-2">
          {stages.map(s => (
            <div key={s.stage} className="flex items-center gap-2">
              {s.status === 'complete' ? (
                <Check className="h-4 w-4 text-[var(--success)]" />
              ) : s.status === 'active' ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-warm)]" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-[var(--line)]" />
              )}
              <span className={`text-[13px] ${s.status === 'complete' ? 'text-[var(--ink-muted)]' : 'text-[var(--ink)]'}`}>
                {s.nameZh}
              </span>
            </div>
          ))}
        </div>
        {/* Version */}
        <p className="mt-6 text-[11px] text-[var(--ink-subtle)]">v{appVersion}</p>
      </div>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed |
|--------------|-----------------|--------------|
| No startup feedback | Branding overlay with progress | This phase |
| Blocking startup wait | Async event-driven updates | N/A - new |
| Fixed percentage bar | Indeterminate sliding animation | This phase |

---

## Open Questions

1. **Stage 1 emission timing**
   - What we know: setup() synchronous part fires before frontend listens
   - What's unclear: How long does the frontend take to mount? Is 100-500ms defer enough?
   - Recommendation: Use a 100ms defer + stage query on mount as fallback

2. **Version number source**
   - What we know: App.tsx gets version via `getVersion()` from `@tauri-apps/api/app`
   - What's unclear: Should overlay read version directly or receive it as prop?
   - Recommendation: Read directly in overlay component for simplicity

3. **STARTUP_PROGRESS_ENABLED env var location**
   - What we know: It's an env var, not in config.json
   - What's unclear: Is it in `.env` file or tauri.conf.json?
   - Recommendation: Check tauri.conf.json build env section for custom env vars

---

## Environment Availability

No external dependencies. Pure Rust + React implementation.

| Dependency | Available | Notes |
|------------|-----------|-------|
| `@tauri-apps/api/event` | ✓ | Already in use (listen, emit patterns) |
| Tauri `emit()` | ✓ | Already used extensively in codebase |
| CSS animations | ✓ | Native, no library needed |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing project test setup) |
| Config | vitest.config.ts in project root |
| Quick run | `npm run test` (existing) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| REQ-07-01 | Overlay shows on app mount | unit | Component render test |
| REQ-07-02 | Stage events update checklist | unit | Mock Tauri event, verify state |
| REQ-07-03 | Indeterminate animation runs | visual | CSS animation test |
| REQ-07-04 | Auto-dismiss on complete | unit | Mock complete event, verify hide |
| REQ-07-05 | Timeout fallback dismisses | unit | Mock timeout, verify hide |
| REQ-07-06 | No regression on existing features | e2e | Existing test suite |

### Wave 0 Gaps
- `src/renderer/components/StartupProgressOverlay.tsx` — new component (not in existing tests)
- `src/renderer/components/__tests__/StartupProgressOverlay.test.tsx` — unit tests
- No existing test infrastructure gaps — Vitest already configured

---

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/lib.rs` — setup() initialization sequence, async spawn pattern
- `src/renderer/components/ShutdownProgressOverlay.tsx` — overlay structure reference
- `src/renderer/App.tsx` — frontend initialization, startGlobalSidecarSilent()
- `src/renderer/hooks/useTrayEvents.ts` — event listener patterns
- `src-tauri/src/cron_task.rs` — async initialization with event emission (cron:manager-ready)
- `src-tauri/src/sidecar.rs` — start_tab_sidecar with health check

### Secondary (MEDIUM confidence)
- Design tokens from `specs/guides/design_guide.md` — `--paper-elevated`, `--accent-warm`, `--ink`, etc.
- Architecture patterns from `specs/tech_docs/architecture.md` — SSE event system

### Tertiary (LOW confidence)
- CSS indeterminate animation — standard web pattern, not project-specific

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, pure existing stack
- Architecture: HIGH — event-driven pattern already established in codebase
- Pitfalls: HIGH — well-understood race condition with clear mitigation

**Research date:** 2026-04-16
**Valid until:** 60 days (stable Tauri v2 API, established patterns)
