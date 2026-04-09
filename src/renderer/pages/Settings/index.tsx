import React from 'react';
import SettingsLayout from './SettingsLayout';
import type { AppConfig } from '@/config/types';

/**
 * Settings page entry point
 * Temporary placeholder - will be replaced by full composition root in plan 01-05
 */
export default function Settings() {
  // TODO: Replace with actual config from useConfig
  const config = {} as AppConfig;

  return (
    <div className="h-full">
      <SettingsLayout
        activeSection="general"
        onSectionChange={() => {}}
        config={config}
      >
        <div>Settings content placeholder</div>
      </SettingsLayout>
    </div>
  );
}
