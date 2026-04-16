# Phase 08: Optimize Cold Start UX - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Optimize cold startup user experience — improve startup speed perception, enhance brand impression during boot, retain 4-stage progress visibility with animations.

</domain>

<decisions>
## Implementation Decisions

### Speed Optimization
- **D-01:** Profile before optimizing — add Rust timestamp logging to key init steps + frontend Performance API
- **D-02:** Analyze all three phases: Bun Sidecar startup, Rust initialization, React/Webview rendering
- **D-03:** Let researcher/planner determine which steps are parallelizable and which are blocking

### Brand Experience
- **D-04:** Visual style: Use brand warm accent colors (#c26d3a) with system light/dark mode auto-adaptation
- **D-05:** Brand elements: nova-agents logo + slogan "一念既起，诸事皆成" + version number (v0.2.x) + brand icon
- **D-06:** Animation effects: Add polished animations (not just spinner) — enhance perceived quality

### Progress Visibility
- **D-07:** Keep 4 stages from Phase 07: System Core → Tray & Management API → Scheduler & Monitors → Sidecar Ready
- **D-08:** Frontend has discretion on implementation approach (4 stages with animation effects)
- **D-09:** Overlay auto-adapts to system light/dark mode

</decisions>

<canonical_refs>
## Canonical References

### Design System
- `specs/guides/design_guide.md` — Colors (warm accent #c26d3a), typography, spacing, animation specs
- `specs/tech_docs/architecture.md` — Startup sequence, Rust initialization order

### Prior Phase Context
- `specs/tech_docs/architecture.md` — Startup stages (Stage 1-4), Rust initialization sequence
- Phase 07 context files for startup overlay decisions

### Existing Code
- `src-tauri/src/lib.rs` — Current overlay creation in `.setup()`, `cmd_hide_overlay` command
- `src/renderer/splash.html` — Current minimalist splash (to be redesigned)
- `src-tauri/src/lib.rs` — Rust startup:stage events (stage 1-3)

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `ShutdownProgressOverlay.tsx` — Similar overlay component with dark/light mode support
- Design tokens from `specs/guides/design_guide.md` for colors/spacing

### Established Patterns
- Light/dark mode via `useThemeEffect` hook
- Startup stage events already implemented in Rust (startup:stage 1-3)
- Overlay window creation pattern in `lib.rs`

### Integration Points
- Overlay window created in `lib.rs` `.setup()`
- Frontend calls `invoke('cmd_hide_overlay')` to dismiss overlay
- `startup:stage` events for progress tracking
</codebase_context>

<specifics>
## Specific Ideas

- Brand colors: warm accent #c26d3a, paper #faf6ee background
- Slogan: "一念既起，诸事皆成" (displayed below logo)
- Brand icon: app icon (32x32 or 48x48)
- Auto light/dark mode: overlay adapts to system theme
- Animations: smooth stage transitions, polished spinner/loading animation
- Profiling: Rust init steps with `Instant::now()` timestamps, frontend with `performance.now()`
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
