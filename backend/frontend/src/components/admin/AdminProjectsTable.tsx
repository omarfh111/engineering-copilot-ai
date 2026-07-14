import { FolderKanban } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import type { AdminRecentProject } from '../../types/admin';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';

interface AdminProjectsTableProps {
  projects: AdminRecentProject[];
}

export function AdminProjectsTable({ projects }: AdminProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        description="Project telemetry will show up here once your project services start returning recent activity."
        title="No recent projects"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/55 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.95)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/[0.03]">
            <tr>
              {['Project Name', 'Team', 'Status', 'Repository Count', 'Documents', 'Open Issues', 'Updated'].map((header) => (
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {projects.map((project) => (
              <tr className="transition hover:bg-brand-500/5" key={project.id}>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-200">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <p className="font-semibold text-white">{project.name}</p>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{project.team}</td>
                <td className="px-6 py-5">
                  <StatusBadge label={project.status} tone="brand" />
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{project.repositoryCount}</td>
                <td className="px-6 py-5 text-sm text-slate-300">{project.documents}</td>
                <td className="px-6 py-5 text-sm text-slate-300">{project.openIssues}</td>
                <td className="px-6 py-5 text-sm text-slate-300">{formatDate(project.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
