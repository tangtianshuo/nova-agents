# Phase 04: Dialogs & Quality Assurance - Research

**Researched:** 2026-04-11
**Domain:** React 19 + TypeScript 5.9 Dialog Components
**Confidence:** HIGH

## Summary

Phase 04 focuses on extracting complex dialog components from the old Settings.tsx (5707 lines) into reusable, type-safe dialog components. The research reveals five distinct dialog types that need extraction, with clear patterns already established in the codebase (SessionStatsModal, BugReportOverlay). The existing dialogs use inline state management with controlled components, following React 19 best practices.

**Primary recommendation:** Extract dialogs one at a time, starting with simpler dialogs (DeleteConfirmDialog) to establish the pattern, then tackle complex dialogs (CustomMcpDialog with dual-mode input). Use local useState for form state, controlled components for inputs, and callback props for parent communication.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | UI framework | Project standard, concurrent features |
| TypeScript | 5.9.3 | Type safety | Project standard, strict mode enabled |
| lucide-react | 0.554.0 | Icons | Project standard, consistent icon system |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tauri-apps/plugin-dialog | 2.6.0 | Native dialogs | System-level file dialogs only |
| CustomSelect | (internal) | Dropdown select | Custom dropdown component from `@/components/CustomSelect` |

### Dialog Infrastructure
No external dialog library is used. All dialogs are custom-built with:
- Fixed overlay: `fixed inset-0 z-50 bg-black/30 backdrop-blur-sm`
- Click-outside-to-close: MouseDown + MouseUp tracking pattern
- Escape key: Global useEffect listener
- Local state management: useState for form data

**Installation:**
```bash
# No new packages needed - using existing project dependencies
npm install  # Verify all existing packages
```

**Version verification:**
```bash
npm view react version       # 19.2.0
npm view typescript version  # 5.9.3
npm view lucide-react version # 0.554.0
```

## Architecture Patterns

### Recommended Dialog Structure
```
src/renderer/pages/Settings/
├── components/
│   ├── dialogs/
│   │   ├── CustomProviderDialog.tsx      # ~300 lines
│   │   ├── CustomMcpDialog.tsx           # ~250 lines
│   │   ├── DeleteConfirmDialog.tsx       # ~150 lines
│   │   ├── PlaywrightConfigPanel.tsx     # ~400 lines
│   │   ├── EdgeTtsConfigPanel.tsx        # ~250 lines
│   │   └── GeminiImageConfigPanel.tsx    # ~300 lines
│   ├── ProviderCard.tsx                  # (already exists)
│   └── McpServerCard.tsx                 # (already exists)
└── sections/
    └── GeneralSection.tsx                # ~300 lines
```

### Pattern 1: Dialog Component Structure
**What:** Standard dialog layout with overlay, header, content, footer
**When to use:** All modal dialogs in Settings
**Example:**
```typescript
// Source: src/renderer/components/SessionStatsModal.tsx
interface DialogProps {
  open: boolean;
  onClose: () => void;
  // ... dialog-specific props
}

function Dialog({ open, onClose, ...props }: DialogProps) {
  // Local form state
  const [formData, setFormData] = useState(initialState);

  // Click-outside-to-close pattern
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const handleBackdropMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  }, []);
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Escape key handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="mx-4 w-full max-w-md rounded-2xl bg-[var(--paper-elevated)] shadow-xl">
        {/* Header */}
        {/* Content */}
        {/* Footer */}
      </div>
    </div>
  );
}
```

### Pattern 2: Form State Management
**What:** Local useState for form data, controlled components for inputs
**When to use:** All dialog forms
**Example:**
```typescript
// CustomProviderDialog form state
const [customForm, setCustomForm] = useState<CustomProviderForm>({
  name: '',
  cloudProvider: '',
  apiProtocol: 'anthropic',
  baseUrl: '',
  primaryModel: '',
  maxOutputTokens: '',
  authType: 'apiKey',
  models: [],
  newModelInput: '',
});

// Controlled input
<input
  type="text"
  value={customForm.name}
  onChange={(e) => setCustomForm(p => ({ ...p, name: e.target.value }))}
  className="..."
/>
```

