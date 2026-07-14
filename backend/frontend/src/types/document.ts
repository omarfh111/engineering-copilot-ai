export type DocumentType = 'PDF' | 'DOCX' | 'HTML' | 'MD' | 'WIKI' | 'TXT' | 'OTHER';

export type DocumentTypeFilter = DocumentType | '';

export interface DocumentProjectSummary {
  id: number;
  title: string;
  description: string | null;
  status: string;
}

export interface SourceDocument {
  id: number;
  title: string;
  description: string | null;
  type: DocumentType;
  path: string | null;
  source: string | null;
  project: DocumentProjectSummary;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentQueryParams {
  search?: string;
  type?: DocumentTypeFilter;
  projectId?: number | '';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CreateDocumentPayload {
  title: string;
  description: string;
  type: DocumentType;
  path: string;
  source: string;
  projectId: number;
}

export interface UpdateDocumentPayload {
  title: string;
  description: string;
  type: DocumentType;
  path: string;
  source: string;
  projectId: number;
}
