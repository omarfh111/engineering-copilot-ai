import { Filter, FolderGit2, ShieldPlus, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { DeleteRepositoryDialog } from '../components/repository/DeleteRepositoryDialog';
import { RepositoryCard } from '../components/repository/RepositoryCard';
import { RepositoryFormModal } from '../components/repository/RepositoryFormModal';
import { RepositoryTable } from '../components/repository/RepositoryTable';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { getApiErrorMessage } from '../lib/api';
import { formatRepositoryProvider, repositoryProviderOptions } from '../lib/repository';
import { adminProjectService } from '../services/adminProjectService';
import { adminRepositoryService } from '../services/adminRepositoryService';
import type {
  CodeRepository,
  CreateRepositoryPayload,
  RepositoryProjectSummary,
  RepositoryQueryParams,
  UpdateRepositoryPayload
} from '../types/repository';

const defaultFilters: RepositoryQueryParams = {
  search: '',
  provider: '',
  projectId: '',
  page: 0,
  size: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc'
};

export function RepositoriesPage() {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<RepositoryQueryParams>(defaultFilters);
  const [repositoryPage, setRepositoryPage] = useState<Awaited<ReturnType<typeof adminRepositoryService.getRepositories>> | null>(null);
  const [projects, setProjects] = useState<RepositoryProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepository, setSelectedRepository] = useState<CodeRepository | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(filters.search ?? '');

  const canManageRepositories = currentUser?.role === 'ADMIN';

  const loadRepositories = async () => {
    setLoading(true);

    try {
      const response = await adminRepositoryService.getRepositories({
        ...filters,
        search: debouncedSearch
      });
      setRepositoryPage(response);
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
      setProjects([]);
      showToast({
        type: 'error',
        title: 'Unable to load projects',
        description: getApiErrorMessage(projectError)
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    void loadRepositories();
  }, [debouncedSearch, filters.page, filters.size, filters.sortBy, filters.sortDirection, filters.provider, filters.projectId]);

  useEffect(() => {
    void loadProjects();
  }, []);

  const handleSort = (field: string) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      sortBy: field,
      sortDirection:
        currentFilters.sortBy === field && currentFilters.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreateSubmit = async (payload: CreateRepositoryPayload) => {
    setSubmitting(true);

    try {
      await adminRepositoryService.createRepository(payload);
      showToast({
        type: 'success',
        title: 'Repository created',
        description: `${payload.name} was linked successfully.`
      });
      setCreateOpen(false);
      await loadRepositories();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create repository',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (payload: UpdateRepositoryPayload) => {
    if (!selectedRepository) {
      return;
    }

    setSubmitting(true);

    try {
      await adminRepositoryService.updateRepository(selectedRepository.id, payload);
      showToast({
        type: 'success',
        title: 'Repository updated',
        description: `${payload.name} was updated successfully.`
      });
      setEditOpen(false);
      await loadRepositories();
    } catch (updateError) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: getApiErrorMessage(updateError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRepository) {
      return;
    }

    setSubmitting(true);

    try {
      await adminRepositoryService.deleteRepository(selectedRepository.id);
      showToast({
        type: 'success',
        title: 'Repository deleted',
        description: `${selectedRepository.name} has been removed.`
      });
      setDeleteOpen(false);
      setSelectedRepository(null);
      await loadRepositories();
    } catch (deleteError) {
      showToast({
        type: 'error',
        title: 'Delete failed',
        description: getApiErrorMessage(deleteError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openRepositoryUrl = (repository: CodeRepository) => {
    window.open(repository.url, '_blank', 'noopener,noreferrer');
  };

  const githubRepositories = repositoryPage?.content.filter((repository) => repository.provider === 'GITHUB').length ?? 0;
  const gitlabRepositories = repositoryPage?.content.filter((repository) => repository.provider === 'GITLAB').length ?? 0;
  const linkedProjects = new Set(repositoryPage?.content.map((repository) => repository.project.id) ?? []).size;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Visible repositories</p>
          <p className="mt-4 text-4xl font-semibold text-white">{repositoryPage?.totalElements ?? 0}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">GitHub repositories</p>
          <p className="mt-4 text-4xl font-semibold text-white">{githubRepositories}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">GitLab repositories</p>
          <p className="mt-4 text-4xl font-semibold text-white">{gitlabRepositories}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Projects in view</p>
          <p className="mt-4 text-4xl font-semibold text-white">{linkedProjects}</p>
        </div>
      </section>

      <section className="page-shell space-y-5 border-white/10 bg-slate-950/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Repository inventory</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Manage project repositories</h3>
            <p className="mt-2 text-sm text-slate-400">
              Link repositories to projects, filter by provider, and keep source-control metadata organized without enabling analysis yet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
              <FolderGit2 className="h-4 w-4" />
              {repositoryPage?.totalElements ?? 0} repositories matched
            </div>
            {canManageRepositories ? (
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400"
                onClick={() => setCreateOpen(true)}
                type="button"
              >
                <ShieldPlus className="h-4 w-4" />
                Add Repository
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_240px_180px_170px]">
          <SearchBar
            onChange={(value) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                search: value,
                page: 0
              }))
            }
            placeholder="Search by repository name, url, technology, or project"
            value={filters.search ?? ''}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  provider: event.target.value as RepositoryQueryParams['provider'],
                  page: 0
                }))
              }
              value={filters.provider}
            >
              <option className="bg-slate-950 text-white" value="">
                All providers
              </option>
              {repositoryProviderOptions.map((provider) => (
                <option className="bg-slate-950 text-white" key={provider} value={provider}>
                  {formatRepositoryProvider(provider)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              disabled={loadingProjects}
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  projectId: event.target.value ? Number(event.target.value) : '',
                  page: 0
                }))
              }
              value={filters.projectId === '' ? '' : String(filters.projectId)}
            >
              <option className="bg-slate-950 text-white" value="">
                {loadingProjects ? 'Loading projects...' : 'All projects'}
              </option>
              {projects.map((project) => (
                <option className="bg-slate-950 text-white" key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <SlidersHorizontal className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  size: Number(event.target.value),
                  page: 0
                }))
              }
              value={filters.size}
            >
              {[10, 20, 50].map((sizeOption) => (
                <option className="bg-slate-950 text-white" key={sizeOption} value={sizeOption}>
                  {sizeOption} per page
                </option>
              ))}
            </select>
          </label>

          <button
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-400/30 hover:text-brand-200"
            onClick={() => setFilters(defaultFilters)}
            type="button"
          >
            Reset filters
          </button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-24 w-full" />
          <LoadingSkeleton className="h-72 w-full" />
        </div>
      ) : error ? (
        <ErrorState
          actionLabel="Reload repositories"
          description={error}
          onAction={() => {
            void loadRepositories();
          }}
          title="Unable to load repositories"
        />
      ) : !repositoryPage || repositoryPage.content.length === 0 ? (
        <EmptyState
          description={
            canManageRepositories
              ? 'Try adjusting your filters or add the first repository to a project.'
              : 'Try adjusting your filters to surface repositories linked to your projects.'
          }
          title="No repositories found"
        />
      ) : (
        <>
          <div className="hidden xl:block">
            <RepositoryTable
              canManageRepositories={canManageRepositories}
              onDelete={(repository) => {
                setSelectedRepository(repository);
                setDeleteOpen(true);
              }}
              onEdit={(repository) => {
                setSelectedRepository(repository);
                setEditOpen(true);
              }}
              onOpenUrl={openRepositoryUrl}
              onSort={handleSort}
              onViewDetails={(repository) => navigate(`/dashboard/repositories/${repository.id}`)}
              onViewProject={(repository) => navigate(`/dashboard/projects/${repository.project.id}`)}
              repositories={repositoryPage.content}
              sortBy={filters.sortBy ?? 'createdAt'}
              sortDirection={filters.sortDirection ?? 'desc'}
            />
          </div>

          <div className="grid gap-4 xl:hidden">
            {repositoryPage.content.map((repository) => (
              <RepositoryCard
                canManageRepositories={canManageRepositories}
                key={repository.id}
                onDelete={() => {
                  setSelectedRepository(repository);
                  setDeleteOpen(true);
                }}
                onEdit={() => {
                  setSelectedRepository(repository);
                  setEditOpen(true);
                }}
                onOpenUrl={() => openRepositoryUrl(repository)}
                onViewDetails={() => navigate(`/dashboard/repositories/${repository.id}`)}
                onViewProject={() => navigate(`/dashboard/projects/${repository.project.id}`)}
                repository={repository}
              />
            ))}
          </div>

          <Pagination
            currentPage={repositoryPage.page}
            onPageChange={(page) => setFilters((currentFilters) => ({ ...currentFilters, page }))}
            totalPages={repositoryPage.totalPages}
          />
        </>
      )}

      {canManageRepositories ? (
        <>
          <RepositoryFormModal
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => setCreateOpen(false)}
            onSubmit={(payload) => {
              void handleCreateSubmit(payload);
            }}
            open={createOpen}
            projects={projects}
            subtitle="Create repository metadata and attach it to a project without enabling provider sync yet."
            title="Add repository"
          />

          <RepositoryFormModal
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => {
              setEditOpen(false);
              setSelectedRepository(null);
            }}
            onSubmit={(payload) => {
              void handleEditSubmit(payload);
            }}
            open={editOpen}
            projects={projects}
            repository={selectedRepository}
            subtitle="Update repository metadata, provider details, branch defaults, and project assignment."
            title="Edit repository"
          />

          <DeleteRepositoryDialog
            loading={submitting}
            onCancel={() => {
              setDeleteOpen(false);
              setSelectedRepository(null);
            }}
            onConfirm={() => {
              void handleDeleteConfirm();
            }}
            open={deleteOpen}
            repository={selectedRepository}
          />
        </>
      ) : null}
    </div>
  );
}
