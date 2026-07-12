import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FolderKanban, LoaderCircle, X } from 'lucide-react';
import { formatProjectStatus, projectStatusOptions } from '../../lib/project';
import type {
  CreateProjectPayload,
  Project,
  ProjectStatus,
  ProjectTeamSummary,
  UpdateProjectPayload
} from '../../types/project';

interface ProjectFormModalProps {
  open: boolean;
  loading: boolean;
  loadingTeams?: boolean;
  title: string;
  subtitle: string;
  project?: Project | null;
  teams: ProjectTeamSummary[];
  onClose: () => void;
  onSubmit: (payload: CreateProjectPayload | UpdateProjectPayload) => void;
}

interface ProjectFormValues {
  title: string;
  description: string;
  status: ProjectStatus;
  teamId: string;
}

const defaultValues: ProjectFormValues = {
  title: '',
  description: '',
  status: 'CREATED',
  teamId: ''
};

export function ProjectFormModal({
  open,
  loading,
  loadingTeams = false,
  title,
  subtitle,
  project,
  teams,
  onClose,
  onSubmit
}: ProjectFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ProjectFormValues>({
    defaultValues
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }

    reset({
      title: project?.title ?? '',
      description: project?.description ?? '',
      status: project?.status ?? 'CREATED',
      teamId: project?.team ? String(project.team.id) : ''
    });
  }, [open, project, reset]);

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
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Project management</p>
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
          onSubmit={handleSubmit((values) =>
            onSubmit({
              title: values.title.trim(),
              description: values.description.trim(),
              status: values.status,
              teamId: Number(values.teamId)
            })
          )}
        >
          <div className="grid gap-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Title</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('title', {
                  required: 'Project title is required',
                  validate: (value) => (value.trim() ? true : 'Project title is required')
                })}
              />
              {errors.title ? <p className="text-sm text-rose-300">{errors.title.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Description</span>
              <textarea
                className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('description')}
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Team</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  disabled={loadingTeams}
                  {...register('teamId', {
                    required: 'Team is required'
                  })}
                >
                  <option className="bg-slate-950 text-white" value="">
                    {loadingTeams ? 'Loading teams...' : 'Select a team'}
                  </option>
                  {teams.map((team) => (
                    <option className="bg-slate-950 text-white" key={team.id} value={team.id}>
                      {team.teamName}
                    </option>
                  ))}
                </select>
                {errors.teamId ? <p className="text-sm text-rose-300">{errors.teamId.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Status</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('status', {
                    required: 'Status is required'
                  })}
                >
                  {projectStatusOptions.map((status) => (
                    <option className="bg-slate-950 text-white" key={status} value={status}>
                      {formatProjectStatus(status)}
                    </option>
                  ))}
                </select>
                {errors.status ? <p className="text-sm text-rose-300">{errors.status.message}</p> : null}
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
                  {project ? 'Saving project...' : 'Creating project...'}
                </>
              ) : project ? (
                'Save Project'
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
