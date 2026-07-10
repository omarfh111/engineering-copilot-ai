import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Download, ExternalLink, FolderKanban, PencilLine, Trash2 } from 'lucide-react';
import { DeleteDocumentDialog } from '../components/document/DeleteDocumentDialog';
import { DocumentFormModal } from '../components/document/DocumentFormModal';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage, resolveFileUrl } from '../lib/api';
import { formatDocumentType } from '../lib/document';
import { getFileIcon, getFileTypeLabel, supportedFileExtensions } from '../lib/fileMeta';
import { formatDate } from '../lib/formatters';
import { adminDocumentService } from '../services/adminDocumentService';
import { adminProjectService } from '../services/adminProjectService';
import type { DocumentProjectSummary, SourceDocument, UpdateDocumentPayload } from '../types/document';

export function DocumentDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [sourceDocument, setSourceDocument] = useState<SourceDocument | null>(null);
  const [projects, setProjects] = useState<DocumentProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const documentId = Number(id);
  const canManageDocuments = currentUser?.role === 'ADMIN';
  const fileUrl = useMemo(() => resolveFileUrl(sourceDocument?.path), [sourceDocument?.path]);
  const FileIcon = getFileIcon(sourceDocument?.path);

  const loadDocument = async () => {
    if (!Number.isFinite(documentId)) {
      setError('The requested document id is invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await adminDocumentService.getDocumentById(documentId);
      setSourceDocument(response);
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
    void loadDocument();
  }, [documentId]);

  useEffect(() => {
    if (canManageDocuments) {
      void loadProjects();
    }
  }, [canManageDocuments]);

  const handleUpdate = async (payload: UpdateDocumentPayload) => {
    if (!sourceDocument) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedDocument = await adminDocumentService.updateDocument(sourceDocument.id, payload);
      setSourceDocument(updatedDocument);
      setEditOpen(false);
      showToast({ type: 'success', title: 'Document updated', description: `${updatedDocument.title} was updated successfully.` });
    } catch (updateError) {
      showToast({ type: 'error', title: 'Update failed', description: getApiErrorMessage(updateError) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!sourceDocument) {
      return;
    }

    setSubmitting(true);

    try {
      await adminDocumentService.deleteDocument(sourceDocument.id);
      showToast({ type: 'success', title: 'Document deleted', description: `${sourceDocument.title} has been removed.` });
      navigate('/dashboard/documents');
    } catch (deleteError) {
      showToast({ type: 'error', title: 'Delete failed', description: getApiErrorMessage(deleteError) });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadFile = () => {
    if (!fileUrl || !sourceDocument) {
      return;
    }

    const anchor = window.document.createElement('a');
    anchor.href = fileUrl;
    anchor.download = sourceDocument.title;
    anchor.rel = 'noreferrer';
    anchor.target = '_blank';
    anchor.click();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-16 w-48" />
        <LoadingSkeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !sourceDocument) {
    return (
      <ErrorState
        actionLabel="Reload document"
        description={error ?? 'Unable to load the requested document.'}
        onAction={() => {
          void loadDocument();
        }}
        title="Document details unavailable"
      />
    );
  }

  return (
    <div className="space-y-6">
      <button
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
        onClick={() => navigate('/dashboard/documents')}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to documents
      </button>

      <section className="page-shell flex flex-col gap-5 border-white/10 bg-slate-950/60 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
            <FileIcon className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Document details</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{sourceDocument.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              {sourceDocument.description || 'No description has been provided for this document yet.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge label={formatDocumentType(sourceDocument.type)} tone="brand" />
              <StatusBadge label={getFileTypeLabel(sourceDocument.path, 'Reference')} tone="neutral" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {fileUrl ? (
            <>
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
                type="button"
              >
                <ExternalLink className="h-4 w-4" />
                Preview
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                onClick={downloadFile}
                type="button"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </>
          ) : null}
          {canManageDocuments ? (
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

      <section className="grid gap-4 md:grid-cols-3">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <FolderKanban className="h-5 w-5" />
            <p className="font-semibold text-white">Related project</p>
          </div>
          <button
            className="mt-4 text-left text-xl font-semibold text-white transition hover:text-brand-200"
            onClick={() => navigate(`/dashboard/projects/${sourceDocument.project.id}`)}
            type="button"
          >
            {sourceDocument.project.title}
          </button>
          <p className="mt-2 text-sm text-slate-400">{sourceDocument.project.status}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <CalendarClock className="h-5 w-5" />
            <p className="font-semibold text-white">Created</p>
          </div>
          <p className="mt-4 text-xl font-semibold text-white">{formatDate(sourceDocument.createdAt)}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <CalendarClock className="h-5 w-5" />
            <p className="font-semibold text-white">Updated</p>
          </div>
          <p className="mt-4 text-xl font-semibold text-white">{formatDate(sourceDocument.updatedAt)}</p>
        </div>
      </section>

      <section className="page-shell border-white/10 bg-slate-950/60">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Metadata</p>
        <dl className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <dt className="text-sm text-slate-400">Stored path</dt>
            <dd className="mt-2 break-all text-sm font-semibold text-white">{sourceDocument.path || 'Not specified'}</dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <dt className="text-sm text-slate-400">Source</dt>
            <dd className="mt-2 text-sm font-semibold text-white">{sourceDocument.source || 'Not specified'}</dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 md:col-span-2">
            <dt className="text-sm text-slate-400">Supported file actions</dt>
            <dd className="mt-2 text-sm font-semibold text-white">{supportedFileExtensions.map((extension) => extension.toUpperCase()).join(', ')}</dd>
          </div>
        </dl>
      </section>

      {canManageDocuments ? (
        <>
          <DocumentFormModal
            document={sourceDocument}
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => setEditOpen(false)}
            onSubmit={(payload) => {
              void handleUpdate(payload as UpdateDocumentPayload);
            }}
            open={editOpen}
            projects={projects}
            subtitle="Update document metadata, project relation, source, and stored file path."
            title="Edit document"
          />
          <DeleteDocumentDialog
            document={sourceDocument}
            loading={submitting}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={() => {
              void handleDelete();
            }}
            open={deleteOpen}
          />
        </>
      ) : null}
    </div>
  );
}
