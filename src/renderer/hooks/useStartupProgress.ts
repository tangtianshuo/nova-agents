// useStartupProgress Hook
// Manages startup progress overlay state, event listening, and auto-dismiss logic

import { useState, useEffect, useCallback } from 'react';
import { isTauriEnvironment } from '@/utils/browserMock';

export interface StartupStage {
  stage: 1 | 2 | 3 | 4;
  name: string;
  nameZh: string;
  status: 'pending' | 'active' | 'complete';
}

export interface StartupProgressState {
  stages: StartupStage[];
  isComplete: boolean;
  isVisible: boolean;
  currentTip: string;
}

const INITIAL_STAGES: StartupStage[] = [
  { stage: 1, name: 'System Core', nameZh: '系统核心', status: 'pending' },
  { stage: 2, name: 'Tray & Management API', nameZh: '托盘与管理 API', status: 'pending' },
  { stage: 3, name: 'Scheduler & Monitors', nameZh: '调度器与监控', status: 'pending' },
  { stage: 4, name: 'Sidecar Ready', nameZh: '助手就绪', status: 'pending' },
];

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Hook to manage startup progress overlay state.
 * Listens for startup:stage and startup:complete events from Rust/frontend.
 * Provides auto-dismiss when all stages complete or after 15s timeout.
 */
export function useStartupProgress() {
  const [stages, setStages] = useState<StartupStage[]>(INITIAL_STAGES);
  const [isComplete, setIsComplete] = useState(false);
  const [currentTip, setCurrentTip] = useState('正在启动...');
  const [isVisible, setIsVisible] = useState(true);

  // Handle stage event from Rust or frontend
  const handleStageEvent = useCallback(
    (payload: { stage: number; name: string; status: 'active' | 'complete' }) => {
      const { stage, name, status } = payload;
      setStages((prev) => {
        const updated = prev.map((s) =>
          s.stage === stage ? { ...s, status } : s
        );
        // Update current tip to the nameZh of the updated stage
        const updatedStage = updated.find((s) => s.stage === stage);
        if (updatedStage) {
          setCurrentTip(updatedStage.nameZh);
        }
        return updated;
      });
    },
    []
  );

  // Handle complete event - mark complete and hide after delay
  const handleCompleteEvent = useCallback(() => {
    setIsComplete(true);
    setCurrentTip('助手就绪');
    // Delay hiding to let user see final state
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  }, []);

  // Listen for startup events
  useEffect(() => {
    if (!isTauriEnvironment()) {
      // In browser dev mode, simulate completion after 2s
      const timer = setTimeout(() => {
        setStages((prev) => prev.map((s) => ({ ...s, status: 'complete' as const })));
        setCurrentTip('助手就绪');
        setIsComplete(true);
        setTimeout(() => setIsVisible(false), 300);
      }, 2000);
      return () => clearTimeout(timer);
    }

    let unlistenStage: (() => void) | null = null;
    let unlistenComplete: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const setup = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      unlistenStage = await listen<{ stage: number; name: string; status: 'active' | 'complete' }>(
        'startup:stage',
        (event) => handleStageEvent(event.payload)
      );

      unlistenComplete = await listen('startup:complete', () => {
        handleCompleteEvent();
      });

      // Timeout fallback
      const timeoutMs = Number(import.meta.env.VITE_STARTUP_PROGRESS_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
      timeoutId = setTimeout(() => {
        console.log('[useStartupProgress] Timeout reached, dismissing overlay');
        handleCompleteEvent();
      }, timeoutMs);
    };

    setup();

    return () => {
      unlistenStage?.();
      unlistenComplete?.();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [handleStageEvent, handleCompleteEvent]);

  // Auto-dismiss when all stages complete
  useEffect(() => {
    const allComplete = stages.every((s) => s.status === 'complete');
    if (allComplete && !isComplete) {
      setIsComplete(true);
      setCurrentTip('助手就绪');
      setTimeout(() => {
        setIsVisible(false);
      }, 300);
    }
  }, [stages, isComplete]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    stages,
    isComplete,
    isVisible,
    currentTip,
    dismiss,
  };
}
