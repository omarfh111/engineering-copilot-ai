import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookText,
  BrainCircuit,
  FolderKanban,
  GitBranch,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  SquareCheckBig,
  Users2
} from 'lucide-react';
import { AdminAnalysesTable } from '../components/admin/AdminAnalysesTable';
import { AdminMetricCard } from '../components/admin/AdminMetricCard';
import { AdminProjectsTable } from '../components/admin/AdminProjectsTable';
import { RecentUsersTable } from '../components/admin/RecentUsersTable';
import { SystemActivityTimeline } from '../components/admin/SystemActivityTimeline';
import { DeleteConfirmationDialog } from '../components/user/DeleteConfirmationDialog';
import { EditUserModal } from '../components/user/EditUserModal';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage } from '../lib/api';
import { adminDashboardService } from '../services/adminDashboardService';
import { adminUserService } from '../services/adminUserService';
import type { AdminDashboardOverview } from '../types/admin';
import type { UpdateUserPayload, User } from '../types/user';

const emptyOverview: AdminDashboardOverview = {
  stats: {
    totalUsers: { total: 0, trend: { direction: 'neutral', value: 'Idle', label: 'No user records returned yet' } },
    activeTeams: { total: 0, trend: { direction: 'neutral', value: 'Idle', label: 'No active teams returned yet' } },
    projects: { total: 0, trend: { direction: 'neutral', value: 'Idle', label: 'No project activity returned yet' } },
    repositories: { total: 0, trend: { direction: 'neutral', value: 'Idle', label: 'No repositories returned yet' } },
    documents: { total: 0, trend: { direction: 'neutral', value: 'Idle', label: 'No documents returned yet' } },
    analyses: { total: 0, trend: { direction: 'neutral', value: 'Idle', label: 'No analyses returned yet' } },
    pendingReviews: { total: 0, trend: { direction: 'neutral', value: 'Idle', label: 'No pending reviews returned' } },
    openTodos: { total: 0, trend: { direction: 'neutral', value: 'Idle', label: 'No open todos returned' } }
  },
  recentUsers: [],
  recentProjects: [],
  recentAnalyses: [],
  activityTimeline: []
};

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { currentUser, refreshSession } = useSession();
  const { showToast } = useToast();
  const [overview, setOverview] = useState<AdminDashboardOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadOverview = async () => {
    setLoading(true);

    try {
      const response = await adminDashboardService.getOverview();
      setOverview(response);
      setError(null);
    } catch (loadError) {
      setOverview(emptyOverview);
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleUpdate = async (payload: UpdateUserPayload) => {
    if (!selectedUser) {
      return;
    }

    setSubmitting(true);

    try {
      await adminUserService.updateUser(selectedUser.id, payload);
      showToast({
        type: 'success',
        title: 'User updated',
        description: `${selectedUser.firstName} ${selectedUser.lastName} was updated successfully.`
      });
      setEditOpen(false);
      await loadOverview();

      if (currentUser?.id === selectedUser.id) {
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
    if (!selectedUser) {
      return;
    }

    setSubmitting(true);

    try {
      await adminUserService.deleteUser(selectedUser.id);
      showToast({
        type: 'success',
        title: 'User deleted',
        description: `${selectedUser.firstName} ${selectedUser.lastName} has been removed.`
      });
      setDeleteOpen(false);
      setSelectedUser(null);
      await loadOverview();
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

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.28),_transparent_32%),linear-gradient(135deg,_#020617_0%,_#0f172a_54%,_#111827_100%)] px-6 py-7 text-white shadow-[0_30px_90px_-44px_rgba(59,130,246,0.7)] sm:px-8 sm:py-8">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-100">Welcome back, Administrator 👋</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Manage your engineering workspace and monitor operational activity.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              Oversee platform users, project telemetry, analyses, and operational activity from one command center.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-100">Admin scope</p>
              <p className="mt-3 text-lg font-semibold text-white">Full workspace governance</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-100">Access level</p>
              <p className="mt-3 text-lg font-semibold text-white">{currentUser?.role ?? 'ADMIN'}</p>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-40 w-full" />
          <LoadingSkeleton className="h-72 w-full" />
          <LoadingSkeleton className="h-80 w-full" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <AdminMetricCard icon={Users2} label="Total Users" metric={overview.stats.totalUsers} />
            <AdminMetricCard icon={ShieldCheck} label="Active Teams" metric={overview.stats.activeTeams} />
            <AdminMetricCard icon={FolderKanban} label="Projects" metric={overview.stats.projects} />
            <AdminMetricCard icon={GitBranch} label="Repositories" metric={overview.stats.repositories} />
            <AdminMetricCard icon={BookText} label="Documents" metric={overview.stats.documents} />
            <AdminMetricCard icon={BrainCircuit} label="Analyses" metric={overview.stats.analyses} />
            <AdminMetricCard icon={MessagesSquare} label="Pending Reviews" metric={overview.stats.pendingReviews} />
            <AdminMetricCard icon={SquareCheckBig} label="Open Todos" metric={overview.stats.openTodos} />
          </section>

          {error ? (
            <ErrorState
              actionLabel="Reload dashboard"
              description={error}
              onAction={() => {
                void loadOverview();
              }}
              title="Admin dashboard data unavailable"
            />
          ) : null}

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Directory activity</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">Recent Users</h2>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-brand-400/20 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-100 transition hover:border-brand-300/35 hover:bg-brand-500/15"
                onClick={() => navigate('/dashboard/users')}
                type="button"
              >
                View all users
              </button>
            </div>
            <RecentUsersTable
              onDelete={(user) => {
                setSelectedUser(user);
                setDeleteOpen(true);
              }}
              onEdit={(user) => {
                setSelectedUser(user);
                setEditOpen(true);
              }}
              onView={(user) => navigate(`/dashboard/users/${user.id}`)}
              users={overview.recentUsers}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Delivery portfolio</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">Recent Projects</h2>
              </div>
              <AdminProjectsTable projects={overview.recentProjects} />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Analysis operations</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">Recent Analyses</h2>
              </div>
              <AdminAnalysesTable analyses={overview.recentAnalyses} />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-brand-300" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">System activity</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">Activity Timeline</h2>
              </div>
            </div>
            <SystemActivityTimeline items={overview.activityTimeline} />
          </section>
        </>
      )}

      <EditUserModal
        isAdmin
        loading={submitting}
        onClose={() => {
          setEditOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={(payload) => {
          void handleUpdate(payload);
        }}
        open={editOpen}
        user={selectedUser}
      />

      <DeleteConfirmationDialog
        loading={submitting}
        onCancel={() => {
          setDeleteOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={() => {
          void handleDelete();
        }}
        open={deleteOpen}
        user={selectedUser}
      />
    </div>
  );
}