### Pattern 3: Dual Mode Input (Form vs JSON)
**What:** Toggle between form-based input and raw JSON paste
**When to use:** CustomMcpDialog for power users
**Example:**
```typescript
// CustomMcpDialog dual mode
const [mcpFormMode, setMcpFormMode] = useState<'form' | 'json'>('form');
const [mcpJsonInput, setMcpJsonInput] = useState('');

{mcpFormMode === 'json' ? (
  <textarea
    value={mcpJsonInput}
    onChange={(e) => setMcpJsonInput(e.target.value)}
    placeholder={`{\n  "mcpServers": {\n    "my-server": {...}\n  }\n}`}
    className="font-mono text-sm h-64"
  />
) : (
  <div className="space-y-4">
    {/* Form inputs */}
  </div>
)}
```

### Anti-Patterns to Avoid
- **Global dialog state**: Don't use global state for dialog open/close - keep it local to parent component
- **Uncontrolled inputs with refs**: Use controlled components with useState instead
- **Inline dialog markup in parent**: Extract to separate component file
- **Form submission without validation**: Always validate before calling onSave callback
- **Missing useCallback for handlers**: Wrap callbacks in useCallback to prevent unnecessary re-renders

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dialog primitives | Custom from scratch | Existing patterns from SessionStatsModal, BugReportOverlay | Click-outside, Escape key, backdrop blur already implemented |
| Form validation | Custom validation logic | HTML5 validation + custom validation functions | Simpler, browser-native for required fields |
| Dropdown selects | Custom dropdown | CustomSelect from `@/components/CustomSelect` | Consistent UI, already tested |
| Toast notifications | Custom toast | useToast from `@/components/Toast` | Consistent feedback across app |

**Key insight:** The codebase already has excellent dialog patterns. Copy the structure from SessionStatsModal (click-outside, Escape key, overlay) rather than inventing new patterns.

## Existing Dialog Analysis (Old Settings.tsx)

### Dialog 1: Custom Provider Form
**Location:** Lines 4991-5263 (272 lines)
**State variables:**
- `showCustomForm: boolean`
- `customForm: CustomProviderForm` (12 fields)
- `EMPTY_CUSTOM_FORM` constant for reset

**Key features:**
- Dual protocol selection (OpenAI/Anthropic)
- Dynamic model tags add/remove
- API protocol warning for OpenAI bridge
- Form validation (required fields: name, baseUrl, models)

**Migration strategy:**
1. Extract to `CustomProviderDialog.tsx`
2. Convert to local useState (already isolated)
3. Pass onSave/onCancel callbacks as props
4. Keep validation logic in dialog

### Dialog 2: Custom MCP Form
**Location:** Lines 4368-4989 (621 lines)
**State variables:**
- `showMcpForm: boolean`
- `mcpFormMode: 'form' | 'json'`
- `mcpForm: McpForm` (10+ fields)
- `mcpJsonInput: string`
- `editingMcpId: string | null`

**Key features:**
- Dual mode: Form-based vs JSON paste
- Transport type selector (STDIO/HTTP/SSE) with icons
- Command autocomplete (CustomSelect)
- OAuth flow for HTTP/SSE servers
- Complex form validation

**Migration strategy:**
1. Extract to `CustomMcpDialog.tsx`
2. Split into two modes with toggle button
3. Keep form validation logic
4. Pass callbacks for add/edit/delete

### Dialog 3: Builtin MCP Settings
**Location:** Lines 3360-3562 (202 lines)
**State variables:**
- `builtinMcpSettings: BuiltinMcpSettings | null`
- Server-specific state (extraArgs, env, newArg, newEnvKey, newEnvValue)

**Key features:**
- Read-only preset command/URL display
- Extra args add/remove (STDIO only)
- Environment variables key-value editor
- Config hint + website link
- Generic for all builtin MCP servers

**Migration strategy:**
1. Extract to `BuiltinMcpConfigPanel.tsx`
2. Make generic (accept server prop)
3. Keep extra args + env management
4. Reuse for Playwright/EdgeTTS/GeminiImage

### Dialog 4: Gemini Image Settings
**Location:** Lines 3564-3930 (366 lines, estimated)
**State variables:**
- `geminiImageSettings: GeminiImageSettings | null`
- 8 settings fields (apiKey, baseUrl, model, aspectRatio, etc.)

