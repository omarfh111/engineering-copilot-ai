import { Download, FileText, Filter, Search, ShieldEllipsis, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatDate } from '../lib/formatters';
import { auditLogService, type AuditLogEntry, type AuditLogStatus } from '../services/auditLogService';

type ActionFilter = 'ALL' | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'SETTINGS';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildCsv(logs: AuditLogEntry[]) {
  const rows = [
    ['Timestamp', 'Actor Email', 'Action', 'IP Address', 'Status'],
    ...logs.map((log) => [log.timestamp, log.actor, log.action, log.ipAddress, log.status])
  ];

  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function exportPdf(logs: AuditLogEntry[]) {
  const lines = [
    'Engineering Copilot Audit Logs',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    ...logs.slice(0, 45).map((log) =>
      `${formatDate(log.timestamp)} | ${log.status} | ${log.actor} | ${log.action} | ${log.ipAddress}`
    )
  ];
  const content = lines.map((line, index) => `BT /F1 9 Tf 40 ${760 - index * 15} Td (${escapePdfText(line.slice(0, 120))}) Tj ET`).join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`
  ];
  const body = objects.join('\n');
  const pdf = `%PDF-1.4\n${body}\ntrailer << /Root 1 0 R >>\n%%EOF`;
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), 'engineering-copilot-audit.pdf');
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AuditLogStatus>('ALL');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const page = await auditLogService.getAuditLogs({
          page: 0,
          size: 100,
          sortBy: 'timestamp',
          sortDirection: 'desc',
          search: searchTerm,
          status: statusFilter === 'ALL' ? '' : statusFilter,
          action: actionFilter === 'ALL' ? '' : actionFilter
        });
        if (active) setLogs(page.content);
      } catch {
        if (active) setLogs([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    const debounce = window.setTimeout(() => void load(), 250);
    return () => {
      active = false;
      window.clearTimeout(debounce);
    };
  }, [searchTerm, statusFilter, actionFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setActionFilter('ALL');
  };

  const filteredLogs = logs;
  const successCount = filteredLogs.filter((log) => log.status === 'SUCCESS').length;
  const failureCount = filteredLogs.filter((log) => log.status === 'FAILURE').length;
  const successRate = filteredLogs.length > 0 ? ((successCount / filteredLogs.length) * 100).toFixed(1) : '0';

  const handleExportCsv = async () => {
    downloadBlob(new Blob([buildCsv(filteredLogs)], { type: 'text/csv;charset=utf-8' }), 'engineering-copilot-audit.csv');
    await auditLogService.recordEvent('Exported audit CSV').catch(() => undefined);
  };

  const handleExportPdf = async () => {
    exportPdf(filteredLogs);
    await auditLogService.recordEvent('Exported audit PDF').catch(() => undefined);
  };

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
          <p className="mt-2 text-4xl font-semibold text-white">{filteredLogs.length}</p>
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
            <button className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600" onClick={handleExportCsv} type="button">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" onClick={handleExportPdf} type="button">
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
              onChange={(e) => setSearchTerm(e.target.value)}
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
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | AuditLogStatus)}
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
              onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="EXPORT">Export</option>
              <option value="SETTINGS">Settings</option>
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

        {loading ? <LoadingSpinner label="Loading audit logs..." /> : null}

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
              {filteredLogs.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400" colSpan={5}>
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr className="transition hover:bg-slate-50 dark:hover:bg-slate-900" key={log.id}>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(log.timestamp)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-950 dark:text-white">{log.actor}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{log.action}</td>
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
      </section>
    </div>
  );
}
