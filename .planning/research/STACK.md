# Technology Stack

**Project:** nova-agents Settings Componentization
**Researched:** 2026-04-09
**Overall confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **React** | 19.2.0 | UI framework | Already in use; React 19 provides improved rendering performance and better TypeScript integration |
| **TypeScript** | 5.9.3 | Type safety | Strict mode already enabled; essential for large-scale refactoring to catch prop type errors during component extraction |
| **Tauri** | v2.9.6 | Desktop framework | Existing desktop framework; all new components must integrate with Tauri IPC commands |

### Component Composition Patterns

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| **Compound Components** | Complex components with shared state (e.g., dialogs, forms) | Use for SettingsSidebar, CustomProviderDialog, CustomMcpDialog where parent and children need to share state without prop drilling |
| **Custom Hooks** | Extract reusable logic | Use for useProviderVerify, useMcpServers, useSubscription to isolate business logic from UI |
| **Presentational + Container Pattern** | Separate concerns | Use for section components (ProvidersSection, McpSection) where container manages state and presentational renders UI |
| **Render Props** | Share code between components | Use sparingly; prefer custom hooks for most cases. Only use when you need to render dynamic content based on component-internal state |

### State Management

| Approach | Purpose | When to Use |
|----------|---------|-------------|
| **Local useState/useReducer** | Component-scoped state | Default for section-specific state (customForm, editingProvider, mcpForm) |
| **useConfig (existing)** | Global configuration state | Keep using for providers, apiKeys, mcpServers — already battle-tested |
| **React Context** | Section-scoped shared state | Use for ProvidersSectionContext, McpSectionContext to avoid prop drilling within sections |
| **Callback Props** | Parent-child communication | Use for onSaveApiKey, onVerifyProvider, onToggleMcpServer — explicit data flow |

### Type Safety Patterns

| Pattern | Implementation | Purpose |
|---------|----------------|---------|
| **Strict Props Interfaces** | `interface ComponentProps { ... }` | All component props must have explicit types; no implicit any |
| **Discriminated Unions** | `type State = { status: 'loading' } \| { status: 'success', data: T }` | Use for verifyStatus, subscriptionStatus to make impossible states impossible |
| **Branded Types** | `type ProviderId = string & { readonly __brand: unique symbol }` | Use for critical IDs (providerId, mcpServerId) to prevent mix-ups |
| **Generic Components** | `function Card<T>({ data }: CardProps<T>)` | Use for reusable list components (ProviderCard, McpServerCard) that work with different data types |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **No additional libraries needed** | — | — | **DO NOT add new libraries** — use existing stack only |
| — | — | — | All necessary patterns are available in React 19 + TypeScript 5.9 |

### Development Tools

| Tool | Purpose | Why |
|------|---------|-----|
| **ESLint** (existing) | Code quality | Already configured with @typescript-eslint — ensures type safety during refactoring |
| **Prettier** (existing) | Code formatting | Already configured — maintains consistent style across split files |
| **TypeScript Compiler** | Type checking | Run `npm run typecheck` before committing — catches prop type errors early |

## Alternatives Considered

### State Management Libraries

| Option | Recommended | Alternative | Why Not |
|--------|-------------|-------------|---------|
| **useConfig (existing)** | ✅ Yes | Redux/Zustand/Jotai | **Not needed** — Settings page doesn't have complex global state beyond existing config. Adding a library would be over-engineering. |
| — | ✅ Yes | Recoil/Atom | **Too complex** — Designed for async, cross-component state graphs. Settings state is mostly synchronous and section-scoped. |
| React Context (section-scoped) | ✅ Yes | Prop drilling | **Avoid prop drilling** — Use Context within sections (e.g., ProvidersSectionContext) but not globally. Keep contexts focused and small. |

### Component Libraries

| Option | Recommended | Alternative | Why Not |
|--------|-------------|-------------|---------|
| **Existing UI components** | ✅ Yes | Radix UI | **Don't add Radix UI** — Project already has custom UI components built with Tailwind. Adding Radix would introduce inconsistency. Use existing CustomSelect, dialog patterns. |
| **Existing design system** | ✅ Yes | Headless UI / Ariakit | **Follow design_guide.md** — Project has established Paper/Ink color system and component specs. Introduce new primitives only if absolutely necessary. |

### Refactoring Patterns

