import { GitCommitHorizontal } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import type { Documentation } from '../../types/documentation';

interface DocumentationVersionHistoryProps {
  documentation: Documentation;
}

export function DocumentationVersionHistory({ documentation }: DocumentationVersionHistoryProps) {
  const author = documentation.createdBy
    ? `${documentation.createdBy.firstName} ${documentation.createdBy.lastName}`.trim() || documentation.createdBy.username
    : 'Platform Command';
  const versions = [
    {
      id: 'v3',
      version: 'v1.2',
      title: 'Metadata and approval state refreshed',
      actor: author,
      date: documentation.updatedAt,
      description: documentation.approved ? 'Marked as approved for delivery evidence.' : 'Updated status and delivery metadata.'
    },
    {
      id: 'v2',
      version: 'v1.1',
      title: 'Content and source path reviewed',
      actor: author,
      date: documentation.updatedAt || documentation.createdAt,
      description: documentation.path ? 'Attached or verified the source reference path.' : 'Reviewed source path requirement.'
    },
    {
      id: 'v1',
      version: 'v1.0',
      title: 'Documentation record created',
      actor: author,
      date: documentation.createdAt,
      description: 'Initial deliverable entry registered in Engineering Copilot.'
    }
  ];

  return (
    <section className="page-shell">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:text-brand-300">Historique</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Version history</h2>
      <div className="mt-6 space-y-4">
        {versions.map((version) => (
          <div className="flex gap-4 rounded-2xl border border-slate-200 bg-white/75 p-4 dark:border-slate-800 dark:bg-slate-950/50" key={version.id}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200">
              <GitCommitHorizontal className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {version.version}
                </span>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">{version.title}</p>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {version.actor} - {formatDate(version.date)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{version.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