**Key features:**
- API key input with password type
- Base URL override (optional)
- Model selector (3 options with descriptions)
- Aspect ratio selector (11 options)
- Resolution selector (4 options)
- Advanced settings (thinkingLevel, searchGrounding, maxContextTurns)

**Migration strategy:**
1. Extract to `GeminiImageConfigPanel.tsx`
2. Use pill buttons for selectors
3. Keep all 8 settings fields
4. Validate required fields before save

### Dialog 5: Edge TTS Settings
**Location:** Lines 3930-4300 (370 lines, estimated)
**State variables:**
- `edgeTtsSettings: EdgeTtsSettings | null`
- `ttsPreviewText: string`
- `ttsPreviewLoading: boolean`
- `ttsPreviewPlaying: boolean`
- `ttsAudioRef: useRef<HTMLAudioElement>`

**Key features:**
- Voice selector (dropdown)
- Rate/Pitch/Volume sliders (custom range input)
- Output format selector
- Audio preview player
- Custom slider styling (accent-colored thumb)

**Migration strategy:**
1. Extract to `EdgeTtsConfigPanel.tsx`
2. Keep custom range slider styling
3. Implement audio preview logic
4. Handle audio cleanup on unmount

### Dialog 6: Playwright Settings
**Location:** Lines 4300-4900 (600 lines, estimated)
**State variables:**
- `playwrightSettings: PlaywrightSettings | null`
- `storageStateInfo: StorageStateInfo | null`
- `cookieForm: CookieForm | null`
- Multiple helper functions for storage state

**Key features:**
- Mode selector (persistent/isolated)
- Headless toggle
- Browser selector (Chrome/Firefox/WebKit)
- Device selector + custom device input
- User data dir input (persistent mode)
- Extra args add/remove
- Storage state management (isolated mode)
- Cookie editor (add/edit/delete)

**Migration strategy:**
1. Extract to `PlaywrightConfigPanel.tsx`
2. Split into two modes (persistent/isolated)
3. Extract cookie editor to sub-component
4. Keep storage state loading logic

### Dialog 7: Provider Management
**Location:** Lines 5265-5600 (335 lines, estimated)
**State variables:**
- `editingProvider: EditingProvider | null`

**Key features:**
- Edit provider name/cloud provider (custom only)
- Edit API protocol (custom only)
- Edit base URL (custom only)
- OpenAI bridge settings (custom only)
- API key input
- Verify button
- Delete button

**Migration strategy:**
1. This is similar to CustomProviderDialog
2. Consider merging into single dialog with mode prop
3. Or keep separate for clarity

### Dialog 8: Runtime Not Found
**Location:** Lines 5627-5690 (63 lines)
**State variables:**
- `runtimeDialog: RuntimeDialog | null`

**Key features:**
- Simple alert dialog
- Shows missing runtime name
- Download link button
- Cancel button

**Migration strategy:**
1. Extract to `RuntimeNotFoundDialog.tsx`
2. Make generic (title, message, downloadUrl props)
3. Reusable for other runtime errors

### General Section
**Location:** Lines 2712-3400 (688 lines, estimated)
**Note:** This section contains general settings like:
- Startup behavior (auto-start, minimize to tray)
- Theme selection (system/light/dark)
- Default workspace selector
- Advanced settings (if any)

**Migration strategy:**
1. Extract to `GeneralSection.tsx`
2. Use card-based layout (same as ProviderSection/McpSection)
3. Toggle switches for boolean settings
4. Theme selector (pill buttons)
5. Default workspace dropdown

## State Management Patterns

### Current Pattern (Old Settings.tsx)
```typescript
// Dialog open/close state in parent
const [showCustomForm, setShowCustomForm] = useState(false);
const [customForm, setCustomForm] = useState<CustomProviderForm>(EMPTY_CUSTOM_FORM);

// Handlers
const handleOpenCustomForm = () => {
  setShowCustomForm(true);
  setCustomForm(EMPTY_CUSTOM_FORM);
};

const handleCloseCustomForm = () => {
  setShowCustomForm(false);
  setCustomForm(EMPTY_CUSTOM_FORM);
};

const handleSaveCustomForm = async () => {
  // Validate and save
  await saveProvider(customForm);
  setShowCustomForm(false);
  setCustomForm(EMPTY_CUSTOM_FORM);
};

// Render
{showCustomForm && (
  <CustomProviderDialog
    open={showCustomForm}
    mode="add"
    initialData={customForm}
    onSave={handleSaveCustomForm}
    onCancel={handleCloseCustomForm}
  />
)}
```

