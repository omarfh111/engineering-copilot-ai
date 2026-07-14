import { Eye, FolderKanban, PencilLine, Trash2 } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import { formatProjectStatus, getProjectStatusTone } from '../../lib/project';
import type { Project } from '../../types/project';
import { StatusBadge } from '../common/StatusBadge';

interface ProjectTableProps {
  projects: Project[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  canManageProjects: boolean;
  onSort: (field: string) => void;
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
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

export function ProjectTable({
  projects,
  sortBy,
  sortDirection,
  canManageProjects,
  onSort,
  onView,
  onEdit,
  onDelete
}: ProjectTableProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="title" label="Title" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Team</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="createdAt" label="Created At" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {projects.map((project) => (
              <tr className="transition hover:bg-brand-500/5" key={project.id}>
                <td className="px-6 py-5">
                  <button className="flex items-center gap-3 text-left" onClick={() => onView(project)} type="button">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{project.title}</p>
                      <p className="max-w-[320px] text-sm text-slate-400">{project.description || 'No description provided yet.'}</p>
                    </div>
                  </button>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{project.team.teamName}</td>
                <td className="px-6 py-5">
                  <StatusBadge label={formatProjectStatus(project.status)} tone={getProjectStatusTone(project.status)} />
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{formatDate(project.createdAt)}</td>
                <td className="px-6 py-5">
                  <div className="flex justify-end gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                      onClick={() => onView(project)}
                      type="button"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    {canManageProjects ? (
                      <>
                        <button
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                          onClick={() => onEdit(project)}
                          type="button"
                        >
                          <PencilLine className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/10"
                          onClick={() => onDelete(project)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </>
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
