import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Bot, LoaderCircle, X } from 'lucide-react';
import type {
  Conversation,
  ConversationProjectSummary,
  CreateConversationPayload,
  UpdateConversationPayload
} from '../../types/conversation';

interface ConversationFormModalProps {
  open: boolean;
  loading: boolean;
  loadingProjects?: boolean;
  title: string;
  subtitle: string;
  conversation?: Conversation | null;
  projects: ConversationProjectSummary[];
  fixedProjectId?: number | null;
  onClose: () => void;
  onSubmit: (payload: CreateConversationPayload | UpdateConversationPayload) => void;
}

interface ConversationFormValues {
  question: string;
  response: string;
  confidenceScore: string;
  responseTime: string;
  projectId: string;
}

const defaultValues: ConversationFormValues = {
  question: '',
  response: '',
  confidenceScore: '',
  responseTime: '',
  projectId: ''
};

export function ConversationFormModal({
  open,
  loading,
  loadingProjects = false,
  title,
  subtitle,
  conversation,
  projects,
  fixedProjectId,
  onClose,
  onSubmit
}: ConversationFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ConversationFormValues>({ defaultValues });

  const projectIdRegistration = register('projectId', {
    required: fixedProjectId === undefined || fixedProjectId === null ? 'Project is required' : false
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }

    reset({
      question: conversation?.question ?? '',
      response: conversation?.response ?? '',
      confidenceScore: conversation?.confidenceScore === null || conversation?.confidenceScore === undefined ? '' : String(conversation.confidenceScore),
      responseTime: conversation?.responseTime === null || conversation?.responseTime === undefined ? '' : String(conversation.responseTime),
      projectId: String(fixedProjectId ?? conversation?.project?.id ?? '')
    });
  }, [conversation, fixedProjectId, open, reset]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="animate-slideUp max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/10 bg-[#09111f] shadow-[0_30px_80px_-40px_rgba(59,130,246,0.55)]">
        <div className="border-b border-white/10 px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Conversation management</p>
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
              question: values.question.trim(),
              response: values.response.trim(),
              confidenceScore: values.confidenceScore ? Number(values.confidenceScore) : null,
              responseTime: values.responseTime ? Number(values.responseTime) : null,
              projectId: fixedProjectId ?? Number(values.projectId)
            });
          })}
        >
          <div className="grid gap-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Question</span>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('question', {
                  required: 'Question is required',
                  maxLength: { value: 10000, message: 'Question must be 10000 characters or fewer' },
                  validate: (value) => (value.trim() ? true : 'Question is required')
                })}
              />
              {errors.question ? <p className="text-sm text-rose-300">{errors.question.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Response</span>
              <textarea
                className="min-h-[160px] w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('response', { maxLength: { value: 20000, message: 'Response must be 20000 characters or fewer' } })}
              />
              {errors.response ? <p className="text-sm text-rose-300">{errors.response.message}</p> : null}
            </label>

            <div className="grid gap-5 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Confidence</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  max={1}
                  min={0}
                  step="0.01"
                  type="number"
                  {...register('confidenceScore', {
                    min: { value: 0, message: 'Confidence must be at least 0' },
                    max: { value: 1, message: 'Confidence must be 1 or lower' }
                  })}
                />
                {errors.confidenceScore ? <p className="text-sm text-rose-300">{errors.confidenceScore.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Response time ms</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  min={0}
                  type="number"
                  {...register('responseTime', { min: { value: 0, message: 'Response time cannot be negative' } })}
                />
                {errors.responseTime ? <p className="text-sm text-rose-300">{errors.responseTime.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Project</span>
                {fixedProjectId !== undefined && fixedProjectId !== null ? (
                  <input type="hidden" value={String(fixedProjectId)} {...projectIdRegistration} />
                ) : null}
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={loadingProjects || fixedProjectId !== undefined && fixedProjectId !== null}
                  {...(fixedProjectId === undefined || fixedProjectId === null ? projectIdRegistration : {})}
                >
                  <option className="bg-slate-950 text-white" value="">
                    {loadingProjects ? 'Loading projects...' : 'Select a project'}
                  </option>
                  {projects.map((project) => (
                    <option className="bg-slate-950 text-white" key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
                {errors.projectId ? <p className="text-sm text-rose-300">{errors.projectId.message}</p> : null}
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
                  Saving conversation...
                </>
              ) : conversation ? (
                'Save Conversation'
              ) : (
                'Create Conversation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
