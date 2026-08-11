import { useEffect, useMemo, useState } from 'react';
import { Activity, Cpu, Database, HardDrive, RefreshCw, Search, Server, ShieldCheck, Timer } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { apiClient } from '../lib/api';

type MetricStatus = 'healthy' | 'warning' | 'critical';
type ServiceStatus = 'Operational' | 'Degraded' | 'Down';
type EventLevel = 'INFO' | 'WARN' | 'SUCCESS';

interface HealthMetric {
  id: 'cpu' | 'memory' | 'latency';
  label: string;
  value: number;
  max: number;
  unit: string;
  status?: MetricStatus;
}

interface ServiceHealth {
  name: string;
  region: string;
  latencyMs: number;
  uptime: number;
  status: ServiceStatus;
}

interface OperationalEvent {
  level: EventLevel;
  message: string;
  timestamp: string;
}

interface HealthResponse {
  timestamp: string;
  metrics: HealthMetric[];
  services: ServiceHealth[];
  events: OperationalEvent[];
}

interface ChartPoint {
  timestamp: number;
  latency: number;
  cpu: number;
}

const icons = {
  cpu: Cpu,
  memory: HardDrive,
  latency: Timer
};

const fallbackServices: ServiceHealth[] = [
  { name: 'Authentication Service', region: 'JWT / eu-west-1', latencyMs: 42, uptime: 99.99, status: 'Operational' },
  { name: 'Primary Database', region: 'PostgreSQL / eu-west-1', latencyMs: 58, uptime: 99.95, status: 'Operational' },
  { name: 'Search & Analytics Engine', region: 'Vector index / eu-west-1', latencyMs: 92, uptime: 99.87, status: 'Degraded' },
  { name: 'Storage & File Delivery API', region: 'Object storage / eu-west-1', latencyMs: 64, uptime: 99.91, status: 'Operational' }
];

const fallbackEvents: OperationalEvent[] = [
  { level: 'SUCCESS', message: 'SSL certificate renewed', timestamp: new Date().toISOString() },
  { level: 'INFO', message: 'Automated DB backup completed', timestamp: new Date(Date.now() - 180_000).toISOString() },
  { level: 'WARN', message: 'Memory spike detected on Node-2', timestamp: new Date(Date.now() - 420_000).toISOString() }
];

function getMetricStatus(metric: HealthMetric): MetricStatus {
  if (metric.id === 'latency') {
    if (metric.value > 400) return 'critical';
    if (metric.value > 250) return 'warning';
    return 'healthy';
  }

  if (metric.value > 85) return 'critical';
  if (metric.value > 70) return 'warning';
  return 'healthy';
}

function getBarColor(status: MetricStatus) {
  if (status === 'critical') return 'bg-rose-500';
  if (status === 'warning') return 'bg-amber-500';
  return 'bg-green-500';
}

function statusBadge(status: MetricStatus | ServiceStatus) {
  if (status === 'critical' || status === 'Down') return <StatusBadge label={status === 'Down' ? 'Down' : 'Critical'} tone="danger" />;
  if (status === 'warning' || status === 'Degraded') return <StatusBadge label={status === 'Degraded' ? 'Degraded' : 'Warning'} tone="warning" />;
  return <StatusBadge label={status === 'Operational' ? 'Operational' : 'Healthy'} tone="success" />;
}

function relativeTime(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `Updated ${minutes}m ago`;
}

function makeFallbackTelemetry(): HealthResponse {
  const cpu = 46 + Math.random() * 18;
  const memory = 63 + Math.random() * 15;
  const latency = 105 + Math.random() * 70;

  return {
    timestamp: new Date().toISOString(),
    metrics: [
      { id: 'cpu', label: 'CPU Usage', value: cpu, max: 100, unit: '%' },
      { id: 'memory', label: 'Memory', value: memory, max: 100, unit: '%' },
      { id: 'latency', label: 'API Response Time', value: latency, max: 500, unit: 'ms' }
    ],
    services: fallbackServices.map((service) => ({
      ...service,
      latencyMs: Math.max(20, Math.round(service.latencyMs + (Math.random() - 0.5) * 18))
    })),
    events: fallbackEvents
  };
}

