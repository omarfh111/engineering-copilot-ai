import type { TodoPriority, TodoStatus } from '../types/todo';
import { formatEnumLabel } from './analysis';

export const todoPriorityOptions: TodoPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const todoStatusOptions: TodoStatus[] = ['OPEN', 'IN_PROGRESS', 'DONE', 'IGNORED'];

export { formatEnumLabel };
