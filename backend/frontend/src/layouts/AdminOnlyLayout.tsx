import { Navigate, Outlet } from 'react-router-dom';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useSession } from '../context/SessionContext';

export function AdminOnlyLayout() {
  const { currentUser, loading } = useSession();

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <LoadingSpinner label="Checking administrator access..." />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate replace to="/login" />;
  }

  if (currentUser.role !== 'ADMIN') {
    return (
      <ErrorState
        description="Only Engineering Copilot administrators can open this section."
        title="403 Access Denied"
      />
    );
  }

  return <Outlet />;
}
