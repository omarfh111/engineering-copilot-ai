import type { ApiRole } from './user';

export type DocumentationType =
  | 'README'
  | 'API_DOC'
  | 'ARCHITECTURE'
  | 'INSTALLATION_GUIDE'
  | 'USER_GUIDE'
  | 'TECHNICAL_REPORT'
  | 'ONBOARDING_GUIDE'
  | 'OTHER';

export type DocumentationTypeFilter = DocumentationType | '';

export type DocumentationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export type DocumentationStatusFilter = DocumentationStatus | '';

export interface DocumentationProjectSummary {
  id: number;
  title: string;
  description: string | null;
  status: string;
}

export interface DocumentationCreatedBySummary {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: ApiRole;
}

export interface Documentation {
  id: number;
  title: string;
  description: string | null;
  type: DocumentationType;
  content: string | null;
  path: string | null;
  status: DocumentationStatus;
  generatedByAI: boolean;
  approved: boolean;
  project: DocumentationProjectSummary;
  createdBy: DocumentationCreatedBySummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentationQueryParams {
  search?: string;
  type?: DocumentationTypeFilter;
  status?: DocumentationStatusFilter;
  projectId?: number | '';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CreateDocumentationPayload {
  title: string;
  description: string;
  type: DocumentationType;
  content: string;
  path: string;
  status: DocumentationStatus;
  generatedByAI: boolean;
  approved: boolean;
  projectId: number;
}

export interface UpdateDocumentationPayload {
  title: string;
  description: string;
  type: DocumentationType;
  content: string;
  path: string;
  status: DocumentationStatus;
  generatedByAI: boolean;
  approved: boolean;
  projectId: number;
}
