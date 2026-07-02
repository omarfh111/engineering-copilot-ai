import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Building2, Clock3, Mail, Shield } from 'lucide-react';
import { UserCard } from '../components/user/UserCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { useSession } from '../context/SessionContext';
import { formatDate, formatRole } from '../lib/formatters';

export function MyProfilePage() {
  const { currentUser } = useSession();

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <UserCard hideActions user={currentUser} />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="page-shell">
            <div className="flex items-center gap-3 text-brand-600 dark:text-brand-300">
              <Mail className="h-5 w-5" />
              <h3 className="font-semibold">Primary contact</h3>
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{currentUser.email}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              This address is used for authentication, notifications, and workspace ownership checks.
            </p>
          </div>

          <div className="page-shell">
            <div className="flex items-center gap-3 text-brand-600 dark:text-brand-300">
              <Shield className="h-5 w-5" />
              <h3 className="font-semibold">Access level</h3>
            </div>
            <div className="mt-4">
              <StatusBadge label={formatRole(currentUser.role)} tone="brand" />
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Your role determines which administrative and profile actions are available across the dashboard.
            </p>
          </div>

          <div className="page-shell">
            <div className="flex items-center gap-3 text-brand-600 dark:text-brand-300">
              <BadgeCheck className="h-5 w-5" />
              <h3 className="font-semibold">Account health</h3>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <StatusBadge label={currentUser.enabled ? 'Enabled' : 'Disabled'} tone={currentUser.enabled ? 'success' : 'danger'} />
              <StatusBadge
                label={currentUser.accountLocked ? 'Locked' : 'Unlocked'}
                tone={currentUser.accountLocked ? 'warning' : 'neutral'}
              />
            </div>
          </div>

          <div className="page-shell">
            <div className="flex items-center gap-3 text-brand-600 dark:text-brand-300">
              <Clock3 className="h-5 w-5" />
              <h3 className="font-semibold">Member timeline</h3>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Joined</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">{formatDate(currentUser.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Last profile update</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">{formatDate(currentUser.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section className="page-shell">
        <div className="flex items-center gap-3 text-brand-600 dark:text-brand-300">
          <Building2 className="h-5 w-5" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Teams</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              These are the engineering teams currently linked to your profile.
            </p>
          </div>
        </div>

        {currentUser.teams.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">No teams assigned</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              This user is not assigned to any team yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {currentUser.teams.map((team) => (
              <article
                className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60"
                key={team.id}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">
                  Team membership
                </p>
                <h4 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{team.teamName}</h4>
                <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  {team.description || 'No description has been provided for this team yet.'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="page-shell flex flex-col items-start justify-between gap-4 bg-gradient-to-r from-brand-600 to-indigo-700 text-white md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-100">Profile management</p>
          <h3 className="mt-2 text-2xl font-semibold">Keep your account details current</h3>
          <p className="mt-2 text-sm text-brand-100">
            Update your profile information or rotate your password without leaving the dashboard.
          </p>
        </div>

        <Link
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
          to="/settings/profile/edit"
        >
          Edit my profile
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
