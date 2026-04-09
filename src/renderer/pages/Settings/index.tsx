import React, { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Import layout components
import SettingsLayout from './SettingsLayout';
import SettingsSidebar from './SettingsSidebar';

// Import section components
import { AccountSection, AboutSection } from './sections';

// Import types and hooks
import type { SettingsSection } from './SettingsLayout';
import type { AppConfig } from '@/config/types';
import { useConfig } from '@/hooks/useConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';

// Import utilities
import { isTauriEnvironment } from '@/utils/browserMock';
import { apiGetJson } from '@/api/apiFetch';

/**
 * Settings page - Composition root
 *
 * Manages navigation state and composes the Settings layout.
 * Per D-04: activeSection state lifted to parent (index.tsx).
 */
const VALID_SECTIONS: SettingsSection[] = ['general', 'providers', 'mcp', 'skills', 'sub-agents', 'agent', 'usage-stats', 'about', 'account'];

export default function Settings() {
  const { config } = useConfig();
  const { user } = useAuth();
  const toast = useToast();

  // Navigation state management (per D-04: lifted state in index.tsx)
  const [activeSection, setActiveSection] = useState<SettingsSection>('about');

  // App version state (needed for AboutSection)
  const [appVersion, setAppVersion] = useState<string>('');
  useEffect(() => {
    if (!isTauriEnvironment()) {
      setAppVersion('dev');
      return;
    }
    getVersion().then(setAppVersion).catch(() => setAppVersion('unknown'));
  }, []);

  // QR code state for AboutSection
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);

  // Load QR code when entering about section
  useEffect(() => {
    if (activeSection !== 'about') return;

    let cancelled = false;
    setQrCodeLoading(true);

    if (isTauriEnvironment()) {
      apiGetJson<{ success: boolean; dataUrl?: string }>('/api/assets/qr-code')
        .then(result => {
          if (cancelled) return;
          if (result.success && result.dataUrl) {
            setQrCodeDataUrl(result.dataUrl);
          }
        })
        .catch((error) => {
          if (cancelled) return;
          console.error('[Settings] Failed to load QR code:', error);
        })
        .finally(() => {
          if (!cancelled) setQrCodeLoading(false);
        });
    } else {
      setQrCodeDataUrl('https://download.novaagents.io/assets/feedback_qr_code.png');
      setQrCodeLoading(false);
    }

    return () => {
      cancelled = true;
      setQrCodeDataUrl(null);
      setQrCodeLoading(false);
    };
  }, [activeSection]);

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
  };

  return (
    <div className="h-full">
      <SettingsLayout
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        config={config}
      >
        {/* Section routing */}
        {activeSection === 'account' && <AccountSection user={user} />}

        {activeSection === 'about' && (
          <AboutSection
            appVersion={appVersion}
            qrCodeDataUrl={qrCodeDataUrl}
            qrCodeLoading={qrCodeLoading}
          />
        )}

        {/* Placeholder for other sections - will be implemented in later phases */}
        {(activeSection === 'general' ||
          activeSection === 'providers' ||
          activeSection === 'mcp' ||
          activeSection === 'skills' ||
          activeSection === 'sub-agents' ||
          activeSection === 'agent' ||
          activeSection === 'usage-stats') && (
          <div className="p-6 text-center text-[var(--ink-muted)]">
            <h2 className="text-xl font-semibold mb-2">
              {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Section
            </h2>
            <p className="text-sm">This section will be migrated in a later phase.</p>
          </div>
        )}
      </SettingsLayout>
    </div>
  );
}
