import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import type { AdminMetric } from '../../types/admin';

interface AdminMetricCardProps {
  icon: LucideIcon;
  label: string;
  metric: AdminMetric;
}

function TrendIcon({ direction }: { direction: AdminMetric['trend']['direction'] }) {
  if (direction === 'up') {
    return <ArrowUpRight className="h-3.5 w-3.5" />;
  }

  if (direction === 'down') {
    return <ArrowDownRight className="h-3.5 w-3.5" />;
  }

  return <ArrowRight className="h-3.5 w-3.5" />;
}

function trendTone(direction: AdminMetric['trend']['direction']) {
  if (direction === 'up') {
    return 'text-emerald-300';
  }

  if (direction === 'down') {
    return 'text-rose-300';
  }

  return 'text-slate-300';
}

export function AdminMetricCard({ icon: Icon, label, metric }: AdminMetricCardProps) {
  const value = useCountUp(metric.total);

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(9,14,28,0.88))] p-5 shadow-[0_24px_60px_-36px_rgba(59,130,246,0.55)] transition duration-300 hover:-translate-y-1 hover:border-brand-400/25 hover:shadow-[0_30px_75px_-36px_rgba(59,130,246,0.7)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.16),_transparent_34%)] opacity-0 transition duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-5 text-4xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-400/20 bg-brand-500/10 text-brand-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className={`relative mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] ${trendTone(metric.trend.direction)}`}>
        <TrendIcon direction={metric.trend.direction} />
        {metric.trend.value}
      </div>
      <p className="relative mt-2 text-sm leading-6 text-slate-400">{metric.trend.label}</p>
    </article>
  );
}
