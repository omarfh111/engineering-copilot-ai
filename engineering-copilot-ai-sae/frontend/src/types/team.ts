import type { Role } from './user';

export interface TeamMember {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: Role;
  enabled: boolean;
  accountLocked: boolean;
}

export interface Team {
  id: number;
  teamName: string;
  description: string | null;
  memberCount: number;
  projectCount: number;
  members: TeamMember[];
  leader: TeamMember | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamQueryParams {
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CreateTeamPayload {
  teamName: string;
  description: string;
}

export interface UpdateTeamPayload {
  teamName: string;
  description: string;
}
