# Phase 07: Startup Progress Bar - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a startup progress bar that displays during app boot, showing the initialization progress of Rust subsystems and Global Sidecar startup. The progress bar is branding-style with logo, animated progress indicator, status text, and step checklist.

</domain>

<decisions>
## Implementation Decisions

### D-01: Full Pipeline Stages
The progress bar tracks the complete startup pipeline:
- **Stage 1**: Rust initialization (core subsystems: tray, cron manager, IM bots, agent channels)
- **Stage 2**: Frontend loading (React mount, ConfigProvider init)
- **Stage 3**: Global Sidecar startup
- **Stage 4**: Ready (all systems initialized)

### D-02: Progress Reporting Mechanism
**Tauri event-driven**: Rust emits events via `emit()` to the frontend, which listens and updates the UI accordingly.
- Event name pattern: `startup:stage` with payload `{ stage: number, name: string, status: 'pending' | 'active' | 'complete' }`
- Frontend listens via `listen()` from `@tauri-apps/api/event`

### D-03: Visual Style — Branding Startup Page
Full-screen branding-style overlay with:
- Centered nova-agents Logo (or app icon)
- Animated progress bar (indeterminate style — infinite loop animation until completion)
- Current status text
- Step checklist with checkmarks for completed stages
- Version number at bottom

### D-04: Progress Bar Animation Style
**Indeterminate progress**: An infinite looping animation (like a spinning loader or sliding indicator) rather than a determinate 0%-100% bar. This is used because Rust reports discrete stage completions, not continuous percentages.

### D-05: Dismissal Behavior
**Auto-dismiss on completion**: The overlay automatically disappears when all stages are complete.
**No user cancel button**: User cannot dismiss early — must wait for completion or timeout.

### D-06: Timeout Configuration
Timeout is configurable via environment variable (not in config.json or settings UI).
- Environment variable: `STARTUP_PROGRESS_TIMEOUT_MS` (e.g., `10000` for 10 seconds)
- Default: 15000ms (15 seconds) if not set
- If timeout is reached before completion, the overlay dismisses anyway

### D-07: Rust Core Subsystem Reporting
Report 3-4 major subsystem stages:
1. **System Core** — Logging, lock file, app handle initialization
2. **Tray & Management API** — System tray setup, management API server
3. **Scheduler & Monitors** — Cron task manager, health monitors, auto-start agents
4. **Sidecar Ready** — Global Sidecar startup confirmed

### D-08: Config Location
Startup progress config is stored in environment variable only (not in config.json or settings page).
- `STARTUP_PROGRESS_ENABLED=true/false` — Enable/disable the progress bar
- `STARTUP_PROGRESS_TIMEOUT_MS=15000` — Timeout in milliseconds

### D-09: Existing Pattern Reuse
Reuse `ShutdownProgressOverlay.tsx` as a reference for:
- Overlay structure (fixed inset-0, z-[300], backdrop-blur)
- Animation approach (requestAnimationFrame)
- Progress state management
- CSS tokens (paper-elevated, accent-warm, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `specs/tech_docs/architecture.md` — Overall system architecture, Tauri IPC events
- `src-tauri/src/lib.rs` — Rust setup() initialization sequence and event emission points

### UI Patterns
- `src/renderer/components/ShutdownProgressOverlay.tsx` — Reference implementation for full-screen overlay
- `specs/guides/design_guide.md` — Design tokens, overlay styling, CSS variables

### Frontend Patterns
- `src/renderer/App.tsx` — Frontend initialization, Global Sidecar startup via `startGlobalSidecarSilent()`
- `src/renderer/hooks/useTrayEvents.ts` — Frontend event listening patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ShutdownProgressOverlay.tsx**: Full-screen overlay with animated progress, spinner icon, progress bar, and status text. Use as reference for structure and styling.
- **Design tokens**: `--paper-elevated`, `--accent-warm`, `--ink`, `--ink-muted`, `--radius-xl`, `backdrop-blur-sm`

### Established Patterns
- Tauri event emission: `app.emit("event:name", payload)` in Rust, `listen("event:name")` in frontend
- Overlay positioning: `fixed inset-0 z-[300] flex items-center justify-center`
- Animation via `requestAnimationFrame` with refs for cleanup

### Integration Points
- Rust: Emit `startup:stage` events from `lib.rs` setup() after each subsystem initializes
- Frontend: App.tsx shows the overlay on mount, listens for startup events, dismisses when complete

</code_context>

<specifics>
## Specific Ideas

1. **Logo**: Use existing nova-agents branding (text-based "nova-agents" or icon from window title bar)
2. **Progress animation**: Indeterminate bar (left-right sliding animation or pulsing bar)
3. **Step list**: Shows all 4 stages with checkmark when complete, highlight current stage
4. **Status text**: Shows current stage name in Chinese (e.g., "正在初始化系统核心...", "正在启动全局助手...")

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-startup-progress*
*Context gathered: 2026-04-16*