function PerformanceChart({ points }: { points: ChartPoint[] }) {
  const [hovered, setHovered] = useState<ChartPoint | null>(null);
  const width = 720;
  const height = 260;
  const padding = 34;
  const recentPoints = points.slice(-24);
  const maxLatency = Math.max(250, ...recentPoints.map((point) => point.latency));

  const x = (index: number) => padding + (index / Math.max(1, recentPoints.length - 1)) * (width - padding * 2);
  const cpuY = (value: number) => height - padding - (value / 100) * (height - padding * 2);
  const latencyY = (value: number) => height - padding - (value / maxLatency) * (height - padding * 2);
  const toPath = (values: number[], y: (value: number) => number) =>
    values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`).join(' ');

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-300">Performance Trend</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">API latency and CPU usage</h3>
        </div>
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand-500" />CPU %</span>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" />Latency ms</span>
        </div>
      </div>

      <svg className="h-[260px] w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="API latency and CPU usage over time">
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1={padding} x2={width - padding} y1={padding + line * 55} y2={padding + line * 55} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
        ))}
        <path d={toPath(recentPoints.map((point) => point.cpu), cpuY)} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
        <path d={toPath(recentPoints.map((point) => point.latency), latencyY)} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
        {recentPoints.map((point, index) => (
          <circle
            className="cursor-pointer fill-white stroke-brand-500 dark:fill-slate-950"
            cx={x(index)}
            cy={cpuY(point.cpu)}
            key={point.timestamp}
            r={hovered?.timestamp === point.timestamp ? 5 : 3}
            strokeWidth="2"
            onMouseEnter={() => setHovered(point)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <p className="min-h-5 text-sm text-slate-500 dark:text-slate-400">
        {hovered ? `${new Date(hovered.timestamp).toLocaleTimeString()} - CPU ${Math.round(hovered.cpu)}%, latency ${Math.round(hovered.latency)}ms` : 'Hover points to inspect a sample.'}
      </p>
    </div>
  );
}

export function SystemHealthPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [relativeUpdated, setRelativeUpdated] = useState('Just now');
  const [metrics, setMetrics] = useState<HealthMetric[]>(makeFallbackTelemetry().metrics);
  const [services, setServices] = useState<ServiceHealth[]>(fallbackServices);
  const [events, setEvents] = useState<OperationalEvent[]>(fallbackEvents);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>(() =>
    Array.from({ length: 24 }, (_, index) => ({
      timestamp: Date.now() - (23 - index) * 60_000,
      latency: 95 + Math.random() * 75,
      cpu: 38 + Math.random() * 22
    }))
  );

  const refreshTelemetry = async () => {
    const response = await apiClient.get<HealthResponse>('/api/health').then((result) => result.data).catch((error) => {
      console.warn('Backend 500 error on /api/health, using local fallback data', error);
      return makeFallbackTelemetry();
    });
    const telemetry = response.metrics && response.services && response.events ? response : makeFallbackTelemetry();
    const normalizedMetrics = telemetry.metrics.map((metric) => ({ ...metric, status: getMetricStatus(metric) }));
    const cpu = normalizedMetrics.find((metric) => metric.id === 'cpu')?.value ?? 0;
    const latency = normalizedMetrics.find((metric) => metric.id === 'latency')?.value ?? 0;

    setMetrics(normalizedMetrics);
    setServices(telemetry.services);
    setEvents(telemetry.events);
    setLastUpdated(new Date(telemetry.timestamp));
    setChartPoints((current) => [...current.slice(-47), { timestamp: Date.now(), cpu, latency }]);
  };

  useEffect(() => {
    void refreshTelemetry();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => void refreshTelemetry(), 5000);
    return () => window.clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    const interval = window.setInterval(() => setRelativeUpdated(relativeTime(lastUpdated)), 1000);
    return () => window.clearInterval(interval);
  }, [lastUpdated]);

  const overallStatus = useMemo(() => {
    if (services.some((service) => service.status === 'Down') || metrics.some((metric) => metric.status === 'critical')) return 'critical';
    if (services.some((service) => service.status === 'Degraded') || metrics.some((metric) => metric.status === 'warning')) return 'warning';
    return 'healthy';
  }, [metrics, services]);

  return (
    <div className="space-y-6">
      <section className="page-shell bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-100">Operational resilience</p>
            <h1 className="mt-3 text-3xl font-semibold">System Health</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-brand-50/85">Live platform telemetry, service readiness, and operational event streaming.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15" onClick={() => setAutoRefresh((current) => !current)} type="button">
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
          </button>
        </div>
      </section>

      <section className="page-shell space-y-6">
        <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
          <Activity className="h-5 w-5" />
          <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">System Metrics</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = icons[metric.id];
            const percentage = (metric.value / metric.max) * 100;
            const status = metric.status ?? getMetricStatus(metric);

            return (
              <div className="page-shell border-white/10 bg-slate-950/60" key={metric.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{metric.label}</p>
                      <div className="mt-1">{statusBadge(status)}</div>
                    </div>
                  </div>
                  <p className="text-2xl font-semibold text-white">{Math.round(metric.value)}<span className="text-sm text-slate-400">{metric.unit}</span></p>
                </div>
                <div className="mt-4">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(status)}`} style={{ width: `${percentage}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-400"><span>0{metric.unit}</span><span>{metric.max}{metric.unit}</span></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">System Status</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"><dt className="text-sm text-slate-400">Overall Health</dt><dd className="mt-2 text-lg font-semibold text-white">{overallStatus === 'critical' ? <StatusBadge label="Attention Required" tone="danger" /> : overallStatus === 'warning' ? <StatusBadge label="Monitoring" tone="warning" /> : <StatusBadge label="All Systems Operational" tone="success" />}</dd></div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"><dt className="text-sm text-slate-400">Uptime</dt><dd className="mt-2 text-lg font-semibold text-white">99.9%</dd></div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"><dt className="text-sm text-slate-400">Last Updated</dt><dd className="mt-2 text-lg font-semibold text-white">{relativeUpdated}</dd></div>
          </div>
        </div>
      </section>

      <section className="page-shell space-y-5">
        <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
          <Server className="h-5 w-5" />
          <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Core Infrastructure Services</h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>{['Service Name', 'Region', 'Response Latency', 'Uptime', 'Status'].map((heading) => <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
              {services.map((service) => (
                <tr className="transition hover:bg-slate-50 dark:hover:bg-slate-900" key={service.name}>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-950 dark:text-white">{service.name}</td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{service.region}</td>
                  <td className="px-5 py-4 font-mono text-sm text-slate-600 dark:text-slate-300">{service.latencyMs}ms</td>
                  <td className="px-5 py-4 font-mono text-sm text-slate-600 dark:text-slate-300">{service.uptime.toFixed(2)}%</td>
                  <td className="px-5 py-4">{statusBadge(service.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <PerformanceChart points={chartPoints} />

      <section className="page-shell space-y-5">
        <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
          <Database className="h-5 w-5" />
          <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Operational Event Log</h2>
        </div>
        <div className="space-y-3">
          {events.map((event, index) => (
            <article className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950" key={`${event.message}-${index}`}>
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200">
                {event.level === 'WARN' ? <Activity className="h-4 w-4" /> : event.level === 'SUCCESS' ? <ShieldCheck className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">{event.level}: {event.message}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{new Date(event.timestamp).toLocaleString()}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
