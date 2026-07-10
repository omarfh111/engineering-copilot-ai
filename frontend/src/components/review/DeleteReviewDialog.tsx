import { AlertTriangle, X } from 'lucide-react';
import type { Review } from '../../types/review';

interface DeleteReviewDialogProps {
  open: boolean;
  review: Review | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteReviewDialog({ open, review, loading, onCancel, onConfirm }: DeleteReviewDialogProps) {
  if (!open || !review) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="animate-slideUp w-full max-w-lg rounded-[32px] border border-white/60 bg-white p-6 shadow-panel dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Delete review</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This permanently removes the selected review decision.</p>
            </div>
          </div>
          <button
            className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-white"
            onClick={onCancel}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          You are about to delete the review by <strong>{review.reviewer}</strong>.
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-2xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            {loading ? 'Deleting...' : 'Delete review'}
          </button>
        </div>
      </div>
    </div>
  );
}
