import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { RefreshCw } from 'lucide-react';

export interface UpdateRestartOverlayHandle {
    /** External: update progress and tip text */
    setProgress: (progress: number, tip: string) => void;
    /** External: mark as complete (progress = 100, then call onComplete) */
    complete: () => void;
}

export interface UpdateRestartOverlayProps {
    version: string;
    /** Called when progress reaches 100% and countdown completes */
    onComplete?: () => void;
    /** If provided, progress bar is controlled externally (no internal animation) */
    externalProgress?: number;
}

// Default tips when not using external progress
const DEFAULT_TIPS = [
    '正在关闭后台进程...',
    '正在准备更新环境...',
    '正在安装更新...',
    '即将启动新版本...',
];

/**
 * Full-screen overlay shown during update restart.
 * Supports both internal countdown animation and external progress control.
 */
const UpdateRestartOverlay = forwardRef<UpdateRestartOverlayHandle, UpdateRestartOverlayProps>(
function UpdateRestartOverlay({
    version,
    onComplete,
    externalProgress,
}: UpdateRestartOverlayProps, ref) {
    const [progress, setProgressState] = useState(0);
    const [tip, setTip] = useState(DEFAULT_TIPS[0]);
    const [isComplete, setIsComplete] = useState(false);
    const startedRef = useRef(false);
    const startTimeRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const tipIndexRef = useRef(0);

    const isExternal = externalProgress !== undefined;

    // Expose setProgress/complete to parent via ref
    useImperativeHandle(ref, () => ({
        setProgress: (newProgress: number, newTip: string) => {
            setProgressState(Math.min(100, Math.max(0, newProgress)));
            setTip(newTip);
        },
        complete: () => {
            setIsComplete(true);
        },
    }), []);

    const handleComplete = useCallback(() => {
        onComplete?.();
    }, [onComplete]);

    // Internal animation (when not using external progress)
    useEffect(() => {
        if (isExternal) return;
        if (startedRef.current) return;
        startedRef.current = true;
        startTimeRef.current = Date.now();

        const animate = () => {
            const elapsed = Date.now() - (startTimeRef.current || Date.now());
            // Use a longer duration (8s) for realistic feel
            const totalDuration = 8000;
            const newProgress = Math.min(100, (elapsed / totalDuration) * 100);
            setProgressState(newProgress);

            // Update tip based on progress
            const newTipIndex = Math.floor(newProgress / 25);
            const idx = Math.min(newTipIndex, DEFAULT_TIPS.length - 1);
            if (idx !== tipIndexRef.current) {
                tipIndexRef.current = idx;
                setTip(DEFAULT_TIPS[idx]);
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
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [handleComplete, isExternal]);

    // External progress mode
    useEffect(() => {
        if (!isExternal) return;
        if (progress >= 100 && !isComplete) {
            // Small delay then call complete
            const timer = setTimeout(() => {
                handleComplete();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isExternal, progress, isComplete, handleComplete]);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="flex w-full max-w-xs flex-col items-center rounded-[var(--radius-xl)] bg-[var(--paper-elevated)] p-8 shadow-xl">
                {/* Spinning icon */}
                <RefreshCw className="h-12 w-12 animate-spin text-[var(--accent-warm)]" />

                {/* Status text */}
                <p className="mt-6 text-[14px] font-medium text-[var(--ink)]">
                    {tip}
                </p>

                {/* Progress bar */}
                <div className="mt-4 w-full rounded-full bg-[var(--paper-inset)] p-[2px]">
                    <div
                        className="h-2 rounded-full bg-[var(--accent-warm)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Progress percentage */}
                <p className="mt-2 text-[12px] text-[var(--ink-muted)]">
                    {Math.round(progress)}%
                </p>

                {/* Version info */}
                <p className="mt-6 text-[12px] text-[var(--ink-muted)]">
                    v{version}
                </p>
            </div>
        </div>
    );
});

UpdateRestartOverlay.displayName = 'UpdateRestartOverlay';

export default UpdateRestartOverlay;
