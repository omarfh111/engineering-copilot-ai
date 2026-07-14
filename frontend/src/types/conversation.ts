export interface ConversationProjectSummary {
  id: number;
  title: string;
  description: string | null;
  status: string;
}

export interface ConversationUserSummary {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: string;
}

export interface Conversation {
  id: number;
  conversationId: number;
  question: string;
  response: string | null;
  confidenceScore: number | null;
  responseTime: number | null;
  user: ConversationUserSummary | null;
  project: ConversationProjectSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationQueryParams {
  search?: string;
  projectId?: number | '';
  userId?: number | '';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CreateConversationPayload {
  question: string;
  response: string;
  confidenceScore: number | null;
  responseTime: number | null;
  projectId: number;
}

export interface UpdateConversationPayload {
  question: string;
  response: string;
  confidenceScore: number | null;
  responseTime: number | null;
  projectId: number;
}
