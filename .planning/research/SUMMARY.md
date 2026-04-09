# Settings Componentization Research Summary

**Project:** nova-agents Settings Page Refactoring
**Date:** 2026-04-09
**Status:** Complete

---

## Executive Summary

nova-agents Settings.tsx (5707 lines) is a monolithic React component that requires systematic refactoring into a modular, maintainable architecture. Research reveals that large-scale React componentization follows well-established patterns: **layout composition + section isolation + shared component layer + custom hooks encapsulation**. The recommended approach uses **React 19 + TypeScript 5.9** with **no new libraries**, leveraging existing project patterns (useConfig, dual context, stability rules).

**Key Finding:** The Settings page exhibits classic anti-patterns—monolithic component, deep prop drilling, mixed concerns—that are well-documented in the React community. Modern best practices emphasize **atomic components, clear state boundaries, and business logic encapsulation through custom hooks**. Differentiation comes from developer experience (type safety, consistent patterns, maintainable architecture) rather than novel features.

**Critical Risks:** The most dangerous pitfalls are **breaking useEffect dependencies during extraction** (causes infinite loops/silent failures), **over-extraction creating unnecessary complexity**, and **unstable callback references causing re-render cascades**. Prevention requires strict adherence to project's React Stability Rules and incremental migration with regression testing at each phase.

---

## Key Findings

### From STACK.md

**Core Technologies (no new libraries needed):**
- **React 19.2.0** - UI framework (already in use)
- **TypeScript 5.9.3** - Type safety (strict mode enabled)
- **Tauri v2.9.6** - Desktop framework (existing IPC integration)

**Component Composition Patterns:**
- **Compound Components** - For complex shared-state components (SettingsSidebar, dialogs)
- **Custom Hooks** - Extract reusable business logic (useProviderVerify, useMcpServers)
- **Presentational + Container Pattern** - Separate concerns (section containers manage state, presenters render UI)

**State Management Strategy:**
- **Local useState/useReducer** - Component-scoped state (default)
- **useConfig (existing)** - Global configuration (providers, apiKeys, mcpServers)
- **React Context** - Section-scoped shared state (avoid prop drilling 3+ levels)
- **Callback Props** - Parent-child communication (explicit data flow)

**Type Safety Patterns:**
- **Strict Props Interfaces** - All components must have explicit TypeScript types
- **Discriminated Unions** - For state with status variants (verifyStatus, subscriptionStatus)
- **Branded Types** - For critical IDs (providerId, mcpServerId) to prevent mix-ups
- **Generic Components** - Reusable list components (ProviderCard, McpServerCard)

**Anti-Patterns to Avoid:**
- Prop drilling through 3+ layers (use Context instead)
- Giant single Context for all Settings (causes re-renders)
- Adding Redux/Zustand (over-engineering for this scope)
- Using `any` for props (defeats TypeScript purpose)

### From FEATURES.md

**Table Stakes (minimum viable features):**
- **Atomic Components** - Breaking down large components into reusable pieces
- **Clear Props Interfaces** - TypeScript requires explicit type definitions
- **State Localization** - Keep state close to where it's used
- **Section-Based Navigation** - Sidebar navigation for multiple categories
- **Form Validation** - Required fields, format checks (API keys, URLs)
- **Persistence Layer** - Settings changes must persist to disk/API
- **Loading States** - Visual feedback for async operations
- **Error Handling** - Toast notifications, inline errors, retry mechanisms
- **Responsive Design** - Mobile: collapsible sidebar, stacked layout
- **Accessibility** - Keyboard navigable with ARIA labels

**Differentiators (nice-to-have features):**
- **Compound Component Pattern** - Flexible API with shared state
- **Custom Hooks Abstraction** - Encapsulate business logic, improve testability
- **Optimistic UI Updates** - Instant feedback, rollback on error
- **Schema-Driven Validation** - Declarative validation rules
- **Real-Time Validation** - Debounced validation as user types
- **Search/Filter** - Quickly find settings (valuable for 10+ sections)

