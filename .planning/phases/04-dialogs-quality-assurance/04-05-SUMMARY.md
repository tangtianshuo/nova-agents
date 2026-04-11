---
phase: "04-dialogs-quality-assurance"
plan: "05"
subsystem: "settings"
tags: ["settings", "general-section", "startup", "theme", "workspace"]
dependency_graph:
  requires: ["04-01", "04-02", "04-03", "04-04"]
  provides: ["general-section"]
  affects: ["Settings/index.tsx", "Settings/sections/index.ts"]
tech_stack:
  added: []
  patterns: ["card-based layout", "toggle switch", "theme selector", "useCallback handlers"]
key_files:
  created:
    - "src/renderer/pages/Settings/sections/GeneralSection.tsx"
  modified:
    - "src/renderer/pages/Settings/sections/index.ts"
    - "src/renderer/pages/Settings/index.tsx"
decisions:
  - "GeneralSection uses Project type for workspaces (not separate Workspace type)"
  - "defaultWorkspacePath used for workspace selection (matches actual AppConfig interface)"
  - "ToggleSwitch is inline component (matches design spec pattern)"
  - "handleUpdateConfig uses atomicModifyConfig for disk-first persistence"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-11T14:22:30Z"
  tasks_completed: 2
---

# Phase 04 Plan 05: GeneralSection Extraction Summary

## One-liner

Extracted GeneralSection component from Settings with startup settings, theme selector, and default workspace dropdown.

## Summary

Phase 04-05 extracts the GeneralSection from Settings/index.tsx into a reusable component:

1. **Created GeneralSection.tsx** with card-based layout:
   - Startup settings card with auto-start toggle and minimize to tray toggle
   - Theme selector with pill buttons (system/light/dark)
   - Default workspace card with CustomSelect dropdown

2. **ToggleSwitch component** - inline component for boolean settings with loading state support

3. **Props interface**:
   - `config: AppConfig` - full app config
   - `autostartEnabled: boolean` - current autostart state
   - `autostartLoading: boolean` - loading state for async operations
   - `workspaces: Project[]` - list of workspaces
   - `onUpdateConfig: (updates: Partial<AppConfig>) => void` - config update handler
   - `onToggleAutostart: () => Promise<boolean>` - autostart toggle handler

4. **Updated sections/index.ts** barrel exports with GeneralSection and GeneralSectionProps

5. **Integrated in Settings/index.tsx**:
   - Added workspaces state and autostart state
   - Added handleUpdateConfig using atomicModifyConfig
   - Added handleToggleAutostart using cmd_toggle_autostart
   - Added useEffects to load workspaces and autostart on mount
   - Added GeneralSection rendering in section routing

## Verification

| Check | Result |
|-------|--------|
| TypeScript compilation | PASS (no new errors in modified files) |
| GeneralSectionProps exported | PASS |
| GeneralSection component created | PASS |
| ToggleSwitch component | PASS |
| CustomSelect used for workspace | PASS |
| handleToggleAutostart handler | PASS |
| handleThemeChange handler | PASS |
| handleDefaultWorkspaceChange handler | PASS |
| handleUpdateConfig handler | PASS |
| Section routing updated | PASS |

## Commit

- `9118fce`: feat(04-05): extract GeneralSection from Settings

## Deviations from Plan

None - plan executed with minor interface adaptations to match actual AppConfig type (defaultWorkspacePath vs defaultWorkspace, Project vs Workspace types).

## Known Stubs

None - all functionality is wired to actual implementation.

## Self-Check: PASSED

- [x] GeneralSection.tsx exists (205 lines)
- [x] Commit 9118fce exists
- [x] GeneralSectionProps exported from sections/index.ts
- [x] GeneralSection imported in Settings/index.tsx
- [x] handleToggleAutostart implemented
- [x] handleThemeChange implemented
- [x] handleDefaultWorkspaceChange implemented
- [x] handleUpdateConfig implemented
- [x] GeneralSection renders in section routing
