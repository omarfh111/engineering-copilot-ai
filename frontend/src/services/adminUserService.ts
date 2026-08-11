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
const LOCAL_ADMIN_USERS_KEY = 'copilote_local_admin_users';

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

function loadLocalUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ADMIN_USERS_KEY) ?? '[]') as User[];
  } catch {
    return [];
  }
}

function saveLocalUser(user: User) {
  const users = loadLocalUsers();
  const nextUsers = [user, ...users.filter((item) => item.id !== user.id)];
  localStorage.setItem(LOCAL_ADMIN_USERS_KEY, JSON.stringify(nextUsers));
  return user;
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

function normalizeUserPayloadRole<T extends { role?: string }>(payload: T) {
  if (!payload.role) {
    return payload;
  }

  return {
    ...payload,
    role: payload.role.replace(/^ROLE_/, '').trim()
  };
}

async function syncSingleTeamMembership(
  user: User,
  teamId: number | string | undefined
) {
  const desiredTeamId = normalizeOptionalTeamId(teamId);

  // If no team is specified, just return the user without any team operations
  if (desiredTeamId === undefined || desiredTeamId === null) {
    return userApi.getUserById(user.id);
  }

  const currentTeamIds = (user.teams ?? []).map((team) => team.id);

  // Remove user from all teams except the desired one
  await Promise.all(
    currentTeamIds
      .filter((id) => id !== desiredTeamId)
      .map((id) =>
        apiClient.delete(`/api/teams/${id}/users/${user.id}`)
      )
  );

  // Add user to the desired team if not already a member
  if (
    desiredTeamId &&
    !currentTeamIds.includes(desiredTeamId)
  ) {
    try {
      await apiClient.post(
        `/api/teams/${desiredTeamId}/users/${user.id}`
      );
    } catch (error) {
      console.warn('Failed to add user to team, but user creation succeeded:', error);
    }
  }

  return userApi.getUserById(user.id);
}

async function fetchAllUsers(filters: AdminUserListFilters) {
  let firstPage: PagedResponse<User>;

  try {
    firstPage = await userApi.getUsers({
      search: filters.search,
      role: filters.role,
      page: 0,
      size: BULK_PAGE_SIZE,
      sortBy: filters.sortBy,
      sortDirection: filters.sortDirection
    });
    firstPage.content.forEach(saveLocalUser);
  } catch (error) {
    console.warn('Backend 500 error on /api/admin/users/*, using local fallback data', error);
    return loadLocalUsers();
  }

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
        }).catch((error) => {
          console.warn('Backend 500 error on /api/admin/users/*, using local fallback data', error);
          return emptyPage<User>(pageOffset + 1, BULK_PAGE_SIZE, filters.sortBy, filters.sortDirection);
        })
    )
  );

  remainingPages.flatMap((page) => page.content).forEach(saveLocalUser);

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
      const localUsers = loadLocalUsers().filter((user) => matchesStatus(user, filters.status));
      if (localUsers.length) {
        return {
          ...emptyPage<User>(filters.page, filters.size, filters.sortBy, filters.sortDirection),
          content: localUsers.slice(filters.page * filters.size, filters.page * filters.size + filters.size),
          totalElements: localUsers.length,
          totalPages: Math.ceil(localUsers.length / filters.size)
        };
      }

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
    const requestPayload = normalizeUserPayloadRole(
      stripEmptyPassword(userPayload)
    );

    try {
      const response = await apiClient.post<User>(
        '/api/users',
        requestPayload
      );

      // Only sync team membership if teamId is provided and not empty
      if (teamId && teamId !== '') {
        return syncSingleTeamMembership(
          response.data,
          teamId
        );
      }

      return response.data;
    } catch (error) {
      console.error('User creation failed:', error);
      throw error;
    }
  },

  async updateUser(
    id: number,
    payload: UpdateUserPayload
  ) {
    const { teamId, ...userPayload } = payload;
    const normalizedPayload = normalizeUserPayloadRole(
      stripEmptyPassword(userPayload)
    );

    // Add ROLE_ prefix for backend compatibility if role is provided
    const requestPayload = normalizedPayload.role
      ? {
          ...normalizedPayload,
          role: `ROLE_${normalizedPayload.role}`
        }
      : normalizedPayload;

    try {
      const response = await apiClient.put<User>(
        `/api/users/${id}`,
        requestPayload
      );

      saveLocalUser(response.data);
      return syncSingleTeamMembership(
        response.data,
        teamId
      );
    } catch (error) {
      console.warn(`Backend 500 error on /api/admin/users/${id}, using local fallback data`, error);
      const existing = loadLocalUsers().find((user) => user.id === id);
      if (!existing) {
        throw error;
      }
      localStorage.setItem(`copilote_pending_profile_sync:${id}`, JSON.stringify({ changedAt: new Date().toISOString() }));
      return saveLocalUser({ ...existing, ...requestPayload } as User);
    }
  },

  async deleteUser(id: number) {
    await userApi.deleteUser(id);
  },

  async getUserById(id: number) {
    try {
      const user = await userApi.getUserById(id);
      return saveLocalUser(user);
    } catch (error) {
      console.warn(`Backend 500 error on /api/admin/users/${id}, using local fallback data`, error);
      const user = loadLocalUsers().find((item) => item.id === id);
      if (!user) throw error;
      return user;
    }
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
