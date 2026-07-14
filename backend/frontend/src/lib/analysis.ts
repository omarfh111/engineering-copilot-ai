import type { AnalysisStatus, AnalysisType, Severity } from '../types/analysis';

export const analysisTypeOptions: AnalysisType[] = ['SECURITY', 'QUALITY', 'ARCHITECTURE', 'DOCUMENTATION', 'TODO_GENERATION'];
export const analysisStatusOptions: AnalysisStatus[] = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'];
export const severityOptions: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function formatEnumLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function getStatusTone(status: string) {
  if (status === 'COMPLETED' || status === 'ACCEPTED' || status === 'DONE') {
    return 'success' as const;
  }

  if (status === 'FAILED' || status === 'REJECTED' || status === 'CRITICAL') {
    return 'danger' as const;
  }

  if (status === 'RUNNING' || status === 'IN_PROGRESS' || status === 'PENDING' || status === 'HIGH') {
    return 'warning' as const;
  }

  return 'neutral' as const;
}
