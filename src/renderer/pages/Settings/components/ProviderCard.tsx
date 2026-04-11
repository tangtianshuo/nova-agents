import React, { useCallback, useRef, useState } from 'react';
import {
  Check,
  KeyRound,
  Loader2,
  RefreshCw,
  AlertCircle,
  Settings2,
  Trash2,
} from 'lucide-react';
import { ExternalLink } from '@/components/ExternalLink';
import {
  getModelsDisplay,
  type Provider,
  type ProviderVerifyStatus,
} from '@/config/types';
import { DeleteConfirmDialog } from './dialogs';

/**
 * ProviderCard Props - matches UI-SPEC exactly
 */
export interface ProviderCardProps {
  provider: Provider;
  apiKey: string;
  verifyStatus: ProviderVerifyStatus;
  verifyError?: { error: string; detail?: string };
  onApiKeyChange: (providerId: string, apiKey: string) => void;
  onVerify: (provider: Provider) => void;
  onManage: (provider: Provider) => void;
  onDelete: (provider: Provider) => void;
}

interface VerifyError {
  error: string;
  detail?: string;
}

/**
 * ProviderCard - Reusable provider card with inline delete confirmation
 *
 * Extracted from ProviderSection inline markup per 03-03 plan.
 * Features:
 * - Provider header with name, badges, and external link
 * - API key input with verification status
 * - Subscription status display
 * - Inline delete confirmation (no modal)
 */
export default function ProviderCard({
  provider,
  apiKey,
  verifyStatus,
  verifyError,
  onApiKeyChange,
  onVerify,
  onManage,
  onDelete,
}: ProviderCardProps) {
  // Local state for verification and delete confirmation
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [localVerifyError, setLocalVerifyError] = useState<VerifyError | null>(null);
  const [errorDetailOpen, setErrorDetailOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const errorDetailPopoverRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use prop-provided verifyError or local one
  const effectiveError = verifyError ?? localVerifyError ?? null;

  // Debounced API key change
  const handleApiKeyInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Clear error on any key change
    setLocalVerifyError(null);

    // Debounce the actual save
    debounceTimeoutRef.current = setTimeout(() => {
      onApiKeyChange(provider.id, newKey);
    }, 300);
  }, [provider.id, onApiKeyChange]);

  // Handle verify button click
  const handleVerify = useCallback(() => {
    setVerifyLoading(true);
    onVerify(provider);
    // Loading state will be cleared by the parent
  }, [provider, onVerify]);

  // Handle delete confirmation
  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    await onDelete(provider);
    setShowDeleteDialog(false);
  }, [provider, onDelete]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Render verification status indicator (icon row)
  const renderVerifyStatus = () => {
    const isLoading = verifyLoading;
    const statusValue = verifyStatus?.status;
    // If no status exists, treat as 'idle' - explicitly type to include 'idle'
    const cachedStatus: 'valid' | 'invalid' | 'idle' = (statusValue ?? 'idle') as 'valid' | 'invalid' | 'idle';
    const hasKey = !!apiKey;

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
        {!isLoading && cachedStatus === 'valid' && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success-bg)]">
            <Check className="h-4 w-4 text-[var(--success)]" />
          </div>
        )}
        {!isLoading && cachedStatus === 'invalid' && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--error-bg)]">
            <AlertCircle className="h-4 w-4 text-[var(--error)]" />
          </div>
        )}
        {!isLoading && cachedStatus === 'idle' && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning-bg)]" title="待验证">
            <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
          </div>
        )}
        {/* Refresh button for re-verification - hide if already valid */}
        {cachedStatus !== 'valid' && (
          <button
            type="button"
            onClick={handleVerify}
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
  const renderVerifyError = () => {
    const errObj = effectiveError;
    if (!errObj) return null;

    return (
      <div className="flex items-start gap-1.5 pt-1.5 text-xs text-[var(--error)]">
        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
        <span className="min-w-0 break-words">{errObj.error}</span>
        {errObj.detail && errObj.detail !== errObj.error && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setErrorDetailOpen(!errorDetailOpen)}
              className="whitespace-nowrap text-[var(--ink-muted)] underline decoration-dotted transition-colors hover:text-[var(--ink)]"
            >
              详情
            </button>
            {errorDetailOpen && (
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
    <div className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-5 hover:border-[var(--line-strong)]">
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
            onClick={() => onManage(provider)}
            className="rounded-lg p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-inset)] hover:text-[var(--ink)]"
            title="管理"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          {/* Delete button - shows trash icon */}
          <button
            onClick={handleDeleteClick}
            className="rounded-lg p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-inset)] hover:text-[var(--error)]"
            title="删除"
          >
            <Trash2 className="h-4 w-4" />
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
                value={apiKey || ''}
                onChange={handleApiKeyInputChange}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] py-2.5 pl-10 pr-4 text-sm text-[var(--ink)] placeholder-[var(--ink-muted)] transition-colors focus:border-[var(--focus-border)] focus:outline-none"
              />
            </div>
            {renderVerifyStatus()}
          </div>
          {renderVerifyError()}
        </div>
      )}

      {/* Subscription type - show status */}
      {provider.type === 'subscription' && (
        <div className="space-y-2">
          <p className="text-sm text-[var(--ink-muted)]">
            使用 Anthropic 订阅账户，无需 API Key
          </p>
          {/* Note: Subscription status is handled at the section level */}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        title="删除供应商"
        message="此操作无法撤销。"
        itemType="provider"
        itemName={provider.name}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}