import { useCallback } from 'react';
import { useToast } from '@/components/Toast';
import CustomSelect from '@/components/CustomSelect';
import type { AppConfig, Project } from '@/config/types';

/**
 * GeneralSection - General settings (startup, theme, workspace)
 *
 * Contains auto-start toggle, theme selector, minimize to tray toggle,
 * and default workspace selection. All props are required except
 * autostartLoading which controls the toggle's loading state.
 */
export interface GeneralSectionProps {
  config: AppConfig;
  autostartEnabled: boolean;
  autostartLoading: boolean;
  workspaces: Project[];
  onUpdateConfig: (updates: Partial<AppConfig>) => void;
  onToggleAutostart: () => Promise<boolean>;
}

// ToggleSwitch component for boolean settings
function ToggleSwitch({
  enabled,
  loading,
  onToggle,
}: {
  enabled: boolean;
  loading?: boolean;
  onToggle: () => void | Promise<void>;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        loading
          ? 'cursor-wait bg-[var(--info)]/60'
          : enabled
            ? 'cursor-pointer bg-[var(--accent)]'
            : 'cursor-pointer bg-[var(--line-strong)]'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/**
 * GeneralSection - Application-level settings
 *
 * Contains startup behavior, theme selection, and default workspace settings.
 * Uses card-based layout matching ProviderSection/McpSection patterns.
 */
export default function GeneralSection({
  config,
  autostartEnabled,
  autostartLoading,
  workspaces,
  onUpdateConfig,
  onToggleAutostart,
}: GeneralSectionProps) {
  const toast = useToast();

  // Handle auto-start toggle (async operation with loading state)
  const handleToggleAutostart = useCallback(async () => {
    try {
      const success = await onToggleAutostart();
      if (success) {
        toast.success(
          autostartEnabled ? '已关闭开机启动' : '已开启开机启动'
        );
      } else {
        toast.error('设置失败，请重试');
      }
    } catch (err) {
      toast.error('设置失败，请重试');
      console.error('[GeneralSection] Failed to toggle autostart:', err);
    }
  }, [autostartEnabled, onToggleAutostart, toast]);

  // Handle minimize to tray toggle (immediate update)
  const handleToggleMinimizeToTray = useCallback(() => {
    onUpdateConfig({ minimizeToTray: !config.minimizeToTray });
    toast.success(
      config.minimizeToTray ? '已关闭最小化到托盘' : '已开启最小化到托盘'
    );
  }, [config.minimizeToTray, onUpdateConfig, toast]);

  // Handle theme change
  const handleThemeChange = useCallback(
    (theme: 'system' | 'light' | 'dark') => {
      onUpdateConfig({ theme });
    },
    [onUpdateConfig]
  );

  // Handle default workspace change
  const handleDefaultWorkspaceChange = useCallback(
    (workspaceId: string) => {
      const workspace = workspaces.find((ws) => ws.id === workspaceId);
      if (workspace) {
        onUpdateConfig({ defaultWorkspacePath: workspace.path });
      }
    },
    [workspaces, onUpdateConfig]
  );

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--ink)]">通用设置</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          配置应用程序的通用行为
        </p>
      </div>

      {/* Startup Settings Card */}
      <div className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-5">
        <h3 className="text-base font-medium text-[var(--ink)]">启动设置</h3>

        {/* Auto-start toggle */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex-1 pr-4">
            <div className="text-sm font-medium text-[var(--ink)]">开机启动</div>
            <div className="text-xs text-[var(--ink-muted)]">
              系统启动时自动运行 NovaAgents
            </div>
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
            <div className="text-sm font-medium text-[var(--ink)]">
              最小化到托盘
            </div>
            <div className="text-xs text-[var(--ink-muted)]">
              关闭窗口时最小化到系统托盘而非退出应用
            </div>
          </div>
          <ToggleSwitch
            enabled={config.minimizeToTray}
            onToggle={handleToggleMinimizeToTray}
          />
        </div>

        {/* Theme selector */}
        <div className="mt-6">
          <div className="mb-2 text-sm font-medium text-[var(--ink)]">主题</div>
          <div className="mb-3 text-xs text-[var(--ink-muted)]">
            设置应用外观模式
          </div>
          <div className="flex gap-0.5 rounded-full bg-[var(--paper-inset)] p-0.5">
            {[
              { value: 'system', label: '跟随系统' },
              { value: 'light', label: '日间模式' },
              { value: 'dark', label: '夜间模式' },
            ].map((theme) => (
              <button
                key={theme.value}
                onClick={() =>
                  handleThemeChange(theme.value as 'system' | 'light' | 'dark')
                }
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
        <div className="mt-2 mb-4 text-xs text-[var(--ink-muted)]">
          选择应用启动时默认打开的工作区
        </div>
        <CustomSelect
          value={
            workspaces.find((ws) => ws.path === config.defaultWorkspacePath)
              ?.id || ''
          }
          onChange={handleDefaultWorkspaceChange}
          options={workspaces.map((ws) => ({
            value: ws.id,
            label: ws.name,
          }))}
          placeholder="选择默认工作区"
        />
      </div>
    </div>
  );
}
