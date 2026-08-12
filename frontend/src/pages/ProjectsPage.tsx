import { useEffect, useState } from 'react';
import { Filter, FolderKanban, ShieldPlus, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { DeleteProjectDialog } from '../components/project/DeleteProjectDialog';
import { ProjectCard } from '../components/project/ProjectCard';
import { ProjectFormModal } from '../components/project/ProjectFormModal';
import { ProjectTable } from '../components/project/ProjectTable';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { getApiErrorMessage } from '../lib/api';
import { formatProjectStatus, projectStatusOptions } from '../lib/project';
import { adminProjectService } from '../services/adminProjectService';
import { adminTeamService } from '../services/adminTeamService';
import type {
  CreateProjectPayload,
  Project,
  ProjectQueryParams,
  ProjectStatusFilter,
  ProjectTeamSummary,
  UpdateProjectPayload
} from '../types/project';

const defaultFilters: ProjectQueryParams = {
  search: '',
  status: '',
  teamId: '',
  page: 0,
  size: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc'
};

export function ProjectsPage() {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<ProjectQueryParams>(defaultFilters);
  const [projectPage, setProjectPage] = useState<Awaited<ReturnType<typeof adminProjectService.getProjects>> | null>(null);
  const [teams, setTeams] = useState<ProjectTeamSummary[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(filters.search ?? '');

  const canManageProjects = currentUser?.role === 'ADMIN';

  const loadProjects = async () => {
    setLoading(true);

    try {
      const response = await adminProjectService.getProjects({
        ...filters,
        search: debouncedSearch
      });
      setProjectPage(response);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    setLoadingTeams(true);

    try {
      const response = await adminTeamService.getTeams({
        page: 0,
        size: 100,
        sortBy: 'teamName',
        sortDirection: 'asc'
      });

      setTeams(
        response.content.map((team) => ({
          id: team.id,
          teamName: team.teamName,
          description: team.description
        }))
      );
    } catch (teamError) {
      setTeams([]);

      if (canManageProjects) {
        showToast({
          type: 'error',
          title: 'Unable to load teams',
          description: getApiErrorMessage(teamError)
        });
      }
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, [debouncedSearch, filters.page, filters.size, filters.sortBy, filters.sortDirection, filters.status, filters.teamId]);

  useEffect(() => {
    void loadTeams();
  }, [canManageProjects]);

  const handleSort = (field: string) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      sortBy: field,
      sortDirection:
        currentFilters.sortBy === field && currentFilters.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreateSubmit = async (payload: CreateProjectPayload) => {
    setSubmitting(true);

    try {
      await adminProjectService.createProject(payload);
      showToast({
        type: 'success',
        title: 'Project created',
        description: `${payload.title} was created successfully.`
      });
      setCreateOpen(false);
      await loadProjects();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create project',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (payload: UpdateProjectPayload) => {
    if (!selectedProject) {
      return;
    }

    setSubmitting(true);

    try {
      await adminProjectService.updateProject(selectedProject.id, payload);
      showToast({
        type: 'success',
        title: 'Project updated',
        description: `${payload.title} was updated successfully.`
      });
      setEditOpen(false);
      await loadProjects();
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
    if (!selectedProject) {
      return;
    }

    setSubmitting(true);

    try {
      await adminProjectService.deleteProject(selectedProject.id);
      showToast({
        type: 'success',
        title: 'Project deleted',
        description: `${selectedProject.title} has been removed.`
      });
      setDeleteOpen(false);
      setSelectedProject(null);
      await loadProjects();
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

  const createdProjects = projectPage?.content.filter((project) => project.status === 'CREATED').length ?? 0;
  const readyProjects = projectPage?.content.filter((project) => project.status === 'READY').length ?? 0;
  const auditedProjects = projectPage?.content.filter((project) => project.status === 'AUDITED').length ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Total projects</p>
          <p className="mt-4 text-4xl font-semibold text-white">{projectPage?.totalElements ?? 0}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Created projects</p>
          <p className="mt-4 text-4xl font-semibold text-white">{createdProjects}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Ready projects</p>
          <p className="mt-4 text-4xl font-semibold text-white">{readyProjects}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Audited projects</p>
          <p className="mt-4 text-4xl font-semibold text-white">{auditedProjects}</p>
        </div>
      </section>

      <section className="page-shell space-y-5 border-white/10 bg-slate-950/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Project portfolio</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Manage engineering projects</h3>
            <p className="mt-2 text-sm text-slate-400">
              Search delivery initiatives, inspect their assigned team, and manage project lifecycle status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
              <FolderKanban className="h-4 w-4" />
              {projectPage?.totalElements ?? 0} projects matched
            </div>
            {canManageProjects ? (
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400"
                onClick={() => setCreateOpen(true)}
                type="button"
              >
                <ShieldPlus className="h-4 w-4" />
                Create Project
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_180px_170px]">
          <SearchBar
            onChange={(value) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                search: value,
                page: 0
              }))
            }
            placeholder="Search by title or description"
            value={filters.search ?? ''}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  status: event.target.value as ProjectStatusFilter,
                  page: 0
                }))
              }
              value={filters.status}
            >
              <option className="bg-slate-950 text-white" value="">
                All statuses
              </option>
              {projectStatusOptions.map((status) => (
                <option className="bg-slate-950 text-white" key={status} value={status}>
                  {formatProjectStatus(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              disabled={loadingTeams}
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  teamId: event.target.value ? Number(event.target.value) : '',
                  page: 0
                }))
              }
              value={filters.teamId === '' ? '' : String(filters.teamId)}
            >
              <option className="bg-slate-950 text-white" value="">
                {loadingTeams ? 'Loading teams...' : 'All teams'}
              </option>
              {teams.map((team) => (
                <option className="bg-slate-950 text-white" key={team.id} value={team.id}>
                  {team.teamName}
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
          actionLabel="Reload projects"
          description={error}
          onAction={() => {
            void loadProjects();
          }}
          title="Unable to load projects"
        />
      ) : !projectPage || projectPage.content.length === 0 ? (
        <EmptyState
          description={
            canManageProjects
              ? 'Try adjusting your filters or create the first engineering project.'
              : 'Try adjusting your filters to surface matching engineering projects.'
          }
          title="No projects found"
        />
      ) : (
        <>
          <div className="hidden xl:block">
            <ProjectTable
              canManageProjects={canManageProjects}
              onDelete={(project) => {
                setSelectedProject(project);
                setDeleteOpen(true);
              }}
              onEdit={(project) => {
                setSelectedProject(project);
                setEditOpen(true);
              }}
              onSort={handleSort}
              onView={(project) => navigate(`/dashboard/projects/${project.id}`)}
              projects={projectPage.content}
              sortBy={filters.sortBy ?? 'createdAt'}
              sortDirection={filters.sortDirection ?? 'desc'}
            />
          </div>

          <div className="grid gap-4 xl:hidden">
            {projectPage.content.map((project) => (
              <ProjectCard
                canManageProjects={canManageProjects}
                key={project.id}
                onDelete={() => {
                  setSelectedProject(project);
                  setDeleteOpen(true);
                }}
                onEdit={() => {
                  setSelectedProject(project);
                  setEditOpen(true);
                }}
                onView={() => navigate(`/dashboard/projects/${project.id}`)}
                project={project}
              />
            ))}
          </div>

          <Pagination
            currentPage={projectPage.page}
            onPageChange={(page) => setFilters((currentFilters) => ({ ...currentFilters, page }))}
            totalPages={projectPage.totalPages}
          />
        </>
      )}

      {canManageProjects ? (
        <>
          <ProjectFormModal
            loading={submitting}
            loadingTeams={loadingTeams}
            onClose={() => setCreateOpen(false)}
            onSubmit={(payload) => {
              void handleCreateSubmit(payload);
            }}
            open={createOpen}
            subtitle="Create a project and link it to a delivery team before repositories are attached."
            teams={teams}
            title="Create project"
          />

          <ProjectFormModal
            loading={submitting}
            loadingTeams={loadingTeams}
            onClose={() => {
              setEditOpen(false);
              setSelectedProject(null);
            }}
            onSubmit={(payload) => {
              void handleEditSubmit(payload);
            }}
            open={editOpen}
            project={selectedProject}
            subtitle="Update project naming, scope notes, team ownership, and lifecycle stage."
            teams={teams}
            title="Edit project"
          />

          <DeleteProjectDialog
            loading={submitting}
            onCancel={() => {
              setDeleteOpen(false);
              setSelectedProject(null);
            }}
            onConfirm={() => {
              void handleDeleteConfirm();
            }}
            open={deleteOpen}
            project={selectedProject}
          />
        </>
      ) : null}
    </div>
  );
}