**Anti-Features (explicitly NOT build):**
- Deep prop drilling (use Context instead)
- Monolithic components (keep files <500 lines)
- Mixing concerns (separate UI, logic, data fetching)
- Global state for local UI (use local useState for ephemeral state)
- String-based props (use TypeScript enums/union types)
- Uncontrolled components (use controlled inputs with explicit state)

**Component Patterns:**
1. **Card-Based Layout** - Settings organized into cards with title, description, controls
2. **Compound Components** - Parent/child sharing implicit state via Context
3. **Control/Controlled Pattern** - Split into stateless (controlled by parent) and stateful variants
4. **Render Props** - Component receives function as children for maximum flexibility

**State Management Hierarchy:**
```
Settings (useConfig) — Global state
  │
  ├─→ ProvidersSection — Section-level state
  │     ├─→ useState: showCustomForm
  │     ├─→ useState: editingProvider
  │     └─→ ProvidersSectionContext — Shared with children
  │
  └─→ McpSection — Section-level state
        ├─→ useState: mcpForm
        └─→ McpSectionContext — Shared with children
```

### From ARCHITECTURE.md

**Component Hierarchy:**
```
Settings (index.tsx - 200 lines)
    │
    ├─→ SettingsLayout (150 lines)
    │       ├─→ SettingsSidebar (200 lines)
    │       └─→ Content Area (dynamic)
    │               │
    │               ├─→ AccountSection (100 lines)
    │               ├─→ GeneralSection (300 lines)
    │               ├─→ ProvidersSection (600 lines)
    │               │       ├─→ ProviderCard × N (150 lines each)
    │               │       ├─→ ApiKeyInput (80 lines)
    │               │       ├─→ VerifyStatusIndicator (60 lines)
    │               │       └─→ CustomProviderDialog (300 lines)
    │               │
    │               ├─→ McpSection (800 lines)
    │               │       ├─→ McpServerCard × N (150 lines each)
    │               │       ├─→ CustomMcpDialog (250 lines)
    │               │       └─→ Config Panels (Playwright/EdgeTTS/GeminiImage)
    │               │
    │               └─→ [Other sections]
```

**Directory Structure:**
```
src/renderer/pages/Settings/
├── index.tsx                    # Main entry, composition root
├── SettingsLayout.tsx           # Layout container
├── SettingsSidebar.tsx          # Navigation sidebar
├── sections/                    # Settings sections
│   ├── AccountSection.tsx
│   ├── GeneralSection.tsx
│   ├── ProvidersSection.tsx
│   ├── McpSection.tsx
│   └── [other sections]
├── components/                  # Shared components
│   ├── ProviderCard.tsx
│   ├── McpServerCard.tsx
│   ├── ApiKeyInput.tsx
│   ├── VerifyStatusIndicator.tsx
│   └── [dialogs]
└── hooks/                       # Business logic hooks
    ├── useProviderVerify.ts
    ├── useMcpServers.ts
    └── useSubscription.ts
```

**Component Boundaries:**
- **Layout Layer** - SettingsLayout (container), SettingsSidebar (navigation)
- **Section Layer** - ProvidersSection, McpSection (business logic containers)
- **Shared Component Layer** - ProviderCard, McpServerCard, ApiKeyInput (reusable UI)
- **Dialog Layer** - CustomProviderDialog, CustomMcpDialog (complex forms)
- **Custom Hooks Layer** - useProviderVerify, useMcpServers, useSubscription (logic)

**Data Flow:**
```
User Interaction
    ↓
Component Event Handler
    ↓
Parent Callback (props.onSave, props.onToggle)
    ↓
Section Component Handler
    ↓
Custom Hook Action
    ↓
API Call (apiPost, invoke, configService)
    ↓
State Update (useState or useConfig)
    ↓
Re-render with New Props
```