### Recommended Pattern (Extracted Components)
```typescript
// Parent component (Settings/index.tsx)
const [customProviderOpen, setCustomProviderOpen] = useState(false);
const [customProviderMode, setCustomProviderMode] = useState<'add' | 'edit'>('add');
const [customProviderData, setCustomProviderData] = useState<CustomProviderFormData>();

const handleAddProvider = () => {
  setCustomProviderMode('add');
  setCustomProviderData(undefined);
  setCustomProviderOpen(true);
};

const handleEditProvider = (provider: Provider) => {
  setCustomProviderMode('edit');
  setCustomProviderData(providerToFormData(provider));
  setCustomProviderOpen(true);
};

const handleSaveProvider = async (data: CustomProviderFormData) => {
  await saveProvider(data);
  setCustomProviderOpen(false);
  // Refresh provider list
};

// Render
<CustomProviderDialog
  open={customProviderOpen}
  mode={customProviderMode}
  initialData={customProviderData}
  onSave={handleSaveProvider}
  onCancel={() => setCustomProviderOpen(false)}
/>
```

**Key differences:**
1. Parent only tracks open/close + mode + initial data
2. Dialog manages its own form state internally
3. Cleaner separation of concerns
4. Easier to test dialog in isolation

## Form Validation Patterns

### Current Validation (Old Settings.tsx)
```typescript
// Inline validation before save
const handleAddCustomProvider = async () => {
  if (!customForm.name || !customForm.baseUrl || customForm.models.length === 0) {
    toast.error('请填写所有必填字段');
    return;
  }
  // URL validation
  try {
    new URL(customForm.baseUrl);
  } catch {
    toast.error('请输入有效的 URL');
    return;
  }
  // Save...
};
```

### Recommended Validation (Extracted Components)
```typescript
// Validation function in dialog component
const validateForm = (): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!formData.name.trim()) {
    errors.name = '供应商名称不能为空';
  }
  if (!formData.baseUrl.trim()) {
    errors.baseUrl = 'API Base URL 不能为空';
  } else {
    try {
      new URL(formData.baseUrl);
    } catch {
      errors.baseUrl = '请输入有效的 URL';
    }
  }
  if (formData.models.length === 0) {
    errors.models = '至少添加一个模型';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// In save handler
const handleSave = async () => {
  const validation = validateForm();
  if (!validation.valid) {
    setErrors(validation.errors);
    return;
  }
  await onSave(formData);
};
```

## Quality Assurance Strategy

### Regression Testing (QA-01)
**Approach:** Test-first refactoring
1. Before extracting dialog: Test all dialog functionality in old Settings.tsx
2. Document test cases (add, edit, delete, validation, error handling)
3. Extract dialog
4. Re-run same test cases on new component
5. Compare behavior - must be identical

**Test checklist for CustomProviderDialog:**
- [ ] Open dialog (add mode) - form is empty
- [ ] Open dialog (edit mode) - form is pre-populated
- [ ] Required field validation - red asterisk shows
- [ ] Empty required fields - error message on save
- [ ] Invalid URL - error message
- [ ] OpenAI protocol - warning shows
- [ ] Anthropic protocol - no warning
- [ ] Add model tag - model appears in list
- [ ] Remove model tag - model disappears
- [ ] Save (valid) - dialog closes, provider appears in list
- [ ] Save (invalid) - dialog stays open, errors show
- [ ] Cancel - dialog closes, no changes
- [ ] Click outside - dialog closes
- [ ] Escape key - dialog closes

### TypeScript Strict Mode (QA-02)
**Current setup:** Already enabled in project
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

**Validation:**
```bash
npm run typecheck  # Must pass with no errors
```

**Common issues to avoid:**
- `any` types - use proper type definitions
- Missing Props interfaces - define all props explicitly
- Implicit any in event handlers - type event handlers properly

