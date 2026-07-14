import { RefreshCcw, ShieldAlert } from 'lucide-react';

interface ErrorStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ErrorState({ title, description, actionLabel, onAction }: ErrorStateProps) {
  return (
    <div className="page-shell flex min-h-[320px] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {actionLabel && onAction ? (
        <button
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
          onClick={onAction}
          type="button"
        >
          <RefreshCcw className="h-4 w-4" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
