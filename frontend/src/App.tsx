import { Navigate, Route, Routes } from 'react-router-dom';
import { RoleGuard } from './components/routing/RoleGuard';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { useSession } from './context/SessionContext';
import { workspaceModules } from './lib/workspace';
import type { WorkspaceModuleId } from './lib/workspace';
import { DashboardPage } from './pages/DashboardPage';
import { EditProfilePage } from './pages/EditProfilePage';
import { LoginPage } from './pages/LoginPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { AdminTeamsPage } from './pages/AdminTeamsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { TeamDetailsPage } from './pages/TeamDetailsPage';
import { UserDetailsPage } from './pages/UserDetailsPage';
import { WorkspaceSectionPage } from './pages/WorkspaceSectionPage';

const sectionModuleIds: WorkspaceModuleId[] = [
  'projects',
  'repositories',
  'documents',
  'analyses',
  'reviews',
  'todos',
  'settings',
  'audit',
  'system-health',
  'reports',
  'sprint',
  'architecture',
  'dependencies',
  'documentation',
  'impact',
  'quality',
  'security',
  'assistant',
  'my-todos'
];

function SettingsLanding() {
  const { currentUser, loading } = useSession();

  if (loading) {
    return null;
  }

  if (!currentUser) {
    return <Navigate replace to="/login" />;
  }

  return <Navigate replace to={currentUser.role === 'ADMIN' ? '/dashboard/settings' : '/settings/profile'} />;
}

function App() {
  return (
    <Routes>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/dashboard/teams"
          element={
            <RoleGuard
              allowedRoles={['ADMIN']}
              description="Only Engineering Copilot administrators can manage engineering teams."
            >
              <AdminTeamsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/teams/:id"
          element={
            <RoleGuard
              allowedRoles={['ADMIN']}
              description="Only Engineering Copilot administrators can manage engineering teams."
            >
              <TeamDetailsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/users"
          element={
            <RoleGuard
              allowedRoles={['ADMIN']}
              description="Only Engineering Copilot administrators can manage the enterprise user directory."
            >
              <AdminUsersPage />
            </RoleGuard>
          }
        />
        <Route path="/dashboard/users/:id" element={<UserDetailsPage />} />
        {sectionModuleIds.map((moduleId) => {
          const module = workspaceModules[moduleId];

          return (
            <Route
              element={
                <RoleGuard
                  allowedRoles={module.allowedRoles}
                  description={`Your role is not allowed to open the ${module.label.toLowerCase()} workspace.`}
                >
                  <WorkspaceSectionPage moduleId={moduleId} />
                </RoleGuard>
              }
              key={module.id}
              path={module.path}
            />
          );
        })}
        <Route path="/users" element={<Navigate replace to="/dashboard/users" />} />
        <Route path="/users/:id" element={<Navigate replace to="/dashboard/users" />} />
        <Route path="/projects" element={<Navigate replace to="/dashboard/projects" />} />
        <Route path="/repositories" element={<Navigate replace to="/dashboard/repositories" />} />
        <Route path="/documents" element={<Navigate replace to="/dashboard/documents" />} />
        <Route path="/documentation" element={<Navigate replace to="/dashboard/documentation" />} />
        <Route path="/analysis" element={<Navigate replace to="/dashboard/analyses" />} />
        <Route path="/dashboard/analysis" element={<Navigate replace to="/dashboard/analyses" />} />
        <Route path="/todos" element={<Navigate replace to="/dashboard/todos" />} />
        <Route path="/reviews" element={<Navigate replace to="/dashboard/reviews" />} />
        <Route path="/assistant" element={<Navigate replace to="/dashboard/assistant" />} />
        <Route path="/teams" element={<Navigate replace to="/dashboard/teams" />} />
        <Route path="/reports" element={<Navigate replace to="/dashboard/reports" />} />
        <Route path="/sprint" element={<Navigate replace to="/dashboard/sprint" />} />
        <Route path="/architecture" element={<Navigate replace to="/dashboard/architecture" />} />
        <Route path="/dependencies" element={<Navigate replace to="/dashboard/dependencies" />} />
        <Route path="/impact" element={<Navigate replace to="/dashboard/impact" />} />
        <Route path="/quality" element={<Navigate replace to="/dashboard/quality" />} />
        <Route path="/security" element={<Navigate replace to="/dashboard/security" />} />
        <Route path="/settings" element={<SettingsLanding />} />
        <Route path="/settings/profile" element={<MyProfilePage />} />
        <Route path="/settings/profile/edit" element={<EditProfilePage />} />
        <Route path="/profile" element={<Navigate to="/settings/profile" replace />} />
        <Route path="/profile/edit" element={<Navigate to="/settings/profile/edit" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
