import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ErrorState } from '../common/ErrorState';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useSession } from '../../context/SessionContext';
import type { Role } from '../../types/user';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: ReactNode;
  description: string;
}

export function RoleGuard({ allowedRoles, children, description }: RoleGuardProps) {
  const { currentUser, loading } = useSession();

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <LoadingSpinner label="Checking workspace access..." />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate replace to="/login" />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <ErrorState description={description} title="403 Access Denied" />;
  }

  return <>{children}</>;
}
