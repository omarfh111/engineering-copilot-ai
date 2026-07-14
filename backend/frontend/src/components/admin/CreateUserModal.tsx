import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { LoaderCircle, UserPlus, X } from 'lucide-react';
import { adminUserService } from '../../services/adminUserService';
import type { CreateAdminUserPayload, TeamOption } from '../../types/admin';
import type { Role } from '../../types/user';

interface CreateUserModalProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAdminUserPayload) => void;
}

const roles: Role[] = ['ADMIN', 'MANAGER', 'ARCHITECT', 'QA', 'DEVELOPER', 'AUDITOR'];

const defaultValues: CreateAdminUserPayload = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  role: 'DEVELOPER'
};

export function CreateUserModal({ open, loading, onClose, onSubmit }: CreateUserModalProps) {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamLoadError, setTeamLoadError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateAdminUserPayload>({
    defaultValues
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      setTeams([]);
      setTeamLoadError(null);
      return;
    }

    setLoadingTeams(true);
    setTeamLoadError(null);

    void adminUserService
      .getTeamOptions()
      .then((options) => setTeams(options))
      .catch(() => {
        setTeams([]);
        setTeamLoadError('Teams could not be loaded.');
      })
      .finally(() => setLoadingTeams(false));
  }, [open, reset]);

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
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">User management</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Create user</h3>
                <p className="mt-1 text-sm text-slate-400">Provision a new Engineering Copilot account for your team.</p>
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
              ...values,
              role: values.role.replace(/^ROLE_/, '') as Role
            })
          )}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">First Name</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('firstName', { required: 'First name is required' })}
              />
              {errors.firstName ? <p className="text-sm text-rose-300">{errors.firstName.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Last Name</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('lastName', { required: 'Last name is required' })}
              />
              {errors.lastName ? <p className="text-sm text-rose-300">{errors.lastName.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Username</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('username', { required: 'Username is required' })}
              />
              {errors.username ? <p className="text-sm text-rose-300">{errors.username.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Email</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Enter a valid email address'
                  }
                })}
              />
              {errors.email ? <p className="text-sm text-rose-300">{errors.email.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Password</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                type="password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })}
              />
              {errors.password ? <p className="text-sm text-rose-300">{errors.password.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Role</span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('role', {
                  required: 'Role is required',
                  setValueAs: (value) => String(value).replace(/^ROLE_/, '')
                })}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Team</span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                disabled={loadingTeams || Boolean(teamLoadError)}
                {...register('teamId')}
              >
                <option value="">{loadingTeams ? 'Loading teams...' : 'No team assigned'}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {teamLoadError ? <p className="text-sm text-rose-300">{teamLoadError}</p> : null}
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
                  Creating user...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
