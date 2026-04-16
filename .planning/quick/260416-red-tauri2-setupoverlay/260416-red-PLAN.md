---
phase: quick
plan: "260416-red"
type: execute
wave: 1
depends_on: []
files_modified:
  - src-tauri/src/lib.rs
autonomous: true
requirements: []
must_haves:
  truths:
    - "Tauri setupoverlay shows brand overlay during Rust initialization (before webview renders)"
    - "Overlay hides when frontend emits startup:complete and sidecar is ready"
  artifacts:
    - path: "src-tauri/src/lib.rs"
      provides: "setupoverlay integration in Rust .setup()"
      min_lines: 10
  key_links:
    - from: "lib.rs .setup()"
      to: "Tauri overlay API"
      via: "app.setup_overlay() call"
---

<objective>
Use Tauri 2 setupoverlay to show a native brand overlay during Rust initialization, replacing the React-based StartupProgressOverlay. The overlay appears before webview renders and is hidden when frontend signals startup:complete.
</objective>

<context>
@src-tauri/src/lib.rs
@src/renderer/components/StartupProgressOverlay.tsx
@src/renderer/App.tsx (lines 318-321, startup:complete emit)

# Tauri 2 setupoverlay API reference:
# app.setup_overlay() shows overlay before webview loads
# The overlay is defined in tauri.conf.json (productName + overlay assets)
# Frontend calls app.hide() to dismiss after startup:complete
</context>

<tasks>

<task type="auto">
  <name>Task 1: Integrate Tauri setupoverlay in Rust lib.rs</name>
  <files>src-tauri/src/lib.rs</files>
  <action>
    In the .setup() callback in lib.rs, BEFORE the logging plugin initialization (which happens after window is created), call app.setup_overlay() to show the native brand overlay.

    Add this at the START of .setup() (before logging plugin):
    ```rust
    // Show native overlay during Rust initialization (before webview content loads)
    // This replaces the React-based StartupProgressOverlay
    if let Err(e) = app.setup_overlay() {
        log::warn!("[App] Failed to setup overlay: {}", e);
    } else {
        log::info!("[App] Native overlay shown during initialization");
    }
    ```

    Keep the existing startup:stage 1-3 events in Rust for debugging.
    The React StartupProgressOverlay can be removed in a separate cleanup task.

    Note: The frontend (App.tsx) already emits 'startup:complete' after sidecar is ready (line 321). The overlay hides when the webview content fully loads - Tauri automatically hides the overlay once the webview is ready to display content.
  </action>
  <verify>rustc compiles lib.rs without errors</verify>
  <done>Tauri setupoverlay integrated, overlay shows during Rust init</done>
</task>

</tasks>

<verification>
Build the Tauri app and verify the overlay appears before the webview content loads. Check logs for "[App] Native overlay shown during initialization".
</verification>

<success_criteria>
- app.setup_overlay() called in .setup() before logging plugin
- No compilation errors in lib.rs
- Overlay shows during Rust initialization phase
</success_criteria>

<output>
After completion, create `.planning/quick/260416-red-tauri2-setupoverlay/260416-red-SUMMARY.md`
</output>
