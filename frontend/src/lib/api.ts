import axios from 'axios';
import type { DashboardOverview } from '../types/dashboard';
import type { ApiRole, PagedResponse, TeamSummary, UpdateUserPayload, User, UserQueryParams } from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081';
const TOKEN_STORAGE_KEY = 'copilote_token';
const LOCAL_FILE_STORAGE_PREFIX = 'copilote_local_file:';

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
  role: ApiRole | string;
  teams?: ApiTeamSummary[];
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL
});

export function saveLocalFileReference(file: File, dataUrl: string) {
  const key = `local-file:${Date.now()}:${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;

  localStorage.setItem(
    `${LOCAL_FILE_STORAGE_PREFIX}${key}`,
    JSON.stringify({
      dataUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      savedAt: new Date().toISOString()
    })
  );

  return key;
}

export function getLocalFileReference(path: string | null | undefined) {
  const trimmedPath = path?.trim();

  if (!trimmedPath?.startsWith('local-file:')) {
    return null;
  }

  const storedValue = localStorage.getItem(`${LOCAL_FILE_STORAGE_PREFIX}${trimmedPath}`);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as {
      dataUrl: string;
      name: string;
      type: string;
      size: number;
      savedAt: string;
    };
  } catch {
    return null;
  }
}

export function resolveFileUrl(path: string | null | undefined) {
  const trimmedPath = path?.trim();

  if (!trimmedPath) {
    return null;
  }

  const localFile = getLocalFileReference(trimmedPath);

  if (localFile) {
    return localFile.dataUrl;
  }

  if (/^(https?:|blob:|data:)/i.test(trimmedPath)) {
    return trimmedPath;
  }

  if (/^file:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  const normalizedPath = trimmedPath.replace(/\\/g, '/');

  if (normalizedPath.startsWith('/')) {
    return `${API_BASE_URL}${normalizedPath}`;
  }

  return `${API_BASE_URL}/${normalizedPath}`;
}

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

function normalizeRole(role: ApiRole | string) {
  switch (role) {
    case 'ROLE_ADMIN':
      return 'ADMIN';
    case 'ROLE_MANAGER':
      return 'MANAGER';
    case 'ROLE_ARCHITECT':
      return 'ARCHITECT';
    case 'ROLE_QA':
      return 'QA';
    case 'ROLE_DEVELOPER':
      return 'DEVELOPER';
    case 'ROLE_AUDITOR':
      return 'AUDITOR';
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

type ApiErrorBody = {
  error?: string;
  message?: string;
  status?: number;
};

const fallbackStatusMessages: Record<number, string> = {
  400: 'Check the highlighted fields and try again.',
  401: 'Your session has expired. Sign in again to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested record could not be found.',
  409: 'This record conflicts with existing data.',
  500: 'The server could not complete the request. Try again later.'
};

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (message) {
      return message;
    }

    if (status && fallbackStatusMessages[status]) {
      return fallbackStatusMessages[status];
    }

    return error.message;
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
