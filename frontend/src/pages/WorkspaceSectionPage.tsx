import { useSession } from '../context/SessionContext';
import { workspaceModules } from '../lib/workspace';
import type { WorkspaceModuleId } from '../lib/workspace';

interface WorkspaceSectionPageProps {
  moduleId: WorkspaceModuleId;
}

/**
 * Descriptive workspace section shown for modules that are not yet backed by a
 * dedicated screen (architecture, dependencies, impact, quality, security,
 * reports, sprint, audit, settings, my-todos). It renders the module's
 * kicker/headline/description plus the role-specific capabilities and
 * boundaries declared in {@link workspaceModules}.
 */
export function WorkspaceSectionPage({ moduleId }: WorkspaceSectionPageProps) {
  const { currentUser } = useSession();
  const module = workspaceModules[moduleId];
  const Icon = module.icon;
  const capabilities = (currentUser ? module.capabilities[currentUser.role] : undefined) ?? [];

  return (
    <div className="space-y-6">
      <section className="page-shell border-white/10 bg-slate-950/60">
        <div className="flex items-center gap-3 text-brand-300">
          <Icon className="h-5 w-5" />
          <p className="text-xs font-semibold uppercase tracking-[0.24em]">{module.kicker}</p>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-white">{module.headline}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{module.description}</p>
      </section>

      {capabilities.length > 0 ? (
        <section className="page-shell border-white/10 bg-slate-950/60">
          <h2 className="text-lg font-semibold text-white">What you can do here</h2>
          <ul className="mt-4 space-y-2">
            {capabilities.map((capability) => (
              <li key={capability} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                {capability}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {module.boundaries.length > 0 ? (
        <section className="page-shell border-white/10 bg-slate-950/60">
          <h2 className="text-lg font-semibold text-white">Boundaries</h2>
          <ul className="mt-4 space-y-2">
            {module.boundaries.map((boundary) => (
              <li key={boundary} className="flex items-start gap-3 text-sm text-slate-400">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                {boundary}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
