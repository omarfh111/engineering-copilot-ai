import { ExternalLink, Eye, FileText, PencilLine, Trash2 } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate } from '../../lib/formatters';
import {
  formatDocumentationStatus,
  formatDocumentationType,
  getDocumentationStatusTone
} from '../../lib/documentation';
import type { Documentation } from '../../types/documentation';

interface DocumentationTableProps {
  documentation: Documentation[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  canManageDocumentation: boolean;
  canDeleteDocumentation: boolean;
  showProjectColumn?: boolean;
  showViewProjectAction?: boolean;
  onSort: (field: string) => void;
  onViewDetails?: (documentation: Documentation) => void;
  onViewProject: (documentation: Documentation) => void;
  onEdit: (documentation: Documentation) => void;
  onDelete: (documentation: Documentation) => void;
  onOpenPath: (documentation: Documentation) => void;
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

export function DocumentationTable({
  documentation,
  sortBy,
  sortDirection,
  canManageDocumentation,
  canDeleteDocumentation,
  showProjectColumn = true,
  showViewProjectAction = true,
  onSort,
  onViewDetails,
  onViewProject,
  onEdit,
  onDelete,
  onOpenPath
}: DocumentationTableProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="title" label="Title" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="type" label="Type" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="status" label="Status" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              {showProjectColumn ? (
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Project</th>
              ) : null}
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Generated externally</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Approved</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="createdAt" label="Created At" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {documentation.map((entry) => (
              <tr className="transition hover:bg-brand-500/5" key={entry.id}>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{entry.title}</p>
                      <p className="max-w-[320px] text-sm text-slate-400">{entry.description || 'No description provided yet.'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="inline-flex rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
                    {formatDocumentationType(entry.type)}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <StatusBadge
                    label={formatDocumentationStatus(entry.status)}
                    tone={getDocumentationStatusTone(entry.status)}
                  />
                </td>
                {showProjectColumn ? <td className="px-6 py-5 text-sm text-slate-300">{entry.project.title}</td> : null}
                <td className="px-6 py-5 text-sm text-slate-300">{entry.generatedByAI ? 'Yes' : 'No'}</td>
                <td className="px-6 py-5 text-sm text-slate-300">{entry.approved ? 'Yes' : 'No'}</td>
                <td className="px-6 py-5 text-sm text-slate-300">{formatDate(entry.createdAt)}</td>
                <td className="px-6 py-5">
                  <div className="flex justify-end gap-2">
                    {onViewDetails ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                        onClick={() => onViewDetails(entry)}
                        type="button"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    ) : null}
                    {showViewProjectAction ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                        onClick={() => onViewProject(entry)}
                        type="button"
                      >
                        <Eye className="h-4 w-4" />
                        View project
                      </button>
                    ) : null}
                    {entry.path ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                        onClick={() => onOpenPath(entry)}
                        type="button"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open path
                      </button>
                    ) : null}
                    {canManageDocumentation ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                        onClick={() => onEdit(entry)}
                        type="button"
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </button>
                    ) : null}
                    {canDeleteDocumentation ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/10"
                        onClick={() => onDelete(entry)}
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
