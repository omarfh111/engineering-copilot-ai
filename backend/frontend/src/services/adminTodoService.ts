import { apiClient } from '../lib/api';
import type {
  CreateTodoPayload,
  Todo,
  TodoAnalysisSummary,
  TodoPriority,
  TodoProjectSummary,
  TodoQueryParams,
  TodoStatus,
  UpdateTodoPayload
} from '../types/todo';
import type { PagedResponse } from '../types/user';

function removeEmptyValues(params: TodoQueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

type ApiTodoAnalysis = Partial<TodoAnalysisSummary> & {
  id?: number | string;
  analysisId?: number | string;
  type?: string | null;
  analysisType?: string | null;
  projectId?: number | string | null;
  projectTitle?: string | null;
};

type ApiTodoProject = Partial<TodoProjectSummary> & {
  id?: number | string;
  projectId?: number | string;
  title?: string | null;
  projectTitle?: string | null;
  description?: string | null;
  status?: string | null;
};

type ApiTodo = Omit<Todo, 'analysis' | 'project' | 'priority' | 'status'> & {
  id: number | string;
  todoId?: number | string;
  priority?: TodoPriority | string | null;
  status?: TodoStatus | string | null;
  analysis?: ApiTodoAnalysis | null;
  project?: ApiTodoProject | null;
  analysisId?: number | string | null;
  analysisType?: string | null;
  projectId?: number | string | null;
  projectTitle?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function normalizeAnalysis(todo: ApiTodo): TodoAnalysisSummary | null {
  const analysis = todo.analysis;
  const id = Number(analysis?.id ?? analysis?.analysisId ?? todo.analysisId ?? 0);

  if (!id) {
    return null;
  }

  return {
    id,
    analysisId: id,
    type: analysis?.type ?? analysis?.analysisType ?? todo.analysisType ?? null,
    status: analysis?.status ?? null,
    summary: analysis?.summary ?? null,
    projectId: Number(analysis?.projectId ?? todo.projectId ?? 0) || null,
    projectTitle: analysis?.projectTitle ?? todo.projectTitle ?? null
  };
}

function normalizeProject(todo: ApiTodo): TodoProjectSummary | null {
  const project = todo.project;
  const id = Number(project?.id ?? project?.projectId ?? todo.projectId ?? todo.analysis?.projectId ?? 0);

  if (!id) {
    return null;
  }

  return {
    id,
    title: String(project?.title ?? project?.projectTitle ?? todo.projectTitle ?? todo.analysis?.projectTitle ?? 'Unnamed project'),
    description: project?.description ?? null,
    status: String(project?.status ?? 'UNKNOWN')
  };
}

function normalizeTodo(todo: ApiTodo): Todo {
  const id = Number(todo.id ?? todo.todoId);

  return {
    id,
    todoId: Number(todo.todoId ?? id),
    title: todo.title,
    description: todo.description ?? null,
    priority: (todo.priority ?? 'MEDIUM') as TodoPriority,
    status: (todo.status ?? 'OPEN') as TodoStatus,
    filePath: todo.filePath ?? null,
    lineNumber: todo.lineNumber ?? null,
    analysis: normalizeAnalysis(todo),
    project: normalizeProject(todo),
    createdAt: String(todo.createdAt ?? ''),
    updatedAt: String(todo.updatedAt ?? todo.createdAt ?? '')
  };
}

function normalizeTodoPage(page: PagedResponse<ApiTodo>) {
  return {
    ...page,
    content: page.content.map(normalizeTodo)
  } satisfies PagedResponse<Todo>;
}

export const adminTodoService = {
  async getTodos(params: TodoQueryParams) {
    const response = await apiClient.get<PagedResponse<ApiTodo>>('/api/todos', {
      params: removeEmptyValues(params)
    });

    return normalizeTodoPage(response.data);
  },

  async getTodoById(id: number) {
    const response = await apiClient.get<ApiTodo>(`/api/todos/${id}`);
    return normalizeTodo(response.data);
  },

  async getTodosByProjectId(projectId: number) {
    const response = await apiClient.get<ApiTodo[]>(`/api/todos/project/${projectId}`);
    return response.data.map(normalizeTodo);
  },

  async createTodo(payload: CreateTodoPayload) {
    const response = await apiClient.post<ApiTodo>('/api/todos', payload);
    return normalizeTodo(response.data);
  },

  async updateTodo(id: number, payload: UpdateTodoPayload) {
    const response = await apiClient.put<ApiTodo>(`/api/todos/${id}`, payload);
    return normalizeTodo(response.data);
  },

  async deleteTodo(id: number) {
    await apiClient.delete(`/api/todos/${id}`);
  }
};
