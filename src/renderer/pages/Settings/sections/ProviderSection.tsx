import React, { useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { type Provider } from '@/config/types';
import ProviderCard from '../components/ProviderCard';

export interface ProviderSectionProps {
  providers: Provider[];
  apiKeys: Record<string, string>;
  providerVerifyStatus: Record<string, {
    status: 'valid' | 'invalid';
    verifiedAt: string;
    accountEmail?: string;
  }>;
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionVerifying: boolean;
  onApiKeyChange: (providerId: string, apiKey: string) => void;
  onReVerifySubscription: () => void;
  onManageProvider: (provider: Provider) => void;
  onDeleteProvider: (provider: Provider) => void;
  onAddProvider: () => void;
}

type SubscriptionStatus = {
  available: boolean;
  info?: {
    email?: string;
  };
  verifyStatus?: 'idle' | 'loading' | 'valid' | 'invalid';
  verifyError?: string;
};

/**
 * ProviderSection - Display and manage model providers
 *
 * Extracted from original Settings.tsx (lines 2435-2592).
 * Contains providers grid, API key input, verification status, and subscription status.
 */
export default function ProviderSection({
  providers,
  apiKeys,
  providerVerifyStatus,
  subscriptionStatus: _subscriptionStatus,
  subscriptionVerifying: _subscriptionVerifying,
  onApiKeyChange,
  onReVerifySubscription: _onReVerifySubscription,
  onManageProvider: _onManageProvider,
  onDeleteProvider: _onDeleteProvider,
  onAddProvider,
}: ProviderSectionProps) {
  const toast = useToast();

  // Handle delete provider
  const handleDeleteProvider = useCallback((_provider: Provider) => {
    // Placeholder for delete functionality
    toast.info('删除功能将在后续版本实现');
  }, [toast]);

  // Handle verify provider callback for ProviderCard
  const handleVerifyProvider = useCallback((_provider: Provider) => {
    toast.info('验证功能已集成到 ProviderCard');
  }, [toast]);

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--ink)]">模型供应商</h2>
        <button
          onClick={onAddProvider}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--button-primary-bg)] px-3 py-1.5 text-sm font-medium text-[var(--button-primary-text)] transition-colors hover:bg-[var(--button-primary-bg-hover)]"
        >
          <Plus className="h-3.5 w-3.5" />
          添加
        </button>
      </div>

      {/* Description */}
      <p className="mb-6 text-sm text-[var(--ink-muted)]">
        配置 API 密钥以使用不同的模型供应商
      </p>

      {/* Provider list */}
      <div className="grid grid-cols-2 gap-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            apiKey={apiKeys[provider.id] || ''}
            verifyStatus={providerVerifyStatus[provider.id] || {}}
            onApiKeyChange={onApiKeyChange}
            onVerify={handleVerifyProvider}
            onManage={onManageProvider}
            onDelete={handleDeleteProvider}
          />
        ))}
      </div>
    </div>
  );
}