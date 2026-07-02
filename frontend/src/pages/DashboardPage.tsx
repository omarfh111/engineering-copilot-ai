import { useSession } from '../context/SessionContext';
import { AdminDashboardPage } from './AdminDashboardPage';
import { RoleDashboardPage } from './RoleDashboardPage';

export function DashboardPage() {
  const { currentUser } = useSession();

  if (!currentUser) {
    return null;
  }

  if (currentUser.role === 'ADMIN') {
    return <AdminDashboardPage />;
  }

  return <RoleDashboardPage />;
}
