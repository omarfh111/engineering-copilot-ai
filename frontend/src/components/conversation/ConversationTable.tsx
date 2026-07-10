import { Bot, Eye, PencilLine, Trash2 } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import type { Conversation } from '../../types/conversation';

interface ConversationTableProps {
  conversations: Conversation[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  canManageConversations: boolean;
  showProjectColumn?: boolean;
  onSort: (field: string) => void;
  onView: (conversation: Conversation) => void;
  onEdit: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
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

export function ConversationTable({
  conversations,
  sortBy,
  sortDirection,
  canManageConversations,
  showProjectColumn = true,
  onSort,
  onView,
  onEdit,
  onDelete
}: ConversationTableProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="question" label="Question" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              {showProjectColumn ? (
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Project</th>
              ) : null}
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">User</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="confidenceScore" label="Confidence" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="responseTime" label="Response Time" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <SortButton field="createdAt" label="Created At" onSort={onSort} sortBy={sortBy} sortDirection={sortDirection} />
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {conversations.map((conversation) => (
              <tr className="transition hover:bg-brand-500/5" key={conversation.id}>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="max-w-[360px] font-semibold text-white">{conversation.question}</p>
                      <p className="max-w-[360px] text-sm text-slate-400">{conversation.response || 'No response captured yet.'}</p>
                    </div>
                  </div>
                </td>
                {showProjectColumn ? <td className="px-6 py-5 text-sm text-slate-300">{conversation.project?.title ?? 'Unlinked project'}</td> : null}
                <td className="px-6 py-5 text-sm text-slate-300">{conversation.user?.username ?? 'Unknown user'}</td>
                <td className="px-6 py-5 text-sm text-slate-300">
                  {conversation.confidenceScore === null ? 'No score' : `${Math.round(conversation.confidenceScore * 100)}%`}
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">
                  {conversation.responseTime === null ? 'Not tracked' : `${conversation.responseTime} ms`}
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{formatDate(conversation.createdAt)}</td>
                <td className="px-6 py-5">
                  <div className="flex justify-end gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                      onClick={() => onView(conversation)}
                      type="button"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    {canManageConversations ? (
                      <>
                        <button
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                          onClick={() => onEdit(conversation)}
                          type="button"
                        >
                          <PencilLine className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/10"
                          onClick={() => onDelete(conversation)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </>
                    ) : null}
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
