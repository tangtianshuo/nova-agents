import React, { useCallback, useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';

// Import layout components
import SettingsLayout from './SettingsLayout';

// Import section components
import { AccountSection, AboutSection, ProviderSection, McpSection, GeneralSection } from './sections';

// Import dialog components
import {
  CustomProviderDialog,
  CustomMcpDialog,
  PlaywrightConfigPanel,
  EdgeTtsConfigPanel,
  GeminiImageConfigPanel,
} from './components/dialogs';
import type {
  CustomProviderFormData,
  McpFormData,
  PlaywrightConfig,
  EdgeTtsConfig,
  GeminiImageConfig,
} from './components/dialogs';

// Import types and hooks
import type { SettingsSection } from './SettingsLayout';
import type { AppConfig, Provider, McpServerDefinition, Project } from '@/config/types';
import type { SubscriptionStatusWithVerify } from '@/types/subscription';
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
export default function Settings() {
  const { config, providers, apiKeys, providerVerifyStatus } = useConfig();
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

  // Subscription status state (for ProviderSection)
  const [subscriptionStatus] = useState<SubscriptionStatusWithVerify | null>(null);
  const [subscriptionVerifying] = useState(false);

  // MCP servers state
  const [mcpServers, setMcpServers] = useState<McpServerDefinition[]>([]);
  const [mcpEnabledIds, setMcpEnabledIds] = useState<string[]>([]);
  const [mcpEnabling, setMcpEnabling] = useState<Record<string, boolean>>({});
  const [mcpNeedsConfig, setMcpNeedsConfig] = useState<Record<string, boolean>>({});

  // Custom provider dialog state
  const [customProviderOpen, setCustomProviderOpen] = useState(false);
  const [customProviderMode, setCustomProviderMode] = useState<'add' | 'edit'>('add');
  const [customProviderData, setCustomProviderData] = useState<CustomProviderFormData | undefined>();

  // Custom MCP dialog state
  const [customMcpOpen, setCustomMcpOpen] = useState(false);
  const [customMcpMode, setCustomMcpMode] = useState<'add' | 'edit'>('add');
  const [customMcpData, setCustomMcpData] = useState<McpFormData | undefined>();

  // Builtin MCP config panel state
  const [builtinPanelOpen, setBuiltinPanelOpen] = useState(false);
  const [builtinPanelType, setBuiltinPanelType] = useState<'playwright' | 'edge-tts' | 'gemini-image' | null>(null);
  const [builtinPanelData, setBuiltinPanelData] = useState<PlaywrightConfig | EdgeTtsConfig | GeminiImageConfig | undefined>();

  // Workspaces state (for GeneralSection)
  const [workspaces, setWorkspaces] = useState<Project[]>([]);

  // Autostart state (for GeneralSection)
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [autostartLoading, setAutostartLoading] = useState(false);

  // Load MCP servers on mount
  useEffect(() => {
    const loadMcpServers = async () => {
      try {
        const { getAllMcpServers, getEnabledMcpServerIds, getMcpServerEnv } = await import('@/config/configService');
        const servers = await getAllMcpServers();
        const enabledIds = await getEnabledMcpServerIds();

        // Compute needsConfig for servers that require config
        const needsConfig: Record<string, boolean> = {};
        for (const server of servers) {
          if (server.requiresConfig && server.requiresConfig.length > 0) {
            const savedEnv = await getMcpServerEnv(server.id);
            const hasConfig = server.requiresConfig.some(key => savedEnv?.[key]?.trim());
            needsConfig[server.id] = !hasConfig;
          }
        }

        setMcpServers(servers);
        setMcpEnabledIds(enabledIds);
        setMcpNeedsConfig(needsConfig);
      } catch (err) {
        console.error('[Settings] Failed to load MCP servers:', err);
      }
    };
    loadMcpServers();
  }, []);

  // Load workspaces on mount (for GeneralSection)
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const { loadProjects } = await import('@/config/services/projectService');
        const ws = await loadProjects();
        setWorkspaces(ws);
      } catch (err) {
        console.error('[Settings] Failed to load workspaces:', err);
      }
    };
    loadWorkspaces();
  }, []);

  // Load autostart state on mount (for GeneralSection)
  useEffect(() => {
    const loadAutostart = async () => {
      if (!isTauriEnvironment()) {
        setAutostartEnabled(false);
        return;
      }
      try {
        const enabled = await invoke<boolean>('cmd_get_autostart_enabled');
        setAutostartEnabled(enabled);
      } catch (err) {
        console.error('[Settings] Failed to load autostart:', err);
      }
    };
    loadAutostart();
  }, []);

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

  // GeneralSection handlers
  const handleUpdateConfig = useCallback(async (updates: Partial<AppConfig>) => {
    try {
      const { atomicModifyConfig } = await import('@/config/services/appConfigService');
      await atomicModifyConfig((current) => ({ ...current, ...updates }));
    } catch (err) {
      console.error('[Settings] Failed to update config:', err);
    }
  }, []);

  const handleToggleAutostart = useCallback(async (): Promise<boolean> => {
    setAutostartLoading(true);
    try {
      const success = await invoke<boolean>('cmd_toggle_autostart', { enable: !autostartEnabled });
      setAutostartEnabled(success);
      return success;
    } catch (err) {
      console.error('[Settings] Failed to toggle autostart:', err);
      return false;
    } finally {
      setAutostartLoading(false);
    }
  }, [autostartEnabled]);

  // ProviderSection handlers
  const handleApiKeyChange = (providerId: string, _apiKey: string) => {
    // API key changes are handled within ProviderSection via saveApiKey
    console.log('[Settings] API key changed for provider:', providerId);
  };

  const handleReVerifySubscription = () => {
    // TODO: Wire up subscription re-verification
    toast.info('订阅验证功能开发中');
  };

  const handleManageProvider = (provider: Provider) => {
    setCustomProviderMode('edit');
    setCustomProviderData({
      name: provider.name,
      cloudProvider: provider.cloudProvider,
      apiProtocol: provider.apiProtocol || 'anthropic',
      baseUrl: provider.config.baseUrl || '',
      primaryModel: provider.primaryModel,
      maxTokens: provider.maxOutputTokens,
      authType: 'apiKey',
    });
    setCustomProviderOpen(true);
  };

  const handleAddProvider = () => {
    setCustomProviderMode('add');
    setCustomProviderData(undefined);
    setCustomProviderOpen(true);
  };

  const handleSaveProvider = useCallback(async (data: CustomProviderFormData) => {
    // TODO: Implement provider save logic (call config service)
    console.log('[Settings] Saving provider:', data);
    toast.info('供应商保存功能开发中');
    // Refresh provider list after save
  }, [toast]);

  const handleDeleteProvider = (provider: Provider) => {
    // TODO: Delete provider functionality
    toast.info(`删除 ${provider.name} 功能将在后续版本实现`);
  };

  // MCP handlers
  const handleMcpToggle = (server: McpServerDefinition, enabled: boolean) => {
    if (!enabled) {
      setMcpEnabledIds(prev => prev.filter(id => id !== server.id));
      return;
    }
    // For enabling, McpSection handles the full flow
    setMcpEnabling(prev => ({ ...prev, [server.id]: true }));
    // The actual toggle is handled in McpSection, but we need to update state after
    // For now, we just track enabling state
  };

  const handleEditMcp = (server: McpServerDefinition) => {
    setCustomMcpMode('edit');
    setCustomMcpData({
      type: 'stdio',
      id: server.id,
      name: server.name,
      command: server.command,
      args: server.args,
      env: {},
    });
    setCustomMcpOpen(true);
  };

  const handleEditBuiltinMcp = (server: McpServerDefinition) => {
    // Determine panel type from server ID
    const panelType = server.id.replace('-mcp', '').replace('mcp-', '') as 'playwright' | 'edge-tts' | 'gemini-image';
    setBuiltinPanelType(panelType);
    setBuiltinPanelData(undefined); // Load actual config from service
    setBuiltinPanelOpen(true);
  };

  const handleAddMcp = () => {
    setCustomMcpMode('add');
    setCustomMcpData(undefined);
    setCustomMcpOpen(true);
  };

  const handleSaveMcp = useCallback(async (data: McpFormData) => {
    // TODO: Implement MCP save logic (call config service)
    console.log('[Settings] Saving MCP:', data);
    toast.info('MCP 保存功能开发中');
    setCustomMcpOpen(false);
    // Refresh MCP list after save
  }, [toast]);

  const handleSaveBuiltinPanel = useCallback(async (config: PlaywrightConfig | EdgeTtsConfig | GeminiImageConfig) => {
    // TODO: Implement builtin MCP config save logic (call config service)
    console.log('[Settings] Saving builtin MCP config:', builtinPanelType, config);
    toast.info('配置保存功能开发中');
    setBuiltinPanelOpen(false);
    // Refresh MCP config after save
  }, [builtinPanelType, toast]);

  const handleMcpServersChange = (servers: McpServerDefinition[]) => {
    setMcpServers(servers);
  };

  return (
    <div className="h-full">
      <SettingsLayout
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        config={config}
      >
        {/* Section routing */}
        {activeSection === 'account' && <AccountSection user={user ?? undefined} />}

        {activeSection === 'about' && (
          <AboutSection
            appVersion={appVersion}
            qrCodeDataUrl={qrCodeDataUrl}
            qrCodeLoading={qrCodeLoading}
            providers={providers}
            apiKeys={apiKeys ?? {}}
            providerVerifyStatus={providerVerifyStatus ?? {}}
          />
        )}

        {activeSection === 'providers' && (
          <ProviderSection
            providers={providers}
            apiKeys={apiKeys ?? {}}
            providerVerifyStatus={providerVerifyStatus ?? {}}
            subscriptionStatus={subscriptionStatus}
            subscriptionVerifying={subscriptionVerifying}
            onApiKeyChange={handleApiKeyChange}
            onReVerifySubscription={handleReVerifySubscription}
            onManageProvider={handleManageProvider}
            onDeleteProvider={handleDeleteProvider}
            onAddProvider={handleAddProvider}
          />
        )}

        {activeSection === 'mcp' && (
          <McpSection
            servers={mcpServers}
            enabledIds={mcpEnabledIds}
            enablingIds={mcpEnabling}
            needsConfig={mcpNeedsConfig}
            onAddServer={handleAddMcp}
            onEditServer={handleEditMcp}
            onEditBuiltinServer={handleEditBuiltinMcp}
            onToggleServer={handleMcpToggle}
            onServersChange={handleMcpServersChange}
          />
        )}

        {activeSection === 'general' && (
          <GeneralSection
            config={config}
            autostartEnabled={autostartEnabled}
            autostartLoading={autostartLoading}
            workspaces={workspaces}
            onUpdateConfig={handleUpdateConfig}
            onToggleAutostart={handleToggleAutostart}
          />
        )}

        {/* Placeholder for other sections - will be implemented in later phases */}
        {(
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

      {/* Custom Provider Dialog */}
      <CustomProviderDialog
        open={customProviderOpen}
        mode={customProviderMode}
        initialData={customProviderData}
        onSave={handleSaveProvider}
        onCancel={() => setCustomProviderOpen(false)}
      />

      {/* Custom MCP Dialog */}
      <CustomMcpDialog
        open={customMcpOpen}
        mode={customMcpMode}
        initialData={customMcpData}
        onSave={handleSaveMcp}
        onCancel={() => setCustomMcpOpen(false)}
      />

      {/* Playwright Config Panel */}
      {builtinPanelType === 'playwright' && (
        <PlaywrightConfigPanel
          open={builtinPanelOpen}
          serverId="playwright-mcp"
          initialConfig={builtinPanelData as PlaywrightConfig | undefined}
          onSave={handleSaveBuiltinPanel}
          onCancel={() => setBuiltinPanelOpen(false)}
        />
      )}

      {/* EdgeTTS Config Panel */}
      {builtinPanelType === 'edge-tts' && (
        <EdgeTtsConfigPanel
          open={builtinPanelOpen}
          serverId="edge-tts-mcp"
          initialConfig={builtinPanelData as EdgeTtsConfig | undefined}
          onSave={handleSaveBuiltinPanel}
          onCancel={() => setBuiltinPanelOpen(false)}
        />
      )}

      {/* GeminiImage Config Panel */}
      {builtinPanelType === 'gemini-image' && (
        <GeminiImageConfigPanel
          open={builtinPanelOpen}
          serverId="gemini-image-mcp"
          initialConfig={builtinPanelData as GeminiImageConfig | undefined}
          onSave={handleSaveBuiltinPanel}
          onCancel={() => setBuiltinPanelOpen(false)}
        />
      )}
    </div>
  );
}