| Option | Recommended | Alternative | Why Not |
|--------|-------------|-------------|---------|
| **Extract "as-is" first** | ✅ Yes | Rewrite while extracting | **Safety first** — Don't improve logic during extraction. Move code to new components exactly as-is, verify it works, then refactor. |
| **Incremental migration** | ✅ Yes | Big bang rewrite | **Risk mitigation** — Phase 1-6 plan allows testing at each stage. Big bang rewrite increases regression risk. |
| **Preserve data flow** | ✅ Yes | Flatten state hierarchy | **Maintain behavior** — Keep existing prop drilling patterns initially, optimize with Context only after verifying functionality. |

## Anti-Patterns to Avoid

### ❌ What NOT to Do

| Anti-Pattern | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Prop drilling through 3+ layers** | Hard to maintain, brittle | Use React Context for section-scoped state (e.g., ProvidersSectionContext) |
| **Giant single Context for all Settings** | Causes unnecessary re-renders across sections | Create focused contexts per section (ProvidersSectionContext, McpSectionContext) |
| **Extracting logic + improving simultaneously** | Hard to debug if something breaks | Extract "as-is" first, verify, then improve in separate PR |
| **Adding Redux/Zustand for this scope** | Over-engineering, adds complexity | Existing useConfig + section-scoped Context is sufficient |
| **Using any for props** | Defeats purpose of TypeScript | Always define explicit prop interfaces; use Partial<T> or optional properties if needed |
| **Deeply nested component trees** | Hard to reason about, performance issues | Extract sub-components (e.g., ProviderCard from ProvidersSection) |
| **Coupling sections to each other** | Defeats purpose of modularization | Each section should be independent; communicate through parent callbacks only |
| **Ignoring existing design system** | Visual inconsistency | Follow specs/guides/design_guide.md for all styling |

## Installation

```bash
# No new packages required — use existing stack
npm run typecheck  # Verify types before refactoring
npm run lint       # Check code quality
```

## Component Extraction Best Practices

### 1. Extraction Sequence

1. **Create target file** (e.g., `sections/ProvidersSection.tsx`)
2. **Copy component "as-is"** — Don't change logic yet
3. **Define Props interface** — Explicit TypeScript types
4. **Replace old code with new component** — Drop-in replacement
5. **Verify functionality** — Test all features work
6. **Then improve** — Optimize in follow-up commit

### 2. Props Interface Design

```typescript
// ✅ Good — Explicit, minimal props
interface ProviderCardProps {
  provider: Provider;
  apiKey: string;
  verifyStatus: _VerifyStatus;
  onApiKeyChange: (key: string) => void;
  onVerify: () => void;
}

// ❌ Bad — Too much internal state exposed
interface ProviderCardProps {
  provider: Provider;
  apiKey: string;
  verifyStatus: _VerifyStatus;
  showVerifyButton: boolean;  // Internal concern
  isVerifying: boolean;        // Can be derived from verifyStatus
  verifyError: string | null;  // Part of verifyStatus
  // ...10 more props
}
```

### 3. State Management Hierarchy

```
Settings (useConfig) — Global state
  │
  ├─→ ProvidersSection — Section-level state
  │     ├─→ useState: showCustomForm
  │     ├─→ useState: editingProvider
  │     └─→ ProvidersSectionContext — Shared with children
  │           └─→ ProviderCard × N
  │
  └─→ McpSection — Section-level state
        ├─→ useState: mcpForm
        └─→ McpSectionContext — Shared with children
              └─→ McpServerCard × N
```

### 4. Type Safety Patterns

```typescript
// Discriminated union for state
type VerifyStatus =
  | { status: 'idle' }
  | { status: 'verifying' }
  | { status: 'success' }
  | { status: 'error'; error: string };

// Branded type for IDs
type ProviderId = string & { readonly __brand: unique symbol };
function createProviderId(id: string): ProviderId {
  return id as ProviderId;
}

// Generic list component
interface CardListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyMessage?: string;
}
```

## Migration Checklist

For each extracted component:

- [ ] Props interface defined with TypeScript
- [ ] All state migrated or lifted to parent
- [ ] Event handlers passed as callbacks
- [ ] Functionality verified (no regressions)
- [ ] File <500 lines (if not, split further)
- [ ] ESLint passing
- [ ] TypeScript compiling with no errors
- [ ] Follows design_guide.md styling
- [ ] Uses existing patterns (no new libraries)

## Sources

