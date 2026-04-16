// Startup Progress Overlay
// Full-screen overlay shown during app boot to track Rust subsystem initialization

import React, { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { getVersion } from '@tauri-apps/api/app';
import { isTauriEnvironment } from '@/utils/browserMock';

interface StartupStage {
  stage: 1 | 2 | 3 | 4;
  name: string;
  nameZh: string;
  status: 'pending' | 'active' | 'complete';
}

const INITIAL_STAGES: StartupStage[] = [
  { stage: 1, name: 'System Core', nameZh: '系统核心', status: 'pending' },
  { stage: 2, name: 'Tray & Management API', nameZh: '托盘与管理 API', status: 'pending' },
  { stage: 3, name: 'Scheduler & Monitors', nameZh: '调度器与监控', status: 'pending' },
  { stage: 4, name: 'Sidecar Ready', nameZh: '助手就绪', status: 'pending' },
];

interface StartupProgressOverlayProps {
  visible: boolean;
  onComplete?: () => void;
}

/**
 * Full-screen startup progress overlay.
 * Displays 4-stage initialization progress with branding and animated indicator.
 * Auto-dismisses when all stages complete or after 15s timeout.
 */
export default function StartupProgressOverlay({
  visible,
  onComplete,
}: StartupProgressOverlayProps) {
  const [stages, setStages] = useState<StartupStage[]>(INITIAL_STAGES);
  const [currentTip, setCurrentTip] = useState('正在启动...');
  const [appVersion, setAppVersion] = useState('');

  // Get app version
  useEffect(() => {
    if (isTauriEnvironment()) {
      getVersion()
        .then((v) => setAppVersion(v))
        .catch(() => setAppVersion('0.0.0'));
    } else {
      setAppVersion('dev');
    }
  }, []);

  // Listen for startup events from Rust and frontend
  useEffect(() => {
    if (!visible) return;

    let unlistenStage: (() => void) | null = null;
    let unlistenComplete: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const setup = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      // Listen for stage events: { stage: number; name: string; status: 'active' | 'complete' }
      unlistenStage = await listen<{ stage: number; name: string; status: 'active' | 'complete' }>(
        'startup:stage',
        (event) => {
          const { stage, name, status } = event.payload;
          setStages((prev) => {
            const updated = prev.map((s) =>
              s.stage === stage ? { ...s, status } : s
            );
            // Update tip to show the stage nameZh
            const updatedStage = updated.find((s) => s.stage === stage);
            if (updatedStage) {
              setCurrentTip(updatedStage.nameZh);
            }
            return updated;
          });
        }
      );

      // Listen for complete event
      unlistenComplete = await listen('startup:complete', () => {
        onComplete?.();
      });

      // Timeout fallback - 15s default
      const timeoutMs = Number(import.meta.env.VITE_STARTUP_PROGRESS_TIMEOUT_MS) || 15000;
      timeoutId = setTimeout(() => {
        console.log('[StartupProgressOverlay] Timeout reached, dismissing overlay');
        onComplete?.();
      }, timeoutMs);
    };

    setup();

    return () => {
      unlistenStage?.();
      unlistenComplete?.();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [visible, onComplete]);

  // Auto-dismiss when all stages complete
  useEffect(() => {
    if (!visible) return;

    const allComplete = stages.every((s) => s.status === 'complete');
    if (allComplete) {
      setCurrentTip('助手就绪');
      // Delay to let user see final state
      const timer = setTimeout(() => {
        onComplete?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [stages, visible, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center rounded-[var(--radius-xl)] bg-[var(--paper-elevated)] p-8 shadow-xl">
        {/* Logo */}
        <div className="text-[28px] font-light text-[var(--ink)]">nova-agents</div>

        {/* Spinner */}
        <Loader2 className="mt-6 h-10 w-10 animate-spin text-[var(--accent-warm)]" />

        {/* Status text */}
        <p className="mt-4 text-[14px] font-medium text-[var(--ink)]">{currentTip}</p>

        {/* Indeterminate progress bar */}
        <div className="mt-4 w-full overflow-hidden rounded-full bg-[var(--paper-inset)] p-[2px]">
          <div
            className="h-2 w-1/3 rounded-full bg-[var(--accent-warm)]"
            style={{ animation: 'slide 1.5s ease-in-out infinite' }}
          />
        </div>

        {/* Step checklist */}
        <div className="mt-6 w-full space-y-2">
          {stages.map((s) => (
            <div key={s.stage} className="flex items-center gap-2">
              {s.status === 'complete' ? (
                <Check className="h-4 w-4 text-[var(--success)]" />
              ) : s.status === 'active' ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-warm)]" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-[var(--line)]" />
              )}
              <span
                className={`text-[13px] ${
                  s.status === 'complete'
                    ? 'text-[var(--ink-muted)]'
                    : 'text-[var(--ink)]'
                }`}
              >
                {s.nameZh}
              </span>
            </div>
          ))}
        </div>

        {/* Version */}
        <p className="mt-6 text-[11px] text-[var(--ink-subtle)]">v{appVersion}</p>
      </div>

      {/* CSS keyframes for sliding bar animation */}
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
