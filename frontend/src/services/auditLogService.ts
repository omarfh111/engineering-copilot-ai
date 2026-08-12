import { apiClient } from '../lib/api';
import type { PagedResponse } from '../types/user';

export type AuditLogStatus = 'SUCCESS' | 'FAILURE';

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  ipAddress: string;
  status: AuditLogStatus;
}

export interface AuditLogQueryParams {
  search?: string;
  status?: AuditLogStatus | '';
  action?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

function compactParams(params: AuditLogQueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function emptyAuditPage(params: AuditLogQueryParams): PagedResponse<AuditLogEntry> {
  const content = loadLocalAuditLogs(params);
  return {
    content,
    page: params.page ?? 0,
    size: params.size ?? 100,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    first: true,
    last: true,
    sortBy: params.sortBy ?? 'timestamp',
    sortDirection: params.sortDirection ?? 'desc'
  };
}

function loadLocalAuditLogs(params: AuditLogQueryParams) {
  try {
    const logs = JSON.parse(localStorage.getItem('copilote_local_audit_logs') ?? '[]') as AuditLogEntry[];
    const search = params.search?.trim().toLowerCase();
    const action = params.action?.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch = !search || [log.actor, log.action, log.ipAddress].some((value) => value.toLowerCase().includes(search));
      const matchesStatus = !params.status || log.status === params.status;
      const matchesAction = !action || log.action.toLowerCase().includes(action);
      return matchesSearch && matchesStatus && matchesAction;
    });
  } catch {
    return [];
  }
}

function storeLocalAuditLog(action: string, status: AuditLogStatus) {
  const entry: AuditLogEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    actor: 'Local fallback',
    action,
    ipAddress: 'local',
    status
  };
  const logs = [entry, ...loadLocalAuditLogs({})].slice(0, 100);
  localStorage.setItem('copilote_local_audit_logs', JSON.stringify(logs));
  return entry;
}

export const auditLogService = {
  async getAuditLogs(params: AuditLogQueryParams) {
    try {
      const response = await apiClient.get<PagedResponse<AuditLogEntry>>('/api/audit/logs', {
        params: compactParams(params)
      });
      return response.data;
    } catch (error) {
      console.warn('Backend 500 error on /api/audit/logs, using local fallback data', error);
      return emptyAuditPage(params);
    }
  },

  async recordEvent(action: string, status: AuditLogStatus = 'SUCCESS') {
    try {
      const response = await apiClient.post<AuditLogEntry>('/api/audit/events', { action, status });
      return response.data;
    } catch (error) {
      console.warn('Backend 500 error on /api/audit/events, using local fallback data', error);
      return storeLocalAuditLog(action, status);
    }
  }
};
