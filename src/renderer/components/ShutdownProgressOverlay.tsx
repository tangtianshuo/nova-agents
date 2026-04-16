import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

export interface ShutdownProgressOverlayProps {
  /** Whether to show the overlay */
  visible: boolean;
  /** Called when progress reaches 100% */
  onComplete?: () => void;
}

// Shutdown steps - designed for good user experience
const SHUTDOWN_TIPS = [
  '正在关闭会话...',
  '正在保存配置...',
  '正在清理资源...',
  '即将完成...',
];

/**
 * Full-screen overlay shown during app shutdown.
 * Displays progress with animated steps for better user experience.
 */
export default function ShutdownProgressOverlay({
  visible,
  onComplete,
}: ShutdownProgressOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [tip, setTip] = useState(SHUTDOWN_TIPS[0]);
  const startedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const tipIndexRef = useRef(0);

  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // Animation effect
  useEffect(() => {
    if (!visible) {
      // Reset state when hidden
      startedRef.current = false;
      startTimeRef.current = null;
      setProgress(0);
      setTip(SHUTDOWN_TIPS[0]);
      tipIndexRef.current = 0;
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;
    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - (startTimeRef.current || Date.now());
      // 7 seconds total duration
      const totalDuration = 7000;
      const newProgress = Math.min(100, (elapsed / totalDuration) * 100);
      setProgress(newProgress);

      // Update tip based on progress
      const newTipIndex = Math.floor(newProgress / 25);
      const idx = Math.min(newTipIndex, SHUTDOWN_TIPS.length - 1);
      if (idx !== tipIndexRef.current) {
        tipIndexRef.current = idx;
        setTip(SHUTDOWN_TIPS[idx]);
      }

      if (newProgress < 100) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        handleComplete();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        // If we're being cleaned up but animation is near complete, call onComplete
        // This handles the case where App.tsx sets visible=false before we reach 100%
        const elapsed = Date.now() - (startTimeRef.current || Date.now());
        const totalDuration = 7000;
        const currentProgress = Math.min(100, (elapsed / totalDuration) * 100);
        if (currentProgress >= 99) {
          handleComplete();
        }
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [visible, handleComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex w-full max-w-xs flex-col items-center rounded-[var(--radius-xl)] bg-[var(--paper-elevated)] p-8 shadow-xl">
        {/* Spinning icon */}
        <Loader2 className="h-12 w-12 animate-spin text-[var(--accent-warm)]" />

        {/* Status text */}
        <p className="mt-6 text-[14px] font-medium text-[var(--ink)]">
          {tip}
        </p>

        {/* Progress bar */}
        <div className="mt-4 w-full rounded-full bg-[var(--paper-inset)] p-[2px]">
          <div
            className="h-2 rounded-full bg-[var(--accent-warm)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress percentage */}
        <p className="mt-2 text-[12px] text-[var(--ink-muted)]">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}
