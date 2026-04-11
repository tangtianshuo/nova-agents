import React from 'react';
import { Plus, ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { ExternalLink } from '@/components/ExternalLink';
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
        {servers.map((server) => (
          <McpServerCard
            key={server.id}
            server={server}
            isEnabled={enabledIds.includes(server.id)}
            isEnabling={enablingIds[server.id] ?? false}
            needsConfig={needsConfig[server.id] ?? false}
            onToggle={handleToggle}
            onEdit={handleSettingsClick}
          />
        ))}
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
              <ExternalLinkIcon className="h-3 w-3" />
            </ExternalLink>
          ))}
        </div>
      </div>
    </div>
  );
}
