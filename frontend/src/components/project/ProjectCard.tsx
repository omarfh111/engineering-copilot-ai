import { Eye, FolderKanban, PencilLine, Trash2 } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import { formatProjectStatus, getProjectStatusTone } from '../../lib/project';
import type { Project } from '../../types/project';
import { StatusBadge } from '../common/StatusBadge';

interface ProjectCardProps {
  project: Project;
  canManageProjects: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, canManageProjects, onView, onEdit, onDelete }: ProjectCardProps) {
  return (
    <article className="page-shell border-white/10 bg-slate-950/60">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{project.title}</h3>
            <p className="text-sm text-slate-400">{project.team.teamName}</p>
          </div>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
          onClick={onView}
          type="button"
        >
          <Eye className="h-4 w-4" />
          View
        </button>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-300">{project.description || 'No description provided yet.'}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Team</p>
          <p className="mt-2 text-base font-semibold text-white">{project.team.teamName}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
          <div className="mt-2">
            <StatusBadge label={formatProjectStatus(project.status)} tone={getProjectStatusTone(project.status)} />
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Created</p>
          <p className="mt-2 text-base font-semibold text-white">{formatDate(project.createdAt)}</p>
        </div>
      </div>

      {canManageProjects ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
            onClick={onEdit}
            type="button"
          >
            <PencilLine className="h-4 w-4" />
            Edit
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
            onClick={onDelete}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      ) : null}
    </article>
  );
}
