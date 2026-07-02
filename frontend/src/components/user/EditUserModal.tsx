import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import type { Role, UpdateUserPayload, User } from '../../types/user';

interface EditUserModalProps {
  open: boolean;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateUserPayload) => void;
}

const roles: Role[] = ['ADMIN', 'MANAGER', 'ARCHITECT', 'QA', 'DEVELOPER'];

export function EditUserModal({ open, user, isAdmin, loading, onClose, onSubmit }: EditUserModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<UpdateUserPayload>({
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: ''
    }
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
        enabled: user.enabled,
        accountLocked: user.accountLocked
      });
    }
  }, [reset, user]);

  if (!open || !user) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="animate-slideUp w-full max-w-2xl rounded-[32px] border border-white/60 bg-white p-6 shadow-panel dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">
              User management
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Edit user</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Update profile details, credentials, and account access.
            </p>
          </div>
          <button
            className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">First name</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/10"
                {...register('firstName', { required: 'First name is required' })}
              />
              {errors.firstName ? <p className="text-sm text-rose-600">{errors.firstName.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Last name</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/10"
                {...register('lastName', { required: 'Last name is required' })}
              />
              {errors.lastName ? <p className="text-sm text-rose-600">{errors.lastName.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Username</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/10"
                {...register('username', { required: 'Username is required' })}
              />
              {errors.username ? <p className="text-sm text-rose-600">{errors.username.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/10"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Enter a valid email address'
                  }
                })}
              />
              {errors.email ? <p className="text-sm text-rose-600">{errors.email.message}</p> : null}
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/10"
                placeholder="Leave blank to keep the existing password"
                type="password"
                {...register('password', {
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })}
              />
              {errors.password ? <p className="text-sm text-rose-600">{errors.password.message}</p> : null}
            </label>
          </div>

          {isAdmin ? (
            <div className="grid gap-5 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Role</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/10"
                  {...register('role')}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Enabled</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Allow login and API access</p>
                </div>
                <input className="h-5 w-5 rounded border-slate-300 text-brand-600" type="checkbox" {...register('enabled')} />
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Locked</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Prevent authentication</p>
                </div>
                <input
                  className="h-5 w-5 rounded border-slate-300 text-brand-600"
                  type="checkbox"
                  {...register('accountLocked')}
                />
              </label>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-2xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? 'Saving changes...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
