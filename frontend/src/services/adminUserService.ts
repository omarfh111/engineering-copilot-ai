import { apiClient, userApi } from '../lib/api';
import type {
  AdminUserListFilters,
  AdminUserStatusFilter,
  CreateAdminUserPayload,
  TeamOption
} from '../types/admin';
import type {
  PagedResponse,
  UpdateUserPayload,
  User
} from '../types/user';

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

function emptyPage<T>(
  page: number,
  size: number,
  sortBy: string,
  sortDirection: 'asc' | 'desc'
): PagedResponse<T> {
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

function extractCollection<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'content' in payload &&
    Array.isArray((payload as any).content)
  ) {
    return (payload as any).content as T[];
  }

  return [];
}

function normalizeTeamOptions(payload: unknown): TeamOption[] {
  const teams = extractCollection<Record<string, unknown>>(payload);

  return teams
    .map((team) => ({
      id: Number(team.id ?? team.teamId ?? team.value),
      name: String(team.name ?? team.teamName ?? team.label ?? 'Unnamed team')
    }))
    .filter((team) => !Number.isNaN(team.id));
}

function normalizeOptionalTeamId(teamId: number | string | undefined) {
  if (teamId === undefined) {
    return undefined;
  }

  if (teamId === '') {
    return null;
  }

  const parsed = Number(teamId);
  return Number.isFinite(parsed) ? parsed : null;
}

function stripEmptyPassword<T extends { password?: string }>(payload: T) {
  if (!payload.password?.trim()) {
    const { password, ...rest } = payload;
    return rest;
  }

  return {
    ...payload,
    password: payload.password.trim()
  };
}

async function syncSingleTeamMembership(
  user: User,
  teamId: number | string | undefined
) {
  const desiredTeamId = normalizeOptionalTeamId(teamId);

  if (desiredTeamId === undefined) {
    return userApi.getUserById(user.id);
  }

  const currentTeamIds = user.teams.map((team) => team.id);

  await Promise.all(
    currentTeamIds
      .filter((id) => id !== desiredTeamId)
      .map((id) =>
        apiClient.delete(`/api/teams/${id}/users/${user.id}`)
      )
  );

  if (
    desiredTeamId &&
    !currentTeamIds.includes(desiredTeamId)
  ) {
    await apiClient.post(
      `/api/teams/${desiredTeamId}/users/${user.id}`
    );
  }

  return userApi.getUserById(user.id);
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
    Array.from(
      { length: firstPage.totalPages - 1 },
      (_, pageOffset) =>
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

  return [firstPage, ...remainingPages].flatMap(
    (page) => page.content
  );
}

export const adminUserService = {
  async getUsers(filters: AdminUserListFilters) {
    const users = await fetchAllUsers(filters);

    const filteredUsers = users.filter((user) =>
      matchesStatus(user, filters.status)
    );

    if (!filteredUsers.length) {
      return emptyPage<User>(
        filters.page,
        filters.size,
        filters.sortBy,
        filters.sortDirection
      );
    }

    const startIndex = filters.page * filters.size;
    const endIndex = startIndex + filters.size;
    const totalPages = Math.ceil(
      filteredUsers.length / filters.size
    );

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
    return userApi.getUsers({
      page: 0,
      size: limit,
      sortBy: 'createdAt',
      sortDirection: 'desc'
    });
  },

  async createUser(payload: CreateAdminUserPayload) {
    const { teamId, ...userPayload } = payload;

    const response = await apiClient.post<User>(
      '/api/users',
      stripEmptyPassword(userPayload)
    );

    return syncSingleTeamMembership(
      response.data,
      teamId
    );
  },

  async updateUser(
    id: number,
    payload: UpdateUserPayload
  ) {
    const { teamId, ...userPayload } = payload;

    const response = await apiClient.put<User>(
      `/api/users/${id}`,
      stripEmptyPassword(userPayload)
    );

    return syncSingleTeamMembership(
      response.data,
      teamId
    );
  },

  async deleteUser(id: number) {
    await userApi.deleteUser(id);
  },

  async getUserById(id: number) {
    return userApi.getUserById(id);
  },

  async getTeamOptions(): Promise<TeamOption[]> {
    try {
      const response = await apiClient.get('/api/teams', {
        params: {
          page: 0,
          size: 100,
          sortBy: 'teamName',
          sortDirection: 'asc'
        }
      });

      return normalizeTeamOptions(response.data);
    } catch (error) {
      console.error('Failed to load team options:', error);
      return [];
    }
  }
};