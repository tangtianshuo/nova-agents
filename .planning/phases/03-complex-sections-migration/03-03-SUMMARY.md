---
phase: '03'
plan: '03'
title: "Extract ProviderCard and McpServerCard components"
subsystem: settings
tags: [settings, react, component-extraction]
dependency_graph:
  requires: ['03-01', '03-02']
  provides:
    - src/renderer/pages/Settings/components/ProviderCard.tsx
    - src/renderer/pages/Settings/components/McpServerCard.tsx
  affects:
    - src/renderer/pages/Settings/sections/ProviderSection.tsx
    - src/renderer/pages/Settings/sections/McpSection.tsx
tech_stack:
  added:
    - ProviderCard.tsx (321 lines) - reusable provider card with inline delete confirmation
    - McpServerCard.tsx (118 lines) - reusable MCP server card
  patterns:
    - Card component pattern - extracted from inline markup in sections
    - Props interface for explicit typing
    - Inline delete confirmation (no modal overlay)
    - Local verification state management
key_files:
  created:
    - src/renderer/pages/Settings/components/ProviderCard.tsx
    - src/renderer/pages/Settings/components/McpServerCard.tsx
  modified:
    - src/renderer/pages/Settings/sections/ProviderSection.tsx
    - src/renderer/pages/Settings/sections/McpSection.tsx
    - src/renderer/pages/Settings/components/index.ts
decisions:
  - id: "03-03-1"
    decision: "Keep verification state local in ProviderCard (verifyLoading, localVerifyError, errorDetailOpenId)"
    rationale: "Verification involves async operations and complex state (loading, error, debounce, stale checks). Extracting to a hook deferred to future wave when more patterns emerge."
  - id: "03-03-2"
    decision: "Inline delete confirmation in ProviderCard (no modal overlay)"
    rationale: "Phase 4 handles full dialogs (DeleteConfirmDialog). Phase 3 needs a simple inline confirmation that shows/hides below actions row. Using bg-[var(--error-bg)] for visual feedback."

execution_summary:
  tasks_completed: 4
  tasks_total: 5
  status: "partial - awaiting human verification"

commits:
  - hash: "1ab817a"
    message: "feat(03-03): create ProviderCard component with inline delete confirmation"
    files_created:
      - src/renderer/pages/Settings/components/ProviderCard.tsx (321 lines)
    description: "Created ProviderCard component with Props interface, verification state management, debounced API key changes, inline delete confirmation with '确认删除?' prompt and cancel/delete buttons"

  - hash: "961ab83"
    message: "refactor(03-03): use ProviderCard in ProviderSection"
    files_modified:
      - src/renderer/pages/Settings/sections/ProviderSection.tsx (-352 lines, +27 lines)
      - src/renderer/pages/Settings/components/index.ts (+1 line)
    description: "Replaced inline card markup with ProviderCard component. Removed local verification state and functions (now in ProviderCard). Added handleDeleteProvider callback. ProviderSection now 92% smaller."

  - hash: "d0e3422"
    message: "feat(03-03): create McpServerCard component"
    files_created:
      - src/renderer/pages/Settings/components/McpServerCard.tsx (118 lines)
    description: "Created McpServerCard component with Props interface, toggle switch, settings button, status badges (预设/免费), config warning display"

  - hash: "bcaa40e"
    message: "refactor(03-03): update McpSection imports and handleToggle"
    files_modified:
      - src/renderer/pages/Settings/sections/McpSection.tsx (updated imports, removed unused functions)
      - src/renderer/pages/Settings/components/index.ts (+1 line)
    description: "Added McpServerCard import, removed unused imports (Globe, Loader2, Settings2, API functions), renamed handleMcpToggle to handleToggle for consistency. Inline markup replacement pending."

verification_results:
  automated:
    - "grep -c 'ProviderCard' src/renderer/pages/Settings/sections/ProviderSection.tsx" - PASS (found import)
    - "grep -c 'McpServerCard' src/renderer/pages/Settings/sections/McpSection.tsx" - PASS (found import)
  manual: "pending - awaiting Task 5 human verification"

remaining_work:
  - item: "Replace inline card markup in McpSection.tsx with McpServerCard component"
    status: "pending"
    priority: "high"
    estimated_effort: "5 minutes"
  - item: "Update Settings/index.tsx to add handleDeleteProvider handler and pass to ProviderSection"
    status: "pending"
    priority: "medium"
    estimated_effort: "3 minutes"
  - item: "Task 5: Human verification checkpoint"
    status: "pending"
    priority: "high"
    requires_user: true

deviations_from_plan:
  - deviation: "McpSection inline markup not yet replaced with McpServerCard"
    reason: "Encountered Edit tool string matching issues during execution. Component created and imported, but JSX replacement pending."
    mitigation: "Can be completed in follow-up commit - straightforward find/replace of map callback."
  - deviation: "Settings/index.tsx not updated with onDeleteProvider prop"
    reason: "Ran out of time during inline execution. Handler not added to Settings parent component."
    mitigation: "Add handleDeleteProvider callback in Settings/index.tsx and pass to ProviderSection props."

next_steps:
  - action: "Complete McpSection refactoring"
    command: "Replace inline markup in McpSection.tsx servers.map() with <McpServerCard> component"
    estimated_time: "5 minutes"
  - action: "Add delete functionality to Settings"
    command: "Create handleDeleteProvider in Settings/index.tsx, pass to ProviderSection"
    estimated_time: "3 minutes"
  - action: "Human verification checkpoint"
    command: "Run app and verify cards render correctly, inline delete confirmation works"
    estimated_time: "5 minutes"
