import { LogOut, MoonStar, Search, ShieldCheck, SunMedium } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatRole, getInitials } from '../../lib/formatters';
import { useSession } from '../../context/SessionContext';
import { useTheme } from '../../context/ThemeContext';
import { resolvePageTitle } from '../../lib/workspace';
import type { User } from '../../types/user';
import { NotificationCenter } from './NotificationCenter';

interface NavbarProps {
  currentUser: User;
}

export function Navbar({ currentUser }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearSession } = useSession();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="glass-panel relative z-50 flex flex-col gap-4 rounded-[28px] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">
          Enterprise Dashboard
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{resolvePageTitle(location.pathname)}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 lg:w-[320px] lg:flex-none">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/10"
            placeholder="Search users, teams, repositories, analyses..."
            type="search"
          />
        </div>

        <NotificationCenter />

        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
          onClick={toggleTheme}
          type="button"
        >
          {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-700 text-sm font-bold text-white">
            {getInitials(currentUser)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {currentUser.firstName} {currentUser.lastName}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{formatRole(currentUser.role)}</p>
              {currentUser.role === 'ADMIN' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700 dark:bg-brand-950/60 dark:text-brand-200">
                  <ShieldCheck className="h-3 w-3" />
                  Admin
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-rose-300 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-rose-500 dark:hover:text-rose-300"
          onClick={() => {
            clearSession();
            navigate('/login', { replace: true });
          }}
          type="button"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  );
}