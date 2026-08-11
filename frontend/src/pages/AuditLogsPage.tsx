import { Download, FileText, Filter, Search, ShieldEllipsis, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatusBadge } from '../components/common/StatusBadge';
import { getApiErrorMessage, apiClient } from '../lib/api';
import { formatDate } from '../lib/formatters';
import type { PagedResponse } from '../types/user';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  requestPath: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILURE';
  httpStatus: number;
}

function exportCsv(logs: AuditLogEntry[]) {
  const rows = [
    ['Timestamp', 'Actor Email', 'Action', 'IP Address', 'Status'],
    ...logs.map((log) => [log.timestamp, log.actor, log.action, log.ipAddress, log.status])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'engineering-copilot-audit.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE'>('ALL');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('ALL');
  const [page, setPage] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void apiClient.get<PagedResponse<AuditLogEntry>>('/api/audit', {
      params: {
        page,
        size: 25,
        query: searchTerm || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        action: actionFilter === 'ALL' ? undefined : actionFilter
      }
    }).then((response) => {
      if (!active) return;
      setLogs(response.data.content ?? []);
      setTotalEvents(response.data.totalElements ?? 0);
      setTotalPages(response.data.totalPages ?? 0);
      setError(null);
    }).catch((requestError) => {
      if (!active) return;
      setLogs([]);
      setError(getApiErrorMessage(requestError));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [actionFilter, page, searchTerm, statusFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setActionFilter('ALL');
    setPage(0);
  };

  const successCount = logs.filter((log) => log.status === 'SUCCESS').length;
  const failureCount = logs.filter((log) => log.status === 'FAILURE').length;
  const successRate = logs.length > 0 ? ((successCount / logs.length) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <section className="page-shell bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-100">Secure traceability</p>
        <h1 className="mt-3 text-3xl font-semibold">Audit logs</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-brand-50/85">Chronological governance trail for identity, security, and platform operations.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Total events</p>
          <p className="mt-2 text-4xl font-semibold text-white">{totalEvents}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Success rate</p>
          <p className="mt-2 text-4xl font-semibold text-green-400">{successRate}%</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Failed events</p>
          <p className="mt-2 text-4xl font-semibold text-rose-400">{failureCount}</p>
        </div>
      </section>

      <section className="page-shell space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
            <ShieldEllipsis className="h-5 w-5" />
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Platform event trail</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-60" disabled={logs.length === 0} onClick={() => exportCsv(logs)} type="button">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" onClick={() => window.print()} type="button">
              <FileText className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_180px_180px_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <Search className="h-4 w-4 text-brand-500" />
            <input
              className="w-full bg-transparent outline-none"
              placeholder="Search by actor, action, or IP..."
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            />
            {searchTerm && (
              <button
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setSearchTerm('')}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <Filter className="h-4 w-4 text-brand-500" />
            <select
              className="w-full bg-transparent outline-none"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as 'ALL' | 'SUCCESS' | 'FAILURE'); setPage(0); }}
            >
              <option value="ALL">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <Filter className="h-4 w-4 text-brand-500" />
            <select
              className="w-full bg-transparent outline-none"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value as 'ALL' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'); setPage(0); }}
            >
              <option value="ALL">All Actions</option>
              <option value="POST">Create / run (POST)</option>
              <option value="PUT">Update (PUT)</option>
              <option value="PATCH">Partial update (PATCH)</option>
              <option value="DELETE">Delete</option>
            </select>
          </label>

          <button
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            onClick={clearFilters}
            type="button"
          >
            Clear filters
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                {['Timestamp', 'Actor Email', 'Action', 'IP Address', 'Status'].map((heading) => (
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500" key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
              {loading ? (
                <tr><td className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400" colSpan={5}>Loading audit events…</td></tr>
              ) : error ? (
                <tr><td className="px-5 py-8 text-center text-sm text-rose-600 dark:text-rose-300" colSpan={5}>{error}</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400" colSpan={5}>
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr className="transition hover:bg-slate-50 dark:hover:bg-slate-900" key={log.id}>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(log.timestamp)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-950 dark:text-white">{log.actor}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300"><span className="font-semibold">{log.action}</span> <span className="block text-xs text-slate-400">{log.requestPath}</span></td>
                    <td className="px-5 py-4 font-mono text-sm text-slate-600 dark:text-slate-300">{log.ipAddress}</td>
                    <td className="px-5 py-4">
                      <StatusBadge label={log.status === 'SUCCESS' ? 'Success' : 'Failed'} tone={log.status === 'SUCCESS' ? 'success' : 'danger'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Page {totalPages === 0 ? 0 : page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button className="rounded-xl border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40 dark:border-slate-700" disabled={page === 0 || loading} onClick={() => setPage((current) => current - 1)} type="button">Previous</button>
            <button className="rounded-xl border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40 dark:border-slate-700" disabled={loading || page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)} type="button">Next</button>
          </div>
        </div>
      </section>
    </div>
  );
}
