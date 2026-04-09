import React, { useState } from 'react';
import SettingsLayout from './SettingsLayout';
import { AccountSection } from './sections';
import type { AppConfig } from '@/config/types';

/**
 * Settings page entry point
 * Temporary placeholder - will be replaced by full composition root in plan 01-05
 */
export default function Settings() {
  // TODO: Replace with actual config from useConfig
  const config = {} as AppConfig;
  
  // Navigation state management (per D-04: lifted state in index.tsx)
  const [activeSection, setActiveSection] = useState<import('./SettingsLayout').SettingsSection>('account');

  const handleSectionChange = (section: import('./SettingsLayout').SettingsSection) => {
    setActiveSection(section);
  };

  return (
    <div className="h-full">
      <SettingsLayout
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        config={config}
      >
        {activeSection === 'account' && <AccountSection />}
        {/* Other sections will be added in subsequent plans */}
      </SettingsLayout>
    </div>
  );
}
