import React from 'react';
import {
  Settings2,
  Globe,
  KeyRound,
  Sparkles,
  Bot,
  MessageSquare,
  BarChart3,
  Info,
  User,
  Package,
} from 'lucide-react';
import type { AppConfig } from '@/config/types';
import type { SettingsSection } from './SettingsLayout';

export interface SettingsSidebarProps {
  /** Currently active section */
  activeSection: SettingsSection;
  /** Callback when section changes */
  onSectionChange: (section: SettingsSection) => void;
  /** App configuration */
  config: AppConfig;
}

/**
 * SettingsSidebar - Navigation sidebar for Settings page
 *
 * Controlled component (no internal state per D-03).
 * Displays all 9 sections with icons, highlights active section.
 */
const SECTIONS = [
  { id: 'general' as SettingsSection, label: '通用', icon: Settings2 },
  { id: 'account' as SettingsSection, label: '账户', icon: User },
  { id: 'providers' as SettingsSection, label: '供应商', icon: Globe },
  { id: 'mcp' as SettingsSection, label: 'MCP 工具', icon: Package },
  { id: 'skills' as SettingsSection, label: '技能', icon: Sparkles },
  { id: 'sub-agents' as SettingsSection, label: '子 Agent', icon: Bot },
  { id: 'agent' as SettingsSection, label: 'IM Bot', icon: MessageSquare },
  { id: 'usage-stats' as SettingsSection, label: '使用统计', icon: BarChart3 },
  { id: 'about' as SettingsSection, label: '关于', icon: Info },
] as const;

export default function SettingsSidebar({
  activeSection,
  onSectionChange,
  config,
}: SettingsSidebarProps) {
  return (
    <nav className="flex h-full w-52 flex-col border-r border-[var(--line)] bg-[var(--paper)]">
      {/* Navigation header */}
      <div className="p-4 border-b border-[var(--line)]">
        <h2 className="text-sm font-semibold text-[var(--ink)]">设置</h2>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto py-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionChange(section.id)}
              className={`
                mx-2 mb-1 flex items-center gap-3 rounded-lg px-3 py-2
                text-[13px] font-medium transition-colors
                ${
                  isActive
                    ? 'bg-[var(--hover-bg)] text-[var(--ink)]'
                    : 'text-[var(--ink-muted)] hover:bg-[var(--paper-inset)] hover:text-[var(--ink)]'
                }
              `}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer section */}
      <div className="p-4 border-t border-[var(--line)]">
        <div className="text-xs text-[var(--ink-subtle)]">
          {config.version ?? 'Development'}
        </div>
      </div>
    </nav>
  );
}