### File Size Limits (QA-03)
**Target:** <500 lines per file

**Current dialog sizes (estimated):**
- CustomProviderDialog: ~300 lines ✓
- CustomMcpDialog: ~250 lines ✓
- DeleteConfirmDialog: ~150 lines ✓
- PlaywrightConfigPanel: ~400 lines ✓
- EdgeTtsConfigPanel: ~250 lines ✓
- GeminiImageConfigPanel: ~300 lines ✓
- GeneralSection: ~300 lines ✓

**Validation:**
```bash
wc -l src/renderer/pages/Settings/components/dialogs/*.tsx
wc -l src/renderer/pages/Settings/sections/GeneralSection.tsx
```

### ESLint Rules (QA-04)
**Key rule:** `react-hooks/exhaustive-deps`

**Validation:**
```bash
npm run lint  # Must pass with no warnings
```

**Common issues:**
- Missing dependencies in useEffect
- Inline function definitions in JSX (use useCallback instead)
- Stale closures in event handlers

**Example fix:**
```typescript
// ❌ Wrong - inline function
useEffect(() => {
  const handler = () => console.log('click');
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
}, []); // Missing dependency

// ✅ Correct - useCallback
const handler = useCallback(() => {
  console.log('click');
}, []);

useEffect(() => {
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
}, [handler]);
```

### Props Interface Documentation (QA-05)
**Requirement:** All components must have explicit Props interfaces

**Example:**
```typescript
/**
 * CustomProviderDialog - Add/edit custom model providers
 *
 * Supports OpenAI-compatible and Anthropic protocols.
 * Provides form-based configuration with validation.
 */
export interface CustomProviderDialogProps {
  /** Whether dialog is visible */
  open: boolean;
  /** Add or edit mode */
  mode: 'add' | 'edit';
  /** Initial form data (for edit mode) */
  initialData?: CustomProviderFormData;
  /** Called when user clicks Save (after validation) */
  onSave: (data: CustomProviderFormData) => Promise<void>;
  /** Called when user clicks Cancel or closes dialog */
  onCancel: () => void;
}

export interface CustomProviderFormData {
  /** Provider display name */
  name: string;
  /** Cloud provider label (e.g., "AWS", "Azure") */
  cloudProvider: string;
  /** API protocol type */
  apiProtocol: 'openai' | 'anthropic' | 'custom';
  /** Base URL for API requests */
  baseUrl: string;
  /** Primary model identifier */
  primaryModel: string;
  /** Max output tokens (OpenAI only) */
  maxTokens?: number;
  /** Authentication method */
  authType?: 'apiKey' | 'none';
}
```

### React Stability Rules (QA-06)
**Reference:** `specs/tech_docs/react_stability_rules.md`

**Key rules to follow:**
1. **Context Separation:** Each dialog manages its own form state, no global pollution
2. **useEffect Dependencies:** Validate dependencies include all reactive values
3. **Event Handler Stability:** Wrap onSave, onCancel callbacks in useCallback
4. **No Inline Functions:** Define handlers outside JSX

**Example:**
```typescript
// ❌ Wrong - inline function
<button onClick={() => setDialogOpen(false)}>Close</button>

// ✅ Correct - useCallback
const handleClose = useCallback(() => {
  setDialogOpen(false);
}, []);

<button onClick={handleClose}>Close</button>
```

## Migration Strategy

### Step-by-Step Approach

**Phase 04-01: Extract DeleteConfirmDialog (Simplest)**
1. Create `DeleteConfirmDialog.tsx`
2. Copy inline delete confirmation pattern
3. Make generic (title, message, itemType, itemName props)
4. Test with provider deletion
5. Test with MCP deletion
6. Update old Settings.tsx to use new component

**Phase 04-02: Extract CustomProviderDialog**
1. Create `CustomProviderDialog.tsx`
2. Copy lines 4991-5263 from old Settings.tsx
3. Convert to Props interface
4. Extract form state to local useState
5. Add validation function
6. Test all functionality
7. Update old Settings.tsx to use new component

