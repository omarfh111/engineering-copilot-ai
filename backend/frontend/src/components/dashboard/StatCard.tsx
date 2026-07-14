import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
}

export function StatCard({ icon: Icon, label, value, hint }: StatCardProps) {
  return (
    <article className="page-shell transition duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
    </article>
  );
}
