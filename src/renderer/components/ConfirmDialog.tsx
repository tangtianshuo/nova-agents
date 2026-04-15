import { useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmLabel?: string; // Deprecated, use confirmText
    cancelLabel?: string;  // Deprecated, use cancelText
    confirmVariant?: 'danger' | 'primary';
    danger?: boolean; // Deprecated, use confirmVariant
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    title,
    message,
    confirmText,
    cancelText,
    confirmLabel,
    cancelLabel,
    confirmVariant,
    danger = false,
    loading = false,
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
    // Support both old and new props
    const finalConfirmText = confirmText || confirmLabel || '确认';
    const finalCancelText = cancelText || cancelLabel || '取消';
    const isDanger = confirmVariant === 'danger' || danger;

    // Keyboard: Enter to confirm, Escape to cancel
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (loading) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    }, [loading, onConfirm, onCancel]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
        >
            <div className="w-full max-w-sm rounded-2xl bg-[var(--paper-elevated)] shadow-xl">
                {/* Header */}
                <div className="px-6 pt-5 pb-4">
                    <h2 className="text-[16px] font-semibold text-[var(--ink)]">{title}</h2>
                </div>

                {/* Message */}
                <div className="px-6 pb-5">
                    <p className="text-[14px] leading-relaxed text-[var(--ink-muted)] whitespace-pre-line">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t border-[var(--line)] px-6 py-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-full bg-[var(--button-secondary-bg)] px-5 py-2 text-[13px] font-medium text-[var(--button-secondary-text)] transition-all hover:bg-[var(--button-secondary-bg-hover)] disabled:opacity-50 active:scale-[0.98]"
                    >
                        {finalCancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium text-white transition-all disabled:opacity-50 active:scale-[0.98] ${isDanger
                            ? 'bg-[var(--error)] hover:bg-[var(--error-hover)]'
                            : 'bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)]'
                            }`}
                    >
                        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {finalConfirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
