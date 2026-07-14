import type { ProjectStatus } from '../types/project';

export const projectStatusOptions: ProjectStatus[] = ['CREATED', 'INDEXING', 'ANALYZING', 'READY', 'AUDITED', 'CLOSED'];

export function formatProjectStatus(status: ProjectStatus | string) {
  return status
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function getProjectStatusTone(status: ProjectStatus | string): 'brand' | 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'READY':
      return 'success';
    case 'INDEXING':
    case 'ANALYZING':
      return 'warning';
    case 'AUDITED':
      return 'brand';
    case 'CLOSED':
    case 'CREATED':
    default:
      return 'neutral';
  }
}