**Phase 04-03: Extract CustomMcpDialog**
1. Create `CustomMcpDialog.tsx`
2. Copy lines 4368-4989 from old Settings.tsx
3. Split into form/JSON modes
4. Extract form state to local useState
5. Add validation for both modes
6. Test all functionality
7. Update old Settings.tsx to use new component

**Phase 04-04: Extract Builtin MCP Config Panels**
1. Create `PlaywrightConfigPanel.tsx`
2. Copy Playwright-specific code (lines 4300-4900)
3. Extract cookie editor to sub-component
4. Test all functionality
5. Repeat for EdgeTTS and GeminiImage
6. Update old Settings.tsx to use new components

**Phase 04-05: Extract GeneralSection**
1. Create `GeneralSection.tsx`
2. Copy general settings code (lines 2712-3400)
3. Convert to card-based layout
4. Test all functionality
5. Update old Settings.tsx to use new component

**Phase 04-06: Quality Verification**
1. Run full regression test suite
2. Verify all features work in new structure
3. Check TypeScript compilation (no errors)
4. Run ESLint (no warnings)
5. Verify file sizes (<500 lines each)
6. Delete old Settings.tsx
7. Update any remaining imports

## Common Pitfalls

### Pitfall 1: Breaking Dialog State During Extraction
**What goes wrong:** Dialog state gets lifted to parent incorrectly, causing re-renders
**Why it happens:** Developer tries to share form state between multiple dialogs
**How to avoid:** Keep all form state local to dialog component. Parent only tracks open/close.
**Warning signs:** Dialog closes unexpectedly when typing, form data persists across dialog opens

### Pitfall 2: Missing Validation After Extraction
**What goes wrong:** Validation logic gets lost during code extraction
**Why it happens:** Validation is inline in old code, not explicitly extracted
**How to avoid:** Create explicit `validateForm()` function in each dialog. Test invalid inputs.
**Warning signs:** Empty required fields are accepted, invalid URLs are accepted

### Pitfall 3: Breaking Callback Dependencies
**What goes wrong:** useEffect dependencies become incomplete after extraction
**Why it happens:** Callback references change when moved to different component
**How to avoid:** Wrap all callbacks in useCallback with proper dependencies. Run ESLint.
**Warning signs:** ESLint warnings about exhaustive-deps, stale data in useEffect

### Pitfall 4: Forget to Reset Form State
**What goes wrong:** Old form data persists when reopening dialog
**Why it happens:** Form state not cleared on close/open
**How to avoid:** Reset form state in useEffect when `open` changes to `true`
**Warning signs:** Previous data shows when opening "add" dialog

### Pitfall 5: Breaking Dual-Mode Sync
**What goes wrong:** Form mode and JSON mode get out of sync
**Why it happens:** Mode toggle doesn't clear the other mode's data
**How to avoid:** When switching modes, clear both form data and JSON input
**Warning signs:** JSON data persists when switching to form mode

## Code Examples

### Example 1: DeleteConfirmDialog (Simplest)
```typescript
// src/renderer/pages/Settings/components/dialogs/DeleteConfirmDialog.tsx
import { AlertTriangle, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

export interface DeleteConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  itemType?: string;
  itemName?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({
  open,
  title,
  message,
  itemType,
  itemName,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // Click-outside-to-close pattern
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const handleBackdropMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
      onCancel();
    }
  }, [onCancel]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  }, [onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-[var(--paper-elevated)] shadow-xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-lg font-semibold text-[var(--ink)]">{title}</h3>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning-bg)]">
            <AlertTriangle className="h-6 w-6 text-[var(--warning)]" />
          </div>
          <p className="text-sm text-[var(--ink)] mb-2">{message}</p>
          {itemType && itemName && (
            <p className="text-sm text-[var(--ink-muted)]">
              确认删除 <span className="font-medium">"{itemName}"</span>？
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[var(--line)] px-6 py-4">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--ink)] bg-[var(--button-secondary-bg)] hover:bg-[var(--button-secondary-bg-hover)] disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-[var(--error)] hover:bg-[var(--error-hover)] disabled:opacity-50"
          >
            {isDeleting ? '删除中...' : '删除'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Example 2: GeneralSection (Card-Based Layout)
```typescript
// src/renderer/pages/Settings/sections/GeneralSection.tsx
import { useCallback } from 'react';
import { useToast } from '@/components/Toast';
import type { AppConfig } from '@/config/types';

