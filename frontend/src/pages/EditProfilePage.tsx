import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage, userApi } from '../lib/api';
import type { UpdateUserPayload } from '../types/user';

export function EditProfilePage() {
  const navigate = useNavigate();
  const { currentUser, refreshSession } = useSession();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
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
    if (currentUser) {
      reset({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        username: currentUser.username,
        email: currentUser.email,
        password: ''
      });
    }
  }, [currentUser, reset]);

  if (!currentUser) {
    return null;
  }

  const handleProfileSubmit = async (payload: UpdateUserPayload) => {
    setSubmitting(true);

    try {
      await userApi.updateUser(currentUser.id, payload);
      await refreshSession();
      showToast({
        type: 'success',
        title: 'Profile saved',
        description: 'Your personal profile has been updated.'
      });
      navigate('/settings');
    } catch (submitError) {
      showToast({
        type: 'error',
        title: 'Profile update failed',
        description: getApiErrorMessage(submitError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
        onClick={() => navigate('/settings')}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </button>

      <section className="page-shell max-w-4xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">
            Personal settings
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Edit your profile</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Keep your public account details accurate and rotate your password when needed.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit((payload) => void handleProfileSubmit(payload))}>
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
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">New password</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/10"
              placeholder="Leave blank to keep your current password"
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

          <div className="flex flex-wrap justify-end gap-3">
            <button
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
              onClick={() => navigate('/settings')}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Saving profile...' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
