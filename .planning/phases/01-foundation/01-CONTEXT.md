# Phase 1: Foundation & Static Sections - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the component architecture foundation for Settings page refactoring. This includes:
1. Creating `src/renderer/pages/Settings/` directory structure (sections/, components/, hooks/)
2. Building SettingsLayout (container) and SettingsSidebar (navigation) components
3. Refactoring index.tsx as a composition root (~200 lines)
4. Migrating AccountSection and AboutSection from the 5707-line Settings.tsx

**No complex business logic in this phase** — only layout and static content sections. Provider management, MCP tools, and dialogs are in later phases.

</domain>

<decisions>
## Implementation Decisions

### Directory Structure
- **D-01:** Follow the design document structure exactly: `Settings/index.tsx`, `SettingsLayout.tsx`, `SettingsSidebar.tsx`, `sections/`, `components/`, `hooks/`. No deviation from `docs/settings-componentization.md` §3.1.

### Layout Component Architecture
- **D-02:** SettingsLayout is a pure layout container (no business logic). It manages the two-column layout (sidebar + content area) and passes `activeSection` state down to children.
- **D-03:** SettingsSidebar is a controlled component receiving `activeSection` and `onSectionChange` as props. Navigation state lives in the parent (Settings/index.tsx), not in the sidebar itself.

### Navigation State Management
- **D-04:** `activeSection` state stored in Settings/index.tsx using `useState('general'` as default). This is lifted state because both SettingsSidebar and the content area need it.
- **D-05:** Section switching is triggered by sidebar button clicks calling `onSectionChange(section)`. No routing — this is internal Settings page navigation only.

### Static Section Migration Approach
- **D-06:** **Extract-as-is principle** — Copy AccountSection and AboutSection code verbatim from Settings.tsx without refactoring logic. Only wrap in function components and export. Fix any direct state references to use props where needed.
- **D-07:** Section components receive their data from useConfig (global) via parent props. No local state duplication — read config from props, let callbacks handle updates.

### Props Interface Design
- **D-08:** All components have explicit TypeScript interfaces exported. Example: `interface SettingsLayoutProps { activeSection: SettingsSection; onSectionChange: (section: SettingsSection) => void; children: React.ReactNode; config: AppConfig; }`
- **D-09:** `SettingsSection` type defined as union: `'general' | 'providers' | 'mcp' | 'skills' | 'sub-agents' | 'agent' | 'usage-stats' | 'about' | 'account'`. This matches the current implementation.

### Import Path Updates
- **D-10:** After creating Settings/index.tsx, update the main App.tsx or wherever Settings.tsx is imported. Change from `import Settings from '@/pages/Settings'` to `import Settings from '@/pages/Settings/index'` (or adjust the export in Settings/index.tsx to maintain backward compatibility).

### Claude's Discretion
- **File naming:** Use kebab-case for component files (SettingsLayout.tsx, SettingsSidebar.tsx) to match project conventions.
- **Inline styling vs CSS:** Continue using TailwindCSS classes as in the original Settings.tsx. No CSS modules or styled-components.
- **Error boundaries:** Defer error boundary setup to later phases. Phase 1 components are simple and won't crash.
- **Testing:** No unit tests in Phase 1. Testing comes in Phase 4 (Dialogs & QA).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Document
- `docs/settings-componentization.md` — Complete design specification. Read §3 (Architecture Design) and §4 (Component Design) before implementing.

### Research
- `.planning/research/ARCHITECTURE.md` — Component hierarchy, boundaries, data flow patterns
- `.planning/research/FEATURES.md` — Table stakes features, component patterns, state management strategies
- `.planning/research/PITFALLS.md` — Common React componentization mistakes to avoid (over-extraction, useEffect deps breaking)

### Project Constraints
- `CLAUDE.md` — Core architectural constraints (no direct HTTP from WebView, Rust proxy layer mandatory)
- `specs/tech_docs/architecture.md` — Session-centric sidecar model, Tab-scoped vs global state
- `specs/tech_docs/react_stability_rules.md` — React stability rules (useCallback, useMemo, Context value stability)
- `specs/guides/design_guide.md` — Design system (Paper/Ink colors, button specs, layout patterns)

### Source Code
- `src/renderer/pages/Settings.tsx` — Current monolithic implementation (5707 lines). Read first 500 lines to understand imports, types, and structure.

### Existing Patterns
- `src/renderer/components/GlobalSkillsPanel.tsx` — Example of extracted section component
- `src/renderer/components/GlobalAgentsPanel.tsx` — Example of extracted section component
- `src/renderer/context/TabContext.tsx` — Pattern for creating scoped context (reference for SettingsSectionContext if needed)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useConfig()` hook — Global config management (providers, apiKeys, mcpServers, projects). All Settings sections read from this.
- `CustomSelect` component (`src/renderer/components/CustomSelect.tsx`) — Dropdown pattern, may be used in SettingsSidebar for section switching if needed.

### Established Patterns
- **Component exports:** Pages use default export: `export default function Settings() { ... }`
- **Icon imports:** From `lucide-react` — maintain this pattern
- **TypeScript:** Strict mode enabled, all props must have explicit interfaces
- **TailwindCSS:** All styling via utility classes, no CSS modules

### Integration Points
- **App.tsx** — Updates Settings import path after index.tsx created
- **useConfig** — All sections read config from this global hook
- **Navigation** — Settings is accessible from Launcher and main app navigation

</code_context>

<specifics>
## Specific Ideas

### From Design Document
- SettingsLayout exact structure: `<div className="flex h-full bg-[var(--paper)]"> <Sidebar /> <Content /> </div>`
- SettingsSidebar navigation: List of sections with icons, active section highlighted
- AccountSection: User info card, logout button (already exists in Settings.tsx around line 2250-2320)
- AboutSection: App version info, links (already exists in Settings.tsx around line 5400-5500)

### Target File Sizes (from design doc)
- Settings/index.tsx: ~200 lines (composition root)
- SettingsLayout.tsx: ~150 lines
- SettingsSidebar.tsx: ~200 lines
- AccountSection.tsx: ~100 lines
- AboutSection.tsx: ~200 lines

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-09*
