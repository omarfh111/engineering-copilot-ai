import { apiClient, dashboardApi } from '../lib/api';
import { roleDefinitions } from '../lib/workspace';
import type {
  DashboardAnalysis,
  DashboardOverview,
  DashboardProject,
  DashboardRecommendation,
  RoleDashboardHighlight,
  RoleDashboardMetric,
  RoleDashboardOverview
} from '../types/dashboard';
import type { Role } from '../types/user';

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

async function safeSnapshot(paths: string[], params: Record<string, unknown> = {}) {
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

function normalizeStatus(record: Record<string, unknown>) {
  return stringValue(record.status, record.analysisStatus, record.todoStatus, record.reviewStatus).toUpperCase();
}

function normalizePriority(record: Record<string, unknown>) {
  return stringValue(record.priority, record.severity).toUpperCase();
}

function normalizeType(record: Record<string, unknown>) {
  return stringValue(record.type, record.analysisType, record.category).toUpperCase();
}

function countWhere(records: Record<string, unknown>[], predicate: (record: Record<string, unknown>) => boolean) {
  return records.filter(predicate).length;
}

function averageScore(records: Record<string, unknown>[], predicate?: (record: Record<string, unknown>) => boolean) {
  const filtered = predicate ? records.filter(predicate) : records;
  const scores = filtered
    .map((record) => numericValue(record.score))
    .filter((score) => Number.isFinite(score) && score > 0);

  if (scores.length === 0) {
    return 0;
  }

  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
}

function mapProjectRecord(project: Record<string, unknown>, index: number): DashboardProject {
  return {
    id: (project.id ?? project.projectId ?? `project-${index}`) as number | string,
    title: stringValue(project.title, project.name, project.projectName, project.label) || 'Unnamed project',
    status: stringValue(project.status, project.projectStatus) || 'Unknown',
    repositoryCount: numericValue(project.repositoryCount, project.repositories),
    lastUpdated: stringValue(project.updatedAt, project.lastUpdated, project.createdAt),
    teamName: stringValue(project.teamName, project.team, project.ownerTeam) || undefined
  };
}

function mapAnalysisRecord(analysis: Record<string, unknown>, index: number): DashboardAnalysis {
  const score = numericValue(analysis.score);

  return {
    id: (analysis.id ?? analysis.analysisId ?? `analysis-${index}`) as number | string,
    projectTitle:
      stringValue(analysis.projectTitle, analysis.projectName, analysis.repositoryName, analysis.repository) ||
      'Workspace analysis',
    type: stringValue(analysis.type, analysis.analysisType) || 'Analysis',
    status: stringValue(analysis.status, analysis.analysisStatus) || 'Unknown',
    createdAt: stringValue(analysis.createdAt, analysis.updatedAt),
    score: score > 0 ? score : undefined
  };
}

function baseDashboard(role: Role, overview: DashboardOverview): RoleDashboardOverview {
  const roleDefinition = roleDefinitions[role];

  return {
    role,
    heading: roleDefinition.dashboardHeadline,
    description: roleDefinition.dashboardDescription,
    metrics: [],
    highlights: [],
    recentProjects: overview.recentProjects,
    recentAnalyses: overview.recentAnalyses,
    aiRecommendations: overview.aiRecommendations
  };
}

function createMetric(id: string, label: string, value: number, hint: string, iconKey: string): RoleDashboardMetric {
  return { id, label, value, hint, iconKey };
}

function createHighlight(id: string, label: string, value: string, description: string): RoleDashboardHighlight {
  return { id, label, value, description };
}

function buildManagerOverview(
  overview: DashboardOverview,
  projects: Snapshot | null,
  todos: Snapshot | null,
  teams: Snapshot | null,
  reviews: Snapshot | null
) {
  const base = baseDashboard('MANAGER', overview);
  const todoRecords = todos?.content ?? [];
  const reviewRecords = reviews?.content ?? [];
  const projectRecords = projects?.content ?? [];
  const totalTodos = todoRecords.length;
  const completedTodos = countWhere(todoRecords, (record) => normalizeStatus(record) === 'DONE');
  const openTasks = countWhere(todoRecords, (record) => ['OPEN', 'IN_PROGRESS'].includes(normalizeStatus(record)));
  const blockedTasks = countWhere(
    todoRecords,
    (record) => ['OPEN', 'IN_PROGRESS'].includes(normalizeStatus(record)) && ['HIGH', 'CRITICAL'].includes(normalizePriority(record))
  );
  const sprintProgress = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 100);

  base.metrics = [
    createMetric('projects', 'Projects', projects?.totalElements ?? overview.stats.projects, 'Active delivery initiatives', 'projects'),
    createMetric('sprint-progress', 'Sprint Progress', sprintProgress, 'Completed share of tracked work items', 'velocity'),
    createMetric('open-tasks', 'Open Tasks', openTasks, 'Currently active TODO workload', 'todos'),
    createMetric('blocked-tasks', 'Blocked Tasks', blockedTasks, 'High-priority items at risk', 'blocked'),
    createMetric('team-velocity', 'Team Velocity', completedTodos, 'Completed TODO items in the current snapshot', 'teams')
  ];
  base.highlights = [
    createHighlight('teams', 'Team workspaces', String(teams?.totalElements ?? 0), 'Read-only visibility into delivery ownership.'),
    createHighlight('reviews', 'Pending reviews', String(countWhere(reviewRecords, (record) => normalizeStatus(record) === 'PENDING')), 'Review decisions still waiting on action.'),
    createHighlight('portfolio', 'Latest initiative', mapProjectRecord(projectRecords[0] ?? {}, 0).title, 'Most recently updated project in the delivery portfolio.')
  ];
  base.recentProjects = projectRecords.length > 0 ? projectRecords.slice(0, 5).map(mapProjectRecord) : overview.recentProjects;
  base.recentAnalyses = [];
  return base;
}

