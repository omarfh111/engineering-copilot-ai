import type { AnalyticsPoint } from '../../services/platformMockService';

interface MiniBarChartProps {
  title: string;
  points: AnalyticsPoint[];
  tone?: 'brand' | 'success' | 'warning';
}

const toneClasses = {
  brand: 'from-brand-500 to-sky-400',
  success: 'from-emerald-500 to-teal-300',
  warning: 'from-amber-400 to-orange-400'
};

export function MiniBarChart({ title, points, tone = 'brand' }: MiniBarChartProps) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <article className="page-shell">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:text-brand-300">{title}</p>
      <div className="mt-5 flex h-44 items-end gap-3">
        {points.map((point) => (
          <div className="flex flex-1 flex-col items-center gap-2" key={point.label}>
            <div className="flex h-32 w-full items-end rounded-full bg-slate-100 p-1 dark:bg-slate-800">
              <div
                className={`w-full rounded-full bg-gradient-to-t ${toneClasses[tone]} shadow-lg transition-all duration-500`}
                style={{ height: `${Math.max(10, (point.value / maxValue) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{point.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
