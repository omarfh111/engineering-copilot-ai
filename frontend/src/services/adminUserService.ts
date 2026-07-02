import { apiClient, userApi } from '../lib/api';
import type { AdminUserListFilters, AdminUserStatusFilter, CreateAdminUserPayload, TeamOption } from '../types/admin';
import type { PagedResponse, UpdateUserPayload, User } from '../types/user';

const BULK_PAGE_SIZE = 100;

function matchesStatus(user: User, status: AdminUserStatusFilter) {
  if (!status) {
    return true;
  }

  if (status === 'ACTIVE') {
    return user.enabled && !user.accountLocked;
  }

  if (status === 'DISABLED') {
    return !user.enabled;
  }

  return user.accountLocked;
}

function emptyPage<T>(page: number, size: number, sortBy: string, sortDirection: 'asc' | 'desc'): PagedResponse<T> {
  return {
    content: [],
    page,
    size,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    sortBy,
    sortDirection
  };
}

function extractCollection<T>(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object' && 'content' in payload && Array.isArray(payload.content)) {
    return payload.content as T[];
  }

  return [] as T[];
}

function normalizeTeamOptions(payload: unknown) {
  const teams = extractCollection<Record<string, unknown>>(payload);

  return teams
    .map((team) => ({
      id: (team.id ?? team.teamId ?? team.value ?? '') as number | string,
      name: String(team.name ?? team.teamName ?? team.label ?? 'Unnamed team')
    }))
    .filter((team) => team.id !== '');
}

async function fetchAllUsers(filters: AdminUserListFilters) {
  const firstPage = await userApi.getUsers({
    search: filters.search,
    role: filters.role,
    page: 0,
    size: BULK_PAGE_SIZE,
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection
  });

  if (firstPage.totalPages <= 1) {
    return firstPage.content;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, pageOffset) =>
      userApi.getUsers({
        search: filters.search,
        role: filters.role,
        page: pageOffset + 1,
        size: BULK_PAGE_SIZE,
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection
      })
    )
  );

  return [firstPage, ...remainingPages].flatMap((page) => page.content);
}

export const adminUserService = {
  async getUsers(filters: AdminUserListFilters) {
    const users = await fetchAllUsers(filters);
    const filteredUsers = users.filter((user) => matchesStatus(user, filters.status));

    if (filteredUsers.length === 0) {
      return emptyPage<User>(filters.page, filters.size, filters.sortBy, filters.sortDirection);
    }

    const startIndex = filters.page * filters.size;
    const endIndex = startIndex + filters.size;
    const totalPages = Math.ceil(filteredUsers.length / filters.size);

    return {
      content: filteredUsers.slice(startIndex, endIndex),
      page: filters.page,
      size: filters.size,
      totalElements: filteredUsers.length,
      totalPages,
      first: filters.page === 0,
      last: filters.page >= totalPages - 1,
      sortBy: filters.sortBy,
      sortDirection: filters.sortDirection
    } satisfies PagedResponse<User>;
  },

  async getRecentUsers(limit = 5) {
    const response = await userApi.getUsers({
      page: 0,
      size: limit,
      sortBy: 'createdAt',
      sortDirection: 'desc'
    });

    return response;
  },

  async createUser(payload: CreateAdminUserPayload) {
    const response = await apiClient.post<User>('/api/users', payload);
    return response.data;
  },

  async updateUser(id: number, payload: UpdateUserPayload & { teamId?: number | string }) {
    const response = await apiClient.put<User>(`/api/users/${id}`, payload);
    return response.data;
  },

  async deleteUser(id: number) {
    await userApi.deleteUser(id);
  },

  async getUserById(id: number) {
    return userApi.getUserById(id);
  },

  async getTeamOptions() {
    try {
      const response = await apiClient.get('/api/teams', {
        params: {
          page: 0,
          size: 100,
          sortBy: 'name',
          sortDirection: 'asc'
        }
      });

      return normalizeTeamOptions(response.data) as TeamOption[];
    } catch {
      return [] as TeamOption[];
    }
  }
};
