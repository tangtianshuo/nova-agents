# Testing Patterns

**Analysis Date:** 2026-04-02

## Test Framework

**Runner:** Bun's built-in test framework (`bun:test`)

**Configuration:** No dedicated test config file; Bun automatically discovers tests

**Assertion Library:** Built into `bun:test` with `expect()`

**Package manager:** Bun (v1.3.2)

**Run commands:**
```bash
npm test              # Run all tests (bun test)
bun test             # Direct bun test
bun test --watch     # Watch mode
```

## Test File Organization

### Location Patterns

**Co-located with source:**
- `src/renderer/utils/parsePartialJson.test.ts` (with `parsePartialJson.ts`)

**Dedicated test directory for integration tests:**
- `src/server/__tests__/` — Server-side tests
  - `sdk-smoke.test.ts` — SDK smoke tests
  - `provider-anthropic.test.ts` — Anthropic provider tests
  - `provider-moonshot.test.ts` — Moonshot provider tests
  - `fixtures/test-env.ts` — Test environment configuration
  - `setup.ts` — Shared test utilities

### Naming

- Test files: `*.test.ts` or `*.test.tsx`
- No `*.spec.ts` pattern used in this project

### Structure

```
src/server/__tests__/
├── fixtures/
│   └── test-env.ts        # Test environment variables and constants
├── setup.ts               # Shared test setup and assertion helpers
├── sdk-smoke.test.ts      # SDK smoke tests
├── provider-anthropic.test.ts
└── provider-moonshot.test.ts
```

## Test Structure

### Test File Pattern (Bun)

```typescript
import { describe, it, expect, beforeAll } from 'bun:test';

describe('Test Suite Name', () => {
    const isAvailable = someCondition;

    beforeAll(() => {
        if (!isAvailable) {
            console.warn('[test] Feature not available, tests will be skipped');
        }
    });

    describe('Subcategory', () => {
        it.skipIf(!isAvailable)('should do something specific', async () => {
            const result = await someOperation();
            expect(result).toBeTruthy();
        }, timeoutMs);
    });
});
```

### Key Patterns

**Conditional test execution:**
```typescript
it.skipIf(!isAvailable)('test name', async () => {
    // test code
}, timeout);
```

**Async testing:**
```typescript
it('should handle async operation', async () => {
    const result = await runTestQuery({...});
    expect(result.sessionId).toBeTruthy();
});
```

**Timeout handling:**
```typescript
// For long-running tests
it('should timeout gracefully', async () => {
    // Test with timeout + buffer
}, TEST_TIMEOUT + TIMEOUT_BUFFER);
```

## Test Fixtures and Factories

### Test Environment (`fixtures/test-env.ts`)

```typescript
export const PROVIDERS = {
    anthropic: {
        name: 'Anthropic',
        available: Boolean(process.env.ANTHROPIC_API_KEY),
        config: { ... },
    },
    moonshot: { ... },
};

export const TEST_TIMEOUT = 60_000;        // 1 minute
export const TIMEOUT_BUFFER = 5_000;       // 5 seconds
export const TOOL_TIMEOUT_MULTIPLIER = 3;  // 3x for tool calls
export const SIMPLE_PROMPT = 'Reply with just "OK"';
export const TOOL_PROMPT = 'Show me the contents of package.json';
```

### Shared Setup (`setup.ts`)

**Type Guards:**
```typescript
function isSystemInitMessage(msg: SDKMessage): msg is SDKSystemMessage {
    return msg.type === 'system' && 'subtype' in msg && msg.subtype === 'init';
}
```

**Environment Builder:**
```typescript
export function buildTestEnv(provider: ProviderConfig): NodeJS.ProcessEnv {
    const env = { ...process.env };
    if (!provider.isSubscription) {
        env.ANTHROPIC_BASE_URL = provider.baseUrl;
        env.ANTHROPIC_API_KEY = provider.apiKey;
    }
    return env;
}
```

**Test Query Runner:**
```typescript
export async function runTestQuery(options: TestQueryOptions): Promise<TestQueryResult> {
    // Creates prompt generator, calls SDK query(), collects results
    // Handles timeouts with cleanup
}
```

**Assertion Helpers:**
```typescript
export function assertQuerySuccess(result: TestQueryResult): void {
    if (result.hasError) {
        throw new Error(`Query failed: ${result.errorMessage}`);
    }
}

export function assertResponseContains(result: TestQueryResult, expected: string): void {
    if (!result.assistantResponse?.toLowerCase().includes(expected.toLowerCase())) {
        throw new Error(`Response does not contain "${expected}"`);
    }
}
```

## Mocking

**Framework:** Bun's built-in mocking (limited)

**Approach:** The project uses integration tests rather than heavy mocking. SDK tests use actual SDK calls with real providers.

**Mock utilities:**
- `src/renderer/utils/browserMock.ts` — Browser environment mocks for development
  - `mockLoadConfig()`, `mockSaveConfig()`
  - `mockLoadProjects()`, `mockSaveProjects()`
  - `captureLog()`, `getLogs()` for log inspection

## Coverage

**Requirements:** None enforced

**View coverage:** Not configured

The project relies on:
- Integration tests with real SDK
- Manual testing during development
- Type checking as first line of defense

## Test Types

### Unit Tests

**Location:** Co-located with source (`src/renderer/utils/`)

**Example:** `parsePartialJson.test.ts`
- 340+ lines of comprehensive test cases
- Tests parsing of complete JSON
- Tests incomplete strings, objects, arrays
- Tests edge cases (special characters, trailing data)
- Tests streaming scenarios with progressive chunks
- Tests with generic type inference

### Integration Tests

**Location:** `src/server/__tests__/`

**Example:** `sdk-smoke.test.ts`
- Tests actual SDK session creation
- Tests message send/receive
- Tests tool calls (Read tool)
- Tests error handling (invalid model)
- Requires valid API credentials

### E2E Tests

**Status:** Not implemented

The project does not have Playwright or similar E2E tests. GUI testing is done manually.

## CI/CD

**Status:** Workflow disabled

**File:** `.github/workflows/release.yml`

The GitHub Actions workflow is currently disabled (`workflow-disabled-do-not-use` branch). Releases are built locally using:
- `build_macos.sh` for macOS
- `build_windows.ps1` for Windows
- `publish_release.sh` or `publish_windows.ps1` for R2 upload

### Historical Workflow (for reference)

The workflow included:
- Checkout + Bun setup + Rust setup
- Multi-platform matrix (macOS aarch64 + x86_64)
- Bun binary download for bundling
- Server bundle build
- Tauri app build with code signing
- Artifact upload
- R2 manifest generation and upload

## Current Testing Limitations

### Not Covered by Tests

- React component rendering (no component tests)
- Event handling in isolation
- Context provider behavior
- Tauri IPC commands
- Rust layer logic

### Recommendations for Improvement

1. **Add component tests:** Use `@testing-library/react` for component tests
2. **Add Rust tests:** Use `#[cfg(test)]` modules in Rust files
3. **CI integration:** Re-enable or replace GitHub Actions workflow
4. **Coverage tracking:** Add coverage reporting with `bun test --coverage`

---

*Testing analysis: 2026-04-02*
