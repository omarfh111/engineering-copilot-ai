import { AlertTriangle, Bell, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import { platformMockService } from '../../services/platformMockService';
import type { PagedResponse } from '../../types/user';

type NotificationType = 'system' | 'approval' | 'security';
interface NotificationItem { id: string; title: string; description: string; timestamp: string; type: NotificationType; }
interface RecordSummary { id?: number; analysisId?: number; reviewId?: number; todoId?: number; title?: string; summary?: string; recommendation?: string; createdAt?: string; updatedAt?: string; severity?: string; }

const READ_STORAGE_KEY = 'copilote_read_notifications_v1';
const typeIcon = { system: CheckCircle2, approval: Bell, security: ShieldAlert };

function asItems(page: PagedResponse<RecordSummary> | null, type: NotificationType, label: string) {
  return (page?.content ?? []).map((record) => ({
    id: `${label}-${record.id ?? record.analysisId ?? record.reviewId ?? record.todoId}`,
    title: record.title ?? label,
    description: record.summary ?? record.recommendation ?? `${label} requires attention.`,
    timestamp: record.updatedAt ?? record.createdAt ?? new Date().toISOString(),
    type,
  }));
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(READ_STORAGE_KEY) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...readIds]));
  }, [readIds]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const params = { page: 0, size: 10, sortBy: 'updatedAt', sortDirection: 'desc' as const };
      const [failed, partial, reviews, todos] = await Promise.all([
        apiClient.get<PagedResponse<RecordSummary>>('/api/analyses', { params: { ...params, status: 'FAILED' } }).catch(() => null),
        apiClient.get<PagedResponse<RecordSummary>>('/api/analyses', { params: { ...params, status: 'PARTIAL' } }).catch(() => null),
        apiClient.get<PagedResponse<RecordSummary>>('/api/reviews', { params: { ...params, status: 'PENDING' } }).catch(() => null),
        apiClient.get<PagedResponse<RecordSummary>>('/api/todos', { params: { ...params, status: 'OPEN' } }).catch(() => null),
      ]);
      if (!active) return;
      const apiNotifications = [
        ...asItems(failed?.data ?? null, 'security', 'Failed analysis'),
        ...asItems(partial?.data ?? null, 'system', 'Partial analysis'),
        ...asItems(reviews?.data ?? null, 'approval', 'Pending review'),
        ...asItems(todos?.data ?? null, 'approval', 'Open TODO'),
      ].sort((left, right) => right.timestamp.localeCompare(left.timestamp)).slice(0, 20);

      if (apiNotifications.length > 0) {
        setNotifications(apiNotifications);
        return;
      }

      const fallbackNotifications = await platformMockService.getNotifications();
      if (active) {
        setNotifications(fallbackNotifications.map(({ unread: _unread, ...notification }) => notification));
      }
    };
    void load();
    const refresh = window.setInterval(() => void load(), 30_000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);

  const unreadCount = useMemo(() => notifications.filter((notification) => !readIds.has(notification.id)).length, [notifications, readIds]);
  const markAllRead = () => setReadIds(new Set(notifications.map((notification) => notification.id)));

  return <div className="relative z-50"><button aria-label="Open notifications" className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200" onClick={() => setOpen((current) => !current)} type="button"><Bell className="h-4 w-4" />{unreadCount ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span> : null}</button>{open ? <div className="absolute right-0 top-full z-[9999] mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-300">Notifications</p><h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Workspace alerts</h3></div><div className="flex items-center gap-1"><button className="rounded-xl px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-200" onClick={markAllRead} type="button">Mark read</button><button aria-label="Close notifications" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white" onClick={() => setOpen(false)} type="button"><X className="h-4 w-4" /></button></div></div><div className="max-h-[400px] overflow-y-auto p-4">{notifications.length ? notifications.map((notification) => { const Icon = typeIcon[notification.type] ?? AlertTriangle; const unread = !readIds.has(notification.id); return <article className="cursor-pointer rounded-2xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-700" key={notification.id} onClick={() => setReadIds((current) => new Set([...current, notification.id]))}><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200"><Icon className="h-4 w-4" /></div><div className="min-w-0"><div className="flex items-center gap-2"><p className="break-words text-sm font-semibold text-slate-950 dark:text-white">{notification.title}</p>{unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" /> : null}</div><p className="mt-1 break-words text-sm leading-6 text-slate-500 dark:text-slate-400">{notification.description}</p><p className="mt-2 text-xs text-slate-400">{formatDate(notification.timestamp)}</p></div></div></article>; }) : <p className="px-3 py-8 text-center text-sm text-slate-500">No current workspace alerts.</p>}</div></div> : null}</div>;
}
