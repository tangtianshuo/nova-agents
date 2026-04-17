# Quick Task 260417-elt: Fix Startup Splash Overlay

## Summary

**Problem:** The startup splash overlay wasn't displaying correctly because the WebViewWindowBuilder was missing explicit size, centering, and visibility configuration.

## Fix Applied

Added to the overlay WebviewWindowBuilder in `src-tauri/src/lib.rs`:

- `.inner_size(400.0, 300.0)` — explicit dimensions for the overlay window
- `.center()` — position overlay in screen center
- `.visible(true)` — explicit visibility

## Changes

- `src-tauri/src/lib.rs` — Added 3 lines to overlay window configuration

## Verification

- Build: cargo check passed
- Overlay window now has explicit 400x300 size, centered, and visible

---

**Completed:** 2026-04-17
