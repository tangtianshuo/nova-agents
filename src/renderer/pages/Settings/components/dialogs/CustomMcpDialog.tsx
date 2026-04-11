/**
 * CustomMcpDialog - Dialog for adding/editing custom MCP servers
 * Supports dual-mode input: form-based (GUI) and JSON paste.
 */
import { Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import CustomSelect from '@/components/CustomSelect';
import { useToast } from '@/components/Toast';

// Types
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

// Default empty form
const EMPTY_FORM: McpFormData = {
  type: 'stdio',
  id: '',
  name: '',
  command: '',
  args: [],
  env: {},
};

// Default JSON template
const DEFAULT_JSON_TEMPLATE = `{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@scope/package"]
    }
  }
}`;

// Transport type configuration
const TRANSPORT_TYPES = [
  { type: 'stdio' as const, icon: '💻', name: 'STDIO', description: '本地命令行' },
  { type: 'http' as const, icon: '🌐', name: 'HTTP', description: '远程服务器' },
  { type: 'sse' as const, icon: '📡', name: 'SSE', description: 'Server-Sent' },
];

// Command autocomplete options
const COMMAND_OPTIONS = [
  { value: 'npx', label: 'npx' },
  { value: 'uvx', label: 'uvx' },
  { value: 'node', label: 'node' },
  { value: 'bun', label: 'bun' },
  { value: 'python', label: 'python' },
  { value: 'pipx', label: 'pipx' },
];

export default function CustomMcpDialog({
  open,
  mode,
  initialData,
  onSave,
  onCancel,
}: CustomMcpDialogProps) {
  const toast = useToast();

  // Form mode state: 'form' | 'json'
  const [mcpFormMode, setMcpFormMode] = useState<'form' | 'json'>('form');

  // Form data state
  const [formData, setFormData] = useState<McpFormData>(EMPTY_FORM);
  const [jsonInput, setJsonInput] = useState(DEFAULT_JSON_TEMPLATE);

  // Validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [jsonError, setJsonError] = useState<string>('');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        setFormData(initialData);
      } else {
        setFormData(EMPTY_FORM);
      }
      setJsonInput(DEFAULT_JSON_TEMPLATE);
      setFormErrors({});
      setJsonError('');
      setMcpFormMode('form');
      setIsSaving(false);
    }
  }, [open, mode, initialData]);

  // Handle form field change
  const handleChange = useCallback((field: keyof McpFormData, value: string | string[] | Record<string, string>) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // Handle transport type change
  const handleTypeChange = useCallback((type: 'stdio' | 'http' | 'sse') => {
    setFormData(prev => ({ ...prev, type }));
    setFormErrors(prev => {
      const next = { ...prev };
      delete next.type;
      return next;
    });
  }, []);

  // Handle ID change with auto-lowercase and hyphen conversion
  const handleIdChange = useCallback((value: string) => {
    const converted = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    setFormData(prev => ({ ...prev, id: converted }));
    setFormErrors(prev => {
      const next = { ...prev };
      delete next.id;
      return next;
    });
  }, []);

  // Handle args change (parse from newline-separated string)
  const handleArgsChange = useCallback((value: string) => {
    const args = value.split('\n').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, args }));
  }, []);

  // Handle env change (parse from JSON textarea)
  const handleEnvChange = useCallback((value: string) => {
    try {
      const env = JSON.parse(value || '{}');
      setFormData(prev => ({ ...prev, env }));
      setFormErrors(prev => {
        const next = { ...prev };
        delete next.env;
        return next;
      });
    } catch {
      // Let user continue typing; validation will catch it
    }
  }, []);

  // Validate form
  const validateForm = useCallback((): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    if (!formData.type) {
      errors.type = '请选择传输协议';
    }
    if (!formData.id.trim()) {
      errors.id = 'ID 不能为空';
    }
    if (!formData.name.trim()) {
      errors.name = '名称不能为空';
    }
    if (formData.type === 'stdio' && !formData.command?.trim()) {
      errors.command = '命令不能为空';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }, [formData]);

  // Validate JSON
  const validateJson = useCallback((): { valid: boolean; error: string; data?: McpFormData[] } => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
        return { valid: false, error: 'JSON 必须包含 mcpServers 对象' };
      }

      // Convert to array of McpFormData
      const servers: McpFormData[] = [];
      for (const [id, config] of Object.entries(parsed.mcpServers)) {
        if (typeof config !== 'object' || config === null) {
          return { valid: false, error: `服务器 "${id}" 配置无效` };
        }
        const serverConfig = config as Record<string, unknown>;
        servers.push({
          type: 'stdio',
          id,
          name: id,
          command: serverConfig.command as string | undefined,
          args: (serverConfig.args as string[]) || [],
          env: (serverConfig.env as Record<string, string>) || {},
        });
      }

      return { valid: true, error: '', data: servers };
    } catch (_err) {
      return { valid: false, error: 'JSON 格式无效' };
    }
  }, [jsonInput]);

  // Toggle mode
  const handleToggleMode = useCallback(() => {
    setMcpFormMode(prev => prev === 'form' ? 'json' : 'form');
    setFormErrors({});
    setJsonError('');
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    if (mcpFormMode === 'form') {
      const { valid, errors } = validateForm();
      if (!valid) {
        setFormErrors(errors);
        return;
      }

      setIsSaving(true);
      try {
        await onSave(formData);
      } catch (_err) {
        toast.error('保存失败');
      } finally {
        setIsSaving(false);
      }
    } else {
      const { valid, error } = validateJson();
      if (!valid) {
        setJsonError(error);
        return;
      }

      setIsSaving(true);
      try {
        // Save first server from JSON (for single-server edit scenario)
        const { data } = validateJson();
        if (data && data.length > 0) {
          await onSave(data[0]);
        }
      } catch (_err) {
        toast.error('保存失败');
      } finally {
        setIsSaving(false);
      }
    }
  }, [mcpFormMode, formData, validateForm, validateJson, onSave, toast]);

  // Close handler
  const handleClose = useCallback(() => {
    if (!isSaving) {
      onCancel();
    }
  }, [isSaving, onCancel]);

  if (!open) return null;

  const isEditMode = mode === 'edit';
  const dialogTitle = isEditMode
    ? mcpFormMode === 'form' ? '编辑 MCP 服务器' : '编辑 MCP 服务器'
    : mcpFormMode === 'form' ? '添加 MCP 服务器' : '添加 MCP 服务器';
  const toggleButtonText = mcpFormMode === 'form' ? '切换为 JSON 配置' : '切换为添加面板';

  // Format args as newline-separated string for textarea display
  const argsDisplay = formData.args?.join('\n') || '';
  const envDisplay = JSON.stringify(formData.env || {}, null, 2);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      style={{ padding: '4vh 4vw' }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="mx-4 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[var(--paper-elevated)] shadow-xl max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">{dialogTitle}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMode}
              className="text-sm text-[var(--accent)] hover:underline"
              disabled={isSaving}
            >
              {toggleButtonText}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--paper-inset)] hover:text-[var(--ink)]"
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {mcpFormMode === 'form' ? (
            <div className="space-y-4">
              {/* Transport Protocol */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--ink-muted)]">
                  传输协议
                </label>
                <div className="mb-5 grid grid-cols-3 gap-2">
                  {TRANSPORT_TYPES.map(({ type, icon, name, description }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      disabled={isEditMode}
                      className={`flex flex-col items-center rounded-xl border p-3 transition-all ${
                        isEditMode
                          ? 'cursor-not-allowed opacity-50'
                          : formData.type === type
                            ? 'border-[var(--ink)] bg-[var(--paper-inset)]'
                            : 'border-[var(--line)] hover:border-[var(--ink-muted)]'
                      }`}
                    >
                      <span className="mb-1 text-xl">{icon}</span>
                      <span className={`text-sm font-medium ${formData.type === type ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>
                        {name}
                      </span>
                      <span className="text-xs text-[var(--ink-muted)]">{description}</span>
                    </button>
                  ))}
                </div>
                {formErrors.type && (
                  <p className="text-sm text-[var(--error)]">{formErrors.type}</p>
                )}
              </div>

              {/* ID */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                  ID <span className="text-[var(--error)]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => handleIdChange(e.target.value)}
                  placeholder="my-mcp-server"
                  disabled={isEditMode}
                  className={`w-full rounded-lg border bg-[var(--paper-elevated)] px-3 py-2.5 font-mono text-sm text-[var(--ink)] transition-colors focus:border-[var(--focus-border)] focus:outline-none ${
                    isEditMode ? 'cursor-not-allowed opacity-50' : ''
                  } ${formErrors.id ? 'border-[var(--error)]' : 'border-[var(--line)]'}`}
                />
                {formErrors.id ? (
                  <p className="mt-1 text-xs text-[var(--error)]">{formErrors.id}</p>
                ) : (
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    唯一标识符，用于内部引用，将自动转为小写
                  </p>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                  名称 <span className="text-[var(--error)]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="我的 MCP 服务器"
                  className={`w-full rounded-lg border bg-[var(--paper-elevated)] px-3 py-2.5 text-sm text-[var(--ink)] transition-colors focus:border-[var(--focus-border)] focus:outline-none ${formErrors.name ? 'border-[var(--error)]' : 'border-[var(--line)]'}`}
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-[var(--error)]">{formErrors.name}</p>
                )}
              </div>

              {/* Command (STDIO only) */}
              {formData.type === 'stdio' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                    命令 <span className="text-[var(--error)]">*</span>
                  </label>
                  <CustomSelect
                    value={formData.command || ''}
                    onChange={(value) => handleChange('command', value)}
                    options={COMMAND_OPTIONS}
                    placeholder="选择或输入命令"
                    className="w-full"
                  />
                  <input
                    type="text"
                    value={formData.command || ''}
                    onChange={(e) => handleChange('command', e.target.value)}
                    placeholder="npx"
                    className={`mt-2 w-full rounded-lg border bg-[var(--paper-elevated)] px-3 py-2.5 font-mono text-sm text-[var(--ink)] transition-colors focus:border-[var(--focus-border)] focus:outline-none ${formErrors.command ? 'border-[var(--error)]' : 'border-[var(--line)]'}`}
                  />
                  {formErrors.command && (
                    <p className="mt-1 text-xs text-[var(--error)]">{formErrors.command}</p>
                  )}
                </div>
              )}

              {/* Args */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                  参数 (可选)
                </label>
                <textarea
                  value={argsDisplay}
                  onChange={(e) => handleArgsChange(e.target.value)}
                  placeholder="--arg1&#10;--arg2"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--paper-elevated)] px-3 py-2.5 font-mono text-sm text-[var(--ink)] transition-colors focus:border-[var(--focus-border)] focus:outline-none"
                />
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  每行一个参数
                </p>
              </div>

              {/* Environment Variables */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                  环境变量 (可选)
                </label>
                <textarea
                  value={envDisplay}
                  onChange={(e) => handleEnvChange(e.target.value)}
                  placeholder='{ "API_KEY": "xxx" }'
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--paper-elevated)] px-3 py-2.5 font-mono text-sm text-[var(--ink)] transition-colors focus:border-[var(--focus-border)] focus:outline-none"
                />
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  JSON 格式，每行一个变量
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[var(--ink-muted)]">
                请粘贴完整的 JSON 配置，例如：
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  setJsonError('');
                }}
                placeholder={DEFAULT_JSON_TEMPLATE}
                rows={12}
                className="h-64 w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 font-mono text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/50 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              {jsonError && (
                <p className="text-sm text-[var(--error)]">{jsonError}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-[var(--line)] px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-lg bg-[var(--button-secondary-bg)] px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--button-secondary-bg-hover)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-[var(--button-primary-bg)] px-4 py-2 text-sm font-medium text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
