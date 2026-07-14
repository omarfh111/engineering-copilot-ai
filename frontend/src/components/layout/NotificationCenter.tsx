import { AlertTriangle, Bell, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDate } from '../../lib/formatters';
import { platformMockService, type NotificationItem } from '../../services/platformMockService';

const typeIcon = {
  system: CheckCircle2,
  approval: Bell,
  security: ShieldAlert
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    void platformMockService.getNotifications().then(setNotifications);
  }, []);

  const unreadCount = notifications.filter((notification) => notification.unread).length;

  return (
    <div className="relative z-50">
      <button
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Bell className="h-4 w-4" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[9999] mt-2 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-300">Notifications</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Command updates</h3>
            </div>
            <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white" onClick={() => setOpen(false)} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-4">
            {notifications.map((notification) => {
              const Icon = typeIcon[notification.type] ?? AlertTriangle;

              return (
                <article className="rounded-2xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-700" key={notification.id}>
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">{notification.title}</p>
                        {notification.unread ? <span className="h-2 w-2 rounded-full bg-rose-500" /> : null}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{notification.description}</p>
                      <p className="mt-2 text-xs text-slate-400">{formatDate(notification.timestamp)}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}