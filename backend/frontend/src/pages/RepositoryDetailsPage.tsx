import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, ExternalLink, FolderKanban, GitBranch, PencilLine, Trash2 } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { DeleteRepositoryDialog } from '../components/repository/DeleteRepositoryDialog';
import { RepositoryFormModal } from '../components/repository/RepositoryFormModal';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage } from '../lib/api';
import { formatDate } from '../lib/formatters';
import { formatRepositoryProvider } from '../lib/repository';
import { adminProjectService } from '../services/adminProjectService';
import { adminRepositoryService } from '../services/adminRepositoryService';
import type { CodeRepository, RepositoryProjectSummary, UpdateRepositoryPayload } from '../types/repository';

export function RepositoryDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [repository, setRepository] = useState<CodeRepository | null>(null);
  const [projects, setProjects] = useState<RepositoryProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const repositoryId = Number(id);
  const canManageRepositories = currentUser?.role === 'ADMIN';

  const loadRepository = async () => {
    if (!Number.isFinite(repositoryId)) {
      setError('The requested repository id is invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await adminRepositoryService.getRepositoryById(repositoryId);
      setRepository(response);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    setLoadingProjects(true);

    try {
      const response = await adminProjectService.getProjects({
        page: 0,
        size: 100,
        sortBy: 'title',
        sortDirection: 'asc'
      });

      setProjects(
        response.content.map((project) => ({
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status
        }))
      );
    } catch (projectError) {
      showToast({ type: 'error', title: 'Unable to load projects', description: getApiErrorMessage(projectError) });
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    void loadRepository();
  }, [repositoryId]);

  useEffect(() => {
    if (canManageRepositories) {
      void loadProjects();
    }
  }, [canManageRepositories]);

  const handleUpdate = async (payload: UpdateRepositoryPayload) => {
    if (!repository) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedRepository = await adminRepositoryService.updateRepository(repository.id, payload);
      setRepository(updatedRepository);
      setEditOpen(false);
      showToast({ type: 'success', title: 'Repository updated', description: `${updatedRepository.name} was updated successfully.` });
    } catch (updateError) {
      showToast({ type: 'error', title: 'Update failed', description: getApiErrorMessage(updateError) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!repository) {
      return;
    }

    setSubmitting(true);

    try {
      await adminRepositoryService.deleteRepository(repository.id);
      showToast({ type: 'success', title: 'Repository deleted', description: `${repository.name} has been removed.` });
      navigate('/dashboard/repositories');
    } catch (deleteError) {
      showToast({ type: 'error', title: 'Delete failed', description: getApiErrorMessage(deleteError) });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-16 w-48" />
        <LoadingSkeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !repository) {
    return (
      <ErrorState
        actionLabel="Reload repository"
        description={error ?? 'Unable to load the requested repository.'}
        onAction={() => {
          void loadRepository();
        }}
        title="Repository details unavailable"
      />
    );
  }

  return (
    <div className="space-y-6">
      <button
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
        onClick={() => navigate('/dashboard/repositories')}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to repositories
      </button>

      <section className="page-shell flex flex-col gap-5 border-white/10 bg-slate-950/60 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
            <GitBranch className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Repository details</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{repository.name}</h1>
            <a className="mt-3 block break-all text-sm text-brand-200 transition hover:text-brand-100" href={repository.url} rel="noreferrer" target="_blank">
              {repository.url}
            </a>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge label={formatRepositoryProvider(repository.provider)} tone="brand" />
              <StatusBadge label={repository.branch || 'main'} tone="neutral" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
            onClick={() => window.open(repository.url, '_blank', 'noopener,noreferrer')}
            type="button"
          >
            <ExternalLink className="h-4 w-4" />
            Open URL
          </button>
          {canManageRepositories ? (
            <>
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
                onClick={() => setEditOpen(true)}
                type="button"
              >
                <PencilLine className="h-4 w-4" />
                Edit
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
                onClick={() => setDeleteOpen(true)}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Provider</p>
          <p className="mt-4 text-xl font-semibold text-white">{formatRepositoryProvider(repository.provider)}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Technology</p>
          <p className="mt-4 text-xl font-semibold text-white">{repository.technology || 'Not specified'}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Branch</p>
          <p className="mt-4 text-xl font-semibold text-white">{repository.branch || 'main'}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Statistics</p>
          <p className="mt-4 text-xl font-semibold text-white">Metadata ready</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <FolderKanban className="h-5 w-5" />
            <p className="font-semibold text-white">Related project</p>
          </div>
          <button
            className="mt-4 text-left text-xl font-semibold text-white transition hover:text-brand-200"
            onClick={() => navigate(`/dashboard/projects/${repository.project.id}`)}
            type="button"
          >
            {repository.project.title}
          </button>
          <p className="mt-2 text-sm text-slate-400">{repository.project.status}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <CalendarClock className="h-5 w-5" />
            <p className="font-semibold text-white">Created</p>
          </div>
          <p className="mt-4 text-xl font-semibold text-white">{formatDate(repository.createdAt)}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <CalendarClock className="h-5 w-5" />
            <p className="font-semibold text-white">Updated</p>
          </div>
          <p className="mt-4 text-xl font-semibold text-white">{formatDate(repository.updatedAt)}</p>
        </div>
      </section>

      {canManageRepositories ? (
        <>
          <RepositoryFormModal
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => setEditOpen(false)}
            onSubmit={(payload) => {
              void handleUpdate(payload as UpdateRepositoryPayload);
            }}
            open={editOpen}
            projects={projects}
            repository={repository}
            subtitle="Update provider, branch, technology, URL, and project assignment."
            title="Edit repository"
          />
          <DeleteRepositoryDialog
            loading={submitting}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={() => {
              void handleDelete();
            }}
            open={deleteOpen}
            repository={repository}
          />
        </>
      ) : null}
    </div>
  );
}
