import type { AnalysisType } from './analysis';

export type TodoPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TodoStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'IGNORED';

export type TodoPriorityFilter = TodoPriority | '';
export type TodoStatusFilter = TodoStatus | '';

export interface TodoAnalysisSummary {
  id: number;
  analysisId: number;
  type: AnalysisType | string | null;
  status: string | null;
  summary: string | null;
  projectId: number | null;
  projectTitle: string | null;
}

export interface TodoProjectSummary {
  id: number;
  title: string;
  description: string | null;
  status: string;
}

export interface Todo {
  id: number;
  todoId: number;
  title: string;
  description: string | null;
  priority: TodoPriority;
  status: TodoStatus;
  filePath: string | null;
  lineNumber: number | null;
  analysis: TodoAnalysisSummary | null;
  project: TodoProjectSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface TodoQueryParams {
  search?: string;
  status?: TodoStatusFilter;
  priority?: TodoPriorityFilter;
  analysisId?: number | '';
  projectId?: number | '';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CreateTodoPayload {
  title: string;
  description: string;
  priority: TodoPriority;
  status?: TodoStatus;
  filePath: string;
  lineNumber: number | null;
  analysisId: number;
}

export interface UpdateTodoPayload {
  title: string;
  description: string;
  priority: TodoPriority;
  status: TodoStatus;
  filePath: string;
  lineNumber: number | null;
  analysisId: number;
}
