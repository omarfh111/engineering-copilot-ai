import { apiClient } from '../lib/api';
import type {
  Analysis,
  AnalysisProjectSummary,
  AnalysisQueryParams,
  AnalysisStatus,
  AnalysisType,
  CreateAnalysisPayload,
  Severity,
  UpdateAnalysisPayload
} from '../types/analysis';
import type { PagedResponse } from '../types/user';

function removeEmptyValues(params: AnalysisQueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

type ApiAnalysisProject = Partial<AnalysisProjectSummary> & {
  id?: number | string;
  projectId?: number | string;
  title?: string | null;
  projectTitle?: string | null;
  description?: string | null;
  status?: string | null;
};

type ApiAnalysis = Omit<Analysis, 'project' | 'analysisType' | 'status' | 'severity' | 'score'> & {
  id: number | string;
  analysisId?: number | string;
  type?: AnalysisType | string | null;
  analysisType?: AnalysisType | string | null;
  status?: AnalysisStatus | string | null;
  severity?: Severity | string | null;
  score?: number | string | null;
  project?: ApiAnalysisProject | null;
  projectId?: number | string;
  projectTitle?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function normalizeProject(project: ApiAnalysis['project'], analysis: ApiAnalysis): AnalysisProjectSummary {
  return {
    id: Number(project?.id ?? project?.projectId ?? analysis.projectId ?? 0),
    title: String(project?.title ?? project?.projectTitle ?? analysis.projectTitle ?? 'Unnamed project'),
    description: project?.description ?? null,
    status: String(project?.status ?? 'UNKNOWN')
  };
}

function normalizeAnalysis(analysis: ApiAnalysis): Analysis {
  const analysisType = analysis.analysisType ?? analysis.type ?? 'QUALITY';

  return {
    id: Number(analysis.id ?? analysis.analysisId),
    title: String(analysis.title ?? `Analysis ${analysis.id}`),
    summary: analysis.summary ?? null,
    recommendation: analysis.recommendation ?? null,
    analysisType: analysisType as AnalysisType,
    status: (analysis.status ?? 'PENDING') as AnalysisStatus,
    severity: (analysis.severity ?? 'MEDIUM') as Severity,
    score: analysis.score === null || analysis.score === undefined ? null : Number(analysis.score),
    project: normalizeProject(analysis.project, analysis),
    createdAt: String(analysis.createdAt ?? ''),
    updatedAt: String(analysis.updatedAt ?? analysis.createdAt ?? '')
  };
}

function normalizeAnalysisPage(page: PagedResponse<ApiAnalysis>) {
  return {
    ...page,
    content: page.content.map(normalizeAnalysis)
  } satisfies PagedResponse<Analysis>;
}

export const adminAnalysisService = {
  async getAnalyses(params: AnalysisQueryParams) {
    const response = await apiClient.get<PagedResponse<ApiAnalysis>>('/api/analyses', {
      params: removeEmptyValues(params)
    });

    return normalizeAnalysisPage(response.data);
  },

  async getAnalysisById(id: number) {
    const response = await apiClient.get<ApiAnalysis>(`/api/analyses/${id}`);
    return normalizeAnalysis(response.data);
  },

  async getAnalysesByProjectId(projectId: number) {
    const response = await apiClient.get<ApiAnalysis[]>(`/api/analyses/project/${projectId}`);
    return response.data.map(normalizeAnalysis);
  },

  async createAnalysis(payload: CreateAnalysisPayload) {
    const response = await apiClient.post<ApiAnalysis>('/api/analyses', payload);
    return normalizeAnalysis(response.data);
  },

  async updateAnalysis(id: number, payload: UpdateAnalysisPayload) {
    const response = await apiClient.put<ApiAnalysis>(`/api/analyses/${id}`, payload);
    return normalizeAnalysis(response.data);
  },

  async deleteAnalysis(id: number) {
    await apiClient.delete(`/api/analyses/${id}`);
  }
};
