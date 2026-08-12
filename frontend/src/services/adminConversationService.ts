import { apiClient } from '../lib/api';
import type {
  Conversation,
  ConversationProjectSummary,
  ConversationQueryParams,
  ConversationUserSummary,
  CreateConversationPayload,
  UpdateConversationPayload
} from '../types/conversation';
import type { PagedResponse } from '../types/user';

function removeEmptyValues(params: ConversationQueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

type ApiConversationProject = Partial<ConversationProjectSummary> & {
  id?: number | string;
  projectId?: number | string;
  title?: string | null;
  projectTitle?: string | null;
};

type ApiConversationUser = Partial<ConversationUserSummary> & {
  id?: number | string;
};

type ApiConversation = Omit<Conversation, 'project' | 'user' | 'confidenceScore' | 'responseTime'> & {
  id: number | string;
  conversationId?: number | string;
  confidenceScore?: number | string | null;
  responseTime?: number | string | null;
  project?: ApiConversationProject | null;
  user?: ApiConversationUser | null;
  projectId?: number | string | null;
  projectTitle?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function normalizeProject(conversation: ApiConversation): ConversationProjectSummary | null {
  const project = conversation.project;
  const id = Number(project?.id ?? project?.projectId ?? conversation.projectId ?? 0);

  if (!id) {
    return null;
  }

  return {
    id,
    title: String(project?.title ?? project?.projectTitle ?? conversation.projectTitle ?? 'Unnamed project'),
    description: project?.description ?? null,
    status: String(project?.status ?? 'UNKNOWN')
  };
}

function normalizeUser(user?: ApiConversationUser | null): ConversationUserSummary | null {
  if (!user?.id) {
    return null;
  }

  return {
    id: Number(user.id),
    firstName: String(user.firstName ?? ''),
    lastName: String(user.lastName ?? ''),
    username: String(user.username ?? 'Unknown user'),
    email: String(user.email ?? ''),
    role: String(user.role ?? '')
  };
}

function normalizeConversation(conversation: ApiConversation): Conversation {
  const id = Number(conversation.id ?? conversation.conversationId);

  return {
    id,
    conversationId: Number(conversation.conversationId ?? id),
    question: conversation.question,
    response: conversation.response ?? null,
    confidenceScore:
      conversation.confidenceScore === null || conversation.confidenceScore === undefined
        ? null
        : Number(conversation.confidenceScore),
    responseTime:
      conversation.responseTime === null || conversation.responseTime === undefined ? null : Number(conversation.responseTime),
    user: normalizeUser(conversation.user),
    project: normalizeProject(conversation),
    createdAt: String(conversation.createdAt ?? ''),
    updatedAt: String(conversation.updatedAt ?? conversation.createdAt ?? '')
  };
}

function normalizeConversationPage(page: PagedResponse<ApiConversation>) {
  return {
    ...page,
    content: page.content.map(normalizeConversation)
  } satisfies PagedResponse<Conversation>;
}

export const adminConversationService = {
  async getConversations(params: ConversationQueryParams) {
    const response = await apiClient.get<PagedResponse<ApiConversation>>('/api/conversations', {
      params: removeEmptyValues(params)
    });

    return normalizeConversationPage(response.data);
  },

  async getConversationById(id: number) {
    const response = await apiClient.get<ApiConversation>(`/api/conversations/${id}`);
    return normalizeConversation(response.data);
  },

  async getConversationsByProjectId(projectId: number) {
    const response = await apiClient.get<ApiConversation[]>(`/api/conversations/project/${projectId}`);
    return response.data.map(normalizeConversation);
  },

  async createConversation(payload: CreateConversationPayload) {
    const response = await apiClient.post<ApiConversation>('/api/conversations', payload);
    return normalizeConversation(response.data);
  },

  async updateConversation(id: number, payload: UpdateConversationPayload) {
    const response = await apiClient.put<ApiConversation>(`/api/conversations/${id}`, payload);
    return normalizeConversation(response.data);
  },

  async deleteConversation(id: number) {
    await apiClient.delete(`/api/conversations/${id}`);
  }
};
