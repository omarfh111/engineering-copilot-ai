export type Role = 'ADMIN' | 'MANAGER' | 'ARCHITECT' | 'QA' | 'DEVELOPER';
export type ApiRole = Role | 'AUDITOR';

export interface TeamSummary {
  id: number;
  teamName: string;
  description: string | null;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: Role;
  teams: TeamSummary[];
  enabled: boolean;
  accountLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  sortBy: string;
  sortDirection: string;
}

export interface UserQueryParams {
  search?: string;
  role?: Role | '';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface UpdateUserPayload {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password?: string;
  role?: Role;
  enabled?: boolean;
  accountLocked?: boolean;
}
