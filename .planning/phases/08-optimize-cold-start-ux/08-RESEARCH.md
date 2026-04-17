# Phase 08: Optimize Cold Start UX - Research

**Researched:** 2026-04-16
**Domain:** Tauri v2 startup profiling, CSS animation for splash screens, system theme detection
**Confidence:** HIGH

## Summary

Phase 08 optimizes cold startup UX through profiling + brand redesign. The native overlay HTML (created via `WebviewWindowBuilder` with data URL) becomes a polished branded splash with animations, replacing the current minimal spinner. Profiling infrastructure (`Instant::now()` on Rust, `performance.now()` on frontend) enables data-driven optimization.

**Primary recommendation:** Redesign the native overlay HTML with warm brand aesthetics, staggered CSS animations, light/dark mode support, and add Rust+frontend profiling to identify bottlenecks. The 4-stage progress structure from Phase 07 is preserved but rendered with enhanced animations.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Profile before optimizing -- add Rust timestamp logging to key init steps + frontend Performance API
- **D-02:** Analyze all three phases: Bun Sidecar startup, Rust initialization, React/Webview rendering
- **D-03:** Let researcher/planner determine which steps are parallelizable and which are blocking
- **D-04:** Visual style: Use brand warm accent colors (#c26d3a) with system light/dark mode auto-adaptation
- **D-05:** Brand elements: nova-agents logo + slogan "一念既起，诸事皆成" + version number (v0.2.x) + brand icon
- **D-06:** Animation effects: Add polished animations (not just spinner) -- enhance perceived quality
- **D-07:** Keep 4 stages from Phase 07: System Core, Tray & Management API, Scheduler & Monitors, Sidecar Ready
- **D-08:** Frontend has discretion on implementation approach (4 stages with animation effects)
- **D-09:** Overlay auto-adapts to system light/dark mode

### Deferred Ideas

None -- discussion stayed within phase scope.

---

## Standard Stack

No new libraries required. The overlay is pure HTML/CSS with inline animations.

| Component | Approach | Rationale |
|-----------|----------|-----------|
| Overlay HTML | Inline CSS data URL | Avoids dev-server loading delay during Rust init |
| Animations | CSS @keyframes | Native, hardware-accelerated, no JS needed |
| Dark mode | CSS `prefers-color-scheme` media query | System-level detection, no JS required |
| Profiling (Rust) | `std::time::Instant::now()` + `ulog_info!` | Already used in `sse_proxy.rs`, `sidecar.rs` |
| Profiling (Frontend) | `performance.now()` | Native Browser API, already used in codebase |
| Version | Hardcoded "v0.2.2" | From `tauri.conf.json` -- not dynamically read |

---

## Architecture Patterns

### Current Startup Flow

```
[App Launch]
  |
  v
[lib.rs .setup() synchronous]
  - Plugin initialization
  - App handle logger init
  - acquire_lock()
  - cleanup_stale_sidecars()
  - Boot banner
  - tray::setup_tray() --> async emit stage 1
  - Create main window (hidden)
  - Create native overlay (visible) <-- current minimal splash
  |
  v
[Async tasks via tokio::spawn]
  - management_api::start_management_api() --> emit stage 2
  - cron_task::initialize_cron_manager() --> emit stage 3
  - Global Sidecar health monitor (background)
  - Session Sidecar health monitor (background)
  - Agent Channel health monitor (background)
  |
  v
[Frontend mounts]
  - Listens for startup:stage events
  - startGlobalSidecarSilent() --> emit stage 4 + startup:complete
  - invoke('cmd_hide_overlay') --> hides native overlay, shows main window
```

### Parallelization Analysis

| Step | Blocking? | Parallelizable With |
|------|-----------|-------------------|
| Logging init | YES | Nothing else depends on it |
| acquire_lock() | YES | Nothing else depends on it |
| cleanup_stale_sidecars() | YES | Nothing else depends on it |
| tray::setup_tray() | NO | Everything after can proceed |
| management_api start | NO | Can run with cron init |
| cron_manager init | NO | Can run with management_api |
| monitors | NO (background) | All other startup |

**Key insight:** Stage 2 (Tray & Management API) and Stage 3 (Scheduler & Monitors) run concurrently -- they are independent async tasks. This means the "sequential" view is slightly misleading; both complete around the same time.

### Native Overlay Architecture

The overlay is created via `WebviewWindowBuilder` with a data URL HTML:

```rust
// Current minimal splash (lib.rs line 276)
let splash_html = r#"data:text/html,<html><head><style>body{...}</style></head><body>..."#;

WebviewWindowBuilder::new(app, "overlay", tauri::WebviewUrl::External(splash_html.parse().unwrap()))
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .transparent(true)
    .build()
```

**Data URL limitation:** The overlay HTML is static (no external resources). All styles, animations, and content must be self-contained in the data URL string.

### Dark Mode in Data URL Overlay

Since the overlay is a separate WebView (not the React app), it does NOT inherit the `.dark` class from React's `useThemeEffect`. The overlay must detect system theme independently via CSS `prefers-color-scheme`:

```css
@media (prefers-color-scheme: dark) {
  /* dark mode styles */
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Theme detection | JS-based theme detection in overlay | CSS `prefers-color-scheme` media query |
| Animations | JS-driven animations | CSS @keyframes (GPU-accelerated) |
| Overlay content | External resources in data URL | Inline CSS/HTML only |
| Profiling timestamps | Manual string formatting | `Instant::now().elapsed().as_millis()` |

---

## Common Pitfalls

### Pitfall 1: Overlay Flickers on Dark/Light Transition
**What goes wrong:** On macOS, switching system theme while app is running causes overlay to briefly show light colors before React re-applies dark mode.

**Why it happens:** The overlay WebView runs independently from React and listens to system theme directly via `prefers-color-scheme`. React's theme applies `.dark` to the main window's HTML, but the overlay doesn't have this class.

**How to avoid:** The overlay should always use `prefers-color-scheme` -- do NOT try to sync theme state between overlay and React. This is a feature: the overlay correctly reflects current system theme regardless of app-level theme setting.

### Pitfall 2: Data URL Size Blows Up
**What goes wrong:** Adding complex animations + Chinese characters + icon SVG to the data URL makes it extremely long, causing compilation issues or URL length limits.

**Why it happens:** Data URLs have practical limits (~2MB theoretical, but many browsers truncate earlier). Inline SVGs and long Chinese strings add up quickly.

**How to avoid:** Keep the overlay design simple. Use text for brand name (not SVG icon). Use system fonts. Minify CSS (remove unnecessary whitespace). Avoid embedding large graphics.

### Pitfall 3: Animation Causes Jank on Low-End Hardware
**What goes wrong:** The animated overlay causes frame drops or stuttering during startup.

**Why it happens:** CSS animations on transparent/transformed elements can trigger repaints, especially on Windows with compositing issues.

**How to avoid:** Use `transform` and `opacity` only (composited properties). Avoid `box-shadow` animations, `width`/`height` animations, or layout-triggering properties.

### Pitfall 4: Profiling Overhead Skews Results
**What goes wrong:** Adding profiling `log::info!` calls to hot paths actually slows down startup, making measurements inaccurate.

**Why it happens:** Logging to stdout/file is not free, especially when done frequently.

**How to avoid:** Only profile at major milestones (stage completions). Don't profile inside tight loops. Use `Instant::now()` for timing but only log at meaningful boundaries.

---

## Code Examples

### Profiling Rust Startup Steps

```rust
use std::time::Instant;

// At the start of setup()
let startup_timer = Instant::now();
let stage_timers: std::collections::HashMap<&str, u128> = std::collections::HashMap::new();

// Before each major step
let step_start = Instant::now();
// ... do step work ...
let elapsed = step_start.elapsed().as_millis();
stage_timers.insert("plugin_init", elapsed);
ulog_info!("[startup:profile] plugin_init took {}ms", elapsed);

// At end of setup(), emit timing summary
let total_ms = startup_timer.elapsed().as_millis();
ulog_info!("[startup:profile] total setup time: {}ms stage_timers={:?}", total_ms, stage_timers);
```

### Profiling Frontend Startup

```typescript
// In useStartupProgress or App.tsx
const startupStart = performance.now();

// At each milestone
const markStage = (stage: number) => {
  const elapsed = Math.round(performance.now() - startupStart);
  console.log(`[startup:profile] Stage ${stage} complete at ${elapsed}ms`);
  // Optionally send to Rust via invoke for aggregation
};

// After all stages complete
const totalMs = Math.round(performance.now() - startupStart);
console.log(`[startup:profile] Total startup: ${totalMs}ms`);
```

### Overlay HTML with Animations (Conceptual)

```html
<!DOCTYPE html>
<html>
<head>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 100vw; height: 100vh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  transition: background 0.3s ease;
}
/* Light mode (default) */
body { background: #faf6ee; }
/* Dark mode */
@media (prefers-color-scheme: dark) {
  body { background: #1c1612; }
  .logo { color: #faf6ee; }
  .slogan { color: #a69a90; }
  .spinner-track { background: #3a3532; }
}

/* Brand elements */
.logo {
  font-size: 32px; font-weight: 300;
  color: #1c1612; letter-spacing: -0.02em;
  /* Staggered reveal animation */
  animation: fadeSlideIn 0.8s ease-out forwards;
  opacity: 0; transform: translateY(10px);
}
.slogan {
  font-size: 14px; font-weight: 400;
  color: #6f6156; margin-top: 8px;
  letter-spacing: 0.08em;
  animation: fadeSlideIn 0.8s ease-out 0.2s forwards;
  opacity: 0; transform: translateY(10px);
}
.version {
  font-size: 11px; color: #a69a90; margin-top: 4px;
  animation: fadeSlideIn 0.8s ease-out 0.3s forwards;
  opacity: 0;
}

/* Progress bar */
.progress-track {
  width: 200px; height: 4px;
  background: #e8dccf; border-radius: 9999px;
  margin-top: 24px; overflow: hidden;
  animation: fadeSlideIn 0.8s ease-out 0.4s forwards;
  opacity: 0;
}
.progress-bar {
  height: 100%; width: 30%;
  background: #c26d3a; border-radius: 9999px;
  animation: slide 1.5s ease-in-out infinite;
}
.spinner {
  width: 24px; height: 24px;
  border: 2px solid #e8dccf;
  border-top-color: #c26d3a;
  border-radius: 50%;
  margin-top: 20px;
  animation: spin 1s linear infinite, fadeSlideIn 0.8s ease-out 0.5s forwards;
  opacity: 0;
}

@keyframes fadeSlideIn {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
</head>
<body>
  <div class="logo">nova-agents</div>
  <div class="slogan">一念既起，诸事皆成</div>
  <div class="version">v0.2.2</div>
  <div class="progress-track">
    <div class="progress-bar"></div>
  </div>
  <div class="spinner"></div>
</body>
</html>
```

### Keyframes for Staggered Stage Reveals

```css
/* Each stage item fades in with 100ms delay cascade */
.stage-item {
  opacity: 0;
  animation: stageReveal 0.4s ease-out forwards;
}
.stage-item:nth-child(1) { animation-delay: 0.1s; }
.stage-item:nth-child(2) { animation-delay: 0.2s; }
.stage-item:nth-child(3) { animation-delay: 0.3s; }
.stage-item:nth-child(4) { animation-delay: 0.4s; }

@keyframes stageReveal {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Checkmark draw animation */
.check-icon {
  animation: checkDraw 0.3s ease-out forwards;
}
@keyframes checkDraw {
  from { stroke-dashoffset: 20; }
  to { stroke-dashoffset: 0; }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed |
|--------------|------------------|--------------|
| Minimal spinner overlay | Polished branded splash with animations | Phase 08 |
| No profiling | Instant.now() timestamps in Rust + performance.now() in frontend | Phase 08 |
| Single accent color | Auto dark/light mode via prefers-color-scheme | Phase 08 |
| Static progress bar | Animated sliding bar with staggered stage reveals | Phase 08 |

---

## Open Questions

1. **Where should profiling results be aggregated?**
   - What we know: Rust logs to unified log, frontend logs to console
   - What's unclear: Should frontend send timing data back to Rust for centralized logging?
   - Recommendation: Keep logging separate initially. If needed, add an invoke to submit frontend timing to Rust log.

2. **Should the 4 stages animate sequentially or show simultaneously?**
   - What we know: D-07 keeps 4 stages, D-08 gives frontend discretion
   - What's unclear: Should stages appear one-by-one as they complete, or show all 4 at once with individual animations?
   - Recommendation: Show all 4 stages from the start (staggered fade-in), with the checkmark appearing when each stage completes. This provides better progress visibility.

3. **Can we read version dynamically or must it be hardcoded?**
   - What we know: `tauri.conf.json` has version "0.2.2", reading it requires Rust file read
   - What's unclear: Is a static string "v0.2.2" acceptable, or should it match tauri.conf.json?
   - Recommendation: Use static "v0.2.2" for simplicity. Version rarely changes and the maintenance cost of dynamic reading outweighs the benefit.

4. **Should the overlay show actual progress or remain indeterminate?**
   - What we know: Phase 07 used indeterminate sliding bar
   - What's unclear: With profiling, could we show real progress?
   - Recommendation: Keep indeterminate. The 4-stage checklist provides sufficient progress indication. True determinate progress requires knowing how long each stage takes (which profiling might reveal, but not for first boot).

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified -- pure Rust + CSS implementation)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing project test setup) |
| Config | vitest.config.ts in project root |
| Quick run | `npm run test` |
| Full suite | `npm run test -- --run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| REQ-08-01 | Rust timestamps logged for key init steps | manual | Check `unified-*.log` for `[startup:profile]` entries |
| REQ-08-02 | Frontend performance.now() timing logged | manual | Check browser console for `[startup:profile]` entries |
| REQ-08-03 | Overlay shows brand logo + slogan | visual | Manual verification |
| REQ-08-04 | Overlay shows v0.2.x version | visual | Manual verification |
| REQ-08-05 | Overlay shows 4-stage progress | visual | Manual verification |
| REQ-08-06 | Overlay adapts to system dark/light mode | visual | Toggle system theme, verify overlay changes |
| REQ-08-07 | Overlay animations play smoothly | visual | Check for jank/stutter |
| REQ-08-08 | No regression on existing startup flow | smoke | Launch app, verify all 4 stages complete, overlay dismisses |

### Wave 0 Gaps
None -- Phase 08 modifies existing files (lib.rs, splash.html inline string) and adds Rust profiling. No new test files needed for research phase.

---

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/lib.rs` (lines 251-290) -- current overlay creation via WebviewWindowBuilder, startup event emissions
- `src-tauri/src/commands.rs` (cmd_hide_overlay) -- overlay dismissal command
- `src/renderer/components/ShutdownProgressOverlay.tsx` -- overlay structure reference
- `src/renderer/hooks/useTheme.ts` -- dark mode detection pattern (prefers-color-scheme)
- `src/renderer/index.html` -- theme FOUC prevention script
- `specs/tech_docs/architecture.md` -- startup sequence, boot banner
- `specs/guides/design_guide.md` -- design tokens (--paper, --accent-warm, --ink, --ink-muted, spacing, animation)

### Secondary (MEDIUM confidence)
- `src-tauri/src/sidecar.rs` (Instant::now usage) -- profiling pattern
- `src/renderer/hooks/useAutoScroll.ts` (performance.now usage) -- frontend profiling pattern

### Tertiary (LOW confidence)
- CSS animation best practices -- standard web, not project-specific
- `prefers-color-scheme` dark mode detection -- standard CSS, not project-specific

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, inline CSS/HTML only
- Architecture: HIGH -- overlay already exists, modifications are enhancements
- Pitfalls: HIGH -- well-understood issues with data URL size, animation performance, dark mode

**Research date:** 2026-04-16
**Valid until:** 60 days (stable Tauri v2 API, established CSS standards)
