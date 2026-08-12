import { FolderGit2 } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import type { DashboardProject } from '../../types/dashboard';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';

interface RecentProjectsTableProps {
  projects: DashboardProject[];
}

export function RecentProjectsTable({ projects }: RecentProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        description="Recent projects will appear here once your backend overview endpoint starts returning project activity."
        title="No recent projects yet"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50/80 dark:bg-slate-900/70">
            <tr>
              {['Project', 'Team', 'Status', 'Repositories', 'Updated'].map((header) => (
                <th
                  className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
                  key={header}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {projects.map((project) => (
              <tr className="transition hover:bg-brand-50/40 dark:hover:bg-brand-950/10" key={project.id}>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                      <FolderGit2 className="h-4 w-4" />
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">{project.title}</p>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">{project.teamName ?? 'Independent'}</td>
                <td className="px-6 py-5">
                  <StatusBadge label={project.status} tone="brand" />
                </td>
                <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">{project.repositoryCount}</td>
                <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">{formatDate(project.lastUpdated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
