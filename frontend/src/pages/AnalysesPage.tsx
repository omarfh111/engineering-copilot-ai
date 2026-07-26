import { Boxes, Filter, ShieldPlus, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalysisFormModal } from '../components/analysis/AnalysisFormModal';
import { RunAnalysisModal } from '../components/analysis/RunAnalysisModal';
import { AnalysisTable } from '../components/analysis/AnalysisTable';
import { DeleteAnalysisDialog } from '../components/analysis/DeleteAnalysisDialog';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { getApiErrorMessage } from '../lib/api';
import { analysisStatusOptions, analysisTypeOptions, formatEnumLabel } from '../lib/analysis';
import { adminAnalysisService } from '../services/adminAnalysisService';
import { adminProjectService } from '../services/adminProjectService';
import { adminRepositoryService } from '../services/adminRepositoryService';
import type {
  Analysis,
  AnalysisProjectSummary,
  AnalysisQueryParams,
  AnalysisStatusFilter,
  AnalysisTypeFilter,
  CreateAnalysisPayload,
  UpdateAnalysisPayload
} from '../types/analysis';
import type { CodeRepository } from '../types/repository';

const defaultFilters: AnalysisQueryParams = {
  search: '',
  type: '',
  status: '',
  projectId: '',
  page: 0,
  size: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc'
};