**State Location Strategy:**
| State Type | Location | Rationale |
|------------|----------|-----------|
| `activeSection` | Settings (parent) | Shared across layout |
| `providers` | useConfig (global) | Global configuration, disk-first |
| `apiKeys` | useConfig (global) | Security-sensitive, global |
| `mcpServers` | McpSection (local) | Section-specific only |
| `customForm` | ProvidersSection (local) | Transient form state |
| `subscriptionStatus` | ProvidersSection (local) | Only needed in providers |
| `verifyStatus` | useProviderVerify (hook) | Encapsulated business logic |

### From PITFALLS.md

**Critical Pitfalls (High Impact, High Probability):**

1. **Over-Extraction into Tiny Components** - Splitting components arbitrarily into pieces too small, creating unnecessary complexity. Prevention: 3 questions rule (reused 2+ places? complex logic? easier to understand?), minimum 50-80 line threshold.

2. **Prop Drilling vs Context Misapplication** - Either drilling 4+ levels (tight coupling) OR using Context for simple 2-level passing (over-engineering). Prevention: Decision framework (2-3 levels = props, 4+ levels or 3+ consumers = Context), split Context by concern.

3. **Breaking useEffect Dependencies** - When extracting logic, dependency arrays become incomplete, causing infinite loops/stale closures. Prevention: Exhaustive deps rule, stabilize callbacks with useCallback, ref pattern for unstable deps, ESLint react-hooks/exhaustive-deps MUST be enabled.

4. **Silent Functionality Regressions** - Features silently break during refactoring (state split incorrectly, handlers disconnected). Prevention: Test-first refactoring, incremental migration, feature audit checklist, visual regression testing.

**Moderate Pitfalls (Medium Impact):**

5. **State Location Confusion** - Lifting state too early, causing unnecessary re-renders. Prevention: Keep state local as long as possible, only lift when 2+ components need it.

6. **Breaking TypeScript Type Definitions** - Props interfaces incorrect during refactoring, using `any` types. Prevention: Strict TypeScript mode, define Props interfaces first, export interfaces for shared components.

7. **Unstable Callback References** - Parent inline functions cause memoized children to re-render. Prevention: All callbacks use `useCallback`, ref synchronization pattern for complex callbacks, memo + custom comparator for expensive lists.

