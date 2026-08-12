import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Download, ExternalLink, FileText, FolderKanban, PencilLine, Trash2, UserRound } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { DeleteDocumentationDialog } from '../components/documentation/DeleteDocumentationDialog';
import { DocumentationFormModal } from '../components/documentation/DocumentationFormModal';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage, getLocalFileReference, resolveFileUrl } from '../lib/api';
import { formatDocumentationStatus, formatDocumentationType, getDocumentationStatusTone } from '../lib/documentation';
import { formatDate, formatRole } from '../lib/formatters';
import { adminDocumentationService } from '../services/adminDocumentationService';
import { adminProjectService } from '../services/adminProjectService';
import type { Documentation, DocumentationProjectSummary, UpdateDocumentationPayload } from '../types/documentation';

export function DocumentationDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [documentation, setDocumentation] = useState<Documentation | null>(null);
  const [projects, setProjects] = useState<DocumentationProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const documentationId = Number(id);
  const canManageDocumentation = currentUser?.role === 'ADMIN' || currentUser?.role === 'ARCHITECT';
  const canDeleteDocumentation = currentUser?.role === 'ADMIN';
  const fileUrl = useMemo(() => {
    if (documentation?.content) {
      return `data:text/markdown;charset=utf-8,${encodeURIComponent(documentation.content)}`;
    }
    return resolveFileUrl(documentation?.path);
  }, [documentation?.content, documentation?.path]);
  const localFile = useMemo(() => getLocalFileReference(documentation?.path), [documentation?.path]);
  const fileType = localFile?.type ?? '';
  const isImagePreview = fileType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(documentation?.path ?? '');
  const canInlinePreview = Boolean(fileUrl && (isImagePreview || fileType === 'application/pdf' || /\.pdf$/i.test(documentation?.path ?? '')));

  const loadDocumentation = async () => {
    if (!Number.isFinite(documentationId)) {
      setError('The requested documentation id is invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await adminDocumentationService.getDocumentationById(documentationId);
      setDocumentation(response);
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
    void loadDocumentation();
  }, [documentationId]);

  useEffect(() => {
    if (canManageDocumentation) {
      void loadProjects();
    }
  }, [canManageDocumentation]);

  const handleUpdate = async (payload: UpdateDocumentationPayload) => {
    if (!documentation) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedDocumentation = await adminDocumentationService.updateDocumentation(documentation.id, payload);
      setDocumentation(updatedDocumentation);
      setEditOpen(false);
      showToast({ type: 'success', title: 'Documentation updated', description: `${updatedDocumentation.title} was updated successfully.` });
    } catch (updateError) {
      showToast({ type: 'error', title: 'Update failed', description: getApiErrorMessage(updateError) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!documentation) {
      return;
    }

    setSubmitting(true);

    try {
      await adminDocumentationService.deleteDocumentation(documentation.id);
      showToast({ type: 'success', title: 'Documentation deleted', description: `${documentation.title} has been removed.` });
      navigate('/dashboard/documentation');
    } catch (deleteError) {
      showToast({ type: 'error', title: 'Delete failed', description: getApiErrorMessage(deleteError) });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadFile = () => {
    if (!fileUrl || !documentation) {
      return;
    }

    const pathName = documentation.path?.split(/[\\/]/).pop() ?? '';
    const extension = pathName.includes('.') ? pathName.slice(pathName.lastIndexOf('.')) : '';
    const downloadName = extension && !documentation.title.toLowerCase().endsWith(extension.toLowerCase())
      ? `${documentation.title}${extension}`
      : documentation.title;
    const anchor = window.document.createElement('a');
    anchor.href = fileUrl;
    anchor.download = downloadName;
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

  if (error || !documentation) {
    return (
      <ErrorState
        actionLabel="Reload documentation"
        description={error ?? 'Unable to load the requested documentation.'}
        onAction={() => {
          void loadDocumentation();
        }}
        title="Documentation details unavailable"
      />
    );
  }

  return (
    <div className="space-y-6">
      <button
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
        onClick={() => navigate('/dashboard/documentation')}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to documentation
      </button>

      <section className="page-shell flex flex-col gap-5 border-white/10 bg-slate-950/60 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Documentation details</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{documentation.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              {documentation.description || 'No description has been provided for this documentation yet.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge label={formatDocumentationStatus(documentation.status)} tone={getDocumentationStatusTone(documentation.status)} />
              <StatusBadge label={formatDocumentationType(documentation.type)} tone="brand" />
              {documentation.approved ? <StatusBadge label="Approved" tone="success" /> : null}
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
          {canManageDocumentation ? (
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
              onClick={() => setEditOpen(true)}
              type="button"
            >
              <PencilLine className="h-4 w-4" />
              Edit
            </button>
          ) : null}
          {canDeleteDocumentation ? (
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
              onClick={() => setDeleteOpen(true)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Version</p>
          <p className="mt-4 text-xl font-semibold text-white">{documentation.updatedAt ? `Updated ${formatDate(documentation.updatedAt)}` : 'Initial'}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Approval status</p>
          <p className="mt-4 text-xl font-semibold text-white">{documentation.approved ? 'Approved' : formatDocumentationStatus(documentation.status)}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Category</p>
          <p className="mt-4 text-xl font-semibold text-white">{formatDocumentationType(documentation.type)}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Source flag</p>
          <p className="mt-4 text-xl font-semibold text-white">{documentation.generatedByAI ? 'Externally generated' : 'Manual entry'}</p>
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
            onClick={() => navigate(`/dashboard/projects/${documentation.project.id}`)}
            type="button"
          >
            {documentation.project.title}
          </button>
          <p className="mt-2 text-sm text-slate-400">{documentation.project.status}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <UserRound className="h-5 w-5" />
            <p className="font-semibold text-white">Author</p>
          </div>
          {documentation.createdBy ? (
            <>
              <p className="mt-4 text-xl font-semibold text-white">
                {documentation.createdBy.firstName} {documentation.createdBy.lastName}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                @{documentation.createdBy.username} - {formatRole(documentation.createdBy.role)}
              </p>
            </>
          ) : (
            <p className="mt-4 text-xl font-semibold text-white">Not available</p>
          )}
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <CalendarClock className="h-5 w-5" />
            <p className="font-semibold text-white">History</p>
          </div>
          <p className="mt-4 text-sm font-semibold text-white">Created {formatDate(documentation.createdAt)}</p>
          <p className="mt-2 text-sm font-semibold text-white">Updated {formatDate(documentation.updatedAt)}</p>
        </div>
      </section>

      <section className="page-shell border-white/10 bg-slate-950/60">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Preview</p>
        <div className="mt-5 max-h-[520px] overflow-auto rounded-2xl border border-white/10 bg-slate-950/75 p-5 text-sm leading-7 text-slate-200">
          {documentation.content ? <pre className="whitespace-pre-wrap font-sans">{documentation.content}</pre> : 'No content has been added yet.'}
        </div>
        {fileUrl ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/75">
            {canInlinePreview ? (
              isImagePreview ? (
                <img alt={documentation.title} className="max-h-[640px] w-full object-contain" src={fileUrl} />
              ) : (
                <iframe className="h-[640px] w-full" src={fileUrl} title={documentation.title} />
              )
            ) : (
              <p className="p-5 text-sm text-slate-400">This file type cannot be embedded here. Use Preview or Download to open it.</p>
            )}
          </div>
        ) : null}
        {documentation.path ? <p className="mt-4 break-all text-sm text-slate-400">Path: {documentation.path}</p> : null}
      </section>

      {canManageDocumentation ? (
        <DocumentationFormModal
          documentation={documentation}
          loading={submitting}
          loadingProjects={loadingProjects}
          onClose={() => setEditOpen(false)}
          onSubmit={(payload) => {
            void handleUpdate(payload as UpdateDocumentationPayload);
          }}
          open={editOpen}
          projects={projects}
          subtitle="Update documentation content, status, path, type, approval state, and project assignment."
          title="Edit documentation"
        />
      ) : null}

      {canDeleteDocumentation ? (
        <DeleteDocumentationDialog
          documentation={documentation}
          loading={submitting}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => {
            void handleDelete();
          }}
          open={deleteOpen}
        />
      ) : null}
    </div>
  );
}