function buildArchitectOverview(
  overview: DashboardOverview,
  projects: Snapshot | null,
  repositories: Snapshot | null,
  documents: Snapshot | null,
  analyses: Snapshot | null
) {
  const base = baseDashboard('ARCHITECT', overview);
  const analysisRecords = analyses?.content ?? [];
  const architectureAnalyses = analysisRecords.filter((record) => normalizeType(record) === 'ARCHITECTURE');
  const architectureScore = averageScore(architectureAnalyses);
  const dependencyRisks = countWhere(
    architectureAnalyses,
    (record) => ['FAILED', 'PENDING'].includes(normalizeStatus(record)) || numericValue(record.score) < 70
  );
  const projectCount = projects?.totalElements ?? overview.stats.projects;
  const documentCount = documents?.totalElements ?? overview.stats.documents;
  const documentationCoverage = projectCount === 0 ? 0 : Math.min(100, Math.round((documentCount / projectCount) * 100));

  base.metrics = [
    createMetric('architecture-score', 'Architecture Score', architectureScore, 'Average architecture analysis score', 'architecture'),
    createMetric('dependency-risks', 'Dependency Risks', dependencyRisks, 'Architecture analyses needing attention', 'dependencies'),
    createMetric('documentation-coverage', 'Documentation Coverage', documentationCoverage, 'Document assets versus active projects', 'documentation'),
    createMetric('impact-analyses', 'Impact Analyses', architectureAnalyses.length, 'Architecture and impact runs available', 'impact')
  ];
  base.highlights = [
    createHighlight('repositories', 'Repositories', String(repositories?.totalElements ?? overview.stats.repositories), 'Connected codebases in architectural scope.'),
    createHighlight('latest-analysis', 'Latest architecture signal', mapAnalysisRecord(architectureAnalyses[0] ?? {}, 0).status, 'Most recent architecture analysis outcome.'),
    createHighlight('knowledge', 'Documentation assets', String(documentCount), 'Technical references available for design review.')
  ];
  base.recentProjects = projects?.content.slice(0, 5).map(mapProjectRecord) ?? overview.recentProjects;
  base.recentAnalyses =
    architectureAnalyses.length > 0 ? architectureAnalyses.slice(0, 5).map(mapAnalysisRecord) : overview.recentAnalyses;
  return base;
}

