import { BrainCircuit } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import type { AdminRecentAnalysis } from '../../types/admin';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';

interface AdminAnalysesTableProps {
  analyses: AdminRecentAnalysis[];
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

function resolveSeverityTone(severity: string) {
  const normalizedSeverity = severity.toLowerCase();

  if (normalizedSeverity.includes('high') || normalizedSeverity.includes('critical')) {
    return 'danger' as const;
  }

  if (normalizedSeverity.includes('medium') || normalizedSeverity.includes('moderate')) {
    return 'warning' as const;
  }

  return 'success' as const;
}

export function AdminAnalysesTable({ analyses }: AdminAnalysesTableProps) {
  if (analyses.length === 0) {
    return (
      <EmptyState
        description="Recent analysis activity will appear here as repository scans and reviews complete."
        title="No recent analyses"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/55 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.95)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/[0.03]">
            <tr>
              {['Repository', 'Analysis Type', 'Status', 'Severity', 'Created At'].map((header) => (
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {analyses.map((analysis) => (
              <tr className="transition hover:bg-brand-500/5" key={analysis.id}>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-200">
                      <BrainCircuit className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-white">{analysis.repository}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{analysis.analysisType}</td>
                <td className="px-6 py-5">
                  <StatusBadge label={analysis.status} tone={resolveStatusTone(analysis.status)} />
                </td>
                <td className="px-6 py-5">
                  <StatusBadge label={analysis.severity} tone={resolveSeverityTone(analysis.severity)} />
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{formatDate(analysis.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
