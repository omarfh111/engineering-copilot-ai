import { BookText, BrainCircuit, FolderKanban, GitBranch, ListTodo, UserPlus } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import type { AdminActivityItem } from '../../types/admin';
import { EmptyState } from '../common/EmptyState';

interface SystemActivityTimelineProps {
  items: AdminActivityItem[];
}

function timelinePresentation(category: AdminActivityItem['category']) {
  if (category === 'user') {
    return {
      icon: UserPlus,
      className: 'bg-emerald-500/12 text-emerald-200'
    };
  }

  if (category === 'project') {
    return {
      icon: FolderKanban,
      className: 'bg-brand-500/12 text-brand-200'
    };
  }

  if (category === 'repository') {
    return {
      icon: GitBranch,
      className: 'bg-sky-500/12 text-sky-200'
    };
  }

  if (category === 'document') {
    return {
      icon: BookText,
      className: 'bg-violet-500/12 text-violet-200'
    };
  }

  if (category === 'todo') {
    return {
      icon: ListTodo,
      className: 'bg-amber-500/12 text-amber-200'
    };
  }

  return {
    icon: BrainCircuit,
    className: 'bg-rose-500/12 text-rose-200'
  };
}

export function SystemActivityTimeline({ items }: SystemActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        description="System events will be listed here as users, repositories, documents, and analysis tasks are created."
        title="No activity events"
      />
    );
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-6 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.95)]">
      <div className="space-y-5">
        {items.map((item, index) => {
          const presentation = timelinePresentation(item.category);
          const Icon = presentation.icon;

          return (
            <div className="relative flex gap-4" key={item.id}>
              {index < items.length - 1 ? <div className="absolute left-5 top-12 h-[calc(100%-2rem)] w-px bg-white/10" /> : null}
              <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${presentation.className}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 pb-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{formatDate(item.occurredAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
