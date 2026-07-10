import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { LoaderCircle, SquareCheckBig, X } from 'lucide-react';
import { formatEnumLabel } from '../../lib/todo';
import { todoPriorityOptions, todoStatusOptions } from '../../lib/todo';
import type { Analysis } from '../../types/analysis';
import type { CreateTodoPayload, Todo, TodoPriority, TodoStatus, UpdateTodoPayload } from '../../types/todo';

interface TodoFormModalProps {
  open: boolean;
  loading: boolean;
  loadingAnalyses?: boolean;
  title: string;
  subtitle: string;
  todo?: Todo | null;
  analyses: Analysis[];
  fixedAnalysisId?: number | null;
  onClose: () => void;
  onSubmit: (payload: CreateTodoPayload | UpdateTodoPayload) => void;
}

interface TodoFormValues {
  title: string;
  description: string;
  priority: TodoPriority | '';
  status: TodoStatus | '';
  filePath: string;
  lineNumber: string;
  analysisId: string;
}

const defaultValues: TodoFormValues = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  status: 'OPEN',
  filePath: '',
  lineNumber: '',
  analysisId: ''
};

export function TodoFormModal({
  open,
  loading,
  loadingAnalyses = false,
  title,
  subtitle,
  todo,
  analyses,
  fixedAnalysisId,
  onClose,
  onSubmit
}: TodoFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TodoFormValues>({ defaultValues });

  const analysisIdRegistration = register('analysisId', {
    required: fixedAnalysisId === undefined || fixedAnalysisId === null ? 'Analysis is required' : false
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }

    reset({
      title: todo?.title ?? '',
      description: todo?.description ?? '',
      priority: todo?.priority ?? 'MEDIUM',
      status: todo?.status ?? 'OPEN',
      filePath: todo?.filePath ?? '',
      lineNumber: todo?.lineNumber ? String(todo.lineNumber) : '',
      analysisId: String(fixedAnalysisId ?? todo?.analysis?.id ?? '')
    });
  }, [fixedAnalysisId, open, reset, todo]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="animate-slideUp w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-[#09111f] shadow-[0_30px_80px_-40px_rgba(59,130,246,0.55)]">
        <div className="border-b border-white/10 px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
                <SquareCheckBig className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Todo management</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
              </div>
            </div>
            <button className="rounded-2xl p-2 text-slate-500 transition hover:bg-white/5 hover:text-white" onClick={onClose} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form
          className="space-y-6 px-6 py-6 sm:px-7"
          onSubmit={handleSubmit((values) => {
            onSubmit({
              title: values.title.trim(),
              description: values.description.trim(),
              priority: values.priority as TodoPriority,
              status: values.status as TodoStatus,
              filePath: values.filePath.trim(),
              lineNumber: values.lineNumber ? Number(values.lineNumber) : null,
              analysisId: fixedAnalysisId ?? Number(values.analysisId)
            });
          })}
        >
          <div className="grid gap-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Title</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('title', {
                  required: 'Todo title is required',
                  maxLength: { value: 200, message: 'Todo title must be 200 characters or fewer' },
                  validate: (value) => (value.trim() ? true : 'Todo title is required')
                })}
              />
              {errors.title ? <p className="text-sm text-rose-300">{errors.title.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Description</span>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('description', { maxLength: { value: 5000, message: 'Description must be 5000 characters or fewer' } })}
              />
              {errors.description ? <p className="text-sm text-rose-300">{errors.description.message}</p> : null}
            </label>

            <div className="grid gap-5 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Priority</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('priority', { required: 'Priority is required' })}
                >
                  {todoPriorityOptions.map((priority) => (
                    <option className="bg-slate-950 text-white" key={priority} value={priority}>
                      {formatEnumLabel(priority)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Status</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('status', { required: 'Status is required' })}
                >
                  {todoStatusOptions.map((status) => (
                    <option className="bg-slate-950 text-white" key={status} value={status}>
                      {formatEnumLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Line</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  min={1}
                  type="number"
                  {...register('lineNumber', { min: { value: 1, message: 'Line number must be positive' } })}
                />
                {errors.lineNumber ? <p className="text-sm text-rose-300">{errors.lineNumber.message}</p> : null}
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">File path</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('filePath', { maxLength: { value: 500, message: 'File path must be 500 characters or fewer' } })}
                />
                {errors.filePath ? <p className="text-sm text-rose-300">{errors.filePath.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Analysis</span>
                {fixedAnalysisId !== undefined && fixedAnalysisId !== null ? (
                  <input type="hidden" value={String(fixedAnalysisId)} {...analysisIdRegistration} />
                ) : null}
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={loadingAnalyses || fixedAnalysisId !== undefined && fixedAnalysisId !== null}
                  {...(fixedAnalysisId === undefined || fixedAnalysisId === null ? analysisIdRegistration : {})}
                >
                  <option className="bg-slate-950 text-white" value="">
                    {loadingAnalyses ? 'Loading analyses...' : 'Select an analysis'}
                  </option>
                  {analyses.map((analysis) => (
                    <option className="bg-slate-950 text-white" key={analysis.id} value={analysis.id}>
                      {analysis.title}
                    </option>
                  ))}
                </select>
                {errors.analysisId ? <p className="text-sm text-rose-300">{errors.analysisId.message}</p> : null}
              </label>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
            <button
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Saving todo...
                </>
              ) : todo ? (
                'Save Todo'
              ) : (
                'Create Todo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
