export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILURE';
}

export interface HealthMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'system' | 'approval' | 'security';
  unread: boolean;
}

export interface AnalyticsPoint {
  label: string;
  value: number;
}

const now = Date.now();

export const platformMockService = {
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    return [
      {
        id: 'audit-001',
        timestamp: new Date(now - 1000 * 60 * 8).toISOString(),
        actor: 'Amina Dupont',
        action: 'Created manager account',
        ipAddress: '10.24.18.41',
        status: 'SUCCESS'
      },
      {
        id: 'audit-002',
        timestamp: new Date(now - 1000 * 60 * 34).toISOString(),
        actor: 'System Gateway',
        action: 'Rejected expired token',
        ipAddress: '172.16.0.18',
        status: 'FAILURE'
      },
      {
        id: 'audit-003',
        timestamp: new Date(now - 1000 * 60 * 78).toISOString(),
        actor: 'Karim Martin',
        action: 'Updated documentation status',
        ipAddress: '10.24.22.9',
        status: 'SUCCESS'
      },
      {
        id: 'audit-004',
        timestamp: new Date(now - 1000 * 60 * 145).toISOString(),
        actor: 'Nora Benali',
        action: 'Exported project report',
        ipAddress: '10.24.19.77',
        status: 'SUCCESS'
      }
    ];
  },

  async getHealthMetrics(): Promise<HealthMetric[]> {
    return [
      { id: 'cpu', label: 'CPU Usage', value: 42, unit: '%', status: 'healthy' },
      { id: 'memory', label: 'Memory Utilization', value: 68, unit: '%', status: 'warning' },
      { id: 'latency', label: 'API Gateway Latency', value: 128, unit: 'ms', status: 'healthy' },
      { id: 'database', label: 'Database Connection Pool', value: 74, unit: '%', status: 'warning' }
    ];
  },

  async getNotifications(): Promise<NotificationItem[]> {
    return [
      {
        id: 'notif-001',
        title: 'Manager provisioning requires review',
        description: 'A delivery manager account was created and awaits team ownership validation.',
        timestamp: new Date(now - 1000 * 60 * 5).toISOString(),
        type: 'approval',
        unread: true
      },
      {
        id: 'notif-002',
        title: 'Gateway latency stabilized',
        description: 'API gateway latency returned below the enterprise threshold.',
        timestamp: new Date(now - 1000 * 60 * 28).toISOString(),
        type: 'system',
        unread: true
      },
      {
        id: 'notif-003',
        title: 'Security policy refreshed',
        description: 'Audit retention policy and token rotation windows were refreshed.',
        timestamp: new Date(now - 1000 * 60 * 92).toISOString(),
        type: 'security',
        unread: false
      }
    ];
  },

  async getAnalytics() {
    return {
      documentationTrend: [
        { label: 'Jan', value: 18 },
        { label: 'Feb', value: 24 },
        { label: 'Mar', value: 32 },
        { label: 'Apr', value: 41 },
        { label: 'May', value: 53 },
        { label: 'Jun', value: 61 }
      ] satisfies AnalyticsPoint[],
      activeUsers: [
        { label: 'W1', value: 74 },
        { label: 'W2', value: 91 },
        { label: 'W3', value: 108 },
        { label: 'W4', value: 126 }
      ] satisfies AnalyticsPoint[],
      completion: [
        { label: 'Design', value: 92 },
        { label: 'Build', value: 76 },
        { label: 'QA', value: 64 },
        { label: 'Release', value: 48 }
      ] satisfies AnalyticsPoint[]
    };
  }
};