export function AnalysesPage() {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<AnalysisQueryParams>(defaultFilters);
  const [analysisPage, setAnalysisPage] = useState<Awaited<ReturnType<typeof adminAnalysisService.getAnalyses>> | null>(null);
  const [projects, setProjects] = useState<AnalysisProjectSummary[]>([]);
  const [repositories, setRepositories] = useState<CodeRepository[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(filters.search ?? '');

  const canManageAnalyses = currentUser?.role === 'ADMIN' || currentUser?.role === 'QA';
  const canRunAnalyses = ['ADMIN', 'QA', 'AUDITOR', 'ARCHITECT', 'DEVELOPER'].includes(currentUser?.role ?? '');
  const canDeleteAnalyses = currentUser?.role === 'ADMIN';

  const loadAnalyses = async () => {
    setLoading(true);

    try {
      const response = await adminAnalysisService.getAnalyses({
        ...filters,
        search: debouncedSearch
      });
      setAnalysisPage(response);
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
      const repositoryResponse = await adminRepositoryService.getRepositories({ page: 0, size: 100, sortBy: 'name', sortDirection: 'asc' });
      setRepositories(repositoryResponse.content);
    } catch (projectError) {
      setProjects([]);
      setRepositories([]);
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
    void loadAnalyses();
  }, [debouncedSearch, filters.page, filters.size, filters.sortBy, filters.sortDirection, filters.type, filters.status, filters.projectId]);

  useEffect(() => {
    void loadProjects();
  }, []);

  const handleSort = (field: string) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      sortBy: field,
      sortDirection: currentFilters.sortBy === field && currentFilters.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreateSubmit = async (payload: CreateAnalysisPayload | UpdateAnalysisPayload) => {
    setSubmitting(true);

    try {
      await adminAnalysisService.createAnalysis(payload as CreateAnalysisPayload);
      showToast({
        type: 'success',
        title: 'Analysis created',
        description: `${payload.title} was created successfully.`
      });
      setCreateOpen(false);
      await loadAnalyses();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create analysis',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunSubmit = async (payload: { projectId: number; repositoryId: number; architectureProfile?: 'engineering_copilot' }) => {
    setSubmitting(true);
    try {
      const analysis = await adminAnalysisService.runAnalysis(payload);
      setRunOpen(false);
      showToast({ type: 'success', title: 'Analysis started', description: `${analysis.title} is running. Refresh shortly to see the completed results.` });
      await loadAnalyses();
    } catch (runError) {
      showToast({ type: 'error', title: 'Unable to start analysis', description: getApiErrorMessage(runError) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (payload: CreateAnalysisPayload | UpdateAnalysisPayload) => {
    if (!selectedAnalysis) {
      return;
    }

    setSubmitting(true);

    try {
      await adminAnalysisService.updateAnalysis(selectedAnalysis.id, payload as UpdateAnalysisPayload);
      showToast({
        type: 'success',
        title: 'Analysis updated',
        description: `${payload.title} was updated successfully.`
      });
      setEditOpen(false);
      await loadAnalyses();
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
    if (!selectedAnalysis) {
      return;
    }

    setSubmitting(true);

    try {
      await adminAnalysisService.deleteAnalysis(selectedAnalysis.id);
      showToast({
        type: 'success',
        title: 'Analysis deleted',
        description: `${selectedAnalysis.title} has been removed.`
      });
      setDeleteOpen(false);
      setSelectedAnalysis(null);
      await loadAnalyses();
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

  const completedCount = analysisPage?.content.filter((analysis) => analysis.status === 'COMPLETED').length ?? 0;
  const failedCount = analysisPage?.content.filter((analysis) => analysis.status === 'FAILED').length ?? 0;
  const highRiskCount = analysisPage?.content.filter((analysis) => analysis.severity === 'HIGH' || analysis.severity === 'CRITICAL').length ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Visible analyses</p>
          <p className="mt-4 text-4xl font-semibold text-white">{analysisPage?.totalElements ?? 0}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Completed on page</p>
          <p className="mt-4 text-4xl font-semibold text-white">{completedCount}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Failed on page</p>
          <p className="mt-4 text-4xl font-semibold text-white">{failedCount}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">High risk on page</p>
          <p className="mt-4 text-4xl font-semibold text-white">{highRiskCount}</p>
        </div>
      </section>

      <section className="page-shell space-y-5 border-white/10 bg-slate-950/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Analysis inventory</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Manage analysis runs</h3>
            <p className="mt-2 text-sm text-slate-400">
              Track security, quality, architecture, documentation, and TODO generation analysis outcomes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
              <Boxes className="h-4 w-4" />
              {analysisPage?.totalElements ?? 0} analyses matched
            </div>
            {canManageAnalyses ? (
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400"
                onClick={() => setCreateOpen(true)}
                type="button"
              >
                <ShieldPlus className="h-4 w-4" />
                Add Analysis
              </button>
            ) : null}
            {canRunAnalyses ? (
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-brand-300/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-100 transition hover:bg-brand-500/20"
                onClick={() => setRunOpen(true)}
                type="button"
              >
                <ShieldPlus className="h-4 w-4" />
                Run repository audit
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_200px_200px_240px_180px_170px]">
          <SearchBar
            onChange={(value) => setFilters((currentFilters) => ({ ...currentFilters, search: value, page: 0 }))}
            placeholder="Search by title, summary, recommendation, or project"
            value={filters.search ?? ''}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, type: event.target.value as AnalysisTypeFilter, page: 0 }))}
              value={filters.type}
            >
              <option className="bg-slate-950 text-white" value="">
                All types
              </option>
              {analysisTypeOptions.map((type) => (
                <option className="bg-slate-950 text-white" key={type} value={type}>
                  {formatEnumLabel(type)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, status: event.target.value as AnalysisStatusFilter, page: 0 }))}
              value={filters.status}
            >
              <option className="bg-slate-950 text-white" value="">
                All statuses
              </option>
              {analysisStatusOptions.map((status) => (
                <option className="bg-slate-950 text-white" key={status} value={status}>
                  {formatEnumLabel(status)}
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
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, size: Number(event.target.value), page: 0 }))}
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
        <ErrorState actionLabel="Reload analyses" description={error} onAction={() => void loadAnalyses()} title="Unable to load analyses" />
      ) : !analysisPage || analysisPage.content.length === 0 ? (
        <EmptyState
          description={canManageAnalyses ? 'Try adjusting filters or add the first analysis run.' : 'Try adjusting filters to surface analyses you can read.'}
          title="No analyses found"
        />
      ) : (
        <>
          <AnalysisTable
            analyses={analysisPage.content}
            canDeleteAnalyses={canDeleteAnalyses}
            canManageAnalyses={canManageAnalyses}
            onDelete={(analysis) => {
              setSelectedAnalysis(analysis);
              setDeleteOpen(true);
            }}
            onEdit={(analysis) => {
              setSelectedAnalysis(analysis);
              setEditOpen(true);
            }}
            onSort={handleSort}
            onView={(analysis) => navigate(`/dashboard/analyses/${analysis.id}`)}
            sortBy={filters.sortBy ?? 'createdAt'}
            sortDirection={filters.sortDirection ?? 'desc'}
          />
          <Pagination
            currentPage={analysisPage.page}
            onPageChange={(page) => setFilters((currentFilters) => ({ ...currentFilters, page }))}
            totalPages={analysisPage.totalPages}
          />
        </>
      )}

      {canManageAnalyses ? (
        <>
          <AnalysisFormModal
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => setCreateOpen(false)}
            onSubmit={(payload) => void handleCreateSubmit(payload)}
            open={createOpen}
            projects={projects}
            subtitle="Create a tracked analysis outcome and attach it to a project."
            title="Add analysis"
          />
          <AnalysisFormModal
            analysis={selectedAnalysis}
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => {
              setEditOpen(false);
              setSelectedAnalysis(null);
            }}
            onSubmit={(payload) => void handleEditSubmit(payload)}
            open={editOpen}
            projects={projects}
            subtitle="Update the analysis status, scoring, recommendation, and project assignment."
            title="Edit analysis"
          />
        </>
      ) : null}

      {canRunAnalyses ? (
        <RunAnalysisModal
          loading={submitting}
          onClose={() => setRunOpen(false)}
          onSubmit={handleRunSubmit}
          open={runOpen}
          projects={projects}
          repositories={repositories}
        />
      ) : null}

      {canDeleteAnalyses ? (
        <DeleteAnalysisDialog
          analysis={selectedAnalysis}
          loading={submitting}
          onCancel={() => {
            setDeleteOpen(false);
            setSelectedAnalysis(null);
          }}
          onConfirm={() => void handleDeleteConfirm()}
          open={deleteOpen}
        />
      ) : null}
    </div>
  );
}
