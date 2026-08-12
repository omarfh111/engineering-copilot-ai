import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { LoaderCircle, UsersRound, X } from 'lucide-react';
import type { CreateTeamPayload, Team, UpdateTeamPayload } from '../../types/team';

interface TeamFormModalProps {
  open: boolean;
  loading: boolean;
  title: string;
  subtitle: string;
  team?: Team | null;
  onClose: () => void;
  onSubmit: (payload: CreateTeamPayload | UpdateTeamPayload) => void;
}

const defaultValues: CreateTeamPayload = {
  teamName: '',
  description: ''
};

export function TeamFormModal({ open, loading, title, subtitle, team, onClose, onSubmit }: TeamFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateTeamPayload>({
    defaultValues
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }

    reset({
      teamName: team?.teamName ?? '',
      description: team?.description ?? ''
    });
  }, [open, reset, team]);

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
                <UsersRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Team management</p>
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

        <form className="space-y-6 px-6 py-6 sm:px-7" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Team name</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('teamName', {
                  required: 'Team name is required',
                  maxLength: {
                    value: 120,
                    message: 'Team name must be 120 characters or fewer'
                  }
                })}
              />
              {errors.teamName ? <p className="text-sm text-rose-300">{errors.teamName.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Description</span>
              <textarea
                className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('description', {
                  maxLength: {
                    value: 2000,
                    message: 'Description must be 2000 characters or fewer'
                  }
                })}
              />
              {errors.description ? <p className="text-sm text-rose-300">{errors.description.message}</p> : null}
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
                  Saving team...
                </>
              ) : (
                'Save Team'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
