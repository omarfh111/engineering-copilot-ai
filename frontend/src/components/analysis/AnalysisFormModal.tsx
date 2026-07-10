import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Boxes, LoaderCircle, X } from 'lucide-react';
import { analysisStatusOptions, analysisTypeOptions, formatEnumLabel, severityOptions } from '../../lib/analysis';
import type {
  Analysis,
  AnalysisProjectSummary,
  AnalysisStatus,
  AnalysisType,
  CreateAnalysisPayload,
  Severity,
  UpdateAnalysisPayload
} from '../../types/analysis';

interface AnalysisFormModalProps {
  open: boolean;
  loading: boolean;
  loadingProjects?: boolean;
  title: string;
  subtitle: string;
  analysis?: Analysis | null;
  projects: AnalysisProjectSummary[];
  fixedProjectId?: number | null;
  onClose: () => void;
  onSubmit: (payload: CreateAnalysisPayload | UpdateAnalysisPayload) => void;
}

interface AnalysisFormValues {
  title: string;
  summary: string;
  recommendation: string;
  analysisType: AnalysisType | '';
  status: AnalysisStatus | '';
  severity: Severity | '';
  score: string;
  projectId: string;
}

const defaultValues: AnalysisFormValues = {
  title: '',
  summary: '',
  recommendation: '',
  analysisType: '',
  status: 'PENDING',
  severity: 'MEDIUM',
  score: '0',
  projectId: ''
};

export function AnalysisFormModal({
  open,
  loading,
  loadingProjects = false,
  title,
  subtitle,
  analysis,
  projects,
  fixedProjectId,
  onClose,
  onSubmit
}: AnalysisFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<AnalysisFormValues>({ defaultValues });

  const projectIdRegistration = register('projectId', {
    required: fixedProjectId === undefined || fixedProjectId === null ? 'Project is required' : false
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }

    reset({
      title: analysis?.title ?? '',
      summary: analysis?.summary ?? '',
      recommendation: analysis?.recommendation ?? '',
      analysisType: analysis?.analysisType ?? '',
      status: analysis?.status ?? 'PENDING',
      severity: analysis?.severity ?? 'MEDIUM',
      score: String(analysis?.score ?? 0),
      projectId: String(fixedProjectId ?? analysis?.project.id ?? '')
    });
  }, [analysis, fixedProjectId, open, reset]);

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
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Analysis management</p>
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
              summary: values.summary.trim(),
              recommendation: values.recommendation.trim(),
              analysisType: values.analysisType as AnalysisType,
              status: values.status as AnalysisStatus,
              severity: values.severity as Severity,
              score: Number(values.score),
              projectId: fixedProjectId ?? Number(values.projectId)
            });
          })}
        >
          <div className="grid gap-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Title</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('title', {
                  required: 'Analysis title is required',
                  maxLength: { value: 200, message: 'Analysis title must be 200 characters or fewer' },
                  validate: (value) => (value.trim() ? true : 'Analysis title is required')
                })}
              />
              {errors.title ? <p className="text-sm text-rose-300">{errors.title.message}</p> : null}
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Type</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('analysisType', { required: 'Analysis type is required' })}
                >
                  <option className="bg-slate-950 text-white" value="">
                    Select a type
                  </option>
                  {analysisTypeOptions.map((type) => (
                    <option className="bg-slate-950 text-white" key={type} value={type}>
                      {formatEnumLabel(type)}
                    </option>
                  ))}
                </select>
                {errors.analysisType ? <p className="text-sm text-rose-300">{errors.analysisType.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Status</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('status', { required: 'Status is required' })}
                >
                  {analysisStatusOptions.map((status) => (
                    <option className="bg-slate-950 text-white" key={status} value={status}>
                      {formatEnumLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Severity</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('severity', { required: 'Severity is required' })}
                >
                  {severityOptions.map((severity) => (
                    <option className="bg-slate-950 text-white" key={severity} value={severity}>
                      {formatEnumLabel(severity)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Score</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  min={0}
                  max={100}
                  type="number"
                  {...register('score', {
                    required: 'Score is required',
                    min: { value: 0, message: 'Score must be at least 0' },
                    max: { value: 100, message: 'Score must be 100 or lower' }
                  })}
                />
                {errors.score ? <p className="text-sm text-rose-300">{errors.score.message}</p> : null}
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

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Summary</span>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('summary', { maxLength: { value: 5000, message: 'Summary must be 5000 characters or fewer' } })}
              />
              {errors.summary ? <p className="text-sm text-rose-300">{errors.summary.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Recommendation</span>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('recommendation', {
                  maxLength: { value: 10000, message: 'Recommendation must be 10000 characters or fewer' }
                })}
              />
              {errors.recommendation ? <p className="text-sm text-rose-300">{errors.recommendation.message}</p> : null}
            </label>
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
                  Saving analysis...
                </>
              ) : analysis ? (
                'Save Analysis'
              ) : (
                'Create Analysis'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
