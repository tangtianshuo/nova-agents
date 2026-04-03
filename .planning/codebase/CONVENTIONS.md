# Coding Conventions

**Analysis Date:** 2026-04-02

## Naming Patterns

### Files

- **TypeScript/React**: kebab-case
  - Components: `WorkspaceConfigPanel.tsx`, `AgentSettingsPanel.tsx`
  - Hooks: `useConfig.ts`, `useAgentState.ts`
  - Utils: `parsePartialJson.ts`, `formatTokens.ts`
  - Types: `chat.ts`, `cronTask.ts`

- **Rust**: snake_case
  - `sidecar.rs`, `cron_task.rs`, `proxy_config.rs`
  - `app_dirs.rs`, `local_http.rs`

### Functions and Variables

- **TypeScript**: camelCase
  - `useConfigData()`, `patchProject()`, `apiPost()`
  - `sessionId`, `workspacePath`, `isLoading`

- **React Components**: PascalCase
  - `ToastProvider`, `AgentCardList`, `WorkspaceSelector`

- **React Hooks**: camelCase with `use` prefix
  - `useConfig()`, `useToast()`, `useAgentState()`

- **Rust Functions**: snake_case
  - `find_available_port()`, `cmd_get_session_port()`, `apply_to_subprocess()`

- **Constants**: SCREAMING_SNAKE_CASE in TypeScript when module-level
  - `DEFAULT_TOAST_DURATION`, `MAX_HISTORY`

### Types and Interfaces

- **TypeScript**: PascalCase with descriptive suffixes
  - `AppConfig`, `ProviderConfig`, `TabContextValue`
  - `UseConfigResult`, `TestQueryOptions`

- **Rust Structs/Enums**: PascalCase
  - `SessionSidecar`, `SidecarOwner`, `CronTaskManager`

## Code Style

### Formatting

**Tool:** Prettier with the following config:
- `@ianvs/prettier-plugin-sort-imports` for import sorting
- `prettier-plugin-tailwindcss` for Tailwind class sorting
- `eslint-config-prettier` to disable ESLint formatting rules

**Key settings:**
- Print width: 100 (default)
- Single quotes: enabled
- Trailing commas: all

**Run formatting:**
```bash
npm run format          # Format all files
npm run format:check    # Check without modifying
```

### Linting

**Tool:** ESLint 9.x with TypeScript and React support

**Config file:** `eslint.config.js`

