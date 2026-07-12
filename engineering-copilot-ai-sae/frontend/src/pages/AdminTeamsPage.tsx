import { useEffect, useState } from 'react';
import { SlidersHorizontal, ShieldPlus, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { DeleteTeamDialog } from '../components/team/DeleteTeamDialog';
import { TeamCard } from '../components/team/TeamCard';
import { TeamFormModal } from '../components/team/TeamFormModal';
import { TeamTable } from '../components/team/TeamTable';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { getApiErrorMessage } from '../lib/api';
import { adminTeamService } from '../services/adminTeamService';
import type { CreateTeamPayload, Team, TeamQueryParams, UpdateTeamPayload } from '../types/team';

const defaultFilters: TeamQueryParams = {
  search: '',
  page: 0,
  size: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc'
};

export function AdminTeamsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<TeamQueryParams>(defaultFilters);
  const [teamPage, setTeamPage] = useState<Awaited<ReturnType<typeof adminTeamService.getTeams>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(filters.search ?? '');

  const loadTeams = async () => {
    setLoading(true);

    try {
      const response = await adminTeamService.getTeams({
        ...filters,
        search: debouncedSearch
      });
      setTeamPage(response);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, [debouncedSearch, filters.page, filters.size, filters.sortBy, filters.sortDirection]);

  const handleSort = (field: string) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      sortBy: field,
      sortDirection:
        currentFilters.sortBy === field && currentFilters.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreateSubmit = async (payload: CreateTeamPayload) => {
    setSubmitting(true);

    try {
      await adminTeamService.createTeam(payload);
      showToast({
        type: 'success',
        title: 'Team created',
        description: `${payload.teamName} was created successfully.`
      });
      setCreateOpen(false);
      await loadTeams();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create team',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (payload: UpdateTeamPayload) => {
    if (!selectedTeam) {
      return;
    }

    setSubmitting(true);

    try {
      await adminTeamService.updateTeam(selectedTeam.id, payload);
      showToast({
        type: 'success',
        title: 'Team updated',
        description: `${payload.teamName} was updated successfully.`
      });
      setEditOpen(false);
      await loadTeams();
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

  const handleDeleteConfirm = async () => {
    if (!selectedTeam) {
      return;
    }

    setSubmitting(true);

    try {
      await adminTeamService.deleteTeam(selectedTeam.id);
      showToast({
        type: 'success',
        title: 'Team deleted',
        description: `${selectedTeam.teamName} has been removed.`
      });
      setDeleteOpen(false);
      setSelectedTeam(null);
      await loadTeams();
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

  const totalMembers = teamPage?.content.reduce((count, team) => count + team.memberCount, 0) ?? 0;
  const linkedProjects = teamPage?.content.reduce((count, team) => count + team.projectCount, 0) ?? 0;
  const emptyTeams = teamPage?.content.filter((team) => team.memberCount === 0).length ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Visible teams</p>
          <p className="mt-4 text-4xl font-semibold text-white">{teamPage?.totalElements ?? 0}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Members in view</p>
          <p className="mt-4 text-4xl font-semibold text-white">{totalMembers}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Linked projects</p>
          <p className="mt-4 text-4xl font-semibold text-white">{linkedProjects}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Unstaffed teams</p>
          <p className="mt-4 text-4xl font-semibold text-white">{emptyTeams}</p>
        </div>
      </section>

      <section className="page-shell space-y-5 border-white/10 bg-slate-950/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Team directory</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Manage engineering teams</h3>
            <p className="mt-2 text-sm text-slate-400">
              Create teams, describe their mission, and control membership before projects are assigned.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
              <UsersRound className="h-4 w-4" />
              {teamPage?.totalElements ?? 0} teams matched
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400"
              onClick={() => setCreateOpen(true)}
              type="button"
            >
              <ShieldPlus className="h-4 w-4" />
              Create Team
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_180px_170px]">
          <SearchBar
            onChange={(value) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                search: value,
                page: 0
              }))
            }
            placeholder="Search by team name, description, or member"
            value={filters.search ?? ''}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <SlidersHorizontal className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  size: Number(event.target.value),
                  page: 0
                }))
              }
              value={filters.size}
            >
              {[10, 20, 50].map((sizeOption) => (
                <option className="bg-slate-950 text-white" key={sizeOption} value={sizeOption}>
                  {sizeOption} per page
                </option>
              ))}
            </select>
          </label>

          <button
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-400/30 hover:text-brand-200"
            onClick={() => setFilters(defaultFilters)}
            type="button"
          >
            Reset filters
          </button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-24 w-full" />
          <LoadingSkeleton className="h-72 w-full" />
        </div>
      ) : error ? (
        <ErrorState
          actionLabel="Reload teams"
          description={error}
          onAction={() => {
            void loadTeams();
          }}
          title="Unable to load teams"
        />
      ) : !teamPage || teamPage.content.length === 0 ? (
        <EmptyState
          description="Try adjusting your search filters or create the first engineering team."
          title="No teams found"
        />
      ) : (
        <>
          <div className="hidden xl:block">
            <TeamTable
              onDelete={(team) => {
                setSelectedTeam(team);
                setDeleteOpen(true);
              }}
              onEdit={(team) => {
                setSelectedTeam(team);
                setEditOpen(true);
              }}
              onSort={handleSort}
              onView={(team) => navigate(`/dashboard/teams/${team.id}`)}
              sortBy={filters.sortBy ?? 'createdAt'}
              sortDirection={filters.sortDirection ?? 'desc'}
              teams={teamPage.content}
            />
          </div>

          <div className="grid gap-4 xl:hidden">
            {teamPage.content.map((team) => (
              <TeamCard
                key={team.id}
                onDelete={() => {
                  setSelectedTeam(team);
                  setDeleteOpen(true);
                }}
                onEdit={() => {
                  setSelectedTeam(team);
                  setEditOpen(true);
                }}
                onView={() => navigate(`/dashboard/teams/${team.id}`)}
                team={team}
              />
            ))}
          </div>

          <Pagination
            currentPage={teamPage.page}
            onPageChange={(page) => setFilters((currentFilters) => ({ ...currentFilters, page }))}
            totalPages={teamPage.totalPages}
          />
        </>
      )}

      <TeamFormModal
        loading={submitting}
        onClose={() => setCreateOpen(false)}
        onSubmit={(payload) => {
          void handleCreateSubmit(payload);
        }}
        open={createOpen}
        subtitle="Create a team before assigning projects and repositories."
        title="Create team"
      />

      <TeamFormModal
        loading={submitting}
        onClose={() => {
          setEditOpen(false);
          setSelectedTeam(null);
        }}
        onSubmit={(payload) => {
          void handleEditSubmit(payload);
        }}
        open={editOpen}
        subtitle="Update the team mission, naming, and ownership details."
        team={selectedTeam}
        title="Edit team"
      />

      <DeleteTeamDialog
        loading={submitting}
        onCancel={() => {
          setDeleteOpen(false);
          setSelectedTeam(null);
        }}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
        open={deleteOpen}
        team={selectedTeam}
      />
    </div>
  );
}