8. **Context Value Instability** - Context Providers create new object/function references every render, causing all consumers to re-render. Prevention: MUST use `useMemo` for Context values (project Stability Rule #1), stabilize all functions with `useCallback`.

**Minor Pitfalls (Low Impact):**

9. **Component Nesting Too Deep** - 6+ levels making data flow hard to trace. Prevention: Prefer composition over nesting, limit to 4-5 levels max, use compound components.
10. **Missing Component Boundaries for List Items** - Rendering lists without proper boundaries, causing entire list re-render. Prevention: Extract list items into components, use stable keys (unique IDs), memo list items.
11. **Forgetting Cleanup Functions** - useEffect without cleanup causing memory leaks. Prevention: All effects with side effects need cleanup, use isMountedRef pattern for async operations.
12. **Hook Rules Violations** - Calling hooks conditionally/inside loops, breaking hook order. Prevention: Only call hooks at top level, enable ESLint react-hooks plugin.

**Phase-Specific Warnings:**
- **Phase 1 (Layout):** Pitfall #9 (nesting too deep), Pitfall #2 (overusing Context for activeSection)
- **Phase 2 (Shared Components):** Pitfall #1 (over-extraction), Pitfall #3 (useEffect breaking), Pitfall #7 (unstable callbacks)
- **Phase 3 (ProvidersSection):** Pitfall #3 (useEffect breaking), Pitfall #4 (silent regressions), Pitfall #7 (re-render cascades)
- **Phase 4 (McpSection):** Pitfall #3 (useEffect breaking), Pitfall #4 (OAuth flow breaking), Pitfall #6 (complex config panel props)

---

## Implications for Roadmap

### Suggested Phase Structure

Based on combined research, the migration should follow this 7-phase sequence:

**Phase 1: Foundation (Low Risk)**
- **Rationale:** Build structure first, migrate static sections to establish layout
- **Delivers:** SettingsLayout, SettingsSidebar, AccountSection, AboutSection, index.tsx entry
- **Features:** Layout composition, section-based navigation
- **Pitfalls to Avoid:** Component nesting too deep, overusing Context for activeSection
- **Research Needed:** None (well-established patterns)

**Phase 2: Shared Components (Medium Risk)**
- **Rationale:** Extract reusable pieces before complex logic, ensures components are tested
- **Delivers:** ProviderCard, ApiKeyInput, VerifyStatusIndicator, McpServerCard
- **Features:** Atomic components, clear props interfaces, reusable UI
- **Pitfalls to Avoid:** Over-extraction, breaking useEffect dependencies, unstable callbacks
- **Research Needed:** None (standard React patterns)

**Phase 3: Business Logic Hooks (Medium Risk)**
- **Rationale:** Encapsulate complex state management before migrating complex sections
- **Delivers:** useProviderVerify, useMcpServers, useSubscription
- **Features:** Custom hooks abstraction, business logic encapsulation
- **Pitfalls to Avoid:** Breaking useEffect dependencies, unstable callback references
- **Research Needed:** Detailed API call sequences for verification/MCP operations

**Phase 4: Complex Sections (High Risk)**
- **Rationale:** Migrate most complex sections using extracted components + hooks
- **Delivers:** ProvidersSection, McpSection (using shared components + hooks)
- **Features:** Complete provider/MCP management, state localization, custom hooks
- **Pitfalls to Avoid:** Silent regressions, breaking useEffect chains, OAuth flow breaking
- **Research Needed:** Provider verification flow, MCP enable/disable logic, OAuth integration

**Phase 5: Simple Sections (Low Risk)**
- **Rationale:** Migrate remaining sections, compose existing extracted components
- **Delivers:** GeneralSection, SkillsAgentsSection, AgentSection, UsageStatsSection
- **Features:** Complete settings coverage, all sections modularized
- **Pitfalls to Avoid:** State location confusion, prop drilling
- **Research Needed:** None (leverages existing extracted components)

**Phase 6: Dialogs (Low Risk)**
- **Rationale:** Extract complex dialogs and panels (isolated components)
- **Delivers:** PlaywrightConfigPanel, EdgeTtsConfigPanel, GeminiImageConfigPanel, CustomMcpDialog, CustomProviderDialog
- **Features:** Compound components, complex form validation
- **Pitfalls to Avoid:** Breaking TypeScript type definitions, complex props interfaces
- **Research Needed:** Form validation patterns, config panel state management

**Phase 7: Cleanup (Low Risk)**
- **Rationale:** Remove old code, verify all functionality, performance audit
- **Delivers:** Delete old Settings.tsx, update imports, comprehensive testing
- **Features:** Complete migration, zero regression bugs
- **Pitfalls to Avoid:** Lingering cleanup functions, TypeScript `any` types
- **Research Needed:** Performance profiling baseline

### Research Flags

**Needs Deeper Research:**
- **Phase 3 (Business Logic Hooks):** Provider verification API call sequence, error handling patterns, retry strategies
- **Phase 4 (Complex Sections):** MCP enable/disable async operation management, OAuth integration architecture (if applicable)
- **Phase 6 (Dialogs):** Form validation patterns for custom provider/MCP forms, schema-driven validation approach

**Standard Patterns (Skip Research):**
- **Phase 1 (Foundation):** Layout composition, sidebar navigation - well-documented React patterns
- **Phase 2 (Shared Components):** Atomic components, props interfaces - standard React practice
- **Phase 5 (Simple Sections):** Section composition, existing component reuse - project already has examples
- **Phase 7 (Cleanup):** Code deletion, testing - standard development practices

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | React 19 + TypeScript 5.9 already in use, no new libraries needed |
| **Features** | HIGH | Table stakes well-documented in official React docs, differentiators based on established community patterns |
| **Architecture** | HIGH | Component hierarchy, data flow, state management backed by official React documentation and project's existing patterns |
| **Pitfalls** | HIGH | 12 pitfalls identified with specific detection methods and prevention strategies; 4 critical pitfalls have high-confidence sources |

**Overall Confidence: HIGH**

**Gaps to Address:**
1. **Provider Verification Flow** - Detailed API call sequence, error handling, retry strategies
2. **MCP Enable/Disable Logic** - Async operation management, error recovery
3. **OAuth Integration** - Third-party auth flow architecture (if applicable to providers)
4. **Form Validation** - Validation patterns for custom provider/MCP forms
5. **Performance Profiling** - Baseline metrics before refactoring (render times, re-render counts)

These gaps are **NOT blockers** for starting Phase 1-2 (Foundation + Shared Components), but should be addressed before Phase 3-4 (Business Logic Hooks + Complex Sections).

---

## Sources

### Stack Research
- [React Composition Patterns - LobeHub](https://lobehub.com/skills/tech-leads-club-agent-skills-react-composition-patterns)
- [Advanced React 19 Patterns - Rakesh Purohit](https://therakeshpurohit.medium.com/how-can-react-wizards-cast-spellbinding-patterns-%25EF%25B8%258F-9e4f9bd060f7)
- [Compound Components Pattern - FreeCodeCamp](https://www.freecodecamp.org/news/compound-components-pattern-in-react/)
- [React State Management 2025 - DeveloperWay](https://www.developerway.com/posts/react-state-management-2025)
- [React & TypeScript: 10 Patterns - LogRocket](https://blog.logrocket.com/react-typescript-10-patterns-writing-better-code/)

### Features Research
- [React Documentation - Thinking in React](https://react.dev/learn/thinking-in-react)
- [React Documentation - Lifting State Up](https://react.dev/learn/sharing-state-between-components)
- [TypeScript Handbook - React](https://www.typescriptlang.org/docs/handbook/react.html)
- [How I Structure Large Forms in React](https://medium.com/devmap/how-i-structure-large-forms-in-react-04ea2cd9a2e0)
- [Advanced Guide on React Component Composition](https://makersden.io/blog/guide-on-react-component-composition)

### Architecture Research
- [React Stack Patterns](https://www.patterns.dev/react/react-2026/)
- [React Architecture Patterns and Best Practices for 2026](https://www.bacancytechnology.com/blog/react-architecture-patterns-and-best-practices)
- [Frontend Design Patterns That Actually Work in 2026](https://www.netguru.com/blog/frontend-design-patterns)
- nova-agents Settings.tsx (5707 lines) - Current implementation analysis
- nova-agents specs/tech_docs/react_stability_rules.md - Project-specific patterns

### Pitfalls Research
- [Five Pitfalls of React Component Design](https://medium.com/geckoboard-under-the-hood/five-pitfalls-of-react-component-design-6d946cf4313a)
- [React.dev: Thinking in React](https://react.dev/learn/thinking-in-react)
- [React.dev: Rules of Hooks](https://react.dev/reference/rules)
- [Josh Comeau: Why React Re-Renders](https://www.joshwcomeau.com/react/why-react-re-renders/)
- [Alex Kondov: Common Sense Refactoring](https://alexkondov.com/refactoring-a-messy-react-component/)
- [LogRocket: How to refactor React components to use Hooks](https://blog.logrocket.com/refactor-react-components-hooks/)
- nova-agents specs/tech_docs/react_stability_rules.md - Project's 5 stability rules

### Project-Specific Sources
- nova-agents Settings.tsx - Source of truth for existing patterns
- nova-agents design_guide.md - Design system constraints
- nova-agents architecture.md - Project architecture and state management
- nova-agents CLAUDE.md - Core architectural constraints

---

**Research completed:** 2026-04-09
**Next step:** Proceed to requirements definition (gsd:requirements)
**Orchestrator:** Can proceed to roadmap creation based on SUMMARY.md
