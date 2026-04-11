/**
 * CustomProviderDialog - Add/edit custom model provider dialog
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/components/Toast';

export interface CustomProviderDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  initialData?: CustomProviderFormData;
  onSave: (data: CustomProviderFormData) => Promise<void>;
  onCancel: () => void;
}

export interface CustomProviderFormData {
  name: string;
  cloudProvider: string;
  apiProtocol: 'openai' | 'anthropic' | 'custom';
  baseUrl: string;
  primaryModel: string;
  maxTokens?: number;
  authType?: 'apiKey' | 'none';
}

const EMPTY_FORM: CustomProviderFormData = {
  name: '',
  cloudProvider: '',
  apiProtocol: 'openai',
  baseUrl: '',
  primaryModel: '',
  maxTokens: undefined,
  authType: 'apiKey',
};

export default function CustomProviderDialog({
  open,
  mode,
  initialData,
  onSave,
  onCancel,
}: CustomProviderDialogProps) {
  const toast = useToast();

  // Form state
  const [formData, setFormData] = useState<CustomProviderFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Only close on genuine clicks (mousedown + mouseup both on backdrop).
  // Prevents closing when user drags a text selection out of the modal.
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData(initialData ?? EMPTY_FORM);
      setErrors({});
      setIsSaving(false);
    }
  }, [open, initialData]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  // Click-outside-to-close pattern
  const handleBackdropMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel]
  );

  // Form validation
  const validateForm = useCallback((): { valid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '供应商名称不能为空';
    }
    if (!formData.baseUrl.trim()) {
      newErrors.baseUrl = 'API Base URL 不能为空';
    } else {
      try {
        new URL(formData.baseUrl);
      } catch {
        newErrors.baseUrl = '请输入有效的 URL';
      }
    }
    if (!formData.primaryModel.trim()) {
      newErrors.primaryModel = '主模型不能为空';
    }

    return { valid: Object.keys(newErrors).length === 0, errors: newErrors };
  }, [formData]);

  // Field change handler
  const handleChange = useCallback((field: keyof CustomProviderFormData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  // Protocol change handler
  const handleProtocolChange = useCallback((protocol: 'openai' | 'anthropic' | 'custom') => {
    setFormData(prev => ({ ...prev, apiProtocol: protocol }));
  }, []);

  // Auth type change handler
  const handleAuthTypeChange = useCallback((authType: 'apiKey' | 'none') => {
    setFormData(prev => ({ ...prev, authType }));
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    const { valid, errors: validationErrors } = validateForm();
    if (!valid) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      toast.success(mode === 'add' ? '供应商已添加' : '供应商已更新');
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [formData, mode, onSave, toast, validateForm]);

  if (!open) return null;

  const protocolOptions: Array<{ value: 'openai' | 'anthropic' | 'custom'; label: string }> = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'custom', label: '自定义' },
  ];

  const authTypeOptions: Array<{ value: 'apiKey' | 'none'; label: string }> = [
    { value: 'apiKey', label: 'API Key' },
    { value: 'none', label: '无需认证' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-8"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        className="mx-4 w-full max-w-md flex flex-col max-h-[90vh] rounded-2xl bg-[var(--paper-elevated)] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            {mode === 'add' ? '添加自定义供应商' : '编辑供应商'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-inset)] hover:text-[var(--ink)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
          {/* 供应商名称 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              供应商名称 <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="例如: My Custom Provider"
              className={`w-full rounded-lg border bg-[var(--paper-elevated)] px-3 py-2.5 text-sm transition-colors focus:outline-none ${
                errors.name
                  ? 'border-[var(--error)] focus:border-[var(--error)]'
                  : 'border-[var(--line)] focus:border-[var(--ink)]'
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-[var(--error)]">{errors.name}</p>}
          </div>

          {/* 供应商商标 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              供应商商标
            </label>
            <input
              type="text"
              value={formData.cloudProvider}
              onChange={e => handleChange('cloudProvider', e.target.value)}
              placeholder="例如: 云服务商"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper-elevated)] px-3 py-2.5 text-sm transition-colors focus:border-[var(--ink)] focus:outline-none"
            />
          </div>

          {/* API 协议 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              API 协议
            </label>
            <div className="flex gap-2">
              {protocolOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleProtocolChange(option.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    formData.apiProtocol === option.value
                      ? 'border-[var(--ink)] bg-[var(--paper-inset)] text-[var(--ink)]'
                      : 'border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--ink-muted)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {formData.apiProtocol === 'openai' && (
              <p className="mb-1.5 mt-2 text-xs text-[var(--ink-muted)]">
                ⚠️ 通过内置桥接自动转换，请求可能受网络延迟影响
              </p>
            )}
          </div>

          {/* 服务端点 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              服务端点 <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={e => handleChange('baseUrl', e.target.value)}
              placeholder="https://api.example.com/v1"
              className={`w-full rounded-lg border bg-[var(--paper-elevated)] px-3 py-2.5 text-sm transition-colors focus:outline-none ${
                errors.baseUrl
                  ? 'border-[var(--error)] focus:border-[var(--error)]'
                  : 'border-[var(--line)] focus:border-[var(--ink)]'
              }`}
            />
            {errors.baseUrl && <p className="mt-1 text-xs text-[var(--error)]">{errors.baseUrl}</p>}
          </div>

          {/* 主模型 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              主模型 <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={formData.primaryModel}
              onChange={e => handleChange('primaryModel', e.target.value)}
              placeholder="例如: gpt-4"
              className={`w-full rounded-lg border bg-[var(--paper-elevated)] px-3 py-2.5 text-sm transition-colors focus:outline-none ${
                errors.primaryModel
                  ? 'border-[var(--error)] focus:border-[var(--error)]'
                  : 'border-[var(--line)] focus:border-[var(--ink)]'
              }`}
            />
            {errors.primaryModel && (
              <p className="mt-1 text-xs text-[var(--error)]">{errors.primaryModel}</p>
            )}
          </div>

          {/* 最大输出 Tokens */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              最大输出 Tokens
            </label>
            <input
              type="number"
              value={formData.maxTokens ?? ''}
              onChange={e =>
                handleChange(
                  'maxTokens',
                  e.target.value ? parseInt(e.target.value, 10) : undefined
                )
              }
              placeholder="4096"
              min={1}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper-elevated)] px-3 py-2.5 text-sm transition-colors focus:border-[var(--ink)] focus:outline-none"
            />
          </div>

          {/* 认证方式 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              认证方式
            </label>
            <div className="flex gap-2">
              {authTypeOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleAuthTypeChange(option.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    formData.authType === option.value
                      ? 'border-[var(--ink)] bg-[var(--paper-inset)] text-[var(--ink)]'
                      : 'border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--ink-muted)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-[var(--line)] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--ink)] bg-[var(--button-secondary-bg)] hover:bg-[var(--button-secondary-bg-hover)] transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--button-primary-text)] bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
