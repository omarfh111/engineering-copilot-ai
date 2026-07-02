import { ArrowRight, Layers3, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import type { WorkspaceModuleId } from '../lib/workspace';
import { roleDefinitions, workspaceModules } from '../lib/workspace';

interface WorkspaceSectionPageProps {
  moduleId: WorkspaceModuleId;
}

export function WorkspaceSectionPage({ moduleId }: WorkspaceSectionPageProps) {
  const { currentUser } = useSession();

  if (!currentUser) {
    return null;
  }

  const module = workspaceModules[moduleId];
  const roleDefinition = roleDefinitions[currentUser.role];
  const capabilities = module.capabilities[currentUser.role] ?? [];

  return (
    <div className="space-y-6">
      <section className="page-shell overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-brand-900 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">{module.kicker}</p>
        <h1 className="mt-3 text-3xl font-semibold">{module.headline}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">{module.description}</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-100">
          <ShieldCheck className="h-3.5 w-3.5" />
          {roleDefinition.workspaceName}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
        <article className="page-shell">
          <div className="flex items-center gap-3 text-brand-600 dark:text-brand-300">
            <Layers3 className="h-5 w-5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em]">Role capabilities</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{module.label} workspace</h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-500 dark:text-slate-400">{roleDefinition.accessSummary}</p>
          <div className="mt-5 grid gap-3">
            {capabilities.map((capability) => (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
                key={capability}
              >
                {capability}
              </div>
            ))}
          </div>
        </article>

        <article className="page-shell">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">Access boundary</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Aligned to enterprise RBAC</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
            {module.boundaries.map((boundary) => (
              <p key={boundary}>{boundary}</p>
            ))}
          </div>
          <Link
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
            to="/dashboard"
          >
            Open dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </section>
    </div>
  );
}