### Component Composition Patterns
- [React Composition Patterns - LobeHub](https://lobehub.com/skills/tech-leads-club-agent-skills-react-composition-patterns) - Practical guide for React composition patterns that scale (HIGH confidence)
- [Advanced React 19 Patterns - Rakesh Purohit](https://therakeshpurohit.medium.com/how-can-react-wizards-cast-spellbinding-patterns-%25EF%25B8%258F-9e4f9bd060f7) - Covers compound components, HOCs, custom hooks for React 19 (MEDIUM confidence)
- [Compound Components Pattern - FreeCodeCamp](https://www.freecodecamp.org/news/compound-components-pattern-in-react/) - Includes React 19 code examples (HIGH confidence)

### State Management
- [React State Management 2025 - DeveloperWay](https://www.developerway.com/posts/react-state-management-2025) - When you actually need state management solutions (HIGH confidence)
- [ReactJS State Management 2025 - MakersDen](https://makersden.io/blog/reactjs-state-management-in-2025-best-options-for-scaling-apps) - Latest strategies for scaling apps (MEDIUM confidence)
- [Mastering React State Management at Scale - Dev.to](https://dev.to/ash_dubai/mastering-react-state-management-at-scale-in-2025-52e8) - Managing state in big React apps (MEDIUM confidence)
- [How to Eliminate Prop Drilling - Medium](https://medium.com/@tejasvinavale1599/how-to-eliminate-prop-drilling-completely-the-2025-state-architecture-guide-for-react-developers-54460d9f3683) - 2025 state architecture guide (MEDIUM confidence)

### TypeScript Patterns
- [React & TypeScript: 10 Patterns - LogRocket](https://blog.logrocket.com/react-typescript-10-patterns-writing-better-code/) - Production-ready patterns (HIGH confidence)
- [TypeScript Patterns for React - Medium](https://medium.com/@ignatovich.dm/typescript-patterns-you-should-know-for-react-development-d43129494027) - React-specific TypeScript patterns (MEDIUM confidence)
- [8 Advanced React + TypeScript Patterns - JavaScript Plain English](https://javascript.plainenglish.io/8-advanced-react-typescript-patterns-every-developer-should-master-d31244a370d6) - Advanced type safety patterns (MEDIUM confidence)

### Refactoring Best Practices
- [Reactjs JSX Anti-Patterns 2025 - Medium](https://medium.com/@sureshdotariya/reactjs-jsx-anti-patterns-you-must-avoid-in-2025-f58e44d08abf) - Component extraction fixes (MEDIUM confidence)
- [How I Refactor Messy React Codebase - Medium](https://medium.com/@vvsu-2515/how-i-refactor-a-messy-react-codebase-without-breaking-everything-9053b92c5e2e) - Safe refactoring approach (MEDIUM confidence)
- [5 React Component Patterns for Reusability - Medium](https://medium.com/@ra46shekhar/5-react-component-patterns-that-make-your-code-reusable-2747b60f0a9d) - Patterns for reusable components (LOW confidence)

### UI Libraries (References)
- [Radix UI Primitives](https://www.radix-ui.com/primitives) - Headless component composition model (HIGH confidence)
- [Radix UI Composition Guide](https://www.radix-ui.com/primitives/docs/guides/composition) - Official composition patterns (HIGH confidence)
- [Radix UI vs Headless UI vs Ariakit - JavaScript Plain English](https://javascript.plainenglish.io/radix-ui-vs-headless-ui-vs-ariakit-the-headless-component-war-aebead855a94) - Library comparison (MEDIUM confidence)

### Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Core Framework (React 19 + TypeScript 5.9)** | HIGH | Already in use, verified in package.json |
| **Component Composition Patterns** | HIGH | Multiple reputable sources confirm patterns (LobeHub, FreeCodeCamp) |
| **State Management Approach** | HIGH | DeveloperWay and other sources confirm useConfig + Context is appropriate for this scope |
| **Type Safety Patterns** | HIGH | LogRocket and Medium sources provide production-ready patterns |
| **Refactoring Best Practices** | MEDIUM | Based on Medium articles; lack official React documentation verification |
| **Anti-Patterns** | MEDIUM | Inferred from best practices articles; some subjective judgment |

### Notes on Confidence Levels

- **HIGH confidence**: Recommendations are backed by official documentation, multiple reputable sources, or are already verified in the project
- **MEDIUM confidence**: Recommendations are supported by community articles and blog posts, but lack official documentation verification
- **LOW confidence**: Recommendations based on limited sources or require additional validation for project-specific context

**Overall assessment**: The recommended stack is appropriate for the Settings componentization project. No new libraries are needed. React 19 + TypeScript 5.9 provide all necessary patterns for safe, incremental refactoring.
