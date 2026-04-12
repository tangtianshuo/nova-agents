/**
 * GeminiImageConfigPanel - Gemini Image generation configuration panel
 *
 * Configuration panel for Gemini Image generation settings.
 * Includes API key, base URL, model selection, and aspect ratio.
 */
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';

/**
 * GeminiImageConfigPanel Props
 */
export interface GeminiImageConfigPanelProps {
  open: boolean;
  serverId: string;
  initialConfig?: GeminiImageConfig;
  onSave: (config: GeminiImageConfig) => Promise<void>;
  onCancel: () => void;
}

export interface GeminiImageConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  aspectRatio: string;
  imageSize: string;
  thinkingLevel: string;
  searchGrounding: boolean;
  maxContextTurns: number;
}

const DEFAULT_CONFIG: GeminiImageConfig = {
  apiKey: '',
  baseUrl: '',
  model: 'gemini-2.5-flash-image',
  aspectRatio: 'auto',
  imageSize: 'auto',
  thinkingLevel: 'auto',
  searchGrounding: false,
  maxContextTurns: 20,
};

const MODEL_OPTIONS = [
  {
    id: 'gemini-2.5-flash-image',
    label: 'Nano Banana',
    desc: 'Stable · 速度快 · 免费额度多',
  },
  {
    id: 'gemini-3-pro-image-preview',
    label: 'Nano Banana Pro',
    desc: 'Preview · 质量最高 · 文字渲染最佳',
  },
  {
    id: 'gemini-3.1-flash-image-preview',
    label: 'Nano Banana 2',
    desc: 'Preview · 速度+质量平衡（推荐）',
  },
];

const ASPECT_RATIOS = [
  { id: 'auto', label: '自动' },
  { id: '1:1', label: '1:1' },
  { id: '3:4', label: '3:4' },
  { id: '4:3', label: '4:3' },
  { id: '9:16', label: '9:16' },
  { id: '16:9', label: '16:9' },
  { id: '2:3', label: '2:3' },
  { id: '3:2', label: '3:2' },
  { id: '4:5', label: '4:5' },
  { id: '5:4', label: '5:4' },
  { id: '21:9', label: '21:9' },
];

const IMAGE_SIZES = [
  { id: 'auto', label: '自动' },
  { id: '1K', label: '1K' },
  { id: '2K', label: '2K' },
  { id: '4K', label: '4K' },
];

const THINKING_LEVELS = [
  { id: 'auto', label: '自动', desc: '不传参数 · 由模型决定' },
  { id: 'minimal', label: '快速', desc: '速度优先（模型默认值）' },
  { id: 'high', label: '高质量', desc: '推理更深 · 生成更精细但更慢' },
];

export default function GeminiImageConfigPanel({
  open,
  serverId: _serverId,
  initialConfig,
  onSave,
  onCancel,
}: GeminiImageConfigPanelProps) {
  const toast = useToast();

  // Form state
  const [config, setConfig] = useState<GeminiImageConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Click-outside-to-close pattern
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  // Reset form when panel opens
  useEffect(() => {
    if (open) {
      setConfig(initialConfig ?? DEFAULT_CONFIG);
      setIsSaving(false);
      setShowAdvanced(false);
    }
  }, [open, initialConfig]);

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

  // Field update helper
  const updateConfig = useCallback(<K extends keyof GeminiImageConfig>(key: K, value: GeminiImageConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // Toggle search grounding
  const handleToggleSearchGrounding = useCallback(() => {
    updateConfig('searchGrounding', !config.searchGrounding);
  }, [config.searchGrounding, updateConfig]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!config.apiKey.trim()) {
      toast.error('请输入 API Key');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(config);
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [config, onSave, toast]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-8"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        className="mx-4 w-full max-w-lg flex flex-col max-h-[85vh] rounded-2xl bg-[var(--paper-elevated)] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4 border-b border-[var(--line)]">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--ink)]">Gemini 图片生成 设置</h2>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              配置 Google Gemini 图片生成参数
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--paper-inset)] hover:text-[var(--ink)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* API Key */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">
              API Key <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={e => updateConfig('apiKey', e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] placeholder-[var(--ink-muted)]/50 outline-none focus:border-[var(--accent)] font-mono"
            />
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              从{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                aistudio.google.com/apikey
              </a>{' '}
              免费获取
            </p>
          </div>

          {/* Base URL */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">API Base URL</label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={e => updateConfig('baseUrl', e.target.value)}
              placeholder="留空使用官方端点"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] placeholder-[var(--ink-muted)]/50 outline-none focus:border-[var(--accent)] font-mono"
            />
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              留空使用官方端点。支持兼容 Gemini 原生协议的第三方中转
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink)]">模型</label>
            <div className="flex flex-wrap gap-2">
              {MODEL_OPTIONS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateConfig('model', m.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    config.model === m.id
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--ink-muted)]'
                  }`}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className="text-[10px] opacity-70">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink)]">默认宽高比</label>
            <div className="flex flex-wrap gap-1.5">
              {ASPECT_RATIOS.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => updateConfig('aspectRatio', r.id)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    r.id !== 'auto' ? 'font-mono' : ''
                  } ${
                    config.aspectRatio === r.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--paper-inset)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              自动 = 不传参数，由模型决定（默认 1:1）
            </p>
          </div>

          {/* Resolution */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink)]">默认分辨率</label>
            <div className="flex gap-2">
              {IMAGE_SIZES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updateConfig('imageSize', s.id)}
                  className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                    config.imageSize === s.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--paper-inset)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              自动 = 不传参数，由模型决定（默认 1K）
            </p>
          </div>

          {/* Advanced Section Toggle */}
          <div className="border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
            >
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              高级设置
            </button>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-5">
              {/* Thinking Level */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--ink)]">推理深度</label>
                <div className="flex flex-wrap gap-2">
                  {THINKING_LEVELS.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateConfig('thinkingLevel', t.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                        config.thinkingLevel === t.id
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--ink-muted)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Grounding */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--ink)]">搜索增强</div>
                  <div className="text-xs text-[var(--ink-muted)]">
                    生成前搜索 Google 获取实时信息（人物、事件、天气等）
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSearchGrounding}
                  className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                    config.searchGrounding ? 'bg-[var(--accent)]' : 'bg-[var(--line-strong)]'
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      config.searchGrounding ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Max Context Turns */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">
                  单次图片会话最大编辑轮次
                </label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={config.maxContextTurns}
                  onChange={e =>
                    updateConfig('maxContextTurns', parseInt(e.target.value, 10) || 20)
                  }
                  className="w-20 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  超过后自动开始新会话（防止请求体过大）
                </p>
              </div>
            </div>
          )}
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
            disabled={isSaving || !config.apiKey.trim()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-40 flex items-center gap-2"
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
