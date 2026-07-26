export type AnalysisType = 'FULL_AUDIT' | 'IMPACT' | 'SECURITY' | 'QUALITY' | 'ARCHITECTURE' | 'DOCUMENTATION' | 'TODO_GENERATION';
export type AnalysisStatus = 'PENDING' | 'RUNNING' | 'PARTIAL' | 'COMPLETED' | 'FAILED';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AnalysisTypeFilter = AnalysisType | '';
export type AnalysisStatusFilter = AnalysisStatus | '';

export interface AnalysisProjectSummary {
  id: number;
  title: string;
  description: string | null;
  status: string;
}

export interface Analysis {
  id: number;
  title: string;
  summary: string | null;
  recommendation: string | null;
  analysisType: AnalysisType;
  status: AnalysisStatus;
  severity: Severity;
  score: number | null;
  project: AnalysisProjectSummary;
  repository?: {
    id: number;
    name: string;
    url: string;
    branch: string;
  } | null;
  correlationId?: string | null;
  agentResults?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface RunAnalysisPayload {
  projectId: number;
  repositoryId: number;
  architectureProfile?: 'engineering_copilot';
  generateDocumentation?: boolean;
  rules?: string[];
}

export interface ImpactAnalysisPayload {
  projectId: number;
  repositoryId: number;
  changeDescription: string;
  paths: string[];
}

export interface AnalysisFinding {
  id: number;
  findingKey: string;
  agent: string;
  title: string;
  severity: Severity;
  confidence: number;
  evidence: string;
  recommendation: string | null;
  filePath: string | null;
  lineStart: number | null;
  sourcesJson: string | null;
}

export interface TodoProposal {
  id: number;
  findingKey: string;
  agent: string;
  title: string;
  description: string | null;
  priority: Severity;
  filePath: string | null;
  lineStart: number | null;
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED';
  createdAt: string;
}

export interface AnalysisQueryParams {
  search?: string;
  type?: AnalysisTypeFilter;
  status?: AnalysisStatusFilter;
  projectId?: number | '';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CreateAnalysisPayload {
  title: string;
  summary: string;
  recommendation: string;
  analysisType: AnalysisType;
  status?: AnalysisStatus;
  severity: Severity;
  score: number;
  projectId: number;
}

export interface UpdateAnalysisPayload {
  title: string;
  summary: string;
  recommendation: string;
  analysisType: AnalysisType;
  status: AnalysisStatus;
  severity: Severity;
  score: number;
  projectId: number;
}
