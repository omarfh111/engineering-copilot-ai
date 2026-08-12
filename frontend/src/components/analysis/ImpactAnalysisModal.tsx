import { GitCompareArrows, LoaderCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (changeDescription: string, paths: string[]) => void;
}

export function ImpactAnalysisModal({ open, loading, onClose, onSubmit }: Props) {
  const [changeDescription, setChangeDescription] = useState('');
  const [paths, setPaths] = useState('');
  useEffect(() => { if (!open) { setChangeDescription(''); setPaths(''); } }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <form className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#09111f] shadow-2xl" onSubmit={(event) => { event.preventDefault(); onSubmit(changeDescription.trim(), paths.split(',').map((path) => path.trim()).filter(Boolean)); }}>
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5"><div className="flex gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200"><GitCompareArrows className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[.24em] text-brand-200">On-demand analysis</p><h3 className="mt-2 text-xl font-semibold text-white">Analyse impact</h3><p className="mt-1 text-sm text-slate-400">Scope a proposed change before implementation.</p></div></div><button className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onClose} type="button"><X className="h-5 w-5" /></button></div>
        <div className="space-y-5 px-6 py-6"><label className="block space-y-2"><span className="text-sm font-medium text-slate-200">Change or problem</span><textarea autoFocus className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none focus:border-brand-400" minLength={5} onChange={(event) => setChangeDescription(event.target.value)} required value={changeDescription} /></label><label className="block space-y-2"><span className="text-sm font-medium text-slate-200">Affected paths (optional)</span><input className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none focus:border-brand-400" onChange={(event) => setPaths(event.target.value)} placeholder="src/api/router.py, src/tests/test_router.py" value={paths} /></label></div>
        <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-5"><button className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200" onClick={onClose} type="button">Cancel</button><button className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={loading || changeDescription.trim().length < 5} type="submit">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Run impact analysis</button></div>
      </form>
    </div>
  );
}
