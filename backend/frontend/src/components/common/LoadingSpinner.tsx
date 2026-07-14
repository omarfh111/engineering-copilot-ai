export function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 dark:border-brand-900 dark:border-t-brand-300" />
      <span>{label}</span>
    </div>
  );
}
