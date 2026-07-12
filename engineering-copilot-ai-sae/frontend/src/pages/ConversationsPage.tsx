import { Filter, MessageSquareText, ShieldPlus, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConversationFormModal } from '../components/conversation/ConversationFormModal';
import { ConversationTable } from '../components/conversation/ConversationTable';
import { DeleteConversationDialog } from '../components/conversation/DeleteConversationDialog';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { getApiErrorMessage } from '../lib/api';
import { adminConversationService } from '../services/adminConversationService';
import { adminProjectService } from '../services/adminProjectService';
import type {
  Conversation,
  ConversationProjectSummary,
  ConversationQueryParams,
  CreateConversationPayload,
  UpdateConversationPayload
} from '../types/conversation';

const defaultFilters: ConversationQueryParams = {
  search: '',
  projectId: '',
  page: 0,
  size: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc'
};

export function ConversationsPage() {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<ConversationQueryParams>(defaultFilters);
  const [conversationPage, setConversationPage] = useState<Awaited<ReturnType<typeof adminConversationService.getConversations>> | null>(null);
  const [projects, setProjects] = useState<ConversationProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(filters.search ?? '');

  const canManageConversations = currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER';

  const loadConversations = async () => {
    setLoading(true);

    try {
      const response = await adminConversationService.getConversations({
        ...filters,
        search: debouncedSearch
      });
      setConversationPage(response);
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
    void loadConversations();
  }, [debouncedSearch, filters.page, filters.size, filters.sortBy, filters.sortDirection, filters.projectId]);

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

  const handleCreateSubmit = async (payload: CreateConversationPayload | UpdateConversationPayload) => {
    setSubmitting(true);

    try {
      await adminConversationService.createConversation(payload as CreateConversationPayload);
      showToast({
        type: 'success',
        title: 'Conversation created',
        description: 'The conversation record was created successfully.'
      });
      setCreateOpen(false);
      await loadConversations();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create conversation',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (payload: CreateConversationPayload | UpdateConversationPayload) => {
    if (!selectedConversation) {
      return;
    }

    setSubmitting(true);

    try {
      await adminConversationService.updateConversation(selectedConversation.id, payload as UpdateConversationPayload);
      showToast({
        type: 'success',
        title: 'Conversation updated',
        description: 'The conversation record was updated successfully.'
      });
      setEditOpen(false);
      await loadConversations();
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
    if (!selectedConversation) {
      return;
    }

    setSubmitting(true);

    try {
      await adminConversationService.deleteConversation(selectedConversation.id);
      showToast({
        type: 'success',
        title: 'Conversation deleted',
        description: 'The conversation record has been removed.'
      });
      setDeleteOpen(false);
      setSelectedConversation(null);
      await loadConversations();
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

  const answeredCount = conversationPage?.content.filter((conversation) => Boolean(conversation.response)).length ?? 0;
  const trackedLatencyCount = conversationPage?.content.filter((conversation) => conversation.responseTime !== null).length ?? 0;
  const highConfidenceCount = conversationPage?.content.filter((conversation) => (conversation.confidenceScore ?? 0) >= 0.8).length ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Visible conversations</p>
          <p className="mt-4 text-4xl font-semibold text-white">{conversationPage?.totalElements ?? 0}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Answered on page</p>
          <p className="mt-4 text-4xl font-semibold text-white">{answeredCount}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Latency tracked</p>
          <p className="mt-4 text-4xl font-semibold text-white">{trackedLatencyCount}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">High confidence</p>
          <p className="mt-4 text-4xl font-semibold text-white">{highConfidenceCount}</p>
        </div>
      </section>

      <section className="page-shell space-y-5 border-white/10 bg-slate-950/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Conversation history</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Manage project conversations</h3>
            <p className="mt-2 text-sm text-slate-400">
              Track project questions, answers, confidence scores, response time, and project context.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
              <MessageSquareText className="h-4 w-4" />
              {conversationPage?.totalElements ?? 0} conversations matched
            </div>
            {canManageConversations ? (
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400"
                onClick={() => setCreateOpen(true)}
                type="button"
              >
                <ShieldPlus className="h-4 w-4" />
                Add Conversation
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px_180px_170px]">
          <SearchBar
            onChange={(value) => setFilters((currentFilters) => ({ ...currentFilters, search: value, page: 0 }))}
            placeholder="Search by question, response, user, or project"
            value={filters.search ?? ''}
          />

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
        <ErrorState actionLabel="Reload conversations" description={error} onAction={() => void loadConversations()} title="Unable to load conversations" />
      ) : !conversationPage || conversationPage.content.length === 0 ? (
        <EmptyState
          description={canManageConversations ? 'Try adjusting filters or add the first conversation record.' : 'Try adjusting filters to surface readable conversations.'}
          title="No conversations found"
        />
      ) : (
        <>
          <ConversationTable
            canManageConversations={canManageConversations}
            conversations={conversationPage.content}
            onDelete={(conversation) => {
              setSelectedConversation(conversation);
              setDeleteOpen(true);
            }}
            onEdit={(conversation) => {
              setSelectedConversation(conversation);
              setEditOpen(true);
            }}
            onSort={handleSort}
            onView={(conversation) => navigate(`/dashboard/conversations/${conversation.id}`)}
            sortBy={filters.sortBy ?? 'createdAt'}
            sortDirection={filters.sortDirection ?? 'desc'}
          />
          <Pagination
            currentPage={conversationPage.page}
            onPageChange={(page) => setFilters((currentFilters) => ({ ...currentFilters, page }))}
            totalPages={conversationPage.totalPages}
          />
        </>
      )}

      {canManageConversations ? (
        <>
          <ConversationFormModal
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => setCreateOpen(false)}
            onSubmit={(payload) => void handleCreateSubmit(payload)}
            open={createOpen}
            projects={projects}
            subtitle="Create a project-linked conversation record."
            title="Add conversation"
          />
          <ConversationFormModal
            conversation={selectedConversation}
            loading={submitting}
            loadingProjects={loadingProjects}
            onClose={() => {
              setEditOpen(false);
              setSelectedConversation(null);
            }}
            onSubmit={(payload) => void handleEditSubmit(payload)}
            open={editOpen}
            projects={projects}
            subtitle="Update question, response, confidence, latency, and project assignment."
            title="Edit conversation"
          />
          <DeleteConversationDialog
            conversation={selectedConversation}
            loading={submitting}
            onCancel={() => {
              setDeleteOpen(false);
              setSelectedConversation(null);
            }}
            onConfirm={() => void handleDeleteConfirm()}
            open={deleteOpen}
          />
        </>
      ) : null}
    </div>
  );
}
