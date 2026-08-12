import { ClipboardCheck, LoaderCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AnalysisFinding } from '../../types/analysis';

interface Props {
  finding: AnalysisFinding | null;
  status: 'ACCEPTED' | 'REJECTED' | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
}

export function ReviewDecisionModal({ finding, status, loading, onClose, onSubmit }: Props) {
  const [comment, setComment] = useState('');
  const open = Boolean(finding && status);

  useEffect(() => {
    if (open) setComment('');
  }, [open, finding?.findingKey, status]);

  if (!open || !finding || !status) return null;

  const approve = status === 'ACCEPTED';
  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <form className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#09111f] shadow-2xl" onSubmit={(event) => { event.preventDefault(); onSubmit(comment.trim()); }}>
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div className="flex gap-4"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${approve ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}><ClipboardCheck className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[.24em] text-brand-200">Human review</p><h3 className="mt-2 text-xl font-semibold text-white">{approve ? 'Approve finding' : 'Reject finding'}</h3><p className="mt-1 text-sm text-slate-400">{finding.title}</p></div></div>
          <button className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onClose} type="button"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-6 py-6">
          <p className="text-sm text-slate-300">A comment is required to preserve the audit trail for this decision.</p>
          <label className="block space-y-2"><span className="text-sm font-medium text-slate-200">Decision comment</span><textarea autoFocus className="min-h-32 w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none focus:border-brand-400" maxLength={5000} onChange={(event) => setComment(event.target.value)} required value={comment} /></label>
        </div>
        <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-5"><button className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200" onClick={onClose} type="button">Cancel</button><button className={`rounded-2xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 ${approve ? 'bg-emerald-600' : 'bg-rose-700'}`} disabled={loading || !comment.trim()} type="submit">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : approve ? 'Approve finding' : 'Reject finding'}</button></div>
      </form>
    </div>
  );
}
