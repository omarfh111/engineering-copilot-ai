export type ProjectStatus = 'CREATED' | 'INDEXING' | 'ANALYZING' | 'READY' | 'AUDITED' | 'CLOSED';

export type ProjectStatusFilter = ProjectStatus | '';

export interface ProjectTeamSummary {
  id: number;
  teamName: string;
  description: string | null;
}

export interface Project {
  id: number;
  title: string;
  description: string | null;
  status: ProjectStatus;
  team: ProjectTeamSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectQueryParams {
  search?: string;
  status?: ProjectStatusFilter;
  teamId?: number | '';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CreateProjectPayload {
  title: string;
  description: string;
  status: ProjectStatus;
  teamId: number;
}

export interface UpdateProjectPayload {
  title: string;
  description: string;
  status: ProjectStatus;
  teamId: number;
}
