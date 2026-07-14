import { ArrowLeft, MessageSquareText, PencilLine, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConversationFormModal } from '../components/conversation/ConversationFormModal';
import { DeleteConversationDialog } from '../components/conversation/DeleteConversationDialog';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage } from '../lib/api';
import { formatDate } from '../lib/formatters';
import { adminConversationService } from '../services/adminConversationService';
import { adminProjectService } from '../services/adminProjectService';
import type { Conversation, ConversationProjectSummary, CreateConversationPayload, UpdateConversationPayload } from '../types/conversation';

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-200">{value ?? 'Not provided'}</p>
    </div>
  );
}

export function ConversationDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [projects, setProjects] = useState<ConversationProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const conversationId = Number(id);
  const canManageConversations = currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER';

  const loadConversation = async () => {
    if (!Number.isFinite(conversationId)) {
      setError('The requested conversation id is invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      setConversation(await adminConversationService.getConversationById(conversationId));
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    if (!canManageConversations) {
      return;
    }

    setLoadingProjects(true);

    try {
      const response = await adminProjectService.getProjects({ page: 0, size: 100, sortBy: 'title', sortDirection: 'asc' });
      setProjects(response.content.map((project) => ({ id: project.id, title: project.title, description: project.description, status: project.status })));
    } catch (projectError) {
      showToast({ type: 'error', title: 'Unable to load projects', description: getApiErrorMessage(projectError) });
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    void loadConversation();
  }, [conversationId]);

  useEffect(() => {
    void loadProjects();
  }, [canManageConversations]);

  const handleEdit = async (payload: CreateConversationPayload | UpdateConversationPayload) => {
    if (!conversation) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedConversation = await adminConversationService.updateConversation(conversation.id, payload as UpdateConversationPayload);
      setConversation(updatedConversation);
      setEditOpen(false);
      showToast({ type: 'success', title: 'Conversation updated', description: 'The conversation record was updated successfully.' });
    } catch (updateError) {
      showToast({ type: 'error', title: 'Update failed', description: getApiErrorMessage(updateError) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!conversation) {
      return;
    }

    setSubmitting(true);

    try {
      await adminConversationService.deleteConversation(conversation.id);
      showToast({ type: 'success', title: 'Conversation deleted', description: 'The conversation record has been removed.' });
      navigate('/dashboard/conversations');
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

  if (error || !conversation) {
    return <ErrorState actionLabel="Reload conversation" description={error ?? 'Unable to load the requested conversation.'} onAction={() => void loadConversation()} title="Conversation unavailable" />;
  }

  return (
    <div className="space-y-6">
      <button className="inline-flex items-center gap-2 text-sm font-semibold text-brand-200 transition hover:text-white" onClick={() => navigate(-1)} type="button">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <section className="page-shell border-white/10 bg-slate-950/70">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-500/12 text-brand-200">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Conversation details</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Conversation record</h1>
              <p className="mt-2 text-sm text-slate-400">{conversation.project?.title ?? 'Unlinked project'}</p>
            </div>
          </div>

          {canManageConversations ? (
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500" onClick={() => setEditOpen(true)} type="button">
                <PencilLine className="h-4 w-4" />
                Edit
              </button>
              <button className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500" onClick={() => setDeleteOpen(true)} type="button">
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailField label="User" value={conversation.user?.username} />
        <DetailField label="Confidence" value={conversation.confidenceScore === null ? null : `${Math.round(conversation.confidenceScore * 100)}%`} />
        <DetailField label="Response Time" value={conversation.responseTime === null ? null : `${conversation.responseTime} ms`} />
        <DetailField label="Created" value={formatDate(conversation.createdAt)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="page-shell border-white/10 bg-slate-950/70">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Question</p>
          <p className="mt-4 text-sm leading-7 text-slate-300">{conversation.question}</p>
        </article>
        <article className="page-shell border-white/10 bg-slate-950/70">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Response</p>
          <p className="mt-4 text-sm leading-7 text-slate-300">{conversation.response || 'No response captured yet.'}</p>
        </article>
      </section>

      {canManageConversations ? (
        <>
          <ConversationFormModal
            conversation={conversation}
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => setEditOpen(false)}
            onSubmit={(payload) => void handleEdit(payload)}
            open={editOpen}
            projects={projects}
            subtitle="Update question, response, confidence, latency, and project assignment."
            title="Edit conversation"
          />
          <DeleteConversationDialog
            conversation={conversation}
            loading={submitting}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={() => void handleDelete()}
            open={deleteOpen}
          />
        </>
      ) : null}
    </div>
  );
}
