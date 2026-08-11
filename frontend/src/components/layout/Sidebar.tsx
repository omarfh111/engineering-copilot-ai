import {
  BellDot,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { User } from '../../types/user';
import { formatRole } from '../../lib/formatters';
import { getModuleTranslationKey, getNavigationModules, roleDefinitions } from '../../lib/workspace';
import { EngineeringCopilotMark } from '../brand/EngineeringCopilotMark';
import { useI18n } from '../../context/I18nContext';

interface SidebarProps {
  currentUser: User;
  mobileOpen: boolean;
  onClose: () => void;
  onToggleMobile: () => void;
}

const baseLinkClassName =
  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition duration-200';

export function Sidebar({ currentUser, mobileOpen, onClose, onToggleMobile }: SidebarProps) {
  const navigationItems = getNavigationModules(currentUser.role);
  const roleDefinition = roleDefinitions[currentUser.role];
  const { t } = useI18n();

  return (
    <>
      <button
        className="fixed left-4 top-4 z-40 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-panel lg:hidden dark:border-slate-800 dark:bg-slate-950/80"
        onClick={onToggleMobile}
        type="button"
      >
        {mobileOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
      </button>

      <div
        className={`fixed inset-0 z-30 bg-slate-950/45 transition lg:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-white/60 bg-white/88 px-5 py-6 shadow-panel backdrop-blur-xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950/88 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header & User Card - Fixed height container */}
        <div className="flex-shrink-0">
          <div className="mb-8 flex items-center gap-3">
            <EngineeringCopilotMark className="h-12 w-12 rounded-2xl" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">
                Engineering Copilot
              </p>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{roleDefinition.workspaceName}</h1>
            </div>
          </div>

          <div className="mb-6 rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-700 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-brand-100">{t('sidebar.activeWorkspace')}</p>
            {currentUser.avatarUrl ? (
              <img className="mt-4 h-14 w-14 rounded-2xl object-cover ring-2 ring-white/25" src={currentUser.avatarUrl} alt="" />
            ) : null}
            <p className="mt-3 text-lg font-semibold">
              {currentUser.firstName} {currentUser.lastName}
            </p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              {formatRole(currentUser.role)}
            </div>
          </div>
        </div>

        {/* Navigation - Takes up remaining height and handles scrolling */}
        <nav className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                className={({ isActive }) =>
                  `${baseLinkClassName} ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'
                  }`
                }
                key={item.path}
                onClick={onClose}
                to={item.path}
              >
                <Icon className="h-4 w-4" />
                {t(getModuleTranslationKey(item.id))}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Panel - Pinned to footer */}
        <div className="mt-6 flex-shrink-0 rounded-3xl border border-dashed border-brand-200 bg-brand-50/80 p-4 text-sm text-brand-700 dark:border-brand-900/50 dark:bg-brand-950/30 dark:text-brand-200">
          <div className="flex items-center gap-2">
            <BellDot className="h-4 w-4" />
            <p className="font-semibold">{t('sidebar.workspaceReady')}</p>
          </div>
          <p className="mt-2 text-xs leading-6 opacity-80">
            {roleDefinition.accessSummary}
          </p>
        </div>
      </aside>
    </>
  );
}
