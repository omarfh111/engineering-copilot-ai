import { apiClient } from '../lib/api';
import type { CreateProjectPayload, Project, ProjectQueryParams, ProjectTeamSummary, UpdateProjectPayload } from '../types/project';
import type { PagedResponse } from '../types/user';

function removeEmptyValues(params: ProjectQueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

type ApiProjectTeam = Partial<ProjectTeamSummary> & {
  id?: number | string;
  teamId?: number | string;
  name?: string | null;
};

type ApiProject = Omit<Project, 'team' | 'description'> & {
  id: number | string;
  description?: string | null;
  team?: ApiProjectTeam | null;
  teamId?: number | string;
  teamName?: string | null;
  teamDescription?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function normalizeProjectTeam(project: ApiProject | Project): ProjectTeamSummary {
  const rawTeam = 'team' in project && project.team && typeof project.team === 'object' ? project.team : null;
  const teamId = rawTeam ? Number(('teamId' in rawTeam ? rawTeam.teamId : undefined) ?? rawTeam.id ?? 0) : Number(('teamId' in project ? project.teamId : undefined) ?? 0);
  const teamName = rawTeam
    ? String((('teamName' in rawTeam ? rawTeam.teamName : undefined) ?? ('name' in rawTeam ? rawTeam.name : undefined)) || 'Unassigned team')
    : 'Unassigned team';
  const teamDescription = rawTeam?.description ?? ('teamDescription' in project ? project.teamDescription ?? null : null);

  return {
    id: teamId,
    teamName,
    description: teamDescription
  };
}

function normalizeProject(project: ApiProject | Project) {
  return {
    id: Number(project.id),
    title: project.title,
    description: project.description ?? null,
    status: project.status,
    team: normalizeProjectTeam(project),
    createdAt: String(project.createdAt ?? ''),
    updatedAt: String(project.updatedAt ?? project.createdAt ?? '')
  } satisfies Project;
}

function normalizeProjectPage(page: PagedResponse<ApiProject>) {
  return {
    ...page,
    content: page.content.map(normalizeProject)
  } satisfies PagedResponse<Project>;
}

export const adminProjectService = {
  async getProjects(params: ProjectQueryParams) {
    const response = await apiClient.get<PagedResponse<ApiProject>>('/api/projects', {
      params: removeEmptyValues(params)
    });

    return normalizeProjectPage(response.data);
  },

  async getProjectById(id: number) {
    const response = await apiClient.get<ApiProject>(`/api/projects/${id}`);
    return normalizeProject(response.data);
  },

  async createProject(payload: CreateProjectPayload) {
    const response = await apiClient.post<ApiProject>('/api/projects', payload);
    return normalizeProject(response.data);
  },

  async updateProject(id: number, payload: UpdateProjectPayload) {
    const response = await apiClient.put<ApiProject>(`/api/projects/${id}`, payload);
    return normalizeProject(response.data);
  },

  async deleteProject(id: number) {
    await apiClient.delete(`/api/projects/${id}`);
  }
};
