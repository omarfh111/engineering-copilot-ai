import { apiClient } from '../lib/api';
import type {
  CreateDocumentPayload,
  DocumentProjectSummary,
  DocumentQueryParams,
  DocumentType,
  SourceDocument,
  UpdateDocumentPayload
} from '../types/document';
import type { PagedResponse } from '../types/user';

function removeEmptyValues(params: DocumentQueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

type ApiDocumentProjectSummary = Partial<DocumentProjectSummary> & {
  id?: number | string;
  projectId?: number | string;
  title?: string | null;
  projectTitle?: string | null;
  description?: string | null;
  status?: string | null;
};

type ApiDocument = Omit<SourceDocument, 'project' | 'type' | 'description' | 'path' | 'source'> & {
  id: number | string;
  description?: string | null;
  type?: DocumentType | string | null;
  path?: string | null;
  source?: string | null;
  project?: ApiDocumentProjectSummary | null;
  projectId?: number | string;
  projectTitle?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function normalizeType(type: ApiDocument['type']): DocumentType {
  switch (type) {
    case 'PDF':
    case 'DOCX':
    case 'HTML':
    case 'MD':
    case 'WIKI':
    case 'TXT':
    case 'OTHER':
      return type;
    default:
      return 'OTHER';
  }
}

function normalizeDocumentProject(project: ApiDocument['project'], document: ApiDocument): DocumentProjectSummary {
  return {
    id: Number(project?.id ?? project?.projectId ?? document.projectId ?? 0),
    title: String(project?.title ?? project?.projectTitle ?? document.projectTitle ?? 'Unnamed project'),
    description: project?.description ?? null,
    status: String(project?.status ?? 'UNKNOWN')
  };
}

function normalizeDocument(document: ApiDocument | SourceDocument) {
  return {
    id: Number(document.id),
    title: document.title,
    description: document.description ?? null,
    type: normalizeType(document.type),
    path: document.path ?? null,
    source: document.source ?? null,
    project: normalizeDocumentProject('project' in document ? document.project : null, document as ApiDocument),
    createdAt: String(document.createdAt ?? ''),
    updatedAt: String(document.updatedAt ?? document.createdAt ?? '')
  } satisfies SourceDocument;
}

function normalizeDocumentPage(page: PagedResponse<ApiDocument>) {
  return {
    ...page,
    content: page.content.map(normalizeDocument)
  } satisfies PagedResponse<SourceDocument>;
}

export const adminDocumentService = {
  async getDocuments(params: DocumentQueryParams) {
    const response = await apiClient.get<PagedResponse<ApiDocument>>('/api/documents', {
      params: removeEmptyValues(params)
    });

    return normalizeDocumentPage(response.data);
  },

  async getDocumentById(id: number) {
    const response = await apiClient.get<ApiDocument>(`/api/documents/${id}`);
    return normalizeDocument(response.data);
  },

  async getDocumentsByProjectId(projectId: number) {
    const response = await apiClient.get<ApiDocument[]>(`/api/documents/project/${projectId}`);
    return response.data.map(normalizeDocument);
  },

  async createDocument(payload: CreateDocumentPayload) {
    const response = await apiClient.post<ApiDocument>('/api/documents', payload);
    return normalizeDocument(response.data);
  },

  async updateDocument(id: number, payload: UpdateDocumentPayload) {
    const response = await apiClient.put<ApiDocument>(`/api/documents/${id}`, payload);
    return normalizeDocument(response.data);
  },

  async deleteDocument(id: number) {
    await apiClient.delete(`/api/documents/${id}`);
  }
};
