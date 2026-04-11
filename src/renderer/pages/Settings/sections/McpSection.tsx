import React from 'react';
import { Plus } from 'lucide-react';
import { ExternalLink } from '@/components/ExternalLink';
import { useToast } from '@/components/Toast';
import {
  type McpServerDefinition,
  MCP_DISCOVERY_LINKS,
} from '@/config/types';
import McpServerCard from '../components/McpServerCard';

export interface McpSectionProps {
  servers: McpServerDefinition[];
  enabledIds: string[];
  enablingIds: Record<string, boolean>;
  needsConfig: Record<string, boolean>;
  onAddServer: () => void;
  onEditServer: (server: McpServerDefinition) => void;
  onEditBuiltinServer: (server: McpServerDefinition) => void;
  onToggleServer: (server: McpServerDefinition, enabled: boolean) => void;
  onServersChange?: (servers: McpServerDefinition[]) => void;
  onDeleteServer?: (server: McpServerDefinition) => void;
}

/**
 * McpSection - Display and manage MCP servers
 *
 * Extracted from original Settings.tsx (lines 2594-2707).
 * Contains MCP servers grid, enable/disable toggle, settings button, and discovery links.
 */
export default function McpSection({
  servers,
  enabledIds,
  enablingIds,
  needsConfig,
  onAddServer,
  onEditServer,
  onEditBuiltinServer,
  onToggleServer,
  onServersChange,
  onDeleteServer,
}: McpSectionProps) {
  const toast = useToast();

  // Handle settings button click - routes to appropriate edit handler
  const handleSettingsClick = (server: McpServerDefinition) => {
    if (server.isBuiltin) {
      onEditBuiltinServer(server);
    } else {
      onEditServer(server);
    }
  };

  // Handle toggle - delegates to parent's onToggleServer
  const handleToggle = (server: McpServerDefinition, enabled: boolean) => {
    onToggleServer(server, enabled);
  };

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--ink)]">工具 MCP</h2>
        <button
          onClick={onAddServer}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--button-primary-bg)] px-3 py-1.5 text-sm font-medium text-[var(--button-primary-text)] transition-colors hover:bg-[var(--button-primary-bg-hover)]"
        >
          <Plus className="h-3.5 w-3.5" />
          添加
        </button>
      </div>

      {/* Description */}
      <p className="mb-6 text-sm text-[var(--ink-muted)]">
        MCP (Model Context Protocol) 扩展能力让 Agent 可以使用更多工具
      </p>

      {/* MCP Server list */}
      <div className="grid grid-cols-2 gap-4">
        {servers.map((server) => {
          const isEnabled = enabledIds.includes(server.id);
          const isEnabling = enablingIds[server.id] ?? false;
          return (
            <div
              key={server.id}
              className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-5 hover:border-[var(--line-strong)]"
            >
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
                    {/* Status indicator */}
                    {isEnabling && (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--info)]" />
                    )}
                  </div>
                  {server.description && (
                    <p className="mt-1 truncate text-xs text-[var(--ink-muted)]" title={server.description}>
                      {server.description}
                    </p>
                  )}
                  {needsConfig[server.id] && (
                    <p className="mt-1 text-xs text-[var(--warning)]">
                      ⚠️ 需要配置 API Key
                    </p>
                  )}
                  {server.command !== '__builtin__' && (
                    <p className="mt-2 truncate font-mono text-[10px] text-[var(--ink-muted)]" title={`${server.command} ${server.args?.join(' ') ?? ''}`}>
                      {server.command} {server.args?.join(' ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => handleSettingsClick(server)}
                    className="rounded-lg p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-inset)] hover:text-[var(--ink)]"
                    title="设置"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggle(server, !isEnabled)}
                    disabled={isEnabling}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isEnabling
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
        })}
      </div>

      {/* Discovery links */}
      <div className="mt-8 rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-elevated)] p-4">
        <p className="text-sm text-[var(--ink-muted)]">
          更多 MCP 可以在以下网站寻找：
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          {MCP_DISCOVERY_LINKS.map((link) => (
            <ExternalLink
              key={link.url}
              href={link.url}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--paper-elevated)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] shadow-sm transition-colors hover:bg-[var(--info-bg)] hover:text-[var(--info)]"
            >
              {link.name}
              <ExternalLink.Icon className="h-3 w-3" />
            </ExternalLink>
          ))}
        </div>
      </div>
    </div>
  );
}
