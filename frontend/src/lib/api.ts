import axios from 'axios';
import type { DashboardOverview } from '../types/dashboard';
import type { ApiRole, PagedResponse, TeamSummary, UpdateUserPayload, User, UserQueryParams } from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081';
const TOKEN_STORAGE_KEY = 'copilote_token';

interface AuthResponse {
  token: string | null;
  message: string;
}

type ApiTeamSummary = Partial<TeamSummary> & {
  id?: number | string;
  teamId?: number | string;
  name?: string | null;
  teamName?: string | null;
  description?: string | null;
};

type ApiUser = Omit<User, 'role' | 'teams'> & {
  role: ApiRole;
  teams?: ApiTeamSummary[];
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function removeEmptyValues(params: UserQueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function normalizeRole(role: ApiRole) {
  return role === 'AUDITOR' ? 'MANAGER' : role;
}

function normalizeTeamSummary(team: ApiTeamSummary) {
  return {
    id: Number(team.id ?? team.teamId ?? 0),
    teamName: String(team.teamName ?? team.name ?? 'Unnamed team'),
    description: team.description ?? null
  } as TeamSummary;
}

function normalizeUser(user: User | ApiUser) {
  return {
    ...user,
    role: normalizeRole(user.role),
    teams: (user.teams ?? []).map(normalizeTeamSummary)
  } as User;
}

function normalizeUserPage(page: PagedResponse<User | ApiUser>) {
  return {
    ...page,
    content: page.content.map(normalizeUser)
  } as PagedResponse<User>;
}

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

export const storageKeys = {
  token: TOKEN_STORAGE_KEY
};

export const tokenStorage = {
  get() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  set(token: string) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export const authApi = {
  async login(email: string, password: string) {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', {
      email,
      password
    });
    return response.data;
  }
};

export const userApi = {
  async getUsers(params: UserQueryParams) {
    const response = await apiClient.get<PagedResponse<ApiUser>>('/api/users', {
      params: removeEmptyValues(params)
    });
    return normalizeUserPage(response.data);
  },

  async getUserById(id: number) {
    const response = await apiClient.get<ApiUser>(`/api/users/${id}`);
    return normalizeUser(response.data);
  },

  async getCurrentUser() {
    const response = await apiClient.get<ApiUser>('/api/users/me');
    return normalizeUser(response.data);
  },

  async updateUser(id: number, payload: UpdateUserPayload) {
    const response = await apiClient.put<ApiUser>(`/api/users/${id}`, payload);
    return normalizeUser(response.data);
  },

  async deleteUser(id: number) {
    await apiClient.delete(`/api/users/${id}`);
  }
};

export const dashboardApi = {
  async getOverview() {
    const response = await apiClient.get<DashboardOverview>('/api/dashboard/overview');
    return response.data;
  }
};
