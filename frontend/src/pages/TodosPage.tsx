import { Filter, ShieldPlus, SlidersHorizontal, SquareCheckBig } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { DeleteTodoDialog } from '../components/todo/DeleteTodoDialog';
import { TodoFormModal } from '../components/todo/TodoFormModal';
import { TodoTable } from '../components/todo/TodoTable';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { getApiErrorMessage } from '../lib/api';
import { formatEnumLabel, todoPriorityOptions, todoStatusOptions } from '../lib/todo';
import { adminAnalysisService } from '../services/adminAnalysisService';
import { adminTodoService } from '../services/adminTodoService';
import type { Analysis } from '../types/analysis';
import type {
  CreateTodoPayload,
  Todo,
  TodoPriorityFilter,
  TodoQueryParams,
  TodoStatusFilter,
  UpdateTodoPayload
} from '../types/todo';

const defaultFilters: TodoQueryParams = {
  search: '',
  status: '',
  priority: '',
  projectId: '',
  page: 0,
  size: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc'
};

export function TodosPage() {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<TodoQueryParams>(defaultFilters);
  const [todoPage, setTodoPage] = useState<Awaited<ReturnType<typeof adminTodoService.getTodos>> | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(filters.search ?? '');

  const canCreateTodos = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'QA';
  const canManageTodos = canCreateTodos || currentUser?.role === 'DEVELOPER';
  const canDeleteTodos = canCreateTodos;

  const loadTodos = async () => {
    setLoading(true);

    try {
      const response = await adminTodoService.getTodos({
        ...filters,
        search: debouncedSearch
      });
      setTodoPage(response);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyses = async () => {
    setLoadingAnalyses(true);

    try {
      const response = await adminAnalysisService.getAnalyses({
        page: 0,
        size: 100,
        sortBy: 'createdAt',
        sortDirection: 'desc'
      });
      setAnalyses(response.content);
    } catch (analysisError) {
      setAnalyses([]);
      showToast({
        type: 'error',
        title: 'Unable to load analyses',
        description: getApiErrorMessage(analysisError)
      });
    } finally {
      setLoadingAnalyses(false);
    }
  };

  useEffect(() => {
    void loadTodos();
  }, [debouncedSearch, filters.page, filters.size, filters.sortBy, filters.sortDirection, filters.status, filters.priority, filters.projectId]);

  useEffect(() => {
    void loadAnalyses();
  }, []);

  const handleSort = (field: string) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      sortBy: field,
      sortDirection: currentFilters.sortBy === field && currentFilters.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreateSubmit = async (payload: CreateTodoPayload | UpdateTodoPayload) => {
    setSubmitting(true);

    try {
      await adminTodoService.createTodo(payload as CreateTodoPayload);
      showToast({
        type: 'success',
        title: 'Todo created',
        description: `${payload.title} was created successfully.`
      });
      setCreateOpen(false);
      await loadTodos();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create todo',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (payload: CreateTodoPayload | UpdateTodoPayload) => {
    if (!selectedTodo) {
      return;
    }

    setSubmitting(true);

    try {
      await adminTodoService.updateTodo(selectedTodo.id, payload as UpdateTodoPayload);
      showToast({
        type: 'success',
        title: 'Todo updated',
        description: `${payload.title} was updated successfully.`
      });
      setEditOpen(false);
      await loadTodos();
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
    if (!selectedTodo) {
      return;
    }

    setSubmitting(true);

    try {
      await adminTodoService.deleteTodo(selectedTodo.id);
      showToast({
        type: 'success',
        title: 'Todo deleted',
        description: `${selectedTodo.title} has been removed.`
      });
      setDeleteOpen(false);
      setSelectedTodo(null);
      await loadTodos();
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

  const openCount = todoPage?.content.filter((todo) => todo.status === 'OPEN').length ?? 0;
  const activeCount = todoPage?.content.filter((todo) => todo.status === 'IN_PROGRESS').length ?? 0;
  const criticalCount = todoPage?.content.filter((todo) => todo.priority === 'CRITICAL').length ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Visible todos</p>
          <p className="mt-4 text-4xl font-semibold text-white">{todoPage?.totalElements ?? 0}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Open on page</p>
          <p className="mt-4 text-4xl font-semibold text-white">{openCount}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">In progress on page</p>
          <p className="mt-4 text-4xl font-semibold text-white">{activeCount}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Critical on page</p>
          <p className="mt-4 text-4xl font-semibold text-white">{criticalCount}</p>
        </div>
      </section>

      <section className="page-shell space-y-5 border-white/10 bg-slate-950/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Todo backlog</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Manage remediation items</h3>
            <p className="mt-2 text-sm text-slate-400">
              Track analysis-generated follow-up work, priorities, status, and source file context.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
              <SquareCheckBig className="h-4 w-4" />
              {todoPage?.totalElements ?? 0} todos matched
            </div>
            {canCreateTodos ? (
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400"
                onClick={() => setCreateOpen(true)}
                type="button"
              >
                <ShieldPlus className="h-4 w-4" />
                Add Todo
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_200px_200px_240px_180px_170px]">
          <SearchBar
            onChange={(value) => setFilters((currentFilters) => ({ ...currentFilters, search: value, page: 0 }))}
            placeholder="Search by title, description, file path, or project"
            value={filters.search ?? ''}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, status: event.target.value as TodoStatusFilter, page: 0 }))}
              value={filters.status}
            >
              <option className="bg-slate-950 text-white" value="">
                All statuses
              </option>
              {todoStatusOptions.map((status) => (
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
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, priority: event.target.value as TodoPriorityFilter, page: 0 }))}
              value={filters.priority}
            >
              <option className="bg-slate-950 text-white" value="">
                All priorities
              </option>
              {todoPriorityOptions.map((priority) => (
                <option className="bg-slate-950 text-white" key={priority} value={priority}>
                  {formatEnumLabel(priority)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              disabled={loadingAnalyses}
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
                {loadingAnalyses ? 'Loading analyses...' : 'All projects'}
              </option>
              {Array.from(new Map(analyses.map((analysis) => [analysis.project.id, analysis.project])).values()).map((project) => (
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
        <ErrorState actionLabel="Reload todos" description={error} onAction={() => void loadTodos()} title="Unable to load todos" />
      ) : !todoPage || todoPage.content.length === 0 ? (
        <EmptyState
          description={canCreateTodos ? 'Try adjusting filters or add the first remediation item.' : 'Try adjusting filters to surface assigned TODOs.'}
          title="No todos found"
        />
      ) : (
        <>
          <TodoTable
            canDeleteTodos={canDeleteTodos}
            canManageTodos={canManageTodos}
            onDelete={(todo) => {
              setSelectedTodo(todo);
              setDeleteOpen(true);
            }}
            onEdit={(todo) => {
              setSelectedTodo(todo);
              setEditOpen(true);
            }}
            onSort={handleSort}
            onView={(todo) => navigate(`/dashboard/todos/${todo.id}`)}
            sortBy={filters.sortBy ?? 'createdAt'}
            sortDirection={filters.sortDirection ?? 'desc'}
            todos={todoPage.content}
          />
          <Pagination
            currentPage={todoPage.page}
            onPageChange={(page) => setFilters((currentFilters) => ({ ...currentFilters, page }))}
            totalPages={todoPage.totalPages}
          />
        </>
      )}

      {canCreateTodos ? (
        <TodoFormModal
          analyses={analyses}
          loading={submitting}
          loadingAnalyses={loadingAnalyses}
          onClose={() => setCreateOpen(false)}
          onSubmit={(payload) => void handleCreateSubmit(payload)}
          open={createOpen}
          subtitle="Create a remediation item connected to an analysis."
          title="Add todo"
        />
      ) : null}

      {canManageTodos ? (
        <TodoFormModal
          analyses={analyses}
          loading={submitting}
          loadingAnalyses={loadingAnalyses}
          onClose={() => {
            setEditOpen(false);
            setSelectedTodo(null);
          }}
          onSubmit={(payload) => void handleEditSubmit(payload)}
          open={editOpen}
          subtitle="Update todo priority, status, source context, and analysis assignment."
          title="Edit todo"
          todo={selectedTodo}
        />
      ) : null}

      {canDeleteTodos ? (
        <DeleteTodoDialog
          loading={submitting}
          onCancel={() => {
            setDeleteOpen(false);
            setSelectedTodo(null);
          }}
          onConfirm={() => void handleDeleteConfirm()}
          open={deleteOpen}
          todo={selectedTodo}
        />
      ) : null}
    </div>
  );
}
