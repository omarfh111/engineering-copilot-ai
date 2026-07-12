import { apiClient } from '../lib/api';
import type {
  CreateDocumentationPayload,
  Documentation,
  DocumentationCreatedBySummary,
  DocumentationProjectSummary,
  DocumentationQueryParams,
  DocumentationStatus,
  DocumentationType,
  UpdateDocumentationPayload
} from '../types/documentation';
import type { ApiRole, PagedResponse } from '../types/user';

function removeEmptyValues(params: DocumentationQueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

type ApiDocumentationProjectSummary = Partial<DocumentationProjectSummary> & {
  id?: number | string;
  projectId?: number | string;
  title?: string | null;
  projectTitle?: string | null;
  description?: string | null;
  status?: string | null;
};

type ApiDocumentationCreatedBySummary = Partial<DocumentationCreatedBySummary> & {
  id?: number | string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
  role?: ApiRole | string | null;
};

type ApiDocumentation = Omit<Documentation, 'project' | 'createdBy' | 'type' | 'status' | 'description' | 'content' | 'path'> & {
  id: number | string;
  description?: string | null;
  type?: DocumentationType | string | null;
  content?: string | null;
  path?: string | null;
  status?: DocumentationStatus | string | null;
  project?: ApiDocumentationProjectSummary | null;
  projectId?: number | string;
  projectTitle?: string | null;
  createdBy?: ApiDocumentationCreatedBySummary | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function normalizeType(type: ApiDocumentation['type']): DocumentationType {
  switch (type) {
    case 'README':
    case 'API_DOC':
    case 'ARCHITECTURE':
    case 'INSTALLATION_GUIDE':
    case 'USER_GUIDE':
    case 'TECHNICAL_REPORT':
    case 'ONBOARDING_GUIDE':
    case 'OTHER':
      return type;
    default:
      return 'OTHER';
  }
}

function normalizeStatus(status: ApiDocumentation['status']): DocumentationStatus {
  switch (status) {
    case 'DRAFT':
    case 'PENDING_REVIEW':
    case 'APPROVED':
    case 'REJECTED':
      return status;
    default:
      return 'DRAFT';
  }
}

function normalizeRole(role: ApiDocumentationCreatedBySummary['role']): ApiRole {
  switch (role) {
    case 'ADMIN':
    case 'MANAGER':
    case 'ARCHITECT':
    case 'QA':
    case 'DEVELOPER':
    case 'AUDITOR':
      return role;
    default:
      return 'DEVELOPER';
  }
}

function normalizeDocumentationProject(
  project: ApiDocumentation['project'],
  documentation: ApiDocumentation
): DocumentationProjectSummary {
  return {
    id: Number(project?.id ?? project?.projectId ?? documentation.projectId ?? 0),
    title: String(project?.title ?? project?.projectTitle ?? documentation.projectTitle ?? 'Unnamed project'),
    description: project?.description ?? null,
    status: String(project?.status ?? 'UNKNOWN')
  };
}

function normalizeCreatedBy(createdBy: ApiDocumentation['createdBy']) {
  if (!createdBy) {
    return null;
  }

  return {
    id: Number(createdBy.id ?? 0),
    firstName: String(createdBy.firstName ?? ''),
    lastName: String(createdBy.lastName ?? ''),
    username: String(createdBy.username ?? ''),
    email: String(createdBy.email ?? ''),
    role: normalizeRole(createdBy.role)
  } satisfies DocumentationCreatedBySummary;
}

function normalizeDocumentation(documentation: ApiDocumentation | Documentation) {
  return {
    id: Number(documentation.id),
    title: documentation.title,
    description: documentation.description ?? null,
    type: normalizeType(documentation.type),
    content: documentation.content ?? null,
    path: documentation.path ?? null,
    status: normalizeStatus(documentation.status),
    generatedByAI: Boolean(documentation.generatedByAI),
    approved: Boolean(documentation.approved),
    project: normalizeDocumentationProject('project' in documentation ? documentation.project : null, documentation as ApiDocumentation),
    createdBy: normalizeCreatedBy('createdBy' in documentation ? documentation.createdBy : null),
    createdAt: String(documentation.createdAt ?? ''),
    updatedAt: String(documentation.updatedAt ?? documentation.createdAt ?? '')
  } satisfies Documentation;
}

function normalizeDocumentationPage(page: PagedResponse<ApiDocumentation>) {
  return {
    ...page,
    content: page.content.map(normalizeDocumentation)
  } satisfies PagedResponse<Documentation>;
}

export const adminDocumentationService = {
  async getDocumentation(params: DocumentationQueryParams) {
    const response = await apiClient.get<PagedResponse<ApiDocumentation>>('/api/documentation', {
      params: removeEmptyValues(params)
    });

    return normalizeDocumentationPage(response.data);
  },

  async getDocumentationById(id: number) {
    const response = await apiClient.get<ApiDocumentation>(`/api/documentation/${id}`);
    return normalizeDocumentation(response.data);
  },

  async getDocumentationByProjectId(projectId: number) {
    const response = await apiClient.get<ApiDocumentation[]>(`/api/documentation/project/${projectId}`);
    return response.data.map(normalizeDocumentation);
  },

  async createDocumentation(payload: CreateDocumentationPayload) {
    const response = await apiClient.post<ApiDocumentation>('/api/documentation', payload);
    return normalizeDocumentation(response.data);
  },

  async updateDocumentation(id: number, payload: UpdateDocumentationPayload) {
    const response = await apiClient.put<ApiDocumentation>(`/api/documentation/${id}`, payload);
    return normalizeDocumentation(response.data);
  },

  async deleteDocumentation(id: number) {
    await apiClient.delete(`/api/documentation/${id}`);
  }
};
