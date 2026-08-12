import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Bot, LoaderCircle, X } from 'lucide-react';
import type { AnalysisProjectSummary, RunAnalysisPayload } from '../../types/analysis';
import type { CodeRepository } from '../../types/repository';

interface Values {
  projectId: string;
  repositoryId: string;
  architectureProfile: boolean;
  generateDocumentation: boolean;
}

interface Props {
  open: boolean;
  loading: boolean;
  projects: AnalysisProjectSummary[];
  repositories: CodeRepository[];
  onClose: () => void;
  onSubmit: (payload: RunAnalysisPayload) => void;
}

export function RunAnalysisModal({ open, loading, projects, repositories, onClose, onSubmit }: Props) {
  const { register, watch, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    defaultValues: { projectId: '', repositoryId: '', architectureProfile: false, generateDocumentation: false }
  });
  const projectId = watch('projectId');
  const availableRepositories = repositories.filter(
    (repository) => String(repository.project.id) === projectId && repository.provider === 'GITHUB'
  );

  useEffect(() => {
    if (!open) reset({ projectId: '', repositoryId: '', architectureProfile: false, generateDocumentation: false });
  }, [open, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#09111f] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div className="flex gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200"><Bot className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[.24em] text-brand-200">Multi-agent audit</p><h3 className="mt-2 text-2xl font-semibold text-white">Run repository analysis</h3><p className="mt-1 text-sm text-slate-400">The run is queued and remains traceable by project and repository.</p></div></div>
          <button className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onClose} type="button"><X className="h-5 w-5" /></button>
        </div>
        <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit((values) => onSubmit({ projectId: Number(values.projectId), repositoryId: Number(values.repositoryId), architectureProfile: values.architectureProfile ? 'engineering_copilot' : undefined, generateDocumentation: values.generateDocumentation }))}>
          <label className="block space-y-2"><span className="text-sm font-medium text-slate-200">Project</span><select className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white" {...register('projectId', { required: 'Project is required' })}><option value="">Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>{errors.projectId ? <p className="text-sm text-rose-300">{errors.projectId.message}</p> : null}</label>
          <label className="block space-y-2"><span className="text-sm font-medium text-slate-200">Repository</span><select className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white disabled:opacity-50" disabled={!projectId} {...register('repositoryId', { required: 'Repository is required' })}><option value="">Select a repository</option>{availableRepositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.name} ({repository.branch ?? 'main'})</option>)}</select>{projectId && availableRepositories.length === 0 ? <p className="text-sm text-amber-300">No public GitHub repository is attached to this project.</p> : null}{errors.repositoryId ? <p className="text-sm text-rose-300">{errors.repositoryId.message}</p> : null}</label>
          <label className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-300"><input className="mt-1" type="checkbox" {...register('architectureProfile')} /><span><span className="font-semibold text-white">Validate against Engineering Copilot architecture</span><br />Enable only when this repository is expected to follow the project reference architecture.</span></label>
          <label className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-300"><input className="mt-1" type="checkbox" {...register('generateDocumentation')} /><span><span className="font-semibold text-white">Generate technical documentation</span><br />Adds an AI-generated draft to the audit result. It must be reviewed before approval.</span></label>
          <div className="flex justify-end gap-3 border-t border-white/10 pt-5"><button className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200" onClick={onClose} type="button">Cancel</button><button className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">{loading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Starting...</> : 'Run analysis'}</button></div>
        </form>
      </div>
    </div>
  );
}
