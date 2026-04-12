import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

/**
 * DeleteConfirmDialog Props - Reusable delete confirmation dialog
 *
 * Features:
 * - Click-outside-to-close (prevents accidental dismissal during text selection)
 * - Escape key handler
 * - Loading state during deletion
 * - Reusable for any deletion scenario (providers, MCPs, workspaces)
 */
export interface DeleteConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  itemType?: string;
  itemName?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({
  open,
  title,
  message,
  itemType,
  itemName,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // Track mouseDown target to prevent closing during text selection drag
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const handleBackdropMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel]
  );

  // Escape key to close
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel]
  );

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  }, [onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl bg-[var(--paper-elevated)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg p-1.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper-inset)] hover:text-[var(--ink)] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Warning icon */}
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning-bg)]">
            <AlertTriangle className="h-6 w-6 text-[var(--warning)]" />
          </div>

          {/* Confirmation message */}
          {itemType && itemName && (
            <p className="mb-2 text-sm text-[var(--ink)]">
              确认删除 &quot;{itemName}&quot;?
            </p>
          )}
          <p className="text-sm text-[var(--ink-muted)]">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[var(--line)] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[var(--button-secondary-bg-hover)] disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg bg-[var(--error)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--error-hover)] disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
