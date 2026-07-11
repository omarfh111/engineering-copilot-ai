import { Filter, FileText, ShieldPlus, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { DeleteDocumentDialog } from '../components/document/DeleteDocumentDialog';
import { DocumentCard } from '../components/document/DocumentCard';
import { DocumentFormModal } from '../components/document/DocumentFormModal';
import { DocumentTable } from '../components/document/DocumentTable';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { getApiErrorMessage, resolveFileUrl } from '../lib/api';
import { documentTypeOptions, formatDocumentType } from '../lib/document';
import { adminDocumentService } from '../services/adminDocumentService';
import { adminProjectService } from '../services/adminProjectService';
import type {
  CreateDocumentPayload,
  DocumentProjectSummary,
  DocumentQueryParams,
  DocumentTypeFilter,
  SourceDocument,
  UpdateDocumentPayload
} from '../types/document';

const defaultFilters: DocumentQueryParams = {
  search: '',
  type: '',
  projectId: '',
  page: 0,
  size: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc'
};

export function DocumentsPage() {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<DocumentQueryParams>(defaultFilters);
  const [documentPage, setDocumentPage] = useState<Awaited<ReturnType<typeof adminDocumentService.getDocuments>> | null>(null);
  const [projects, setProjects] = useState<DocumentProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<SourceDocument | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(filters.search ?? '');

  const canManageDocuments = currentUser?.role === 'ADMIN';

  const loadDocuments = async () => {
    setLoading(true);

    try {
      const response = await adminDocumentService.getDocuments({
        ...filters,
        search: debouncedSearch
      });
      setDocumentPage(response);
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
    void loadDocuments();
  }, [debouncedSearch, filters.page, filters.size, filters.sortBy, filters.sortDirection, filters.type, filters.projectId]);

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

  const handleCreateSubmit = async (payload: CreateDocumentPayload) => {
    setSubmitting(true);

    try {
      await adminDocumentService.createDocument(payload);
      showToast({
        type: 'success',
        title: 'Document created',
        description: `${payload.title} was linked successfully.`
      });
      setCreateOpen(false);
      await loadDocuments();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create document',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (payload: UpdateDocumentPayload) => {
    if (!selectedDocument) {
      return;
    }

    setSubmitting(true);

    try {
      await adminDocumentService.updateDocument(selectedDocument.id, payload);
      showToast({
        type: 'success',
        title: 'Document updated',
        description: `${payload.title} was updated successfully.`
      });
      setEditOpen(false);
      await loadDocuments();
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
    if (!selectedDocument) {
      return;
    }

    setSubmitting(true);

    try {
      await adminDocumentService.deleteDocument(selectedDocument.id);
      showToast({
        type: 'success',
        title: 'Document deleted',
        description: `${selectedDocument.title} has been removed.`
      });
      setDeleteOpen(false);
      setSelectedDocument(null);
      await loadDocuments();
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

  const openDocumentPath = (document: SourceDocument) => {
    if (!document.path) {
      return;
    }

    const fileUrl = resolveFileUrl(document.path);

    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const pdfDocuments = documentPage?.content.filter((document) => document.type === 'PDF').length ?? 0;
  const docxDocuments = documentPage?.content.filter((document) => document.type === 'DOCX').length ?? 0;
  const linkedProjects = new Set(documentPage?.content.map((document) => document.project.id) ?? []).size;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Visible documents</p>
          <p className="mt-4 text-4xl font-semibold text-white">{documentPage?.totalElements ?? 0}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">PDF documents</p>
          <p className="mt-4 text-4xl font-semibold text-white">{pdfDocuments}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">DOCX documents</p>
          <p className="mt-4 text-4xl font-semibold text-white">{docxDocuments}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Projects in view</p>
          <p className="mt-4 text-4xl font-semibold text-white">{linkedProjects}</p>
        </div>
      </section>

      <section className="page-shell space-y-5 border-white/10 bg-slate-950/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Document inventory</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Manage project documents</h3>
            <p className="mt-2 text-sm text-slate-400">
              Track standards, references, architecture notes, and technical guidance as metadata linked to delivery projects.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
              <FileText className="h-4 w-4" />
              {documentPage?.totalElements ?? 0} documents matched
            </div>
            {canManageDocuments ? (
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400"
                onClick={() => setCreateOpen(true)}
                type="button"
              >
                <ShieldPlus className="h-4 w-4" />
                Add Document
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
            placeholder="Search by title, description, source, path, or project"
            value={filters.search ?? ''}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  type: event.target.value as DocumentTypeFilter,
                  page: 0
                }))
              }
              value={filters.type}
            >
              <option className="bg-slate-950 text-white" value="">
                All types
              </option>
              {documentTypeOptions.map((type) => (
                <option className="bg-slate-950 text-white" key={type} value={type}>
                  {formatDocumentType(type)}
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
          actionLabel="Reload documents"
          description={error}
          onAction={() => {
            void loadDocuments();
          }}
          title="Unable to load documents"
        />
      ) : !documentPage || documentPage.content.length === 0 ? (
        <EmptyState
          description={
            canManageDocuments
              ? 'Try adjusting your filters or add the first source document to a project.'
              : 'Try adjusting your filters to surface documents linked to your projects.'
          }
          title="No documents found"
        />
      ) : (
        <>
          <div className="hidden xl:block">
            <DocumentTable
              canManageDocuments={canManageDocuments}
              documents={documentPage.content}
              onDelete={(document) => {
                setSelectedDocument(document);
                setDeleteOpen(true);
              }}
              onEdit={(document) => {
                setSelectedDocument(document);
                setEditOpen(true);
              }}
              onOpenPath={openDocumentPath}
              onSort={handleSort}
              onViewDetails={(document) => navigate(`/dashboard/documents/${document.id}`)}
              onViewProject={(document) => navigate(`/dashboard/projects/${document.project.id}`)}
              sortBy={filters.sortBy ?? 'createdAt'}
              sortDirection={filters.sortDirection ?? 'desc'}
            />
          </div>

          <div className="grid gap-4 xl:hidden">
            {documentPage.content.map((document) => (
              <DocumentCard
                canManageDocuments={canManageDocuments}
                document={document}
                key={document.id}
                onDelete={() => {
                  setSelectedDocument(document);
                  setDeleteOpen(true);
                }}
                onEdit={() => {
                  setSelectedDocument(document);
                  setEditOpen(true);
                }}
                onOpenPath={() => openDocumentPath(document)}
                onViewDetails={() => navigate(`/dashboard/documents/${document.id}`)}
                onViewProject={() => navigate(`/dashboard/projects/${document.project.id}`)}
              />
            ))}
          </div>

          <Pagination
            currentPage={documentPage.page}
            onPageChange={(page) => setFilters((currentFilters) => ({ ...currentFilters, page }))}
            totalPages={documentPage.totalPages}
          />
        </>
      )}

      {canManageDocuments ? (
        <>
          <DocumentFormModal
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => setCreateOpen(false)}
            onSubmit={(payload) => {
              void handleCreateSubmit(payload);
            }}
            open={createOpen}
            projects={projects}
            subtitle="Create document metadata, file path, source, and project assignment."
            title="Add document"
          />

          <DocumentFormModal
            document={selectedDocument}
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => {
              setEditOpen(false);
              setSelectedDocument(null);
            }}
            onSubmit={(payload) => {
              void handleEditSubmit(payload);
            }}
            open={editOpen}
            projects={projects}
            subtitle="Update document metadata, type, reference path, source, and project assignment."
            title="Edit document"
          />

          <DeleteDocumentDialog
            document={selectedDocument}
            loading={submitting}
            onCancel={() => {
              setDeleteOpen(false);
              setSelectedDocument(null);
            }}
            onConfirm={() => {
              void handleDeleteConfirm();
            }}
            open={deleteOpen}
          />
        </>
      ) : null}
    </div>
  );
}
