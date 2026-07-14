import { Eye, PencilLine, Trash2, Boxes } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import { formatEnumLabel, getStatusTone } from '../../lib/analysis';
import type { Analysis } from '../../types/analysis';
import { StatusBadge } from '../common/StatusBadge';

interface AnalysisTableProps {
  analyses: Analysis[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  canManageAnalyses: boolean;
  canDeleteAnalyses: boolean;
  showProjectColumn?: boolean;
  onSort: (field: string) => void;
  onView: (analysis: Analysis) => void;
  onEdit: (analysis: Analysis) => void;
  onDelete: (analysis: Analysis) => void;
}

function SortButton({
  field,
  label,
  sortBy,
  sortDirection,
  onSort
}: {
  field: string;
  label: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
}) {
  const active = sortBy === field;

  return (
    <button className="inline-flex items-center gap-2 transition hover:text-white" onClick={() => onSort(field)} type="button">
      {label}
      <span className={`text-[10px] ${active ? 'text-brand-300' : 'text-slate-500'}`}>{active ? sortDirection.toUpperCase() : ''}</span>
    </button>
  );
}

export function AnalysisTable({
  analyses,
  sortBy,
  sortDirection,
  canManageAnalyses,
  canDeleteAnalyses,
  showProjectColumn = true,
  onSort,
  onView,
  onEdit,
  onDelete
}: AnalysisTableProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="title" label="Analysis" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="type" label="Type" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="status" label="Status" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="severity" label="Severity" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              {showProjectColumn ? (
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Project</th>
              ) : null}
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="createdAt" label="Created At" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {analyses.map((analysis) => (
              <tr className="transition hover:bg-brand-500/5" key={analysis.id}>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{analysis.title}</p>
                      <p className="max-w-[320px] text-sm text-slate-400">{analysis.summary || 'No summary provided yet.'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{formatEnumLabel(analysis.analysisType)}</td>
                <td className="px-6 py-5">
                  <StatusBadge label={formatEnumLabel(analysis.status)} tone={getStatusTone(analysis.status)} />
                </td>
                <td className="px-6 py-5">
                  <StatusBadge label={formatEnumLabel(analysis.severity)} tone={getStatusTone(analysis.severity)} />
                </td>
                {showProjectColumn ? <td className="px-6 py-5 text-sm text-slate-300">{analysis.project.title}</td> : null}
                <td className="px-6 py-5 text-sm text-slate-300">{formatDate(analysis.createdAt)}</td>
                <td className="px-6 py-5">
                  <div className="flex justify-end gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                      onClick={() => onView(analysis)}
                      type="button"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    {canManageAnalyses ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                        onClick={() => onEdit(analysis)}
                        type="button"
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </button>
                    ) : null}
                    {canDeleteAnalyses ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/10"
                        onClick={() => onDelete(analysis)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
