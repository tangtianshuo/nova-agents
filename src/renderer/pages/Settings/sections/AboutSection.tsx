import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ExternalLink } from '@/components/ExternalLink';
import BugReportOverlay from '@/components/BugReportOverlay';
import { getBuildVersions } from '@/utils/debug';
import { isDeveloperSectionUnlocked, unlockDeveloperSection, UNLOCK_CONFIG } from '@/utils/developerMode';
import type { Provider, ProviderVerifyStatus } from '@/config/types';

/**
 * AboutSection Props - Display app version, QR code, and provider status
 *
 * Shows app version with build info, QR code for mobile app connection,
 * and provider verification status summary.
 */
export interface AboutSectionProps {
  appVersion: string;
  qrCodeDataUrl: string | null;
  qrCodeLoading: boolean;
  providers: Provider[];
  apiKeys: Record<string, string>;
  providerVerifyStatus: Record<string, ProviderVerifyStatus>;
}

export default function AboutSection({
  appVersion,
  qrCodeDataUrl,
  qrCodeLoading,
  providers,
  apiKeys,
  providerVerifyStatus,
}: AboutSectionProps) {
  const [showBugReport, setShowBugReport] = useState(false);
  const [devSectionVisible, setDevSectionVisible] = useState(isDeveloperSectionUnlocked());
  const logoTapCountRef = useRef(0);
  const logoTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = () => {
    if (devSectionVisible) return;
    logoTapCountRef.current += 1;
    if (logoTapTimerRef.current) {
      clearTimeout(logoTapTimerRef.current);
    }
    if (logoTapCountRef.current >= UNLOCK_CONFIG.requiredTaps) {
      unlockDeveloperSection();
      setDevSectionVisible(true);
      logoTapCountRef.current = 0;
      return;
    }
    logoTapTimerRef.current = setTimeout(() => {
      logoTapCountRef.current = 0;
    }, UNLOCK_CONFIG.timeWindowMs);
  };

  useEffect(() => {
    return () => {
      if (logoTapTimerRef.current) {
        clearTimeout(logoTapTimerRef.current);
      }
    };
  }, []);

  const buildVersions = getBuildVersions();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--paper-inset)] to-[var(--paper)] p-8">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-[3rem] text-[var(--ink)] cursor-default select-none" onClick={handleLogoTap}>
            NovaAgents
          </h1>
          <div className="mt-1">
            <p className="text-sm font-medium text-[var(--ink-muted)]">
              Version {appVersion || '...'}
            </p>
          </div>
          <p className="mt-3 text-base text-[var(--ink-secondary)]">
            Your Intent, Amplified
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] px-7 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--ink-muted)]/50">From the Developer</p>
        <div className="mt-4 space-y-5 text-[13px] leading-[1.9] text-[var(--ink-secondary)]">
          <p><span className="font-semibold text-[var(--ink)]">NovaAgents</span> 你的本地 Agent 枢纽，电脑里的个人 AI 中心。</p>
          <p>兼容并蓄，且坚守本地。我们不仅继承了 Claude Code 的极致效率与 OpenClaw 的主动交互，更致力于打造一种全时空的 Agent 体验：</p>
          <p>它是协同者，触达你的所有工具与项目，完成从指令到产出的精细跨越；它是守望者，在你离开后依然代你感知、思考与行动。NovaAgents 不再是一个陌生的窗口，而是随你共同成长的数字镜像。</p>
          <p>它是你意图的扩音器，让一切复杂终结于此</p>
          <p className="text-center text-[14px] font-medium italic tracking-wide text-[var(--ink)]">
            一念既起，万事皆成。
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-[var(--ink)]">AI 小助理</h3>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">AI 小助理将分析本地日志进行功能答疑、上报问题或建议</p>
          </div>
          <button
            onClick={() => setShowBugReport(true)}
            className="rounded-lg bg-[var(--paper-inset)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] transition-colors hover:bg-[var(--paper-elevated)]"
          >
            反馈问题
          </button>
        </div>
      </div>

      {(qrCodeLoading || qrCodeDataUrl) && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-5">
          <div className="flex flex-col items-center text-center">
            <p className="text-sm font-medium text-[var(--ink)]">加入用户交流群</p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">扫码加入，与其他用户交流使用心得</p>
            {qrCodeLoading ? (
              <div className="mt-4 h-36 w-36 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--ink-muted)]" />
              </div>
            ) : (
              <img src={qrCodeDataUrl!} alt="用户交流群二维码" className="mt-4 h-36 w-36 rounded-lg" />
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--ink-muted)]">Developer</p>
            <p className="mt-1 text-[var(--ink)]">Nova</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--ink-muted)]">Website</p>
            <ExternalLink href="https://novai.net.cn" className="mt-1 block text-[var(--accent)] hover:underline">
              novai.net.cn
            </ExternalLink>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--ink-muted)]">Contact</p>
            <ExternalLink href="mailto:novaintelligent@gmail.com" className="mt-1 block text-[var(--accent)] hover:underline">
              novaintelligent@gmail.com
            </ExternalLink>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-[var(--ink-muted)]">
        © 2026 Nova Intelligent. All rights reserved.
      </p>

      {devSectionVisible && (
        <div>
          <h2 className="mb-4 text-base font-medium text-[var(--ink-muted)]">开发者</h2>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-elevated)] p-5">
            <h3 className="mb-3 text-sm font-medium text-[var(--ink)]">构建信息</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Claude Agent SDK</span>
                <span className="font-mono text-[var(--ink)]">{buildVersions.claudeAgentSdk}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Bun Runtime</span>
                <span className="font-mono text-[var(--ink)]">{buildVersions.bun}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Tauri</span>
                <span className="font-mono text-[var(--ink)]">{buildVersions.tauri}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBugReport && (
        <BugReportOverlay
          onClose={() => setShowBugReport(false)}
          onNavigateToProviders={() => {}}
          appVersion={appVersion}
          providers={providers}
          apiKeys={apiKeys}
          providerVerifyStatus={providerVerifyStatus}
        />
      )}
    </div>
  );
}
