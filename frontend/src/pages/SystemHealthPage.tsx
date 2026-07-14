import { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, Timer } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';

interface HealthMetric {
  label: string;
  value: number;
  max: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ComponentType<{ className?: string }>;
}

export function SystemHealthPage() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([
    {
      label: 'CPU Usage',
      value: 45,
      max: 100,
      unit: '%',
      status: 'healthy',
      icon: Cpu
    },
    {
      label: 'Memory',
      value: 68,
      max: 100,
      unit: '%',
      status: 'warning',
      icon: HardDrive
    },
    {
      label: 'API Response Time',
      value: 120,
      max: 500,
      unit: 'ms',
      status: 'healthy',
      icon: Timer
    }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => {
          const variation = (Math.random() - 0.5) * 10;
          const newValue = Math.max(0, Math.min(metric.max, metric.value + variation));
          let status: 'healthy' | 'warning' | 'critical' = 'healthy';
          
          if (metric.label === 'CPU Usage') {
            if (newValue > 80) status = 'critical';
            else if (newValue > 60) status = 'warning';
          } else if (metric.label === 'Memory') {
            if (newValue > 85) status = 'critical';
            else if (newValue > 70) status = 'warning';
          } else if (metric.label === 'API Response Time') {
            if (newValue > 400) status = 'critical';
            else if (newValue > 250) status = 'warning';
          }
          
          return { ...metric, value: newValue, status };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getBarColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-amber-500';
      case 'critical':
        return 'bg-rose-500';
    }
  };

  const getStatusBadge = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <StatusBadge label="Healthy" tone="success" />;
      case 'warning':
        return <StatusBadge label="Warning" tone="warning" />;
      case 'critical':
        return <StatusBadge label="Critical" tone="danger" />;
    }
  };

  return (
    <div className="space-y-6">
      <section className="page-shell bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-100">Operational resilience</p>
        <h1 className="mt-3 text-3xl font-semibold">System Health</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-brand-50/85">Real-time monitoring of platform stability, service readiness, and operational signals.</p>
      </section>

      <section className="page-shell space-y-6">
        <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
          <Activity className="h-5 w-5" />
          <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">System Metrics</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const percentage = (metric.value / metric.max) * 100;

            return (
              <div
                className="page-shell border-white/10 bg-slate-950/60"
                key={metric.label}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{metric.label}</p>
                      <div className="mt-1">{getStatusBadge(metric.status)}</div>
                    </div>
                  </div>
                  <p className="text-2xl font-semibold text-white">
                    {Math.round(metric.value)}
                    <span className="text-sm text-slate-400">{metric.unit}</span>
                  </p>
                </div>

                <div className="mt-4">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${getBarColor(metric.status)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-400">
                    <span>0{metric.unit}</span>
                    <span>{metric.max}{metric.unit}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">System Status</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <dt className="text-sm text-slate-400">Overall Health</dt>
              <dd className="mt-2 text-lg font-semibold text-white">
                {metrics.every((m) => m.status === 'healthy') ? (
                  <StatusBadge label="All Systems Operational" tone="success" />
                ) : metrics.some((m) => m.status === 'critical') ? (
                  <StatusBadge label="Attention Required" tone="danger" />
                ) : (
                  <StatusBadge label="Monitoring" tone="warning" />
                )}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <dt className="text-sm text-slate-400">Uptime</dt>
              <dd className="mt-2 text-lg font-semibold text-white">99.9%</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <dt className="text-sm text-slate-400">Last Updated</dt>
              <dd className="mt-2 text-lg font-semibold text-white">Just now</dd>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
