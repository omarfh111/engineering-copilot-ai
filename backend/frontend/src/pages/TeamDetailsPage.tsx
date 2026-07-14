import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Crown, FolderKanban, LoaderCircle, UserPlus, UsersRound, XCircle } from 'lucide-react';
import { DeleteTeamDialog } from '../components/team/DeleteTeamDialog';
import { TeamFormModal } from '../components/team/TeamFormModal';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { useToast } from '../context/ToastContext';
import { formatDate, formatRole } from '../lib/formatters';
import { getApiErrorMessage } from '../lib/api';
import { adminTeamService } from '../services/adminTeamService';
import type { Team, UpdateTeamPayload } from '../types/team';
import type { User } from '../types/user';

export function TeamDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const teamId = Number(id);

  const applyTeamState = async (nextTeam: Team) => {
    const users = await adminTeamService.getAvailableUsers(nextTeam);
    setTeam(nextTeam);
    setAvailableUsers(users);
    setSelectedUserId(users[0] ? String(users[0].id) : '');
  };

  const loadTeam = async () => {
    if (!Number.isFinite(teamId)) {
      setError('The requested team id is invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await adminTeamService.getTeamById(teamId);
      await applyTeamState(response);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeam();
  }, [teamId]);

  const sortedMembers = useMemo(
    () =>
      [...(team?.members ?? [])].sort((left, right) =>
        `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`)
      ),
    [team]
  );

  const handleEditSubmit = async (payload: UpdateTeamPayload) => {
    if (!team) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedTeam = await adminTeamService.updateTeam(team.id, payload);
      await applyTeamState(updatedTeam);
      setEditOpen(false);
      showToast({
        type: 'success',
        title: 'Team updated',
        description: `${updatedTeam.teamName} was updated successfully.`
      });
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

  const handleDeleteTeam = async () => {
    if (!team) {
      return;
    }

    setSubmitting(true);

    try {
      await adminTeamService.deleteTeam(team.id);
      showToast({
        type: 'success',
        title: 'Team deleted',
        description: `${team.teamName} has been removed.`
      });
      navigate('/dashboard/teams');
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

  const handleAddMember = async () => {
    if (!team || !selectedUserId) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedTeam = await adminTeamService.addUserToTeam(team.id, Number(selectedUserId));
      await applyTeamState(updatedTeam);
      showToast({
        type: 'success',
        title: 'Member added',
        description: 'The selected user is now part of the team.'
      });
    } catch (addError) {
      showToast({
        type: 'error',
        title: 'Unable to add member',
        description: getApiErrorMessage(addError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!team) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedTeam = await adminTeamService.removeUserFromTeam(team.id, userId);
      await applyTeamState(updatedTeam);
      showToast({
        type: 'success',
        title: 'Member removed',
        description: 'The user was removed from the team.'
      });
    } catch (removeError) {
      showToast({
        type: 'error',
        title: 'Unable to remove member',
        description: getApiErrorMessage(removeError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignLeader = async (userId: number) => {
    if (!team) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedTeam = await adminTeamService.assignTeamLeader(team.id, userId);
      const leader = updatedTeam.leader;
      await applyTeamState(updatedTeam);
      showToast({
        type: 'success',
        title: 'Team leader assigned',
        description: leader
          ? `${leader.firstName} ${leader.lastName} is now leading ${updatedTeam.teamName}.`
          : 'The team leader was assigned successfully.'
      });
    } catch (assignError) {
      showToast({
        type: 'error',
        title: 'Unable to assign leader',
        description: getApiErrorMessage(assignError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveLeader = async () => {
    if (!team || !team.leader) {
      return;
    }

    const currentLeader = team.leader;
    setSubmitting(true);

    try {
      const updatedTeam = await adminTeamService.removeTeamLeader(team.id);
      await applyTeamState(updatedTeam);
      showToast({
        type: 'success',
        title: 'Team leader removed',
        description: `${currentLeader.firstName} ${currentLeader.lastName} is no longer the leader of ${team.teamName}.`
      });
    } catch (removeError) {
      showToast({
        type: 'error',
        title: 'Unable to remove leader',
        description: getApiErrorMessage(removeError)
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

  if (error || !team) {
    return (
      <ErrorState
        actionLabel="Reload team"
        description={error ?? 'Unable to load the requested team.'}
        onAction={() => {
          void loadTeam();
        }}
        title="Team details unavailable"
      />
    );
  }

  return (
    <div className="space-y-6">
      <button
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
        onClick={() => navigate('/dashboard/teams')}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to teams
      </button>

      <section className="page-shell flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">Team workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{team.teamName}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            {team.description || 'No description has been provided for this team yet.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
            onClick={() => setEditOpen(true)}
            type="button"
          >
            Edit team
          </button>
          <button
            className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
            onClick={() => setDeleteOpen(true)}
            type="button"
          >
            Delete team
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <UsersRound className="h-5 w-5" />
            <p className="font-semibold text-white">Members</p>
          </div>
          <p className="mt-4 text-4xl font-semibold text-white">{team.memberCount}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <FolderKanban className="h-5 w-5" />
            <p className="font-semibold text-white">Projects</p>
          </div>
          <p className="mt-4 text-4xl font-semibold text-white">{team.projectCount}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <CalendarClock className="h-5 w-5" />
            <p className="font-semibold text-white">Updated</p>
          </div>
          <p className="mt-4 text-lg font-semibold text-white">{formatDate(team.updatedAt)}</p>
        </div>
      </section>

      <section className="page-shell overflow-hidden border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-brand-900 text-white">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/10 text-brand-200">
              <Crown className="h-7 w-7" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Team leadership</p>
              <h2 className="mt-2 text-2xl font-semibold">Team leader</h2>

              {team.leader ? (
                <>
                  <p className="mt-3 text-lg font-semibold">
                    {team.leader.firstName} {team.leader.lastName}
                  </p>
                  <p className="mt-1 text-sm text-brand-100">
                    @{team.leader.username} - {team.leader.email}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge label="Team Leader" tone="warning" />
                    <StatusBadge label={formatRole(team.leader.role)} tone="brand" />
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm leading-7 text-slate-300">No team leader assigned</p>
              )}
            </div>
          </div>

          {team.leader ? (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              onClick={() => {
                void handleRemoveLeader();
              }}
              type="button"
            >
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
              Remove Leader
            </button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <article className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Membership</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Add users to team</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            Select an existing user account and assign it to this team.
          </p>

          <div className="mt-6 space-y-4">
            <select
              className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
              disabled={submitting || availableUsers.length === 0}
              onChange={(event) => setSelectedUserId(event.target.value)}
              value={selectedUserId}
            >
              {availableUsers.length === 0 ? (
                <option value="">No available users</option>
              ) : null}
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} (@{user.username})
                </option>
              ))}
            </select>

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!selectedUserId || submitting || availableUsers.length === 0}
              onClick={() => {
                void handleAddMember();
              }}
              type="button"
            >
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Add member
            </button>
          </div>
        </article>

        <article className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Current members</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Team members</h2>

          {sortedMembers.length === 0 ? (
            <EmptyState
              description="This team does not have any members yet. Add users from the panel on the left."
              title="No team members yet"
            />
          ) : (
            <div className="mt-6 space-y-4">
              {sortedMembers.map((member) => {
                const isLeader = team.leader?.id === member.id;

                return (
                  <div
                    className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-slate-950/75 px-5 py-4 md:flex-row md:items-center md:justify-between"
                    key={member.id}
                  >
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-sm text-slate-400">
                        @{member.username} - {member.email}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge label={formatRole(member.role)} tone="brand" />
                        {isLeader ? <StatusBadge label="Team Leader" tone="warning" /> : null}
                        <StatusBadge
                          label={member.enabled && !member.accountLocked ? 'Active' : member.accountLocked ? 'Locked' : 'Disabled'}
                          tone={member.enabled && !member.accountLocked ? 'success' : member.accountLocked ? 'warning' : 'danger'}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!isLeader ? (
                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-500/30 px-4 py-2 text-sm font-semibold text-brand-100 transition hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={submitting}
                          onClick={() => {
                            void handleAssignLeader(member.id);
                          }}
                          type="button"
                        >
                          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                          Make Leader
                        </button>
                      ) : null}

                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={submitting}
                        onClick={() => {
                          void handleRemoveMember(member.id);
                        }}
                        type="button"
                      >
                        <XCircle className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

      <TeamFormModal
        loading={submitting}
        onClose={() => setEditOpen(false)}
        onSubmit={(payload) => {
          void handleEditSubmit(payload);
        }}
        open={editOpen}
        subtitle="Update the team mission, naming, and ownership details."
        team={team}
        title="Edit team"
      />

      <DeleteTeamDialog
        loading={submitting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          void handleDeleteTeam();
        }}
        open={deleteOpen}
        team={team}
      />
    </div>
  );
}
