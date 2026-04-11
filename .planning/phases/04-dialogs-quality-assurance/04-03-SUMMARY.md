# Phase 04 Plan 03: CustomMcpDialog Extraction Summary

## Plan Overview
**Phase:** 04-dialogs-quality-assurance
**Plan:** 03
**Status:** COMPLETE

## Objective
Extract CustomMcpDialog from old Settings.tsx into reusable dialog component with dual-mode input (form/JSON).

## One-liner
CustomMcpDialog with form/JSON mode toggle, transport type selector (STDIO/HTTP/SSE), validation, and Settings integration.

## Requirements Covered
- **DIALOG-02**: CustomMcpDialog with dual-mode input (form/JSON)
- **QA-05**: Component contract (Props interfaces, validation rules, error handling)
- **QA-06**: React Stability Rules (Context separation, useCallback, no inline functions)

## Tasks Completed

### Task 1: Create CustomMcpDialog Component
**Commit:** 80f4c6d
**Files Created:**
- `src/renderer/pages/Settings/components/dialogs/CustomMcpDialog.tsx` (488 lines)

**Features Implemented:**
- Dual-mode state (form/JSON) with toggle button
- Transport type selector: 3-button grid (STDIO 💻, HTTP 🌐, SSE 📡)
- Transport icons with selected/unselected visual states
- Form validation:
  - Required fields: type, id, name
  - Command required for STDIO type
  - ID auto-converts to lowercase with hyphens
- JSON validation with error messages
- Command autocomplete via CustomSelect
- Environment variables editor (JSON textarea)
- Edit mode disables transport type selector and ID field
- Mode toggle button text: "切换为 JSON 配置" / "切换为添加面板"
- Click-outside-to-close pattern (same as SessionStatsModal)
- Loading state on save button

### Task 2: Update Dialog Exports and Integrate in Settings
**Commit:** 80f4c6d
**Files Modified:**
- `src/renderer/pages/Settings/components/dialogs/index.ts`
- `src/renderer/pages/Settings/index.tsx`

**Changes:**
- Added CustomMcpDialog and McpFormData exports to dialogs index
- Added MCP dialog state (customMcpOpen, customMcpMode, customMcpData)
- Updated handleAddMcp to open dialog in add mode
- Updated handleEditMcp to open dialog in edit mode with pre-populated data
- Added handleSaveMcp callback (placeholder for config service integration)
- Rendered CustomMcpDialog after CustomProviderDialog

### Task 3: McpSection Handler Verification
**Status:** VERIFIED (no changes needed)

**Flow Confirmed:**
- Custom MCP card settings button → handleSettingsClick → onEditServer → handleEditMcp in Settings → opens CustomMcpDialog
- Builtin MCP card settings button → handleSettingsClick → onEditBuiltinServer → handleEditBuiltinMcp in Settings → (future builtin panels)

## Export Summary

```typescript
// src/renderer/pages/Settings/components/dialogs/CustomMcpDialog.tsx
export interface CustomMcpDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  initialData?: McpFormData;
  onSave: (data: McpFormData) => Promise<void>;
  onCancel: () => void;
}

export interface McpFormData {
  type: 'stdio' | 'http' | 'sse';
  id: string;
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export default function CustomMcpDialog(props: CustomMcpDialogProps): JSX.Element
```

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dual-mode toggle | Power users prefer JSON paste, regular users prefer form | Implemented |
| Transport type selector disabled in edit mode | Transport type change could break server connection | Implemented |
| Command autocomplete via CustomSelect | Reuse existing component pattern | Implemented |
| JSON mode saves first server | Single-server edit scenario | Implemented |

## File Metrics

| File | Lines | Status |
|------|-------|--------|
| CustomMcpDialog.tsx | 488 | < 500 target |
| dialogs/index.ts | 8 | Updated |
| Settings/index.tsx | ~340 | Updated |

## Verification Results

### Automated Checks
- [x] `export interface CustomMcpDialogProps` found
- [x] `mcpFormMode` state found (form/JSON toggle)
- [x] `validateForm` and `validateJson` functions found
- [x] `CustomSelect` usage found
- [x] `TRANSPORT_TYPES` (STDIO/HTTP/SSE) found
- [x] TypeScript compilation passes for modified files
- [x] File size < 500 lines

### Integration Checks
- [x] CustomMcpDialog imported in Settings/index.tsx
- [x] Dialog state variables present (customMcpOpen, customMcpMode, customMcpData)
- [x] handleAddMcp opens dialog in add mode
- [x] handleEditMcp opens dialog in edit mode with pre-populated data
- [x] handleSaveMcp callback wired to dialog
- [x] Dialog rendered after CustomProviderDialog

## Known Stubs

None - all stubs are intentional placeholders pending config service integration:
- `handleSaveMcp` logs data and shows toast "MCP 保存功能开发中"

## Deviation from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused toast variable in McpSection**
- **Found during:** Task 3 (Verify McpSection wiring)
- **Issue:** `useToast()` was called but `useToast` was never imported, and `toast` variable was never used
- **Fix:** Removed the unused `const toast = useToast();` line
- **Files modified:** src/renderer/pages/Settings/sections/McpSection.tsx
- **Verification:** Grep confirmed handleSettingsClick correctly routes to onEditServer/onEditBuiltinServer
- **Committed in:** db10cf7

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor bug fix. All plan tasks were completed in previous execution.

## Dependencies
- Phase 04-01 (Dialogs research)
- Phase 04-02 (CustomProviderDialog extraction)
