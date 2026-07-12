import { ArrowLeft, PencilLine, SquareCheckBig, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { DeleteTodoDialog } from '../components/todo/DeleteTodoDialog';
import { TodoFormModal } from '../components/todo/TodoFormModal';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage } from '../lib/api';
import { getStatusTone } from '../lib/analysis';
import { formatDate } from '../lib/formatters';
import { formatEnumLabel } from '../lib/todo';
import { adminAnalysisService } from '../services/adminAnalysisService';
import { adminTodoService } from '../services/adminTodoService';
import type { Analysis } from '../types/analysis';
import type { CreateTodoPayload, Todo, UpdateTodoPayload } from '../types/todo';

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-200">{value ?? 'Not provided'}</p>
    </div>
  );
}

export function TodoDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [todo, setTodo] = useState<Todo | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const todoId = Number(id);

  const canCreateTodos = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'QA';
  const canManageTodos = canCreateTodos || currentUser?.role === 'DEVELOPER';
  const canDeleteTodos = canCreateTodos;

  const loadTodo = async () => {
    if (!Number.isFinite(todoId)) {
      setError('The requested todo id is invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      setTodo(await adminTodoService.getTodoById(todoId));
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyses = async () => {
    if (!canManageTodos) {
      return;
    }

    setLoadingAnalyses(true);

    try {
      const response = await adminAnalysisService.getAnalyses({ page: 0, size: 100, sortBy: 'createdAt', sortDirection: 'desc' });
      setAnalyses(response.content);
    } catch (analysisError) {
      showToast({ type: 'error', title: 'Unable to load analyses', description: getApiErrorMessage(analysisError) });
    } finally {
      setLoadingAnalyses(false);
    }
  };

  useEffect(() => {
    void loadTodo();
  }, [todoId]);

  useEffect(() => {
    void loadAnalyses();
  }, [canManageTodos]);

  const handleEdit = async (payload: CreateTodoPayload | UpdateTodoPayload) => {
    if (!todo) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedTodo = await adminTodoService.updateTodo(todo.id, payload as UpdateTodoPayload);
      setTodo(updatedTodo);
      setEditOpen(false);
      showToast({ type: 'success', title: 'Todo updated', description: `${updatedTodo.title} was updated successfully.` });
    } catch (updateError) {
      showToast({ type: 'error', title: 'Update failed', description: getApiErrorMessage(updateError) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!todo) {
      return;
    }

    setSubmitting(true);

    try {
      await adminTodoService.deleteTodo(todo.id);
      showToast({ type: 'success', title: 'Todo deleted', description: `${todo.title} has been removed.` });
      navigate('/dashboard/todos');
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

  if (error || !todo) {
    return <ErrorState actionLabel="Reload todo" description={error ?? 'Unable to load the requested todo.'} onAction={() => void loadTodo()} title="Todo unavailable" />;
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
              <SquareCheckBig className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Todo details</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{todo.title}</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge label={formatEnumLabel(todo.status)} tone={getStatusTone(todo.status)} />
                <StatusBadge label={formatEnumLabel(todo.priority)} tone={getStatusTone(todo.priority)} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {canManageTodos ? (
              <button className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500" onClick={() => setEditOpen(true)} type="button">
                <PencilLine className="h-4 w-4" />
                Edit
              </button>
            ) : null}
            {canDeleteTodos ? (
              <button className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500" onClick={() => setDeleteOpen(true)} type="button">
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailField label="Project" value={todo.project?.title} />
        <DetailField label="Analysis" value={todo.analysis?.type ? formatEnumLabel(todo.analysis.type) : null} />
        <DetailField label="File" value={todo.filePath ? `${todo.filePath}${todo.lineNumber ? `:${todo.lineNumber}` : ''}` : null} />
        <DetailField label="Created" value={formatDate(todo.createdAt)} />
      </section>

      <article className="page-shell border-white/10 bg-slate-950/70">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Description</p>
        <p className="mt-4 text-sm leading-7 text-slate-300">{todo.description || 'No description provided yet.'}</p>
      </article>

      {canManageTodos ? (
        <TodoFormModal
          analyses={analyses}
          loading={submitting}
          loadingAnalyses={loadingAnalyses}
          onClose={() => setEditOpen(false)}
          onSubmit={(payload) => void handleEdit(payload)}
          open={editOpen}
          subtitle="Update todo priority, status, source context, and analysis assignment."
          title="Edit todo"
          todo={todo}
        />
      ) : null}

      {canDeleteTodos ? (
        <DeleteTodoDialog loading={submitting} onCancel={() => setDeleteOpen(false)} onConfirm={() => void handleDelete()} open={deleteOpen} todo={todo} />
      ) : null}
    </div>
  );
}
