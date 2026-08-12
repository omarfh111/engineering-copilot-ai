import { apiClient } from '../lib/api';
import type {
  CodeRepository,
  CreateRepositoryPayload,
  RepositoryProjectSummary,
  RepositoryProvider,
  RepositoryQueryParams,
  UpdateRepositoryPayload
} from '../types/repository';
import type { PagedResponse } from '../types/user';

function removeEmptyValues(params: RepositoryQueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

type ApiRepositoryProjectSummary = Partial<RepositoryProjectSummary> & {
  id?: number | string;
  projectId?: number | string;
  title?: string | null;
  projectTitle?: string | null;
  description?: string | null;
  status?: string | null;
};

type ApiRepository = Omit<CodeRepository, 'project' | 'provider' | 'technology' | 'branch'> & {
  id: number | string;
  technology?: string | null;
  provider?: RepositoryProvider | string | null;
  branch?: string | null;
  project?: ApiRepositoryProjectSummary | null;
  projectId?: number | string;
  projectTitle?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function normalizeProvider(provider: ApiRepository['provider']): RepositoryProvider {
  switch (provider) {
    case 'GITHUB':
    case 'GITLAB':
    case 'BITBUCKET':
    case 'OTHER':
      return provider;
    default:
      return 'OTHER';
  }
}

function normalizeRepositoryProject(project: ApiRepository['project'], repository: ApiRepository): RepositoryProjectSummary {
  return {
    id: Number(project?.id ?? project?.projectId ?? repository.projectId ?? 0),
    title: String(project?.title ?? project?.projectTitle ?? repository.projectTitle ?? 'Unnamed project'),
    description: project?.description ?? null,
    status: String(project?.status ?? 'UNKNOWN')
  };
}

function normalizeRepository(repository: ApiRepository | CodeRepository) {
  return {
    id: Number(repository.id),
    name: repository.name,
    url: repository.url,
    technology: repository.technology ?? null,
    provider: normalizeProvider(repository.provider),
    branch: repository.branch ?? null,
    project: normalizeRepositoryProject('project' in repository ? repository.project : null, repository as ApiRepository),
    createdAt: String(repository.createdAt ?? ''),
    updatedAt: String(repository.updatedAt ?? repository.createdAt ?? '')
  } satisfies CodeRepository;
}

function normalizeRepositoryPage(page: PagedResponse<ApiRepository>) {
  return {
    ...page,
    content: page.content.map(normalizeRepository)
  } satisfies PagedResponse<CodeRepository>;
}

export const adminRepositoryService = {
  async getRepositories(params: RepositoryQueryParams) {
    const response = await apiClient.get<PagedResponse<ApiRepository>>('/api/repositories', {
      params: removeEmptyValues(params)
    });

    return normalizeRepositoryPage(response.data);
  },

  async getRepositoryById(id: number) {
    const response = await apiClient.get<ApiRepository>(`/api/repositories/${id}`);
    return normalizeRepository(response.data);
  },

  async getRepositoriesByProjectId(projectId: number) {
    const response = await apiClient.get<ApiRepository[]>(`/api/repositories/project/${projectId}`);
    return response.data.map(normalizeRepository);
  },

  async createRepository(payload: CreateRepositoryPayload) {
    const response = await apiClient.post<ApiRepository>('/api/repositories', payload);
    return normalizeRepository(response.data);
  },

  async updateRepository(id: number, payload: UpdateRepositoryPayload) {
    const response = await apiClient.put<ApiRepository>(`/api/repositories/${id}`, payload);
    return normalizeRepository(response.data);
  },

  async deleteRepository(id: number) {
    await apiClient.delete(`/api/repositories/${id}`);
  }
};
