import { Filter, FileText, ShieldPlus, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { DocumentationCard } from '../components/documentation/DocumentationCard';
import { DeleteDocumentationDialog } from '../components/documentation/DeleteDocumentationDialog';
import { DocumentationFormModal } from '../components/documentation/DocumentationFormModal';
import { DocumentationTable } from '../components/documentation/DocumentationTable';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { getApiErrorMessage } from '../lib/api';
import {
  documentationStatusOptions,
  documentationTypeOptions,
  formatDocumentationStatus,
  formatDocumentationType
} from '../lib/documentation';
import { adminDocumentationService } from '../services/adminDocumentationService';
import { adminProjectService } from '../services/adminProjectService';
import type {
  CreateDocumentationPayload,
  Documentation,
  DocumentationProjectSummary,
  DocumentationQueryParams,
  DocumentationStatusFilter,
  DocumentationTypeFilter,
  UpdateDocumentationPayload
} from '../types/documentation';

const defaultFilters: DocumentationQueryParams = {
  search: '',
  type: '',
  status: '',
  projectId: '',
  page: 0,
  size: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc'
};

export function DocumentationPage() {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<DocumentationQueryParams>(defaultFilters);
  const [documentationPage, setDocumentationPage] =
    useState<Awaited<ReturnType<typeof adminDocumentationService.getDocumentation>> | null>(null);
  const [projects, setProjects] = useState<DocumentationProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentation, setSelectedDocumentation] = useState<Documentation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(filters.search ?? '');

  const canManageDocumentation = currentUser?.role === 'ADMIN' || currentUser?.role === 'ARCHITECT';
  const canDeleteDocumentation = currentUser?.role === 'ADMIN';

  const loadDocumentation = async () => {
    setLoading(true);

    try {
      const response = await adminDocumentationService.getDocumentation({
        ...filters,
        search: debouncedSearch
      });
      setDocumentationPage(response);
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
    void loadDocumentation();
  }, [debouncedSearch, filters.page, filters.size, filters.sortBy, filters.sortDirection, filters.type, filters.status, filters.projectId]);

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

  const handleCreateSubmit = async (payload: CreateDocumentationPayload) => {
    setSubmitting(true);

    try {
      await adminDocumentationService.createDocumentation(payload);
      showToast({
        type: 'success',
        title: 'Documentation created',
        description: `${payload.title} was saved successfully.`
      });
      setCreateOpen(false);
      await loadDocumentation();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create documentation',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (payload: UpdateDocumentationPayload) => {
    if (!selectedDocumentation) {
      return;
    }

    setSubmitting(true);

    try {
      await adminDocumentationService.updateDocumentation(selectedDocumentation.id, payload);
      showToast({
        type: 'success',
        title: 'Documentation updated',
        description: `${payload.title} was updated successfully.`
      });
      setEditOpen(false);
      await loadDocumentation();
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
    if (!selectedDocumentation) {
      return;
    }

    setSubmitting(true);

    try {
      await adminDocumentationService.deleteDocumentation(selectedDocumentation.id);
      showToast({
        type: 'success',
        title: 'Documentation deleted',
        description: `${selectedDocumentation.title} has been removed.`
      });
      setDeleteOpen(false);
      setSelectedDocumentation(null);
      await loadDocumentation();
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

  const openDocumentationPath = (documentation: Documentation) => {
    if (!documentation.path) {
      return;
    }

    window.open(documentation.path, '_blank', 'noopener,noreferrer');
  };

  const approvedDocumentation = documentationPage?.content.filter((entry) => entry.approved).length ?? 0;
  const generatedDocumentation = documentationPage?.content.filter((entry) => entry.generatedByAI).length ?? 0;
  const linkedProjects = new Set(documentationPage?.content.map((entry) => entry.project.id) ?? []).size;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Visible deliverables</p>
          <p className="mt-4 text-4xl font-semibold text-white">{documentationPage?.totalElements ?? 0}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Approved</p>
          <p className="mt-4 text-4xl font-semibold text-white">{approvedDocumentation}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Generated externally</p>
          <p className="mt-4 text-4xl font-semibold text-white">{generatedDocumentation}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Projects in view</p>
          <p className="mt-4 text-4xl font-semibold text-white">{linkedProjects}</p>
        </div>
      </section>

      <section className="page-shell space-y-5 border-white/10 bg-slate-950/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Documentation inventory</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Manage project deliverables</h3>
            <p className="mt-2 text-sm text-slate-400">
              Track README files, architecture guides, API documentation, onboarding notes, and technical reports linked to projects.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
              <FileText className="h-4 w-4" />
              {documentationPage?.totalElements ?? 0} deliverables matched
            </div>
            {canManageDocumentation ? (
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400"
                onClick={() => setCreateOpen(true)}
                type="button"
              >
                <ShieldPlus className="h-4 w-4" />
                Add Documentation
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_240px_180px_170px]">
          <SearchBar
            onChange={(value) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                search: value,
                page: 0
              }))
            }
            placeholder="Search by title, description, content, path, or project"
            value={filters.search ?? ''}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  type: event.target.value as DocumentationTypeFilter,
                  page: 0
                }))
              }
              value={filters.type}
            >
              <option className="bg-slate-950 text-white" value="">
                All types
              </option>
              {documentationTypeOptions.map((type) => (
                <option className="bg-slate-950 text-white" key={type} value={type}>
                  {formatDocumentationType(type)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  status: event.target.value as DocumentationStatusFilter,
                  page: 0
                }))
              }
              value={filters.status}
            >
              <option className="bg-slate-950 text-white" value="">
                All statuses
              </option>
              {documentationStatusOptions.map((status) => (
                <option className="bg-slate-950 text-white" key={status} value={status}>
                  {formatDocumentationStatus(status)}
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
          actionLabel="Reload documentation"
          description={error}
          onAction={() => {
            void loadDocumentation();
          }}
          title="Unable to load documentation"
        />
      ) : !documentationPage || documentationPage.content.length === 0 ? (
        <EmptyState
          description={
            canManageDocumentation
              ? 'Try adjusting your filters or add the first documentation deliverable to a project.'
              : 'Try adjusting your filters to surface documentation linked to your projects.'
          }
          title="No documentation found"
        />
      ) : (
        <>
          <div className="hidden xl:block">
            <DocumentationTable
              canDeleteDocumentation={canDeleteDocumentation}
              canManageDocumentation={canManageDocumentation}
              documentation={documentationPage.content}
              onDelete={(documentation) => {
                setSelectedDocumentation(documentation);
                setDeleteOpen(true);
              }}
              onEdit={(documentation) => {
                setSelectedDocumentation(documentation);
                setEditOpen(true);
              }}
              onOpenPath={openDocumentationPath}
              onSort={handleSort}
              onViewDetails={(documentation) => navigate(`/dashboard/documentation/${documentation.id}`)}
              onViewProject={(documentation) => navigate(`/dashboard/projects/${documentation.project.id}`)}
              sortBy={filters.sortBy ?? 'createdAt'}
              sortDirection={filters.sortDirection ?? 'desc'}
            />
          </div>

          <div className="grid gap-4 xl:hidden">
            {documentationPage.content.map((documentation) => (
              <DocumentationCard
                canDeleteDocumentation={canDeleteDocumentation}
                canManageDocumentation={canManageDocumentation}
                documentation={documentation}
                key={documentation.id}
                onDelete={() => {
                  setSelectedDocumentation(documentation);
                  setDeleteOpen(true);
                }}
                onEdit={() => {
                  setSelectedDocumentation(documentation);
                  setEditOpen(true);
                }}
                onOpenPath={() => openDocumentationPath(documentation)}
                onViewDetails={() => navigate(`/dashboard/documentation/${documentation.id}`)}
                onViewProject={() => navigate(`/dashboard/projects/${documentation.project.id}`)}
              />
            ))}
          </div>

          <Pagination
            currentPage={documentationPage.page}
            onPageChange={(page) => setFilters((currentFilters) => ({ ...currentFilters, page }))}
            totalPages={documentationPage.totalPages}
          />
        </>
      )}

      {canManageDocumentation ? (
        <>
          <DocumentationFormModal
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => setCreateOpen(false)}
            onSubmit={(payload) => {
              void handleCreateSubmit(payload);
            }}
            open={createOpen}
            projects={projects}
            subtitle="Create documentation metadata, content, status, approval state, and project assignment."
            title="Add documentation"
          />

          <DocumentationFormModal
            documentation={selectedDocumentation}
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => {
              setEditOpen(false);
              setSelectedDocumentation(null);
            }}
            onSubmit={(payload) => {
              void handleEditSubmit(payload);
            }}
            open={editOpen}
            projects={projects}
            subtitle="Update documentation content, status, review flags, path, type, and project assignment."
            title="Edit documentation"
          />
        </>
      ) : null}

      {canDeleteDocumentation ? (
        <DeleteDocumentationDialog
          documentation={selectedDocumentation}
          loading={submitting}
          onCancel={() => {
            setDeleteOpen(false);
            setSelectedDocumentation(null);
          }}
          onConfirm={() => {
            void handleDeleteConfirm();
          }}
          open={deleteOpen}
        />
      ) : null}
    </div>
  );
}
