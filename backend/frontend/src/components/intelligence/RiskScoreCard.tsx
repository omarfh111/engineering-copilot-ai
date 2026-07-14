import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Documentation } from '../../types/documentation';

interface RiskScoreCardProps {
  documentation: Documentation;
}

function calculateRisk(documentation: Documentation) {
  let score = 12;
  const signals: string[] = [];

  if (documentation.generatedByAI) {
    score += 28;
    signals.push('Generated externally');
  }

  if (!documentation.content?.trim()) {
    score += 22;
    signals.push('Missing readable content');
  }

  if (!documentation.path?.trim()) {
    score += 18;
    signals.push('No source file attached');
  }

  if (!documentation.approved || documentation.status !== 'APPROVED') {
    score += 20;
    signals.push('Approval incomplete');
  }

  const clampedScore = Math.min(score, 100);

  if (clampedScore >= 70) {
    return { score: clampedScore, tier: 'High', tone: 'rose', signals };
  }

  if (clampedScore >= 40) {
    return { score: clampedScore, tier: 'Medium', tone: 'amber', signals };
  }

  return { score: clampedScore, tier: 'Low', tone: 'emerald', signals: signals.length ? signals : ['Ready for delivery review'] };
}

export function RiskScoreCard({ documentation }: RiskScoreCardProps) {
  const risk = calculateRisk(documentation);
  const isLowRisk = risk.tier === 'Low';

  return (
    <section className="page-shell">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:text-brand-300">Score Risk</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Deliverable risk tier</h2>
        </div>
        <div className={`rounded-2xl ${isLowRisk ? 'bg-emerald-100 text-emerald-700' : risk.tier === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'} p-3`}>
          {isLowRisk ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </div>
      </div>
      <div className="mt-6">
        <div className="flex items-end justify-between">
          <p className="text-5xl font-semibold text-slate-950 dark:text-white">{risk.score}</p>
          <p className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${risk.tier === 'Low' ? 'bg-emerald-100 text-emerald-700' : risk.tier === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'}`}>
            {risk.tier}
          </p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${risk.tier === 'Low' ? 'bg-emerald-500' : risk.tier === 'Medium' ? 'bg-amber-400' : 'bg-rose-500'}`}
            style={{ width: `${risk.score}%` }}
          />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {risk.signals.map((signal) => (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300" key={signal}>
            {signal}
          </span>
        ))}
      </div>
    </section>
  );
}
