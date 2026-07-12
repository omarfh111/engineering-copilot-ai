import type { Role } from './user';

export interface DashboardOverview {
  stats: DashboardStats;
  recentProjects: DashboardProject[];
  recentAnalyses: DashboardAnalysis[];
  aiRecommendations: DashboardRecommendation[];
}

export interface RoleDashboardMetric {
  id: string;
  label: string;
  value: number;
  hint: string;
  iconKey: string;
}

export interface RoleDashboardHighlight {
  id: string;
  label: string;
  value: string;
  description: string;
}

export interface RoleDashboardOverview {
  role: Role;
  heading: string;
  description: string;
  metrics: RoleDashboardMetric[];
  highlights: RoleDashboardHighlight[];
  recentProjects: DashboardProject[];
  recentAnalyses: DashboardAnalysis[];
  aiRecommendations: DashboardRecommendation[];
}

export interface DashboardStats {
  projects: number;
  repositories: number;
  documents: number;
  analyses: number;
  openTodos: number;
}

export interface DashboardProject {
  id: number | string;
  title: string;
  status: string;
  repositoryCount: number;
  lastUpdated: string;
  teamName?: string;
}

export interface DashboardAnalysis {
  id: number | string;
  projectTitle: string;
  type: string;
  status: string;
  createdAt: string;
  score?: number;
}

export interface DashboardRecommendation {
  id: number | string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}
