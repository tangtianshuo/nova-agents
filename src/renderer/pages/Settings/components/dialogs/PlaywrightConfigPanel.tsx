/**
 * PlaywrightConfigPanel - Playwright browser automation configuration panel
 *
 * Configuration panel for Playwright browser automation settings.
 * Includes browser selection, viewport, headless mode, and device emulation.
 */
import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';
import {
  DEFAULT_CONFIG,
  type PlaywrightConfig,
  type StorageStateInfo,
  KNOWN_BROWSERS,
  DEVICE_PRESETS,
} from './PlaywrightConfig';

/**
 * PlaywrightConfigPanel Props
 */
export interface PlaywrightConfigPanelProps {
  open: boolean;
  serverId: string;
  initialConfig?: PlaywrightConfig;
  onSave: (config: PlaywrightConfig) => Promise<void>;
  onCancel: () => void;
}

export default function PlaywrightConfigPanel({
  open,
  serverId: _serverId,
  initialConfig,
  onSave,
  onCancel,
}: PlaywrightConfigPanelProps) {
  const toast = useToast();

  // Form state
  const [config, setConfig] = useState<PlaywrightConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [newArg, setNewArg] = useState('');

  // Storage state for isolated mode
  const [storageStateInfo, setStorageStateInfo] = useState<StorageStateInfo | null>(null);

  // Click-outside-to-close pattern
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  // Reset form when panel opens
  useEffect(() => {
    if (open) {
      setConfig(initialConfig ?? DEFAULT_CONFIG);
      setIsSaving(false);
      setNewArg('');
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

  // Load storage state info when isolated mode is selected
  useEffect(() => {
    if (!open || config.mode !== 'isolated') return;

    const loadStorageState = async () => {
      try {
        const { homeDir, join } = await import('@tauri-apps/api/path');
        const { exists, readTextFile, stat } = await import('@tauri-apps/plugin-fs');
        const home = await homeDir();
        const ssPath = await join(home, '.nova-agents', 'browser-storage-state.json');

        if (await exists(ssPath)) {
          const content = await readTextFile(ssPath);
          const parsed = JSON.parse(content);
          const cookies = (parsed.cookies ?? []).map((c: Record<string, unknown>) => ({
            name: String(c.name ?? ''),
            value: String(c.value ?? ''),
            domain: String(c.domain ?? ''),
            path: String(c.path ?? '/'),
            secure: !!c.secure,
            httpOnly: !!c.httpOnly,
          }));
          const domains = [...new Set(cookies.map((c: { domain: string }) => c.domain.replace(/^\./, '')))] as string[];
          await stat(ssPath).catch(() => null); // File exists check but stat not used
          setStorageStateInfo({
            exists: true,
            cookieCount: cookies.length,
            domains,
            cookies,
          });
        } else {
          setStorageStateInfo({ exists: false, cookieCount: 0, domains: [], cookies: [] });
        }
      } catch {
        setStorageStateInfo({ exists: false, cookieCount: 0, domains: [], cookies: [] });
      }
    };

    loadStorageState();
  }, [open, config.mode]);

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
  const updateConfig = useCallback(<K extends keyof PlaywrightConfig>(key: K, value: PlaywrightConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // Toggle headless mode
  const handleToggleHeadless = useCallback(() => {
    updateConfig('headless', !config.headless);
  }, [config.headless, updateConfig]);

  // Toggle browser mode
  const handleToggleMode = useCallback((mode: 'persistent' | 'isolated') => {
    updateConfig('mode', mode);
  }, [updateConfig]);

  // Add extra arg
  const handleAddArg = useCallback(() => {
    if (!newArg.trim()) return;
    setConfig(prev => ({
      ...prev,
      extraArgs: [...prev.extraArgs, newArg.trim()],
    }));
    setNewArg('');
  }, [newArg]);

  // Remove extra arg
  const handleRemoveArg = useCallback((index: number) => {
    setConfig(prev => ({
      ...prev,
      extraArgs: prev.extraArgs.filter((_, i) => i !== index),
    }));
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
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

  const browserItems = KNOWN_BROWSERS.some(b => b.id === config.browser)
    ? KNOWN_BROWSERS
    : [...KNOWN_BROWSERS, { id: config.browser, label: config.browser }];

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
            <h2 className="text-lg font-semibold text-[var(--ink)]">Playwright 浏览器设置</h2>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              配置 Playwright 浏览器自动化行为
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
          {/* Headless Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--ink)]">无头模式</div>
              <div className="text-xs text-[var(--ink-muted)]">后台运行，不弹出浏览器窗口</div>
            </div>
            <button
              type="button"
              onClick={handleToggleHeadless}
              className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                config.headless ? 'bg-[var(--accent)]' : 'bg-[var(--line-strong)]'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  config.headless ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Browser Selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink)]">浏览器</label>
            <div className="flex flex-wrap gap-1.5">
              {browserItems.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => updateConfig('browser', b.id)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    config.browser === b.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--paper-inset)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Device Emulation */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink)]">设备模拟</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: '', label: '不模拟' },
                ...DEVICE_PRESETS.map(name => ({ id: name, label: name })),
                { id: '__custom__', label: '自定义' },
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => updateConfig('device', d.id)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    config.device === d.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--paper-inset)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {config.device === '__custom__' && (
              <input
                type="text"
                value={config.customDevice}
                onChange={e => updateConfig('customDevice', e.target.value)}
                placeholder="输入设备名称，如 Galaxy S24"
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] placeholder-[var(--ink-muted)]/50 outline-none focus:border-[var(--accent)]"
              />
            )}
          </div>

          {/* Browser Mode Selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink)]">浏览器模式</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleToggleMode('persistent')}
                className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  config.mode === 'persistent'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-[var(--line)] hover:border-[var(--line-strong)]'
                }`}
              >
                <div
                  className={`text-xs font-medium ${
                    config.mode === 'persistent' ? 'text-[var(--accent)]' : 'text-[var(--ink)]'
                  }`}
                >
                  持久化模式
                </div>
                <div className="mt-0.5 text-[10px] leading-tight text-[var(--ink-muted)]">
                  登录态完整保留，同一时间仅一个对话可使用
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleToggleMode('isolated')}
                className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  config.mode === 'isolated'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-[var(--line)] hover:border-[var(--line-strong)]'
                }`}
              >
                <div
                  className={`text-xs font-medium ${
                    config.mode === 'isolated' ? 'text-[var(--accent)]' : 'text-[var(--ink)]'
                  }`}
                >
                  独立模式
                </div>
                <div className="mt-0.5 text-[10px] leading-tight text-[var(--ink-muted)]">
                  多对话可同时使用，登录态通过快照共享
                </div>
              </button>
            </div>
          </div>

          {/* Persistent Mode: user-data-dir */}
          {config.mode === 'persistent' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">
                浏览器数据目录
              </label>
              <input
                type="text"
                value={config.userDataDir}
                onChange={e => updateConfig('userDataDir', e.target.value)}
                placeholder="~/.playwright-mcp-profile"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] placeholder-[var(--ink-muted)]/50 outline-none focus:border-[var(--accent)] font-mono"
              />
              <div className="mt-2 rounded-lg bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning)]">
                持久化模式下，同一时间只能有一个对话使用浏览器，其他对话需等待
              </div>
            </div>
          )}

          {/* Isolated Mode: storage state info */}
          {config.mode === 'isolated' && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--ink)]">登录态管理</label>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  添加 Cookie
                </button>
              </div>
              <p className="mb-2 text-xs text-[var(--ink-muted)]">
                每个对话使用独立浏览器，登录状态通过 Cookie 快照跨对话共享
              </p>
              {storageStateInfo && storageStateInfo.cookies.length > 0 ? (
                <div className="rounded-lg border border-[var(--line)] overflow-hidden">
                  {storageStateInfo.cookies.map((cookie, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between px-3 py-2 ${
                        idx > 0 ? 'border-t border-[var(--line)]' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-medium text-[var(--ink)]">
                            {cookie.name}
                          </span>
                          <span className="text-[10px] text-[var(--ink-muted)]">{cookie.domain}</span>
                        </div>
                        <div className="mt-0.5 max-w-[280px] truncate font-mono text-[10px] text-[var(--ink-muted)]">
                          {cookie.value}
                        </div>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="rounded p-1 text-[var(--ink-muted)] hover:bg-[var(--paper-inset)] hover:text-[var(--ink)]"
                        >
                          <svg
                            className="h-3 w-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-[var(--ink-muted)] hover:bg-[var(--paper-inset)] hover:text-[var(--error)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--line)] px-3 py-4 text-center text-xs text-[var(--ink-muted)]">
                  暂无保存的 Cookie
                </div>
              )}
            </div>
          )}

          {/* Extra Args */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              额外启动参数
            </label>
            <div className="space-y-2">
              {config.extraArgs.map((arg, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
                >
                  <code className="flex-1 truncate font-mono text-xs text-[var(--ink)]">{arg}</code>
                  <button
                    type="button"
                    onClick={() => handleRemoveArg(idx)}
                    className="shrink-0 rounded p-0.5 text-[var(--ink-muted)] hover:bg-[var(--paper-inset)] hover:text-[var(--error)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newArg}
                  onChange={e => setNewArg(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newArg.trim()) {
                      e.preventDefault();
                      handleAddArg();
                    }
                  }}
                  placeholder="例如: --timeout=30000"
                  className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] placeholder-[var(--ink-muted)]/50 outline-none focus:border-[var(--accent)] font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddArg}
                  disabled={!newArg.trim()}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink)] bg-[var(--button-secondary-bg)] hover:bg-[var(--button-secondary-bg-hover)] transition-colors disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加
                </button>
              </div>
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
