import type { Role, User } from './user';

export type AdminUserStatusFilter = '' | 'ACTIVE' | 'DISABLED' | 'LOCKED';
export type TrendDirection = 'up' | 'down' | 'neutral';

export interface AdminTrend {
  direction: TrendDirection;
  value: string;
  label: string;
}

export interface AdminMetric {
  total: number;
  trend: AdminTrend;
}

export interface AdminDashboardStats {
  totalUsers: AdminMetric;
  activeTeams: AdminMetric;
  projects: AdminMetric;
  repositories: AdminMetric;
  documents: AdminMetric;
  analyses: AdminMetric;
  pendingReviews: AdminMetric;
  openTodos: AdminMetric;
}

export interface AdminRecentProject {
  id: number | string;
  name: string;
  team: string;
  status: string;
  repositoryCount: number;
  documents: number;
  openIssues: number;
  updatedAt: string;
}

export interface AdminRecentAnalysis {
  id: number | string;
  repository: string;
  analysisType: string;
  status: string;
  severity: string;
  createdAt: string;
}

export interface AdminActivityItem {
  id: string;
  category: 'user' | 'project' | 'repository' | 'document' | 'analysis' | 'todo';
  title: string;
  description: string;
  occurredAt: string;
}

export interface AdminDashboardOverview {
  stats: AdminDashboardStats;
  recentUsers: User[];
  recentProjects: AdminRecentProject[];
  recentAnalyses: AdminRecentAnalysis[];
  activityTimeline: AdminActivityItem[];
}

export interface AdminUserListFilters {
  search: string;
  role: Role | '';
  status: AdminUserStatusFilter;
  page: number;
  size: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export interface CreateAdminUserPayload {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  teamId?: number | string;
  enabled?: boolean;
}

export interface TeamOption {
  id: number | string;
  name: string;
}
