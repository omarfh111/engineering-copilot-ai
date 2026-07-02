import { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  Boxes,
  ClipboardCheck,
  FileText,
  FolderKanban,
  GitBranch,
  ShieldCheck,
  ShieldEllipsis,
  Spline,
  SquareCheckBig,
  TimerReset,
  UsersRound,
  Waypoints
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { RecentAnalysesPanel } from '../components/dashboard/RecentAnalysesPanel';
import { RecentProjectsTable } from '../components/dashboard/RecentProjectsTable';
import { RecommendationsPanel } from '../components/dashboard/RecommendationsPanel';
import { StatCard } from '../components/dashboard/StatCard';
import { useSession } from '../context/SessionContext';
import { getApiErrorMessage } from '../lib/api';
import { roleDefinitions } from '../lib/workspace';
import { roleDashboardService } from '../services/roleDashboardService';
import type { RoleDashboardOverview } from '../types/dashboard';

const metricIcons: Record<string, LucideIcon> = {
  projects: FolderKanban,
  velocity: TimerReset,
  todos: SquareCheckBig,
  blocked: Activity,
  teams: UsersRound,
  architecture: Spline,
  dependencies: Waypoints,
  documentation: FileText,
  impact: Bot,
  quality: ShieldCheck,
  security: ShieldEllipsis,
  defects: ClipboardCheck,
  reviews: ClipboardCheck,
  repositories: GitBranch,
  analyses: Boxes,
  assistant: Bot
};

export function RoleDashboardPage() {
  const { currentUser } = useSession();
  const [overview, setOverview] = useState<RoleDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const loadOverview = async () => {
      setLoading(true);

      try {
        const response = await roleDashboardService.getOverview(currentUser.role);
        setOverview(response);
        setError(null);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    void loadOverview();
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  const roleDefinition = roleDefinitions[currentUser.role];

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-40 w-full" />
        <LoadingSkeleton className="h-28 w-full" />
        <LoadingSkeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <ErrorState
        actionLabel="Reload dashboard"
        description={error ?? 'The role dashboard could not be loaded.'}
        onAction={() => {
          window.location.reload();
        }}
        title="Dashboard unavailable"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="page-shell overflow-hidden bg-gradient-to-r from-brand-700 via-indigo-700 to-slate-900 text-white">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-100">{roleDefinition.workspaceName}</p>
            <h1 className="mt-3 text-3xl font-semibold">{overview.heading}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-brand-100">{overview.description}</p>
          </div>

          <div className="rounded-[24px] border border-white/12 bg-white/10 px-5 py-4 backdrop-blur-sm">
            <p className="text-sm font-medium text-brand-100">Current role</p>
            <p className="mt-2 text-xl font-semibold">{roleDefinition.label}</p>
          </div>
        </div>
      </section>

      <section className={`grid gap-4 ${overview.metrics.length >= 5 ? '2xl:grid-cols-5' : 'xl:grid-cols-4'} md:grid-cols-2`}>
        {overview.metrics.map((metric) => {
          const Icon = metricIcons[metric.iconKey] ?? Activity;

          return <StatCard hint={metric.hint} icon={Icon} key={metric.id} label={metric.label} value={metric.value} />;
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {overview.highlights.map((highlight) => (
          <article className="page-shell border-white/10 bg-slate-950/60" key={highlight.id}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-300">{highlight.label}</p>
            <p className="mt-4 text-3xl font-semibold text-white">{highlight.value}</p>
            <p className="mt-3 text-sm leading-7 text-slate-400">{highlight.description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
        <div className="space-y-6">
          <div>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">
                Delivery visibility
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Recent Projects</h2>
            </div>
            <RecentProjectsTable projects={overview.recentProjects} />
          </div>

          {overview.recentAnalyses.length > 0 ? (
            <div>
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">
                  Role telemetry
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Recent Analyses</h2>
              </div>
              <RecentAnalysesPanel analyses={overview.recentAnalyses} />
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="page-shell">
            <div className="flex items-center gap-3 text-brand-600 dark:text-brand-300">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em]">AI Recommendations</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Recommended next actions</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Prioritized follow-ups aligned with the responsibilities of your role workspace.
            </p>
          </div>

          <RecommendationsPanel recommendations={overview.aiRecommendations} />
        </div>
      </section>
    </div>
  );
}
