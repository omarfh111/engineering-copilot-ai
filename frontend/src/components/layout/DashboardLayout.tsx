import { Navigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useSession } from '../../context/SessionContext';
import { useI18n } from '../../context/I18nContext';

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentUser, error, loading } = useSession();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass-panel rounded-[32px] px-8 py-6">
          <LoadingSpinner label={t('loading.dashboard')} />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate replace state={error ? { authError: error } : undefined} to="/login" />;
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        currentUser={currentUser}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggleMobile={() => setMobileOpen((currentState) => !currentState)}
      />

      <main className="min-h-screen px-4 pb-6 pt-20 lg:ml-[280px] lg:px-6 lg:pt-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <Navbar currentUser={currentUser} />

          <Outlet />
        </div>
      </main>
    </div>
  );
}
