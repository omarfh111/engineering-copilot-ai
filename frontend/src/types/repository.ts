export type RepositoryProvider = 'GITHUB' | 'GITLAB' | 'BITBUCKET' | 'OTHER';

export interface RepositoryProjectSummary {
  id: number;
  title: string;
  description: string | null;
  status: string;
}

export interface CodeRepository {
  id: number;
  name: string;
  url: string;
  technology: string | null;
  provider: RepositoryProvider;
  branch: string | null;
  project: RepositoryProjectSummary;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryQueryParams {
  search?: string;
  provider?: RepositoryProvider | '';
  projectId?: number | '';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CreateRepositoryPayload {
  name: string;
  url: string;
  technology: string;
  provider: RepositoryProvider;
  branch: string;
  projectId: number;
}

export interface UpdateRepositoryPayload {
  name: string;
  url: string;
  technology: string;
  provider: RepositoryProvider;
  branch: string;
  projectId: number;
}
