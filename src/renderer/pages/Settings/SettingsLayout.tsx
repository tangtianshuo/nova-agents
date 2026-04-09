import React from 'react';
import type { AppConfig } from '@/config/types';

// SettingsSection type from existing Settings.tsx
export type SettingsSection = 'general' | 'providers' | 'mcp' | 'skills' | 'sub-agents' | 'agent' | 'usage-stats' | 'about' | 'account';

export interface SettingsLayoutProps {
  /** Currently active section */
  activeSection: SettingsSection;
  /** Callback when section changes */
  onSectionChange: (section: SettingsSection) => void;
  /** Content to render in main area */
  children: React.ReactNode;
  /** App configuration */
  config: AppConfig;
}

/**
 * SettingsLayout - Pure layout container for Settings page
 *
 * Two-column layout: sidebar (fixed width) + content area (flexible)
 * No business logic - structural component only
 */
export default function SettingsLayout({
  activeSection,
  onSectionChange,
  children,
  config,
}: SettingsLayoutProps) {
  return (
    <div className="flex h-full bg-[var(--paper)]">
      {/* Sidebar - will contain SettingsSidebar component */}
      <div className="w-52 flex-shrink-0 border-r border-[var(--line)]">
        {/* SettingsSidebar will be rendered here in plan 01-03 */}
        <div className="p-4 text-[var(--ink-muted)]">
          Sidebar (will be SettingsSidebar)
        </div>
      </div>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
