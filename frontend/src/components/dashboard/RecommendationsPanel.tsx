import type { DashboardRecommendation } from '../../types/dashboard';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';

interface RecommendationsPanelProps {
  recommendations: DashboardRecommendation[];
}

function resolvePriorityTone(priority: DashboardRecommendation['priority']) {
  if (priority === 'High') {
    return 'danger' as const;
  }

  if (priority === 'Medium') {
    return 'warning' as const;
  }

  return 'success' as const;
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  if (recommendations.length === 0) {
    return (
      <EmptyState
        description="AI recommendations will appear here when your overview endpoint begins surfacing actionable insights."
        title="No recommendations yet"
      />
    );
  }

  return (
    <div className="space-y-4">
      {recommendations.map((recommendation) => (
        <article className="glass-panel rounded-[26px] p-5" key={recommendation.id}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{recommendation.title}</h3>
            <StatusBadge label={recommendation.priority} tone={resolvePriorityTone(recommendation.priority)} />
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{recommendation.description}</p>
        </article>
      ))}
    </div>
  );
}
