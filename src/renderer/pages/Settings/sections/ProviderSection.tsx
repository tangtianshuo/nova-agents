import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  AlertCircle,
  Settings2,
} from 'lucide-react';
import { ExternalLink } from '@/components/ExternalLink';
import { useToast } from '@/components/Toast';
import { apiPostJson } from '@/api/apiFetch';
import {
  getModelsDisplay,
  type Provider,
  type ProviderVerifyStatus,
} from '@/config/types';
import {
  saveApiKey as saveApiKeyFn,
  saveProviderVerifyStatus as saveProviderVerifyStatusFn,
} from '@/config/services/providerService';

export interface ProviderSectionProps {
  providers: Provider[];
  apiKeys: Record<string, string>;
  providerVerifyStatus: Record<string, ProviderVerifyStatus>;
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionVerifying: boolean;
  onApiKeyChange: (providerId: string, apiKey: string) => void;
  onReVerifySubscription: () => void;
  onManageProvider: (provider: Provider) => void;
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

interface VerifyError {
  error: string;
  detail?: string;
}

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
  subscriptionStatus,
  subscriptionVerifying,
  onApiKeyChange,
  onReVerifySubscription,
  onManageProvider,
  onAddProvider,
}: ProviderSectionProps) {
  const toast = useToast();

  // Local verification state
  const [verifyLoading, setVerifyLoading] = useState<Record<string, boolean>>({});
  const [verifyError, setVerifyError] = useState<Record<string, VerifyError>>({});
  const [errorDetailOpenId, setErrorDetailOpenId] = useState<string | null>(null);
  const verifyTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const verifyGenRef = useRef<Record<string, number>>({});
  const errorDetailPopoverRef = useRef<HTMLDivElement>(null);

  // Close error detail popover when clicking outside
  useEffect(() => {
    if (!errorDetailOpenId) return;
    const handleClick = (e: MouseEvent) => {
      if (errorDetailPopoverRef.current && !errorDetailPopoverRef.current.contains(e.target as Node)) {
        setErrorDetailOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [errorDetailOpenId, verifyError]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = verifyTimeoutRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  // Verify API key for a provider
  const verifyProvider = useCallback(async (provider: Provider, apiKey: string) => {
    if (!apiKey || !provider.config.baseUrl) {
      console.warn('[verifyProvider] Missing apiKey or baseUrl');
      return;
    }

    // Bump generation counter — any in-flight verify for this provider becomes stale
    const gen = (verifyGenRef.current[provider.id] ?? 0) + 1;
    verifyGenRef.current[provider.id] = gen;

    console.log('[verifyProvider] ========================');
    console.log('[verifyProvider] Provider:', provider.id, provider.name, `(gen=${gen})`);
    console.log('[verifyProvider] baseUrl:', provider.config.baseUrl);
    console.log('[verifyProvider] model:', provider.primaryModel);
    console.log('[verifyProvider] apiKey:', apiKey.slice(0, 10) + '...');

    setVerifyLoading((prev) => ({ ...prev, [provider.id]: true }));
    setVerifyError((prev) => { const next = { ...prev }; delete next[provider.id]; return next; });

    try {
      const result = await apiPostJson<{ success: boolean; error?: string; detail?: string }>('/api/provider/verify', {
        baseUrl: provider.config.baseUrl,
        apiKey,
        model: provider.primaryModel,
        authType: provider.authType,
        apiProtocol: provider.apiProtocol,
        maxOutputTokens: provider.maxOutputTokens,
        maxOutputTokensParamName: provider.maxOutputTokensParamName,
        upstreamFormat: provider.upstreamFormat,
      });

      // Stale check: if a newer verify was triggered while we were waiting, discard this result
      if (verifyGenRef.current[provider.id] !== gen) {
        console.log(`[verifyProvider] Discarding stale result (gen=${gen}, current=${verifyGenRef.current[provider.id]})`);
        return;
      }

      console.log('[verifyProvider] Result:', JSON.stringify(result, null, 2));
      console.log('[verifyProvider] ========================');

      if (result.success) {
        await saveProviderVerifyStatusFn(provider.id, 'valid');
      } else {
        await saveProviderVerifyStatusFn(provider.id, 'invalid');
        const errorMsg = result.error || '验证失败';
        setVerifyError((prev) => ({ ...prev, [provider.id]: { error: errorMsg, detail: result.detail } }));
        toast.error(`${provider.name}: ${errorMsg}`);
      }
    } catch (err) {
      // Stale check on error path too
      if (verifyGenRef.current[provider.id] !== gen) return;

      console.error('[verifyProvider] Exception:', err);
      await saveProviderVerifyStatusFn(provider.id, 'invalid');
      const errorMsg = err instanceof Error ? err.message : '验证失败';
      setVerifyError((prev) => ({ ...prev, [provider.id]: { error: errorMsg } }));
      toast.error(`${provider.name}: ${errorMsg}`);
    } finally {
      // Only clear loading if this is still the latest generation
      if (verifyGenRef.current[provider.id] === gen) {
        setVerifyLoading((prev) => ({ ...prev, [provider.id]: false }));
      }
    }
  }, [toast]);

  // Auto-verify when API key changes (with debounce)
  const handleSaveApiKey = useCallback(async (provider: Provider, key: string) => {
    await saveApiKeyFn(provider.id, key);
    onApiKeyChange(provider.id, key);

    // Clear previous timeout for this provider
    if (verifyTimeoutRef.current[provider.id]) {
      clearTimeout(verifyTimeoutRef.current[provider.id]);
    }

    // Clear stale error and popover immediately on any key change
    setVerifyError((prev) => { const next = { ...prev }; delete next[provider.id]; return next; });
    if (errorDetailOpenId === provider.id) setErrorDetailOpenId(null);

    // Clear verification status when key changes - will re-verify
    if (key) {
      // Debounce verification
      verifyTimeoutRef.current[provider.id] = setTimeout(() => {
        verifyProvider(provider, key);
      }, 500);
    }
  }, [onApiKeyChange, verifyProvider, errorDetailOpenId]);

  // Render verification status indicator (icon row)
  const renderVerifyStatus = (provider: Provider) => {
    const isLoading = verifyLoading[provider.id];
    const cached = providerVerifyStatus[provider.id];
    const verifyStatus = cached?.status; // 'valid' | 'invalid' | undefined
    const hasKey = !!apiKeys[provider.id];

    if (!hasKey) {
      return null;
    }

    return (
      <div className="flex items-center gap-1">
        {isLoading && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--info-bg)]">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--info)]" />
          </div>
        )}
        {!isLoading && verifyStatus === 'valid' && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success-bg)]">
            <Check className="h-4 w-4 text-[var(--success)]" />
          </div>
        )}
        {!isLoading && verifyStatus === 'invalid' && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--error-bg)]">
            <AlertCircle className="h-4 w-4 text-[var(--error)]" />
          </div>
        )}
        {!isLoading && !verifyStatus && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning-bg)]" title="待验证">
            <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
          </div>
        )}
        {/* Refresh button for re-verification - hide if already valid */}
        {verifyStatus !== 'valid' && (
          <button
            type="button"
            onClick={() => verifyProvider(provider, apiKeys[provider.id])}
            disabled={isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-inset)] hover:text-[var(--ink)] disabled:opacity-50"
            title="重新验证"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    );
  };

  // Render inline error line below the API key input row
  const renderVerifyError = (provider: Provider) => {
    const errObj = verifyError[provider.id];
    if (!errObj) return null;

    return (
      <div className="flex items-start gap-1.5 pt-1.5 text-xs text-[var(--error)]">
        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
        <span className="min-w-0 break-words">{errObj.error}</span>
        {errObj.detail && errObj.detail !== errObj.error && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setErrorDetailOpenId(
                errorDetailOpenId === provider.id ? null : provider.id
              )}
              className="whitespace-nowrap text-[var(--ink-muted)] underline decoration-dotted transition-colors hover:text-[var(--ink)]"
            >
              详情
            </button>
            {errorDetailOpenId === provider.id && (
              <div
                ref={errorDetailPopoverRef}
                className="absolute right-0 top-6 z-50 w-80 max-w-[90vw] rounded-lg border border-[var(--line)] bg-[var(--paper-elevated)] p-3 shadow-lg"
              >
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">错误详情</p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-[var(--ink-secondary)]">{errObj.detail}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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
          <div
            key={provider.id}
            className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-5 hover:border-[var(--line-strong)]"
          >
            {/* Provider header */}
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-[var(--ink)]">{provider.name}</h3>
                  <span className="shrink-0 rounded bg-[var(--paper-inset)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-muted)]">
                    {provider.cloudProvider}
                  </span>
                  {provider.apiProtocol === 'openai' && (
                    <span className="shrink-0 rounded bg-[var(--paper-inset)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-muted)]">
                      OpenAI 协议
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-[var(--ink-muted)]">
                  {getModelsDisplay(provider)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {provider.websiteUrl && (
                  <ExternalLink
                    href={provider.websiteUrl}
                    className="rounded-lg px-1.5 py-1.5 text-xs text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-inset)] hover:text-[var(--ink)]"
                  >
                    去官网
                  </ExternalLink>
                )}
                <button
                  onClick={() => onManageProvider(provider)}
                  className="rounded-lg p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-inset)] hover:text-[var(--ink)]"
                  title="管理"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* API Key input */}
            {provider.type === 'api' && (
              <div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
                    <input
                      type="password"
                      placeholder="输入 API Key"
                      value={apiKeys[provider.id] || ''}
                      onChange={(e) => handleSaveApiKey(provider, e.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] py-2.5 pl-10 pr-4 text-sm text-[var(--ink)] placeholder-[var(--ink-muted)] transition-colors focus:border-[var(--focus-border)] focus:outline-none"
                    />
                  </div>
                  {renderVerifyStatus(provider)}
                </div>
                {renderVerifyError(provider)}
              </div>
            )}

            {/* Subscription type - show status */}
            {provider.type === 'subscription' && (
              <div className="space-y-2">
                <p className="text-sm text-[var(--ink-muted)]">
                  使用 Anthropic 订阅账户，无需 API Key
                </p>
                {/* Subscription status display */}
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  {subscriptionStatus?.available ? (
                    <>
                      {/* Email display first */}
                      <span className="text-[var(--ink-muted)] font-mono text-[10px]">
                        {subscriptionStatus.info?.email}
                      </span>
                      {/* Verification status after email */}
                      {subscriptionStatus.verifyStatus === 'loading' && (
                        <div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>验证中...</span>
                        </div>
                      )}
                      {subscriptionStatus.verifyStatus === 'valid' && (
                        <div className="flex items-center gap-1.5 text-[var(--success)]">
                          <Check className="h-3.5 w-3.5" />
                          <span className="font-medium">已验证</span>
                          <button
                            type="button"
                            onClick={onReVerifySubscription}
                            disabled={subscriptionVerifying}
                            className="ml-1 rounded p-0.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-inset)] hover:text-[var(--ink)] disabled:opacity-50"
                            title="重新验证"
                          >
                            <RefreshCw className={`h-3 w-3 ${subscriptionVerifying ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      )}
                      {subscriptionStatus.verifyStatus === 'invalid' && (
                        <div className="flex items-center gap-1.5 text-[var(--error)]">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span className="font-medium">验证失败</span>
                          <button
                            type="button"
                            onClick={onReVerifySubscription}
                            disabled={subscriptionVerifying}
                            className="ml-1 rounded p-0.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-inset)] hover:text-[var(--ink)] disabled:opacity-50"
                            title="重新验证"
                          >
                            <RefreshCw className={`h-3 w-3 ${subscriptionVerifying ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      )}
                      {subscriptionStatus.verifyStatus === 'idle' && (
                        <div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
                          <span>检测中...</span>
                        </div>
                      )}
                      {/* Error message */}
                      {subscriptionStatus.verifyStatus === 'invalid' && subscriptionStatus.verifyError && (
                        <span className="text-[var(--error)] text-[10px] w-full mt-1">
                          {subscriptionStatus.verifyError}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[var(--ink-muted)]">
                      未登录，请先使用 Claude Code CLI 登录 (claude --login)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}