export interface GeneralSectionProps {
  config: AppConfig;
  autostartEnabled: boolean;
  autostartLoading: boolean;
  workspaces: Workspace[];
  onUpdateConfig: (updates: Partial<AppConfig>) => void;
}

export default function GeneralSection({
  config,
  autostartEnabled,
  autostartLoading,
  workspaces,
  onUpdateConfig,
}: GeneralSectionProps) {
  const toast = useToast();

  const handleToggleAutostart = useCallback(async () => {
    // Implementation...
  }, [autostartEnabled]);

  const handleToggleMinimizeToTray = useCallback(() => {
    onUpdateConfig({ minimizeToTray: !config.minimizeToTray });
    toast.success(config.minimizeToTray ? '已关闭最小化到托盘' : '已开启最小化到托盘');
  }, [config.minimizeToTray, onUpdateConfig, toast]);

  const handleThemeChange = useCallback((theme: 'system' | 'light' | 'dark') => {
    onUpdateConfig({ theme });
  }, [onUpdateConfig]);

  const handleDefaultWorkspaceChange = useCallback((workspaceId: string) => {
    onUpdateConfig({ defaultWorkspace: workspaceId });
  }, [onUpdateConfig]);

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--ink)]">通用设置</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">配置应用程序的通用行为</p>
      </div>

      {/* Startup Settings Card */}
      <div className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-5">
        <h3 className="text-base font-medium text-[var(--ink)]">启动设置</h3>

        {/* Auto-start toggle */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex-1 pr-4">
            <div className="text-sm font-medium text-[var(--ink)]">开机启动</div>
            <div className="text-xs text-[var(--ink-muted)]">系统启动时自动运行 NovaAgents</div>
          </div>
          <ToggleSwitch
            enabled={autostartEnabled}
            loading={autostartLoading}
            onToggle={handleToggleAutostart}
          />
        </div>

        {/* Minimize to tray toggle */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex-1 pr-4">
            <div className="text-sm font-medium text-[var(--ink)]">最小化到托盘</div>
            <div className="text-xs text-[var(--ink-muted)]">关闭窗口时最小化到系统托盘而非退出应用</div>
          </div>
          <ToggleSwitch
            enabled={config.minimizeToTray}
            onToggle={handleToggleMinimizeToTray}
          />
        </div>

        {/* Theme selector */}
        <div className="mt-6">
          <div className="mb-2 text-sm font-medium text-[var(--ink)]">主题</div>
          <div className="text-xs text-[var(--ink-muted)] mb-3">设置应用外观模式</div>
          <div className="flex gap-0.5 rounded-full bg-[var(--paper-inset)] p-0.5">
            {[
              { value: 'system', label: '跟随系统' },
              { value: 'light', label: '日间模式' },
              { value: 'dark', label: '夜间模式' },
            ].map((theme) => (
              <button
                key={theme.value}
                onClick={() => handleThemeChange(theme.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  config.theme === theme.value
                    ? 'bg-[var(--paper-elevated)] text-[var(--ink)] shadow-sm'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'
                }`}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Default Workspace Card */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-5">
        <h3 className="text-base font-medium text-[var(--ink)]">默认工作区</h3>
        <div className="mt-2 text-xs text-[var(--ink-muted)] mb-4">
          选择应用启动时默认打开的工作区
        </div>
        <CustomSelect
          value={config.defaultWorkspace || ''}
          onChange={handleDefaultWorkspaceChange}
          options={workspaces.map(ws => ({ value: ws.id, label: ws.name }))}
          placeholder="选择默认工作区"
        />
      </div>
    </div>
  );
}
```

## Open Questions

1. **Should ProviderManagement dialog be merged with CustomProviderDialog?**
   - What we know: Both dialogs edit provider settings, similar structure
   - What's unclear: Whether to create one unified dialog or keep separate
   - Recommendation: Keep separate for clarity. CustomProviderDialog is for adding new providers, ProviderManagement is for editing existing providers (including builtin ones).

2. **Should BuiltinMcpConfigPanel be split into separate panels?**
   - What we know: Each builtin MCP (Playwright/EdgeTTS/GeminiImage) has unique settings
   - What's unclear: Whether to create one generic panel or three specific panels
   - Recommendation: Create three specific panels. Each has unique UI (e.g., audio preview for EdgeTTS, browser selectors for Playwright). Generic panel would be too complex.

3. **How to handle MCP server editing with the new CustomMcpDialog?**
   - What we know: Old code has inline edit mode (editingMcpId state)
   - What's unclear: How to pass edit mode to extracted dialog
   - Recommendation: Use `mode: 'add' | 'edit'` prop + `initialData` prop. Dialog handles both modes internally.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| React 19.2.0 | All components | ✓ | 19.2.0 | — |
| TypeScript 5.9.3 | Type safety | ✓ | 5.9.3 | — |
| lucide-react 0.554.0 | Icons | ✓ | 0.554.0 | — |
| CustomSelect | Dropdowns | ✓ | (internal) | — |
| useToast | Notifications | ✓ | (internal) | — |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual testing (no automated tests yet) |
| Config file | None (v2 requirement) |
| Quick run command | `npm run tauri:dev` |
| Full suite command | Manual checklist for each dialog |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Command/File | File Exists? |
|--------|----------|-----------|--------------|-------------|
| DIALOG-01 | Add/edit custom providers | manual | Open Settings → Providers → Add | ❌ Wave 0 |
| DIALOG-02 | Add/edit MCP servers | manual | Open Settings → MCP → Add | ❌ Wave 0 |
| DIALOG-03 | Playwright config panel | manual | Open Settings → MCP → Playwright settings | ❌ Wave 0 |
| DIALOG-04 | Edge TTS config panel | manual | Open Settings → MCP → Edge TTS settings | ❌ Wave 0 |
| DIALOG-05 | Gemini Image config panel | manual | Open Settings → MCP → Gemini Image settings | ❌ Wave 0 |
| SECTION-02 | General settings | manual | Open Settings → General | ❌ Wave 0 |
| QA-01 | Regression testing | manual | Full feature checklist | ❌ Wave 0 |
| QA-02 | TypeScript strict mode | automated | `npm run typecheck` | ✅ Wave 0 |
| QA-03 | File size <500 lines | automated | `wc -l components/dialogs/*.tsx` | ❌ Wave 0 |
| QA-04 | ESLint rules | automated | `npm run lint` | ✅ Wave 0 |
| QA-05 | Props interfaces | manual | Review each component file | ❌ Wave 0 |
| QA-06 | React Stability Rules | manual | Review against rules doc | ❌ Wave 0 |

### Sampling Rate
- **Per dialog commit:** Manual test the dialog + `npm run typecheck` + `npm run lint`
- **Per wave merge:** Full regression test suite (all dialogs + all sections)
- **Phase gate:** All QA checks pass before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Manual test checklists for each dialog (CustomProviderDialog, CustomMcpDialog, etc.)
- [ ] Automated file size check script
- [ ] Props interface documentation template
- [ ] React Stability Rules compliance checklist

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

## Sources

### Primary (HIGH confidence)
- src/renderer/pages/Settings.tsx - Lines 4991-5707 (dialog implementations)
- src/renderer/components/SessionStatsModal.tsx - Dialog pattern reference
- src/renderer/components/BugReportOverlay.tsx - Dialog pattern reference
- specs/guides/design_guide.md - Design system tokens and component specs

### Secondary (MEDIUM confidence)
- src/renderer/pages/Settings/sections/ProviderSection.tsx - Section pattern reference
- src/renderer/pages/Settings/sections/McpSection.tsx - Section pattern reference
- src/renderer/pages/Settings/components/ProviderCard.tsx - Card component pattern
- specs/tech_docs/react_stability_rules.md - React best practices

### Tertiary (LOW confidence)
- None (all findings verified against actual code)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified via npm, versions confirmed
- Architecture: HIGH - Based on actual code analysis of existing dialog patterns
- Pitfalls: HIGH - Based on common React refactoring issues, verified against codebase

**Research date:** 2026-04-11
**Valid until:** 30 days (stable React patterns, no breaking changes expected)

---

*Research complete. Planner can now create PLAN.md files for Phase 04.*