function buildQaOverview(
  overview: DashboardOverview,
  projects: Snapshot | null,
  repositories: Snapshot | null,
  analyses: Snapshot | null,
  reviews: Snapshot | null,
  todos: Snapshot | null
) {
  const base = baseDashboard('QA', overview);
  const analysisRecords = analyses?.content ?? [];
  const reviewRecords = reviews?.content ?? [];
  const todoRecords = todos?.content ?? [];
  const qualityScore = averageScore(analysisRecords, (record) => normalizeType(record) === 'QUALITY');
  const securityFindings = countWhere(
    analysisRecords,
    (record) =>
      normalizeType(record) === 'SECURITY' &&
      (['FAILED', 'PENDING'].includes(normalizeStatus(record)) || numericValue(record.score) < 75)
  );
  const openDefects = countWhere(todoRecords, (record) => ['OPEN', 'IN_PROGRESS'].includes(normalizeStatus(record)));
  const reviewCoverage = reviewRecords.length;

  base.metrics = [
    createMetric('quality-score', 'Quality Score', qualityScore, 'Average quality analysis score', 'quality'),
    createMetric('security-findings', 'Security Findings', securityFindings, 'Open security risks requiring QA attention', 'security'),
    createMetric('open-defects', 'Open Defects', openDefects, 'QA-managed remediation items still active', 'defects'),
    createMetric('review-coverage', 'Review Coverage', reviewCoverage, 'Review records available in the current workspace snapshot', 'reviews')
  ];
  base.highlights = [
    createHighlight('projects', 'Projects under QA watch', String(projects?.totalElements ?? overview.stats.projects), 'Delivery initiatives currently visible to QA.'),
    createHighlight('repositories', 'Repositories in scope', String(repositories?.totalElements ?? overview.stats.repositories), 'Codebases with quality and security signals.'),
    createHighlight(
      'pending-reviews',
      'Pending approvals',
      String(countWhere(reviewRecords, (record) => normalizeStatus(record) === 'PENDING')),
      'Reviews still waiting on QA decisions.'
    )
  ];
  base.recentProjects = projects?.content.slice(0, 5).map(mapProjectRecord) ?? overview.recentProjects;
  base.recentAnalyses = analyses?.content.slice(0, 5).map(mapAnalysisRecord) ?? overview.recentAnalyses;
  return base;
}

function buildDeveloperOverview(
  overview: DashboardOverview,
  projects: Snapshot | null,
  repositories: Snapshot | null,
  documents: Snapshot | null,
  analyses: Snapshot | null,
  todos: Snapshot | null
) {
  const base = baseDashboard('DEVELOPER', overview);
  const todoRecords = todos?.content ?? [];
  const analysisRecords = analyses?.content ?? [];
  const activeTasks = countWhere(todoRecords, (record) => ['OPEN', 'IN_PROGRESS'].includes(normalizeStatus(record)));

  base.metrics = [
    createMetric('assigned-tasks', 'Assigned Tasks', activeTasks, 'Active TODO items in your execution view', 'todos'),
    createMetric('repositories', 'Repositories', repositories?.totalElements ?? overview.stats.repositories, 'Connected codebases available for work', 'repositories'),
    createMetric('recent-analyses', 'Recent Analyses', analysisRecords.length, 'Analysis history available in your workspace', 'analyses'),
    createMetric('ai-suggestions', 'AI Suggestions', overview.aiRecommendations.length, 'Current AI recommendations surfaced for action', 'assistant'),
    createMetric('recent-documentation', 'Documentation', documents?.totalElements ?? overview.stats.documents, 'Technical references available for implementation', 'documentation')
  ];
  base.highlights = [
    createHighlight('projects', 'Active projects', String(projects?.totalElements ?? overview.stats.projects), 'Project contexts currently available to you.'),
    createHighlight('latest-analysis', 'Latest analysis', mapAnalysisRecord(analysisRecords[0] ?? {}, 0).type, 'Most recent repository insight in your workspace.'),
    createHighlight('knowledge', 'Documentation source', `${documents?.totalElements ?? 0} assets`, 'Project documents available for AI-assisted work.')
  ];
  base.recentProjects = projects?.content.slice(0, 5).map(mapProjectRecord) ?? overview.recentProjects;
  base.recentAnalyses = analyses?.content.slice(0, 5).map(mapAnalysisRecord) ?? overview.recentAnalyses;
  return base;
}

