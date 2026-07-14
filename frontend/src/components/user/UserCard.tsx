import { CalendarClock, Mail, Shield } from 'lucide-react';
import { formatDate, formatRole, getInitials } from '../../lib/formatters';
import type { User } from '../../types/user';
import { StatusBadge } from '../common/StatusBadge';

interface UserCardProps {
  user: User;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  hideActions?: boolean;
}

function statusTone(user: User) {
  if (!user.enabled) {
    return { label: 'Disabled', tone: 'danger' as const };
  }

  if (user.accountLocked) {
    return { label: 'Locked', tone: 'warning' as const };
  }

  return { label: 'Active', tone: 'success' as const };
}

export function UserCard({ user, onView, onEdit, onDelete, hideActions = false }: UserCardProps) {
  const accountStatus = statusTone(user);

  return (
    <article className="glass-panel animate-slideUp rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-indigo-700 text-lg font-bold text-white shadow-lg shadow-brand-600/25">
            {getInitials(user)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={formatRole(user.role)} tone="brand" />
          <StatusBadge label={accountStatus.label} tone={accountStatus.tone} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-brand-500" />
          <span>{user.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="h-4 w-4 text-brand-500" />
          <span>{formatRole(user.role)} permissions</span>
        </div>
        <div className="flex items-center gap-3">
          <CalendarClock className="h-4 w-4 text-brand-500" />
          <span>Joined {formatDate(user.createdAt)}</span>
        </div>
      </div>

      {!hideActions ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {onView ? (
            <button
              className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
              onClick={onView}
              type="button"
            >
              View profile
            </button>
          ) : null}
          {onEdit ? (
            <button
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
              onClick={onEdit}
              type="button"
            >
              Edit user
            </button>
          ) : null}
          {onDelete ? (
            <button
              className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
              onClick={onDelete}
              type="button"
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
