# Architecture Patterns: Settings Page Componentization

**Project:** nova-agents Settings Page Refactoring
**Researched:** 2026-04-09
**Overall confidence:** HIGH

## Executive Summary

Large React settings pages follow a consistent architectural pattern of **layout composition + section isolation + shared component layer + custom hooks encapsulation**. The nova-agents Settings.tsx (5707 lines) requires refactoring into this modular pattern to improve maintainability from <2000 lines to <500 lines per file with clear component boundaries.

**Key architectural principles identified:**
1. **Layout-Content Separation** - Sidebar navigation and content area are distinct layout components
2. **Section Independence** - Each settings section (Account, Providers, MCP, etc.) is an isolated module
3. **Shared Component Reusability** - Cards, inputs, dialogs form a reusable component library
4. **Business Logic Encapsulation** - Custom hooks encapsulate complex state management
5. **Props-Down, Callbacks-Up** - Unidirectional data flow with explicit boundaries

## Research Findings

### Industry Patterns (2026)

Based on web research of current React architecture patterns:

1. **Context API for State Management** - Avoid prop drilling in large settings pages
2. **Component Composition Patterns** - Build complex UIs from simple, focused components
3. **Signals for Reactive State** - Emerging pattern for fine-grained reactivity (2026 trend)
4. **Server Components** - Where applicable, move data fetching to server layer

