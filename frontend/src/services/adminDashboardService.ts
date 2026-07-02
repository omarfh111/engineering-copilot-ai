import { apiClient, dashboardApi } from '../lib/api';
import { adminUserService } from './adminUserService';
import type {
  AdminActivityItem,
  AdminDashboardOverview,
  AdminMetric,
  AdminRecentAnalysis,
  AdminRecentProject
} from '../types/admin';
import type { DashboardAnalysis, DashboardOverview, DashboardProject } from '../types/dashboard';
import type { User } from '../types/user';

type Snapshot = {
  content: Record<string, unknown>[];
  totalElements: number;
};

function normalizeSnapshot(payload: unknown): Snapshot | null {
  if (Array.isArray(payload)) {
    return {
      content: payload as Record<string, unknown>[],
      totalElements: payload.length
    };
  }

  if (payload && typeof payload === 'object') {
    const content = 'content' in payload && Array.isArray(payload.content) ? (payload.content as Record<string, unknown>[]) : [];
    const totalElements =
      'totalElements' in payload && typeof payload.totalElements === 'number' ? payload.totalElements : content.length;

    return {
      content,
      totalElements
    };
  }

  return null;
}

async function safeSnapshot(paths: string[], params: Record<string, unknown>) {
  for (const path of paths) {
    try {
      const response = await apiClient.get(path, { params });
      const snapshot = normalizeSnapshot(response.data);

      if (snapshot) {
        return snapshot;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function numericValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const numeric = Number(value);

      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }

    if (Array.isArray(value)) {
      return value.length;
    }
  }

  return 0;
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return '';
}

function buildMetric(total: number, activeLabel: string, emptyLabel: string): AdminMetric {
  if (total <= 0) {
    return {
      total: 0,
      trend: {
        direction: 'neutral',
        value: 'Idle',
        label: emptyLabel
      }
    };
  }

  return {
    total,
    trend: {
      direction: 'up',
      value: 'Live',
      label: activeLabel
    }
  };
}

function deriveSeverity(status: string, rawSeverity: string) {
  if (rawSeverity) {
    return rawSeverity;
  }

  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes('failed') || normalizedStatus.includes('critical')) {
    return 'High';
  }

  if (normalizedStatus.includes('running') || normalizedStatus.includes('queued')) {
    return 'Medium';
  }

  return 'Low';
}

function mapProjectRecord(project: Record<string, unknown>, index: number): AdminRecentProject {
  return {
    id: (project.id ?? project.projectId ?? `project-${index}`) as number | string,
    name: stringValue(project.name, project.title, project.projectName, project.label) || 'Unnamed project',
    team: stringValue(project.teamName, project.team, project.ownerTeam, project.groupName) || 'Unassigned',
    status: stringValue(project.status, project.projectStatus) || 'Unknown',
    repositoryCount: numericValue(project.repositoryCount, project.repositories, project.repositoryIds),
    documents: numericValue(project.documentCount, project.documents, project.documentIds),
    openIssues: numericValue(project.openIssues, project.issueCount, project.todoCount),
    updatedAt: stringValue(project.updatedAt, project.lastUpdated, project.modifiedAt, project.createdAt)
  };
}

function mapDashboardProject(project: DashboardProject): AdminRecentProject {
  return {
    id: project.id,
    name: project.title,
    team: project.teamName ?? 'Unassigned',
    status: project.status,
    repositoryCount: project.repositoryCount,
    documents: 0,
    openIssues: 0,
    updatedAt: project.lastUpdated
  };
}

function mapAnalysisRecord(analysis: Record<string, unknown>, index: number): AdminRecentAnalysis {
  const status = stringValue(analysis.status, analysis.analysisStatus) || 'Unknown';
  const severity = deriveSeverity(status, stringValue(analysis.severity, analysis.overallSeverity));

  return {
    id: (analysis.id ?? analysis.analysisId ?? `analysis-${index}`) as number | string,
    repository: stringValue(
      analysis.repositoryName,
      analysis.repository,
      analysis.projectTitle,
      analysis.projectName,
      analysis.subject
    ) || 'Repository unavailable',
    analysisType: stringValue(analysis.analysisType, analysis.type) || 'Analysis',
    status,
    severity,
    createdAt: stringValue(analysis.createdAt, analysis.lastUpdated, analysis.completedAt)
  };
}

function mapDashboardAnalysis(analysis: DashboardAnalysis): AdminRecentAnalysis {
  return {
    id: analysis.id,
    repository: analysis.projectTitle,
    analysisType: analysis.type,
    status: analysis.status,
    severity: deriveSeverity(analysis.status, ''),
    createdAt: analysis.createdAt
  };
}

