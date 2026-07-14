import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { EngineeringCopilotMark } from '../components/brand/EngineeringCopilotMark';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage } from '../lib/api';

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

const REMEMBERED_EMAIL_KEY = 'copilote_remembered_email';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, error, loading, login } = useSession();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true
    }
  });

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);

    if (rememberedEmail) {
      setValue('email', rememberedEmail);
      setValue('rememberMe', true);
    }
  }, [setValue]);

  if (!loading && currentUser) {
    return <Navigate replace to="/dashboard" />;
  }

  const authErrorFromRoute = (location.state as { authError?: string } | null)?.authError;
  const visibleError = authErrorFromRoute ?? error;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values.email, values.password);

      if (values.rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, values.email.trim());
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      showToast({
        type: 'success',
        title: 'Welcome back',
        description: 'Authentication succeeded and your dashboard is ready.'
      });

      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      showToast({
        type: 'error',
        title: 'Unable to sign in',
        description: getApiErrorMessage(submitError)
      });
    }
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(79,70,229,0.18),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#050816_45%,_#0b1120_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:68px_68px] opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(5,8,22,0.2)_50%,_rgba(5,8,22,0.85)_100%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <section className="flex w-full max-w-md items-center justify-center">
          <div className="w-full animate-slideUp">
            <div className="rounded-[32px] border border-white/10 bg-[#0b1220]/88 p-6 shadow-[0_30px_80px_-40px_rgba(59,130,246,0.45)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center gap-3">
                <EngineeringCopilotMark className="h-12 w-12 rounded-2xl" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Engineering Copilot</p>
                  <p className="mt-1 text-sm text-slate-400">Administrator-provisioned access</p>
                </div>
              </div>

              <h2 className="mt-10 text-3xl font-semibold tracking-tight text-white">Welcome Back</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Sign in to access your engineering workspace.
              </p>

              {visibleError ? (
                <div className="mt-6 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {visibleError}
                </div>
              ) : null}

              <form className="mt-7 space-y-5" onSubmit={(event) => void onSubmit(event)}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-white outline-none transition duration-200 placeholder:text-slate-500 focus:border-brand-400 focus:bg-slate-950 focus:ring-4 focus:ring-brand-500/10"
                      placeholder="you@company.com"
                      type="email"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /\S+@\S+\.\S+/,
                          message: 'Enter a valid email address'
                        }
                      })}
                    />
                  </div>
                  {errors.email ? <p className="text-sm text-rose-300">{errors.email.message}</p> : null}
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Password</span>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-white outline-none transition duration-200 placeholder:text-slate-500 focus:border-brand-400 focus:bg-slate-950 focus:ring-4 focus:ring-brand-500/10"
                      placeholder="Enter your password"
                      type="password"
                      {...register('password', {
                        required: 'Password is required'
                      })}
                    />
                  </div>
                  {errors.password ? <p className="text-sm text-rose-300">{errors.password.message}</p> : null}
                </label>

                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      className="h-4 w-4 rounded border-white/15 bg-slate-950/70 text-brand-500 focus:ring-brand-500/20"
                      type="checkbox"
                      {...register('rememberMe')}
                    />
                    Remember me
                  </label>

                  <button
                    className="text-sm font-medium text-slate-500 transition hover:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled
                    type="button"
                  >
                    Forgot password
                  </button>
                </div>

                <button
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_-24px_rgba(59,130,246,0.72)] transition duration-300 hover:-translate-y-0.5 hover:from-brand-400 hover:to-indigo-400 hover:shadow-[0_24px_55px_-24px_rgba(59,130,246,0.82)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting || loading}
                  type="submit"
                >
                  {isSubmitting || loading ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                <p>
                  Need an account?
                  <span className="ml-1 font-medium text-slate-200">Contact your administrator.</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">Accounts are provisioned and managed by your organization.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
