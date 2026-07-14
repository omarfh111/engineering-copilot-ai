import { Eye, Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatRole, getInitials } from '../../lib/formatters';
import type { User } from '../../types/user';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';

interface RecentUsersTableProps {
  users: User[];
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
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

export function RecentUsersTable({ users, onView, onEdit, onDelete }: RecentUsersTableProps) {
  if (users.length === 0) {
    return (
      <EmptyState
        description="Newly provisioned users will appear here when administrator activity starts flowing in."
        title="No recent users"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/55 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.95)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/[0.03]">
            <tr>
              {['Avatar', 'Name', 'Email', 'Role', 'Status', 'Created At', 'Actions'].map((header) => (
                <th
                  className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 ${header === 'Actions' ? 'text-right' : ''}`}
                  key={header}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {users.map((user) => {
              const status = resolveStatus(user);

              return (
                <tr className="transition hover:bg-brand-500/5" key={user.id}>
                  <td className="px-6 py-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-sm font-bold text-white">
                      {getInitials(user)}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-semibold text-white">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">@{user.username}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-300">{user.email}</td>
                  <td className="px-6 py-5">
                    <StatusBadge label={formatRole(user.role)} tone="brand" />
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge label={status.label} tone={status.tone} />
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-300">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      <button
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/30 hover:text-brand-200"
                        onClick={() => onView(user)}
                        type="button"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/30 hover:text-brand-200"
                        onClick={() => onEdit(user)}
                        type="button"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-500/10"
                        onClick={() => onDelete(user)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
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
