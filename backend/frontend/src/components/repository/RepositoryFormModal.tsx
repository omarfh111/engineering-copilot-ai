import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { GitBranch, LoaderCircle, X } from 'lucide-react';
import { formatRepositoryProvider, repositoryProviderOptions } from '../../lib/repository';
import type {
  CodeRepository,
  CreateRepositoryPayload,
  RepositoryProjectSummary,
  RepositoryProvider,
  UpdateRepositoryPayload
} from '../../types/repository';

interface RepositoryFormModalProps {
  open: boolean;
  loading: boolean;
  loadingProjects?: boolean;
  title: string;
  subtitle: string;
  repository?: CodeRepository | null;
  projects: RepositoryProjectSummary[];
  fixedProjectId?: number | null;
  onClose: () => void;
  onSubmit: (payload: CreateRepositoryPayload | UpdateRepositoryPayload) => void;
}

interface RepositoryFormValues {
  name: string;
  url: string;
  technology: string;
  provider: RepositoryProvider | '';
  branch: string;
  projectId: string;
}

const defaultValues: RepositoryFormValues = {
  name: '',
  url: '',
  technology: '',
  provider: '',
  branch: 'main',
  projectId: ''
};

export function RepositoryFormModal({
  open,
  loading,
  loadingProjects = false,
  title,
  subtitle,
  repository,
  projects,
  fixedProjectId,
  onClose,
  onSubmit
}: RepositoryFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<RepositoryFormValues>({
    defaultValues
  });

  const projectIdRegistration = register('projectId', {
    required: fixedProjectId === undefined || fixedProjectId === null ? 'Project is required' : false
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }

    reset({
      name: repository?.name ?? '',
      url: repository?.url ?? '',
      technology: repository?.technology ?? '',
      provider: repository?.provider ?? '',
      branch: repository?.branch ?? 'main',
      projectId: String(fixedProjectId ?? repository?.project.id ?? '')
    });
  }, [fixedProjectId, open, repository, reset]);

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
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Repository management</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
              </div>
            </div>
            <button
              className="rounded-2xl p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form
          className="space-y-6 px-6 py-6 sm:px-7"
          onSubmit={handleSubmit((values) => {
            const resolvedProjectId = fixedProjectId ?? Number(values.projectId);

            onSubmit({
              name: values.name.trim(),
              url: values.url.trim(),
              technology: values.technology.trim(),
              provider: values.provider as RepositoryProvider,
              branch: values.branch.trim() || 'main',
              projectId: resolvedProjectId
            });
          })}
        >
          <div className="grid gap-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Name</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('name', {
                  required: 'Repository name is required',
                  maxLength: {
                    value: 150,
                    message: 'Repository name must be 150 characters or fewer'
                  },
                  validate: (value) => (value.trim() ? true : 'Repository name is required')
                })}
              />
              {errors.name ? <p className="text-sm text-rose-300">{errors.name.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">URL</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                type="url"
                {...register('url', {
                  required: 'Repository url is required',
                  maxLength: {
                    value: 500,
                    message: 'Repository url must be 500 characters or fewer'
                  },
                  validate: (value) => (value.trim() ? true : 'Repository url is required')
                })}
              />
              {errors.url ? <p className="text-sm text-rose-300">{errors.url.message}</p> : null}
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Technology</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('technology', {
                    maxLength: {
                      value: 100,
                      message: 'Technology must be 100 characters or fewer'
                    }
                  })}
                />
                {errors.technology ? <p className="text-sm text-rose-300">{errors.technology.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Branch</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('branch', {
                    maxLength: {
                      value: 100,
                      message: 'Branch must be 100 characters or fewer'
                    }
                  })}
                />
                {errors.branch ? <p className="text-sm text-rose-300">{errors.branch.message}</p> : null}
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Provider</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('provider', {
                    required: 'Provider is required'
                  })}
                >
                  <option className="bg-slate-950 text-white" value="">
                    Select a provider
                  </option>
                  {repositoryProviderOptions.map((provider) => (
                    <option className="bg-slate-950 text-white" key={provider} value={provider}>
                      {formatRepositoryProvider(provider)}
                    </option>
                  ))}
                </select>
                {errors.provider ? <p className="text-sm text-rose-300">{errors.provider.message}</p> : null}
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
                  Saving repository...
                </>
              ) : repository ? (
                'Save Repository'
              ) : (
                'Create Repository'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