**Sources:**
- [React Stack Patterns](https://www.patterns.dev/react/react-2026/)
- [React Architecture Patterns and Best Practices for 2026](https://www.bacancytechnology.com/blog/react-architecture-patterns-and-best-practices)
- [Frontend Design Patterns That Actually Work in 2026](https://www.netguru.com/blog/frontend-design-patterns)

### nova-agents Specific Context

**Current State Analysis:**
- **File Size:** 5707 lines (extremely large)
- **State Management:** 77 hooks (useState, useEffect, useCallback)
- **Settings Sections:** 9 sections (general, providers, mcp, skills, sub-agents, agent, usage-stats, about, account)
- **Existing Extracted Components:** 5 (GlobalSkillsPanel, GlobalAgentsPanel, UsageStatsPanel, BotPlatformRegistry, WorkspaceConfigPanel)

**Existing Architecture Patterns in Project:**
- **AgentSettingsPanel** - Demonstrates section-based organization with separate section files
- **WorkspaceConfigPanel** - Shows tab-based layout pattern
- **Dual Context Pattern** - `ConfigDataContext` + `ConfigActionsContext` separation
- **useConfig Hook** - Centralized configuration management

**Project Architecture Constraints:**
- **Session-Centric Sidecar Model** - Settings uses Global Sidecar, not Tab-scoped
- **Tauri v2 Desktop Framework** - IPC communication via `invoke()`
- **Design System** - Paper/Ink color system with CSS variables
- **TypeScript Strict Mode** - No `any` types allowed

## Recommended Architecture

### Component Hierarchy

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
    │               │       ├─→ PlaywrightConfigPanel (200 lines)
    │               │       ├─→ EdgeTtsConfigPanel (180 lines)
    │               │       └─→ GeminiImageConfigPanel (180 lines)
    │               │
    │               ├─→ SkillsAgentsSection (400 lines)
    │               │       ├─→ GlobalSkillsPanel (existing)
    │               │       └─→ GlobalAgentsPanel (existing)
    │               │
    │               ├─→ AgentSection (500 lines)
    │               │       └─→ BotPlatformRegistry (existing)
    │               │
    │               ├─→ UsageStatsSection (300 lines)
    │               │       └─→ UsageStatsPanel (existing)
    │               │
    │               └─→ AboutSection (200 lines)
```

### Directory Structure

```
src/renderer/pages/Settings/
├── index.tsx                    # Main entry, composition root
├── SettingsLayout.tsx           # Layout container
├── SettingsSidebar.tsx          # Navigation sidebar
├── sections/                    # Settings sections
│   ├── AccountSection.tsx       # Account settings
│   ├── GeneralSection.tsx       # General settings
│   ├── ProvidersSection.tsx     # Provider management
│   ├── McpSection.tsx           # MCP tools management
│   ├── SkillsAgentsSection.tsx  # Skills + Agents
│   ├── AgentSection.tsx         # IM Bot settings
│   ├── UsageStatsSection.tsx    # Usage statistics
│   └── AboutSection.tsx         # About page
├── components/                  # Shared components
│   ├── ProviderCard.tsx         # Provider card
│   ├── McpServerCard.tsx        # MCP server card
│   ├── ApiKeyInput.tsx          # API key input
│   ├── VerifyStatusIndicator.tsx # Verification status
│   ├── CustomProviderDialog.tsx # Custom provider dialog
│   ├── CustomMcpDialog.tsx      # Custom MCP dialog
│   ├── PlaywrightConfigPanel.tsx # Playwright config
│   ├── EdgeTtsConfigPanel.tsx   # Edge TTS config
│   └── GeminiImageConfigPanel.tsx # Gemini Image config
└── hooks/                       # Business logic hooks
    ├── useProviderVerify.ts     # Provider verification
    ├── useMcpServers.ts         # MCP server management
    └── useSubscription.ts       # Subscription status
```

## Component Boundaries

### 1. Layout Layer

**SettingsLayout** (`SettingsLayout.tsx`)
- **Responsibility:** Container for sidebar + content area
- **Props:** `activeSection`, `onSectionChange`, `children`, `config`, `showDevTools`
- **State:** None (controlled component)
- **Communicates With:** SettingsSidebar, Content Area

**SettingsSidebar** (`SettingsSidebar.tsx`)
- **Responsibility:** Navigation menu, section list
- **Props:** `activeSection`, `onSectionChange`, `config`, `showDevTools`
- **State:** None (controlled component)
- **Communicates With:** SettingsLayout

### 2. Section Layer

**ProvidersSection** (`ProvidersSection.tsx`)
- **Responsibility:** Provider management (list, add, edit, delete, verify)
- **Props:** Providers, API keys, verification status, callbacks
- **Internal State:** Custom form, editing states, subscription status
- **Communicates With:** ProviderCard, CustomProviderDialog, useConfig

**McpSection** (`McpSection.tsx`)
- **Responsibility:** MCP server management (enable, configure, custom servers)
- **Props:** MCP servers, enabled IDs, toggle/add/update/delete callbacks
- **Internal State:** Editing MCP, config panels (EdgeTTS, Playwright, GeminiImage)
- **Communicates With:** McpServerCard, CustomMcpDialog, config panels

### 3. Shared Component Layer

**ProviderCard** (`ProviderCard.tsx`)
- **Responsibility:** Display single provider with API key input and verification
- **Props:** Provider, API key, verification status, event handlers
- **State:** None (controlled component)
- **Reusability:** Used in ProvidersSection list

**McpServerCard** (`McpServerCard.tsx`)
- **Responsibility:** Display single MCP server with enable toggle
- **Props:** Server, enabled state, enabling state, error, event handlers
- **State:** None (controlled component)
- **Reusability:** Used in McpSection list

**ApiKeyInput** (`ApiKeyInput.tsx`)
- **Responsibility:** Secure API key input with visibility toggle
- **Props:** Value, onChange, placeholder, disabled
- **State:** Internal visibility toggle
- **Reusability:** Used in ProviderCard, CustomProviderDialog

**VerifyStatusIndicator** (`VerifyStatusIndicator.tsx`)
- **Responsibility:** Display verification status (idle, loading, valid, invalid)
- **Props:** Status, error message, retry callback
- **State:** None (controlled component)
- **Reusability:** Used in ProviderCard, CustomProviderDialog

### 4. Dialog Layer

**CustomProviderDialog** (`CustomProviderDialog.tsx`)
- **Responsibility:** Add/edit custom provider
- **Props:** Open state, provider to edit, save callback, close callback
- **Internal State:** Form data (name, baseUrl, models, etc.)
- **Communicates With:** ApiKeyInput, VerifyStatusIndicator

**CustomMcpDialog** (`CustomMcpDialog.tsx`)
- **Responsibility:** Add/edit custom MCP server
- **Props:** Open state, server to edit, save callback, close callback
- **Internal State:** Form data (command, args, env)
- **Communicates With:** PlaywrightConfigPanel, EdgeTtsConfigPanel, GeminiImageConfigPanel

### 5. Custom Hooks Layer

**useProviderVerify** (`hooks/useProviderVerify.ts`)
- **Responsibility:** Provider verification logic (API call, status tracking)
- **Returns:** Verification status map, error map, isVerifying(), verifyProvider(), clearError()
- **Internal State:** Verification status, errors, loading states
- **Used By:** ProvidersSection

**useMcpServers** (`hooks/useMcpServers.ts`)
- **Responsibility:** MCP server management (list, enable/disable)
- **Returns:** Servers list, enabled IDs, refreshServers(), toggleServer()
- **Internal State:** Servers, enabled IDs, enabling states, errors
- **Used By:** McpSection

**useSubscription** (`hooks/useSubscription.ts`)
- **Responsibility:** Subscription status checking and display
- **Returns:** Subscription status, isChecking, refreshStatus()
- **Internal State:** Subscription status, checking state
- **Used By:** ProvidersSection

## Data Flow

### Unidirectional Data Flow

```
User Interaction
    │
    ▼
Component Event Handler (onClick, onChange, etc.)
    │
    ▼
Parent Callback (props.onSave, props.onToggle, etc.)
    │
    ▼
Section Component Handler
    │
    ▼
Custom Hook Action (useProviderVerify.verifyProvider)
    │
    ▼
API Call (apiPost, invoke, or configService)
    │
    ▼
State Update (useState or useConfig updateConfig)
    │
    ▼
Re-render with New Props
    │
    ▼
Child Components Receive New Props
```

### Configuration Data Flow

```
useConfig Hook (Global State)
    │
    ├─→ Settings (index.tsx)
    │       │
    │       ├─→ ProvidersSection
    │       │       ├─→ ProviderCard × N
    │       │       └─→ CustomProviderDialog
    │       │
    │       └─→ McpSection
    │               ├─→ McpServerCard × N
    │               └─→ CustomMcpDialog
    │
    └─→ Direct API Calls (apiFetch, apiPost)
            └─→ Rust Backend
                    └─→ Bun Sidecar
```

### Local vs Global State

| State Type | Location | Rationale |
|------------|----------|-----------|
| `activeSection` | Settings (parent) | Shared across layout, controls which section renders |
| `providers` | useConfig (global) | Global configuration, disk-first persistence |
| `apiKeys` | useConfig (global) | Global configuration, security-sensitive |
| `mcpServers` | McpSection (local) | Section-specific, not needed elsewhere |
| `customForm` | ProvidersSection (local) | Transient form state, only needed during editing |
| `subscriptionStatus` | ProvidersSection (local) | Only needed in providers section |
| `verifyStatus` | useProviderVerify (hook) | Encapsulated business logic |

## Build Order Dependencies

### Phase 1: Foundation (Low Risk)
1. **Create directory structure** - `Settings/`, `sections/`, `components/`, `hooks/`
2. **Extract layout components** - `SettingsLayout`, `SettingsSidebar`
3. **Migrate simple sections** - `AccountSection`, `AboutSection`
4. **Create main entry** - `index.tsx` composition root

**Dependencies:** None
**Risk:** Low (static sections, no complex state)

### Phase 2: Shared Components (Medium Risk)
1. **Extract `ProviderCard`** - From current providers rendering
2. **Extract `ApiKeyInput`** - From provider card
3. **Extract `VerifyStatusIndicator`** - From verification UI
4. **Extract `McpServerCard`** - From MCP servers list

**Dependencies:** Phase 1 (layout structure must exist)
**Risk:** Medium (requires careful state management extraction)

### Phase 3: Business Logic Hooks (Medium Risk)
1. **Create `useProviderVerify`** - Extract verification logic
2. **Create `useMcpServers`** - Extract MCP management
3. **Create `useSubscription`** - Extract subscription checking

**Dependencies:** Phase 2 (shared components must exist)
**Risk:** Medium (complex state management, API calls)

### Phase 4: Complex Sections (High Risk)
1. **Migrate `ProvidersSection`** - Use shared components + hooks
2. **Extract `CustomProviderDialog`** - Complex form with validation
3. **Migrate `McpSection`** - Use shared components + hooks

**Dependencies:** Phase 2 + Phase 3 (shared components and hooks required)
**Risk:** High (most complex sections, heavy state management)

### Phase 5: Remaining Sections (Low Risk)
1. **Migrate `GeneralSection`** - Simple toggles and settings
2. **Migrate `SkillsAgentsSection`** - Compose existing panels
3. **Migrate `AgentSection`** - Compose existing panels
4. **Migrate `UsageStatsSection`** - Compose existing panel

**Dependencies:** Phase 1 (layout structure)
**Risk:** Low (most logic already extracted to existing components)

### Phase 6: Dialogs and Panels (Low Risk)
1. **Extract `PlaywrightConfigPanel`** - From MCP dialog
2. **Extract `EdgeTtsConfigPanel`** - From MCP dialog
3. **Extract `GeminiImageConfigPanel`** - From MCP dialog
4. **Extract `CustomMcpDialog`** - Compose config panels

**Dependencies:** Phase 4 (McpSection must exist)
**Risk:** Low (isolated components)

### Phase 7: Cleanup (Low Risk)
1. **Delete old `Settings.tsx`** - After all sections migrated
2. **Update imports** - Fix all import paths
3. **Run tests** - Full regression testing
4. **Performance audit** - Check for unnecessary re-renders

**Dependencies:** All previous phases
**Risk:** Low (cleanup phase)

## Architecture Patterns

### 1. Compound Component Pattern

**Used By:** SettingsLayout, CustomProviderDialog

```typescript
<SettingsLayout activeSection="providers" onSectionChange={handleSectionChange}>
  <ProvidersSection {...providerProps} />
</SettingsLayout>
```

**Benefits:**
- Flexible composition
- Clear parent-child relationships
- Shared state context

### 2. Container/Presenter Pattern

**Used By:** All section components

```typescript
// Container component (business logic)
function ProvidersSection({ providers, onSaveApiKey, ... }) {
  const [editingProvider, setEditingProvider] = useState(null);
  const { verifyStatus, verifyProvider } = useProviderVerify();

  // Render presenter components
  return (
    <>
      {providers.map(provider => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          onVerify={() => verifyProvider(provider, apiKey)}
          // ... props down
        />
      ))}
    </>
  );
}
```

**Benefits:**
- Separation of concerns (logic vs presentation)
- Easier testing
- Reusable presenters

### 3. Custom Hooks Pattern

**Used By:** useProviderVerify, useMcpServers, useSubscription

```typescript
function ProvidersSection() {
  const { verifyStatus, verifyProvider, isVerifying } = useProviderVerify();
  const { mcpServers, toggleServer } = useMcpServers();
  const { subscriptionStatus, refreshStatus } = useSubscription();

  // Render UI using hook returns
}
```

**Benefits:**
- Business logic encapsulation
- Reusable across components
- Easier testing (logic separated from UI)

### 4. Props Drilling vs Context

**Decision:** Use props drilling for section-specific data, use Context for global configuration.

```typescript
// ✅ GOOD: Props drilling for section-specific data
<ProvidersSection
  providers={providers}
  apiKeys={apiKeys}
  onSaveApiKey={handleSaveApiKey}
/>

// ✅ GOOD: Context for global configuration
const { config, updateConfig } = useConfig();
```

**Rationale:**
- Settings page is not deeply nested (max 3 levels)
- Props drilling makes data flow explicit
- Context is used only for global app configuration (useConfig)
- Avoids over-engineering with multiple Contexts

## Performance Considerations

### Re-render Optimization

**Problem:** Settings page has 30+ pieces of state, changes could trigger cascading re-renders.

**Solutions:**
1. **React.memo** - Wrap shared components (ProviderCard, McpServerCard)
2. **useMemo** - Memoize expensive computations (provider lists, filtered servers)
3. **useCallback** - Stable callbacks for event handlers
4. **Component splitting** - Smaller components re-render independently

**Example:**
```typescript
const ProviderCard = React.memo(function ProviderCard({ provider, apiKey, onVerify, ... }) {
  // Component only re-renders when props change
});
```

### Lazy Loading

**Problem:** All sections loaded upfront, increasing initial bundle size.

**Solution:**
```typescript
const McpSection = lazy(() => import('./sections/McpSection'));
const ProvidersSection = lazy(() => import('./sections/ProvidersSection'));

// In render:
<Suspense fallback={<LoadingSpinner />}>
  {activeSection === 'mcp' && <McpSection {...props} />}
</Suspense>
```

**Benefits:**
- Smaller initial bundle
- Faster initial load
- On-demand loading of complex sections

## Error Boundaries

**Strategy:** Wrap each section in error boundary to isolate failures.

```typescript
class SectionErrorBoundary extends React.Component {
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-message">
          <p>此设置区块加载失败</p>
          <button onClick={this.handleRetry}>重试</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage:
<SectionErrorBoundary>
  <ProvidersSection {...props} />
</SectionErrorBoundary>
```

**Benefits:**
- One section failure doesn't crash entire settings page
- Better user experience
- Easier debugging

## Testing Strategy

### Unit Tests
- **Shared Components:** ProviderCard, ApiKeyInput, VerifyStatusIndicator
- **Hooks:** useProviderVerify, useMcpServers, useSubscription
- **Utilities:** parsePositiveInt, getPlaywrightDefaultArgs

### Integration Tests
- **ProvidersSection:** Add/edit/delete provider flow
- **McpSection:** Enable/configure MCP server flow
- **CustomProviderDialog:** Form validation and submission

### Visual Regression Tests
- Ensure refactored UI matches original design exactly
- Test all states (idle, loading, success, error)

## Migration Risks

### Risk 1: State Management Complexity
**Problem:** 77 hooks in current file, difficult to extract without breaking interactions.

**Mitigation:**
- Migrate incrementally by section
- Keep existing hook dependencies during migration
- Test each section thoroughly before proceeding

### Risk 2: Prop Drilling
**Problem:** Deep component trees may require excessive prop passing.

**Mitigation:**
- Use compound component pattern to reduce depth
- Extract sub-components to flatten hierarchy
- Consider section-specific Context only if drilling exceeds 3 levels

### Risk 3: Functionality Regression
**Problem:** Complex interactions (OAuth, verification, file dialogs) may break.

**Mitigation:**
- Comprehensive test checklist before migration
- Side-by-side comparison during development
- Keep old Settings.tsx until all sections verified

## Roadmap Implications

Based on this architecture research, the suggested phase structure is:

1. **Phase 1: Foundation** (ARCH-01, ARCH-02, ARCH-03)
   - Create layout structure, migrate static sections
   - Addresses: Layout composition, section isolation
   - Avoids: Complex state management, API interactions

2. **Phase 2: Shared Components** (SHARE-01 through SHARE-04)
   - Extract reusable components (ProviderCard, ApiKeyInput, etc.)
   - Addresses: Component reusability, props interface design
   - Avoids: Business logic complexity

3. **Phase 3: Business Logic Hooks** (HOOK-01, HOOK-02, HOOK-03)
   - Encapsulate complex state management
   - Addresses: State organization, testability
   - Avoids: UI changes

4. **Phase 4: Complex Sections** (SECTION-03, SECTION-04)
   - Migrate providers and MCP sections using shared components + hooks
   - Addresses: Most complex functionality
   - Avoids: Simple sections (already migrated)

5. **Phase 5: Simple Sections** (SECTION-01, SECTION-02, SECTION-05)
   - Migrate remaining sections
   - Addresses: Completeness
   - Avoids: Complex logic (already handled)

6. **Phase 6: Dialogs** (DIALOG-01 through DIALOG-05)
   - Extract complex dialogs and panels
   - Addresses: Modal complexity
   - Avoids: Core settings logic

**Phase ordering rationale:**
- Build foundational structure first (layout)
- Extract reusable pieces next (shared components)
- Encapsulate business logic (hooks)
- Migrate complex sections using extracted pieces
- Finish with simple sections and dialogs
- Each phase builds on previous, minimizing risk

**Research flags for phases:**
- Phase 4 (Complex Sections): Likely needs deeper research on provider verification flow, MCP enable/disable logic
- Phase 6 (Dialogs): May need additional research on form validation patterns, OAuth integration

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Component boundaries | HIGH | Clear separation of concerns identified |
| Data flow direction | HIGH | Standard React unidirectional flow |
| Build order | HIGH | Logical dependencies mapped |
| Shared component design | HIGH | Similar patterns exist in AgentSettings |
| Hook encapsulation | MEDIUM | Complex state logic may need refinement |
| Performance optimization | MEDIUM | Requires profiling to validate |
| Error handling | MEDIUM | Error boundary strategy needs testing |

## Gaps to Address

1. **Provider Verification Flow** - Detailed API call sequence and error handling
2. **MCP Enable/Disable Logic** - Async operation management and error recovery
3. **OAuth Integration** - Third-party auth flow architecture (if applicable)
4. **Form Validation** - Validation patterns for custom provider/MCP forms
5. **Performance Profiling** - Identify actual re-render bottlenecks
6. **Error Recovery** - User-facing error messages and retry strategies

## Sources

### Web Research (2026)
- [React Stack Patterns](https://www.patterns.dev/react/react-2026/)
- [React Architecture Patterns and Best Practices for 2026](https://www.bacancytechnology.com/blog/react-architecture-patterns-and-best-practices)
- [React Design Patterns That Cannot Be Missed in 2026](https://radixweb.com/blog/react-design-patterns)
- [Frontend Design Patterns That Actually Work in 2026](https://www.netguru.com/blog/frontend-design-patterns)
- [React in 2026: From UI Library to Full-Stack Architecture](https://medium.com/@basakbilginoglu/react-in-2026-from-ui-library-to-full-stack-architecture-0bda700d765b)

### Project Documentation
- `.planning/PROJECT.md` - Project context and requirements
- `docs/settings-componentization.md` - Detailed design document
- `specs/tech_docs/architecture.md` - Project architecture constraints
- `specs/guides/design_guide.md` - Design system specifications

### Code Analysis
- `src/renderer/pages/Settings.tsx` (5707 lines) - Current implementation
- `src/renderer/components/AgentSettings/` - Existing component patterns
- `src/renderer/context/` - Existing context patterns
- `src/renderer/hooks/` - Existing hook patterns
