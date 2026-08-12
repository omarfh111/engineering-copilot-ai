import { FolderGit2, PencilLine, Trash2, UsersRound } from 'lucide-react';
import type { Team } from '../../types/team';
import { formatDate } from '../../lib/formatters';

interface TeamTableProps {
  teams: Team[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  onView: (team: Team) => void;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}

function SortButton({
  field,
  label,
  sortBy,
  sortDirection,
  onSort
}: {
  field: string;
  label: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
}) {
  const active = sortBy === field;

  return (
    <button className="inline-flex items-center gap-2 transition hover:text-white" onClick={() => onSort(field)} type="button">
      {label}
      <span className={`text-[10px] ${active ? 'text-brand-300' : 'text-slate-500'}`}>{active ? sortDirection.toUpperCase() : ''}</span>
    </button>
  );
}

export function TeamTable({ teams, sortBy, sortDirection, onSort, onView, onEdit, onDelete }: TeamTableProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="teamName" label="Team" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Description</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Members</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Projects</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="updatedAt" label="Updated" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {teams.map((team) => (
              <tr className="transition hover:bg-brand-500/5" key={team.id}>
                <td className="px-6 py-5">
                  <button className="flex items-center gap-3 text-left" onClick={() => onView(team)} type="button">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
                      <UsersRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{team.teamName}</p>
                      <p className="text-sm text-slate-400">{team.memberCount} members</p>
                    </div>
                  </button>
                </td>
                <td className="max-w-[320px] px-6 py-5 text-sm text-slate-300">
                  <p className="line-clamp-2">{team.description || 'No description provided yet.'}</p>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{team.memberCount}</td>
                <td className="px-6 py-5 text-sm text-slate-300">{team.projectCount}</td>
                <td className="px-6 py-5 text-sm text-slate-300">{formatDate(team.updatedAt)}</td>
                <td className="px-6 py-5">
                  <div className="flex justify-end gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                      onClick={() => onView(team)}
                      type="button"
                    >
                      <FolderGit2 className="h-4 w-4" />
                      View
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                      onClick={() => onEdit(team)}
                      type="button"
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/10"
                      onClick={() => onDelete(team)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