export const roleDashboardService = {
  async getOverview(role: Role): Promise<RoleDashboardOverview> {
    const overview = await dashboardApi.getOverview();

    if (role === 'MANAGER') {
      const [projects, todos, teams, reviews] = await Promise.all([
        safeSnapshot(['/api/projects'], { page: 0, size: 5, sortBy: 'updatedAt', sortDirection: 'desc' }),
        safeSnapshot(['/api/todos'], { page: 0, size: 100, sortBy: 'createdAt', sortDirection: 'desc' }),
        safeSnapshot(['/api/teams'], { page: 0, size: 50, sortBy: 'name', sortDirection: 'asc' }),
        safeSnapshot(['/api/reviews'], { page: 0, size: 100, sortBy: 'createdAt', sortDirection: 'desc' })
      ]);

      return buildManagerOverview(overview, projects, todos, teams, reviews);
    }

    if (role === 'ARCHITECT') {
      const [projects, repositories, documents, analyses] = await Promise.all([
        safeSnapshot(['/api/projects'], { page: 0, size: 5, sortBy: 'updatedAt', sortDirection: 'desc' }),
        safeSnapshot(['/api/repositories'], { page: 0, size: 100, sortBy: 'updatedAt', sortDirection: 'desc' }),
        safeSnapshot(['/api/documents'], { page: 0, size: 100, sortBy: 'updatedAt', sortDirection: 'desc' }),
        safeSnapshot(['/api/analyses', '/api/analysis'], { page: 0, size: 100, sortBy: 'createdAt', sortDirection: 'desc' })
      ]);

      return buildArchitectOverview(overview, projects, repositories, documents, analyses);
    }

    if (role === 'QA') {
      const [projects, repositories, analyses, reviews, todos] = await Promise.all([
        safeSnapshot(['/api/projects'], { page: 0, size: 5, sortBy: 'updatedAt', sortDirection: 'desc' }),
        safeSnapshot(['/api/repositories'], { page: 0, size: 100, sortBy: 'updatedAt', sortDirection: 'desc' }),
        safeSnapshot(['/api/analyses', '/api/analysis'], { page: 0, size: 100, sortBy: 'createdAt', sortDirection: 'desc' }),
        safeSnapshot(['/api/reviews'], { page: 0, size: 100, sortBy: 'createdAt', sortDirection: 'desc' }),
        safeSnapshot(['/api/todos'], { page: 0, size: 100, sortBy: 'createdAt', sortDirection: 'desc' })
      ]);

      return buildQaOverview(overview, projects, repositories, analyses, reviews, todos);
    }

    const [projects, repositories, documents, analyses, todos] = await Promise.all([
      safeSnapshot(['/api/projects'], { page: 0, size: 5, sortBy: 'updatedAt', sortDirection: 'desc' }),
      safeSnapshot(['/api/repositories'], { page: 0, size: 100, sortBy: 'updatedAt', sortDirection: 'desc' }),
      safeSnapshot(['/api/documents'], { page: 0, size: 100, sortBy: 'updatedAt', sortDirection: 'desc' }),
      safeSnapshot(['/api/analyses', '/api/analysis'], { page: 0, size: 100, sortBy: 'createdAt', sortDirection: 'desc' }),
      safeSnapshot(['/api/todos'], { page: 0, size: 100, sortBy: 'createdAt', sortDirection: 'desc' })
    ]);

    return buildDeveloperOverview(overview, projects, repositories, documents, analyses, todos);
  }
};
