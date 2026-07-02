import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarClock, KeyRound, ShieldCheck, UserRoundCog } from 'lucide-react';
import { DeleteConfirmationDialog } from '../components/user/DeleteConfirmationDialog';
import { EditUserModal } from '../components/user/EditUserModal';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage, userApi } from '../lib/api';
import { formatDate, formatRole } from '../lib/formatters';
import type { UpdateUserPayload, User } from '../types/user';

function resolveStatus(user: User) {
  if (!user.enabled) {
    return { label: 'Disabled', tone: 'danger' as const };
  }

  if (user.accountLocked) {
    return { label: 'Locked', tone: 'warning' as const };
  }

  return { label: 'Active', tone: 'success' as const };
}

export function UserDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser, refreshSession } = useSession();
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const userId = Number(id);

  const loadUser = async () => {
    if (!Number.isFinite(userId)) {
      setError('The requested user id is invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await userApi.getUserById(userId);
      setUser(response);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUser();
  }, [userId]);

  const canEdit = Boolean(currentUser && user && (currentUser.role === 'ADMIN' || currentUser.id === user.id));
  const canDelete = Boolean(currentUser && currentUser.role === 'ADMIN' && user);

  const handleUpdate = async (payload: UpdateUserPayload) => {
    if (!user) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedUser = await userApi.updateUser(user.id, payload);
      setUser(updatedUser);
      setModalOpen(false);
      showToast({
        type: 'success',
        title: 'Profile updated',
        description: `${updatedUser.firstName} ${updatedUser.lastName} has been refreshed.`
      });

      if (currentUser?.id === updatedUser.id) {
        await refreshSession();
      }
    } catch (updateError) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: getApiErrorMessage(updateError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) {
      return;
    }

    setSubmitting(true);

    try {
      await userApi.deleteUser(user.id);
      showToast({
        type: 'success',
        title: 'User deleted',
        description: `${user.firstName} ${user.lastName} has been removed.`
      });
      navigate('/dashboard/users');
    } catch (deleteError) {
      showToast({
        type: 'error',
        title: 'Delete failed',
        description: getApiErrorMessage(deleteError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-16 w-48" />
        <LoadingSkeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <ErrorState
        actionLabel="Reload profile"
        description={error ?? 'Unable to load the requested user.'}
        onAction={() => {
          void loadUser();
        }}
        title="User details unavailable"
      />
    );
  }

  const status = resolveStatus(user);

  return (
    <div className="space-y-6">
      <button
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
        onClick={() => navigate(currentUser?.role === 'ADMIN' ? '/dashboard/users' : '/profile')}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mx-auto w-full max-w-5xl space-y-6">
        <section className="page-shell flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">
              User profile
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              {user.firstName} {user.lastName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge label={formatRole(user.role)} tone="brand" />
              <StatusBadge label={status.label} tone={status.tone} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {canEdit ? (
              <button
                className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
                onClick={() => setModalOpen(true)}
                type="button"
              >
                Edit user
              </button>
            ) : null}
            {canDelete ? (
              <button
                className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                onClick={() => setDeleteOpen(true)}
                type="button"
              >
                Delete user
              </button>
            ) : null}
          </div>
        </section>

        <section className="page-shell grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-3 text-brand-600 dark:text-brand-300">
              <UserRoundCog className="h-5 w-5" />
              <h3 className="font-semibold">Account overview</h3>
            </div>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Username</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">@{user.username}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Role</dt>
                <dd className="mt-1">
                  <StatusBadge label={formatRole(user.role)} tone="brand" />
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Status</dt>
                <dd className="mt-1">
                  <StatusBadge label={status.label} tone={status.tone} />
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-3 text-brand-600 dark:text-brand-300">
              <ShieldCheck className="h-5 w-5" />
              <h3 className="font-semibold">Security</h3>
            </div>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Enabled</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">{user.enabled ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Account locked</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">{user.accountLocked ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 dark:bg-slate-950/70">
                <KeyRound className="h-4 w-4 text-brand-500" />
                <p className="text-slate-600 dark:text-slate-300">Passwords remain hidden from all responses.</p>
              </div>
            </dl>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-3 text-brand-600 dark:text-brand-300">
              <CalendarClock className="h-5 w-5" />
              <h3 className="font-semibold">Timeline</h3>
            </div>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Created at</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Last updated</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">{formatDate(user.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-brand-600 to-indigo-700 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-100">Contact</p>
            <p className="mt-4 text-lg font-semibold">{user.email}</p>
            <p className="mt-2 text-sm text-brand-100">
              Reach this teammate directly for project-level collaboration and access reviews.
            </p>
          </div>
        </section>

        <section className="page-shell">
          <div className="flex items-center gap-3 text-brand-600 dark:text-brand-300">
            <Building2 className="h-5 w-5" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Teams</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Every engineering team this user currently contributes to.
              </p>
            </div>
          </div>

          {user.teams.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">No teams assigned</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                This user is not assigned to any team yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {user.teams.map((team) => (
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
      </div>

      <EditUserModal
        isAdmin={currentUser?.role === 'ADMIN'}
        loading={submitting}
        onClose={() => setModalOpen(false)}
        onSubmit={(payload) => {
          void handleUpdate(payload);
        }}
        open={modalOpen}
        user={user}
      />

      <DeleteConfirmationDialog
        loading={submitting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          void handleDelete();
        }}
        open={deleteOpen}
        user={user}
      />
    </div>
  );
}
