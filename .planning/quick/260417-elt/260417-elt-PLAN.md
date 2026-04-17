---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src-tauri/src/lib.rs
autonomous: true
requirements: []
must_haves:
  truths:
    - "Overlay window displays centered with proper dimensions during cold start"
    - "Main window shows after frontend is ready"
  artifacts:
    - path: "src-tauri/src/lib.rs"
      provides: "Overlay window configuration fix"
      min_lines: 10
---

<objective>
Fix the overlay (splash) window so it properly displays during cold start. The issue is that the overlay window is created without explicit size or centering, which may cause it to be invisible on Windows.
</objective>

<context>
@src-tauri/src/lib.rs (lines 277-294)
</context>

<tasks>

<task type="auto">
  <name>Fix overlay window size and positioning</name>
  <files>src-tauri/src/lib.rs</files>
  <action>
    In the overlay WebviewWindowBuilder (around line 281), add missing configuration:

    1. Add `.inner_size(400.0, 300.0)` — explicit dimensions for the overlay window (data URL needs size)
    2. Add `.center()` — position overlay in screen center
    3. Add `.visible(true)` — explicit visibility (clarifies intent)

    The current overlay config (missing items marked with ???):
    ```rust
    match WebviewWindowBuilder::new(
        app,
        "overlay",
        tauri::WebviewUrl::External(splash_html.parse().unwrap()),
    )
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .transparent(true)
    .inner_size(400.0, 300.0)   // ADD: explicit size
    .center()                     // ADD: center on screen
    .visible(true)               // ADD: explicit visibility
    .build()
    ```
  </action>
  <verify>
    <automated>grep -n "\.inner_size.*400.*300" src-tauri/src/lib.rs && grep -n "\.center()" src-tauri/src/lib.rs | head -2</automated>
  </verify>
  <done>Overlay window configured with explicit size (400x300), centered, and visible</done>
</task>

</tasks>

<verification>
- Build the app and verify the overlay window appears centered during cold start
- Verify the main window (launcher) appears after frontend initialization
</verification>

<success_criteria>
- Overlay window has explicit inner_size of 400x300
- Overlay window is centered on screen
- Overlay window has explicit visible(true)
</success_criteria>

<output>
After completion, create `.planning/quick/260417-elt/260417-elt-SUMMARY.md`
</output>
