interface StatusBadgeProps {
  label: string;
  tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

const badgeToneClasses: Record<StatusBadgeProps['tone'], string> = {
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeToneClasses[tone]}`}>
      {label}
    </span>
  );
}
