import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatRole } from '../../lib/formatters';
import type { User } from '../../types/user';
import { StatusBadge } from '../common/StatusBadge';

interface UserTableProps {
  users: User[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

function renderSortIcon(active: boolean, direction: 'asc' | 'desc') {
  if (!active) {
    return <ArrowUpDown className="h-4 w-4" />;
  }

  return direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
}

function resolveStatus(user: User) {
  if (!user.enabled) {
    return { label: 'Disabled', tone: 'danger' as const };
  }

  if (user.accountLocked) {
    return { label: 'Locked', tone: 'warning' as const };
  }

  return { label: 'Active', tone: 'success' as const };
}

export function UserTable({ users, sortBy, sortDirection, onSort, onView, onEdit, onDelete }: UserTableProps) {
  const headerButtonClassName =
    'inline-flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300';

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-panel dark:border-slate-800 dark:bg-slate-950/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50/80 dark:bg-slate-900/70">
            <tr>
              <th className="px-6 py-4">
                <button className={headerButtonClassName} onClick={() => onSort('firstName')} type="button">
                  Name
                  {renderSortIcon(sortBy === 'firstName', sortDirection)}
                </button>
              </th>
              <th className="px-6 py-4">
                <button className={headerButtonClassName} onClick={() => onSort('email')} type="button">
                  Email
                  {renderSortIcon(sortBy === 'email', sortDirection)}
                </button>
              </th>
              <th className="px-6 py-4">
                <button className={headerButtonClassName} onClick={() => onSort('role')} type="button">
                  Role
                  {renderSortIcon(sortBy === 'role', sortDirection)}
                </button>
              </th>
              <th className="px-6 py-4">
                <button className={headerButtonClassName} onClick={() => onSort('enabled')} type="button">
                  Status
                  {renderSortIcon(sortBy === 'enabled', sortDirection)}
                </button>
              </th>
              <th className="px-6 py-4">
                <button className={headerButtonClassName} onClick={() => onSort('createdAt')} type="button">
                  Joined
                  {renderSortIcon(sortBy === 'createdAt', sortDirection)}
                </button>
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {users.map((user) => {
              const accountStatus = resolveStatus(user);

              return (
                <tr className="transition hover:bg-brand-50/40 dark:hover:bg-brand-950/10" key={user.id}>
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">{user.email}</td>
                  <td className="px-6 py-5">
                    <StatusBadge label={formatRole(user.role)} tone="brand" />
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge label={accountStatus.label} tone={accountStatus.tone} />
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-brand-300"
                        onClick={() => onView(user)}
                        type="button"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-brand-300"
                        onClick={() => onEdit(user)}
                        type="button"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-xl p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                        onClick={() => onDelete(user)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
