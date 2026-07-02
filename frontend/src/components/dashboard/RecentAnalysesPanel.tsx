import { BrainCircuit } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import type { DashboardAnalysis } from '../../types/dashboard';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';

interface RecentAnalysesPanelProps {
  analyses: DashboardAnalysis[];
}

function resolveStatusTone(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes('completed') || normalizedStatus.includes('ready')) {
    return 'success' as const;
  }

  if (normalizedStatus.includes('failed') || normalizedStatus.includes('blocked')) {
    return 'danger' as const;
  }

  return 'warning' as const;
}

export function RecentAnalysesPanel({ analyses }: RecentAnalysesPanelProps) {
  if (analyses.length === 0) {
    return (
      <EmptyState
        description="Fresh analysis runs, architecture reviews, and security scans will show up here."
        title="No analyses yet"
      />
    );
  }

  return (
    <div className="space-y-4">
      {analyses.map((analysis) => (
        <article
          className="glass-panel rounded-[26px] p-5 transition duration-200 hover:-translate-y-0.5"
          key={analysis.id}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{analysis.projectTitle}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{analysis.type}</p>
              </div>
            </div>
            <StatusBadge label={analysis.status} tone={resolveStatusTone(analysis.status)} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>{formatDate(analysis.createdAt)}</span>
            <span>{analysis.score !== undefined ? `Score ${analysis.score}` : 'Awaiting score'}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