**Key rules enforced:**
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/no-unused-vars`: error (with `_` ignore pattern)
- `react/prop-types`: off (TypeScript handles this)
- `react-hooks/rules-of-hooks`: enabled
- `react-hooks/exhaustive-deps`: enabled

**Run linting:**
```bash
npm run lint  # With cache, max-warnings=0
```

**Pre-commit checks (required):**
```bash
npm run typecheck && npm run lint
```

### TypeScript

- Strict mode enabled via `typescript-eslint`
- No `any` type allowed (error level)
- Unused variables must be prefixed with `_` or listed in ignore patterns
- Generic type parameters used for JSON parsing: `parsePartialJson<T>()`

### React Patterns

**Component structure:**
1. Type definitions at top
2. Component function
3. Helper functions (if not exported)
4. Styled/inner components below

**Example from `Toast.tsx`:**
```typescript
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    // ... implementation
}
```

**Context usage:**
- Dual Context pattern for separation of data and actions
- `useConfigData()` and `useConfigActions()` as separate consumers
- Legacy `useConfig()` as compatibility wrapper

**Hooks rules:**
- Custom hooks must start with `use`
- Dependencies in `useEffect`/`useCallback`/`useMemo` must be exhaustive
- Memoization with `useMemo` for context values to prevent consumer re-renders

## Import Organization

**Order (via prettier-plugin-sort-imports):**
1. React/core imports
2. Third-party libraries
3. Internal modules (using `@/` path alias)
4. Relative imports

**Path aliases:**
- `@/` maps to `src/renderer/`
- `@anthropic-ai/claude-agent-sdk` for SDK imports

**Example:**
```typescript
import { useCallback, useState } from 'react';
import { useConfigData } from '@/config/useConfigData';
import { useConfigActions } from '@/config/useConfigActions';
import type { AppConfig, Project } from '@/config/types';
```

## Error Handling

### TypeScript/JavaScript

**Pattern:** Try-catch with typed errors

```typescript
try {
    const result = await someAsyncOperation();
    return result;
} catch (error) {
    if (error instanceof CustomError) {
        throw error;
    }
    throw new Error(`Failed to do something: ${error instanceof Error ? error.message : String(error)}`);
}
```

**Error types in React:**
- `ErrorBoundary` component at app root (`AppErrorBoundary.tsx`)
- Toast notifications for user-facing errors (`useToast()`)
- Console error logging with `[ComponentName]` prefix

### Rust

**Pattern:** `Result<T, String>` for fallible operations

```rust
pub fn cmd_get_device_id() -> Result<String, String> {
    // ... operation that might fail
    Ok(value)
}
```

**Error logging:** Use `ulog_error!` macro, not `log::error!`

## Logging Conventions

### Frontend (React)

**Unified logging:** All logs go through the `UnifiedLogger` system and are forwarded via SSE to the frontend.

**Pattern:** `[Prefix] message`
```typescript
console.log('[App] Global sidecar started');
console.error('[App] Failed to start session');
console.warn('[App] Something unexpected but recoverable');
```

**Categories in logs:**
- `[REACT]` — Frontend logs
- `[BUN]` — Bun Sidecar logs
- `[RUST]` — Rust layer logs

### Backend (Bun Sidecar)

**Logger initialization:** `src/server/logger.ts`

The Bun logger intercepts `console.log/error/warn/debug` and:
1. Stores in ring buffer (100 entries max)
2. Persists to unified log file
3. Broadcasts to SSE clients

**Accessing logs:**
- Via `~/.nova-agents/logs/unified-{YYYY-MM-DD}.log`
- Via `[Logger]` prefixed messages in console

### Rust

**Macros used:** `ulog_info!`, `ulog_error!`, `ulog_warn!`, `ulog_debug!`

**Why:** These write to the unified log file. Standard `log::info!` does not.

## Function Design

### Size Guidelines

- Functions should be small and focused
- If a function exceeds ~100 lines, consider splitting
- React components: separate logic into custom hooks

### Parameters

**TypeScript:**
- Explicit parameter types (no `any`)
- Optional parameters have `?` suffix
- Use object destructuring for functions with >3 parameters

**Example:**
```typescript
export function useConfig(): UseConfigResult {
    const data = useConfigData();
    const actions = useConfigActions();
    return { ...data, ...actions };
}
```

### Return Values

- Always explicit return types for exported functions
- Use `null` instead of `undefined` for "no value"
- Arrays should be typed as `T[]` not `Array<T>` (project preference)

## Module Design

### Exports

- Named exports preferred over default exports (better refactoring)
- Barrel files (`index.ts`) for public API surface of modules
- Re-exports through `index.ts` for public API

### File Organization

```
src/renderer/
├── components/    # React components
├── hooks/         # Custom React hooks
├── context/       # React Context providers
├── api/           # API client functions
├── config/        # Configuration services and types
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── services/      # Business logic services
├── pages/         # Page-level components
└── constants/     # Constants
```

## Git Workflow

### Branch Strategy

- `dev/x.x.x` — Development branches
- `main` — Production branch (never commit directly)

### Commit Messages

Format: **Conventional Commits**

```
feat: add new feature
fix: fix bug
docs: documentation changes
refactor: code refactoring
test: adding tests
chore: maintenance tasks
style: formatting changes
perf: performance improvements
```

### Pre-commit Checklist

```bash
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint with zero warnings
```

### Merging to Main

1. All checks pass
2. User explicitly confirms
3. Use merge commit (not squash)

---

*Convention analysis: 2026-04-02*