function timelineDateValue(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function buildActivityTimeline(
  recentUsers: User[],
  recentProjects: AdminRecentProject[],
  recentAnalyses: AdminRecentAnalysis[]
) {
  const items: AdminActivityItem[] = [
    ...recentUsers.map((user) => ({
      id: `user-${user.id}`,
      category: 'user' as const,
      title: 'User created',
      description: `${user.firstName} ${user.lastName} joined the engineering workspace.`,
      occurredAt: user.createdAt
    })),
    ...recentProjects.map((project) => ({
      id: `project-${project.id}`,
      category: 'project' as const,
      title: 'Project created',
      description: `${project.name} is being tracked for ${project.team.toLowerCase()}.`,
      occurredAt: project.updatedAt
    })),
    ...recentAnalyses.map((analysis) => ({
      id: `analysis-${analysis.id}`,
      category: 'analysis' as const,
      title: analysis.status.toLowerCase().includes('completed') ? 'Analysis finished' : 'Analysis updated',
      description: `${analysis.analysisType} on ${analysis.repository} is currently ${analysis.status.toLowerCase()}.`,
      occurredAt: analysis.createdAt
    }))
  ];

  return items.sort((left, right) => timelineDateValue(right.occurredAt) - timelineDateValue(left.occurredAt)).slice(0, 8);
}

export const adminDashboardService = {
  async getOverview(): Promise<AdminDashboardOverview> {
    const [workspaceOverview, recentUsersPage, teamSnapshot, projectSnapshot, repositorySnapshot, documentSnapshot, reviewSnapshot, todoSnapshot, analysisSnapshot] =
      await Promise.all([
        dashboardApi.getOverview().catch(() => null as DashboardOverview | null),
        adminUserService
          .getRecentUsers(6)
          .catch(() => ({
            content: [],
            totalElements: 0
          })),
        safeSnapshot(['/api/teams'], { page: 0, size: 1 }),
        safeSnapshot(['/api/projects'], { page: 0, size: 5, sortBy: 'updatedAt', sortDirection: 'desc' }),
        safeSnapshot(['/api/repositories'], { page: 0, size: 1 }),
        safeSnapshot(['/api/documents'], { page: 0, size: 1 }),
        safeSnapshot(['/api/reviews'], { page: 0, size: 1, status: 'PENDING' }),
        safeSnapshot(['/api/todos'], { page: 0, size: 1, status: 'OPEN' }),
        safeSnapshot(['/api/analyses', '/api/analysis'], { page: 0, size: 5, sortBy: 'createdAt', sortDirection: 'desc' })
      ]);

    const recentUsers = recentUsersPage.content;
    const recentProjects = projectSnapshot
      ? projectSnapshot.content.slice(0, 5).map(mapProjectRecord)
      : workspaceOverview?.recentProjects.map(mapDashboardProject) ?? [];
    const recentAnalyses = analysisSnapshot
      ? analysisSnapshot.content.slice(0, 5).map(mapAnalysisRecord)
      : workspaceOverview?.recentAnalyses.map(mapDashboardAnalysis) ?? [];

    const totalUsers = recentUsersPage.totalElements;
    const activeTeams = teamSnapshot?.totalElements ?? 0;
    const projects = projectSnapshot?.totalElements ?? workspaceOverview?.stats.projects ?? 0;
    const repositories = repositorySnapshot?.totalElements ?? workspaceOverview?.stats.repositories ?? 0;
    const documents = documentSnapshot?.totalElements ?? workspaceOverview?.stats.documents ?? 0;
    const analyses = analysisSnapshot?.totalElements ?? workspaceOverview?.stats.analyses ?? 0;
    const pendingReviews = reviewSnapshot?.totalElements ?? 0;
    const openTodos = todoSnapshot?.totalElements ?? workspaceOverview?.stats.openTodos ?? 0;

    return {
      stats: {
        totalUsers: buildMetric(totalUsers, `${recentUsers.length} recent accounts loaded`, 'No user records returned yet'),
        activeTeams: buildMetric(activeTeams, 'Team workspaces are available', 'No active teams returned yet'),
        projects: buildMetric(projects, 'Project activity is flowing in', 'No project activity returned yet'),
        repositories: buildMetric(repositories, 'Connected repositories are reporting', 'No repositories returned yet'),
        documents: buildMetric(documents, 'Documentation inventory is available', 'No documents returned yet'),
        analyses: buildMetric(analyses, 'Analysis telemetry is live', 'No analyses returned yet'),
        pendingReviews: buildMetric(
          pendingReviews,
          `${pendingReviews} review items require attention`,
          'No pending reviews returned'
        ),
        openTodos: buildMetric(openTodos, `${openTodos} open remediation tasks in flight`, 'No open todos returned')
      },
      recentUsers,
      recentProjects,
      recentAnalyses,
      activityTimeline: buildActivityTimeline(recentUsers, recentProjects, recentAnalyses)
    };
  }
};
