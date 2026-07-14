import { ExternalLink, Eye, GitBranch, PencilLine, Trash2 } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import { formatRepositoryProvider } from '../../lib/repository';
import type { CodeRepository } from '../../types/repository';

interface RepositoryCardProps {
  repository: CodeRepository;
  canManageRepositories: boolean;
  showProjectMeta?: boolean;
  showViewProjectAction?: boolean;
  onViewDetails?: () => void;
  onViewProject: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenUrl: () => void;
}

export function RepositoryCard({
  repository,
  canManageRepositories,
  showProjectMeta = true,
  showViewProjectAction = true,
  onViewDetails,
  onViewProject,
  onEdit,
  onDelete,
  onOpenUrl
}: RepositoryCardProps) {
  return (
    <article className="page-shell border-white/10 bg-slate-950/60">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{repository.name}</h3>
            <p className="text-sm text-slate-400">{formatRepositoryProvider(repository.provider)}</p>
          </div>
        </div>
        {showViewProjectAction ? (
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
            onClick={onViewProject}
            type="button"
          >
            <Eye className="h-4 w-4" />
            View project
          </button>
        ) : null}
      </div>

      <a
        className="mt-4 block break-all text-sm leading-7 text-brand-200 transition hover:text-brand-100"
        href={repository.url}
        rel="noreferrer"
        target="_blank"
      >
        {repository.url}
      </a>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Technology</p>
          <p className="mt-2 text-base font-semibold text-white">{repository.technology || 'Not specified'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Branch</p>
          <p className="mt-2 text-base font-semibold text-white">{repository.branch || 'main'}</p>
        </div>
        {showProjectMeta ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Project</p>
            <p className="mt-2 text-base font-semibold text-white">{repository.project.title}</p>
          </div>
        ) : null}
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Created</p>
          <p className="mt-2 text-base font-semibold text-white">{formatDate(repository.createdAt)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {onViewDetails ? (
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
            onClick={onViewDetails}
            type="button"
          >
            <Eye className="h-4 w-4" />
            View details
          </button>
        ) : null}
        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
          onClick={onOpenUrl}
          type="button"
        >
          <ExternalLink className="h-4 w-4" />
          Open URL
        </button>
        {canManageRepositories ? (
          <>
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
          </>
        ) : null}
      </div>
    </article>
  );
}
