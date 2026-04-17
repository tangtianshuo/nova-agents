---
status: resolved
trigger: "shutdown-progress-not-closing"
created: 2026-04-16T14:42:00.000Z
updated: 2026-04-16T18:30:00.000Z
---

## Root Cause

Two issues:
1. **Permission**: `process:allow-exit` was missing from capabilities - `exit(0)` was blocked
2. **Event delivery**: `emit('tray:confirm-exit')` fails with `ERR_CONNECTION_REFUSED` during window close (IPC channel closes)

## Fix Applied

1. **capabilities/default.json** — Added `process:allow-exit`
2. **App.tsx beforeExit** — Fire-and-forget emit + direct `exit(0)` after animation completes

## Files Changed
- src-tauri/capabilities/default.json
- src/renderer/App.tsx
- src/renderer/hooks/useTrayEvents.ts

## Verification
User confirmed: progress increments and app exits after ~7 seconds.
