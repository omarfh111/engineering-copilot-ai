import { apiClient, userApi } from '../lib/api';
import type { ApiRole, PagedResponse, User } from '../types/user';
import type { CreateTeamPayload, Team, TeamMember, TeamQueryParams, UpdateTeamPayload } from '../types/team';

function removeEmptyValues(params: TeamQueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function sortUsers(users: User[]) {
  return [...users].sort((left, right) => {
    const nameComparison = `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`);

    if (nameComparison !== 0) {
      return nameComparison;
    }

    return left.username.localeCompare(right.username);
  });
}

function normalizeRole(role: ApiRole) {
  return role === 'AUDITOR' ? 'MANAGER' : role;
}

type ApiTeamMember = Omit<TeamMember, 'role'> & { role: ApiRole };
type ApiTeam = Omit<Team, 'members' | 'leader'> & {
  members: ApiTeamMember[];
  leader: ApiTeamMember | null;
};

function normalizeTeamMember(member: TeamMember | ApiTeamMember) {
  return {
    ...member,
    role: normalizeRole(member.role)
  } as TeamMember;
}

function normalizeTeam(team: Team | ApiTeam) {
  return {
    ...team,
    members: team.members.map(normalizeTeamMember),
    leader: team.leader ? normalizeTeamMember(team.leader) : null
  } as Team;
}

function normalizeTeamPage(page: PagedResponse<Team | ApiTeam>) {
  return {
    ...page,
    content: page.content.map(normalizeTeam)
  } as PagedResponse<Team>;
}

export const adminTeamService = {
  async getTeams(params: TeamQueryParams) {
    const response = await apiClient.get<PagedResponse<ApiTeam>>('/api/teams', {
      params: removeEmptyValues(params)
    });

    return normalizeTeamPage(response.data);
  },

  async getTeamById(id: number) {
    const response = await apiClient.get<ApiTeam>(`/api/teams/${id}`);
    return normalizeTeam(response.data);
  },

  async createTeam(payload: CreateTeamPayload) {
    const response = await apiClient.post<ApiTeam>('/api/teams', payload);
    return normalizeTeam(response.data);
  },

  async updateTeam(id: number, payload: UpdateTeamPayload) {
    const response = await apiClient.put<ApiTeam>(`/api/teams/${id}`, payload);
    return normalizeTeam(response.data);
  },

  async deleteTeam(id: number) {
    await apiClient.delete(`/api/teams/${id}`);
  },

  async addUserToTeam(teamId: number, userId: number) {
    const response = await apiClient.post<ApiTeam>(`/api/teams/${teamId}/users/${userId}`);
    return normalizeTeam(response.data);
  },

  async removeUserFromTeam(teamId: number, userId: number) {
    const response = await apiClient.delete<ApiTeam>(`/api/teams/${teamId}/users/${userId}`);
    return normalizeTeam(response.data);
  },

  async assignTeamLeader(teamId: number, userId: number) {
    const response = await apiClient.put<ApiTeam>(`/api/teams/${teamId}/leader/${userId}`, null);
    return normalizeTeam(response.data);
  },

  async removeTeamLeader(teamId: number) {
    const response = await apiClient.delete<ApiTeam>(`/api/teams/${teamId}/leader`);
    return normalizeTeam(response.data);
  },

  async getAvailableUsers(team: Team | null) {
    const response = await userApi.getUsers({
      page: 0,
      size: 100,
      sortBy: 'firstName',
      sortDirection: 'asc'
    });

    const memberIds = new Set(team?.members.map((member) => member.id) ?? []);

    return sortUsers(response.content.filter((user) => !memberIds.has(user.id)));
  }
};
