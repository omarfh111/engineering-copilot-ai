export type AnalysisType = 'SECURITY' | 'QUALITY' | 'ARCHITECTURE' | 'DOCUMENTATION' | 'TODO_GENERATION';
export type AnalysisStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
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
  createdAt: string;
  updatedAt: string;
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
