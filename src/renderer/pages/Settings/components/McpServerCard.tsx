import React from 'react';
import { Globe, Loader2, Settings2 } from 'lucide-react';
import { type McpServerType } from '@/config/types';

/**
 * McpServerCard - Display and manage a single MCP server
 *
 * Shows server name, description, enable toggle, and settings button.
 * Used in McpSection list layout with builtin servers and custom servers.
 */
export interface McpServerCardProps {
  server: {
    id: string;
    name: string;
    description?: string;
    type: McpServerType;
    isBuiltin: boolean;
    isFree?: boolean;
    command?: string;
    args?: string[];
    requiresConfig?: string[];
  };
  isEnabled: boolean;
  isEnabling: boolean;
  needsConfig: boolean;
  onToggle: (server: McpServerCardProps['server'], enabled: boolean) => void;
  onEdit: (server: McpServerCardProps['server']) => void;
}

/**
 * McpServerCard - Reusable MCP server card
 *
 * Extracted from McpSection inline markup per 03-03 plan.
 * Features:
 * - Server header with name, globe icon, and badges
 * - Description text (truncated)
 * - Config warning if needed
 * - Command display for non-builtin servers
 * - Settings button and toggle switch
 */
export default function McpServerCard({
  server,
  isEnabled,
  isEnabling,
  needsConfig,
  onToggle,
  onEdit,
}: McpServerCardProps) {
  const handleSettingsClick = () => {
    onEdit(server);
  };

  const handleToggle = () => {
    onToggle(server, !isEnabled);
  };

  return (
    <div className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-5 hover:border-[var(--line-strong)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-[var(--accent-warm)]/70" />
            <h3 className="truncate font-semibold text-[var(--ink)]" title={server.name}>{server.name}</h3>
            {server.isBuiltin && (
              <span className="shrink-0 rounded-full border border-[var(--info)]/20 bg-[var(--info-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--info)]">
                预设
              </span>
            )}
            {server.isFree && (
              <span className="shrink-0 rounded-full border border-[var(--success)]/20 bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--success)]">
                免费
              </span>
            )}
            {/* Status indicator when enabling */}
            {isEnabling && (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--info)]" />
            )}
          </div>
          {server.description && (
            <p className="mt-1 truncate text-xs text-[var(--ink-muted)]" title={server.description}>
              {server.description}
            </p>
          )}
          {needsConfig && (
            <p className="mt-1 text-xs text-[var(--warning)]">
              ⚠️ 需要配置 API Key
            </p>
          )}
          {server.command && server.command !== '__builtin__' && (
            <p className="mt-2 truncate font-mono text-[10px] text-[var(--ink-muted)]" title={`${server.command} ${server.args?.join(' ') ?? ''}`}>
              {server.command} {server.args?.join(' ')}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleSettingsClick}
            className="rounded-lg p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-inset)] hover:text-[var(--ink)]"
            title="设置"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleToggle}
            disabled={isEnabling}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              isEnabling
                ? 'bg-[var(--info)]/60 cursor-wait'
                : isEnabled
                  ? 'cursor-pointer bg-[var(--accent)]'
                  : 'cursor-pointer bg-[var(--line-strong)]'
            }`}
            title={isEnabling ? '启用中...' : isEnabled ? '已启用' : '点击启用'}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--toggle-thumb)] shadow transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}