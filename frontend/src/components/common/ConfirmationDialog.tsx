import { AlertTriangle, LoaderCircle, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmationDialog({ open, title, description, confirmLabel, loading, onClose, onConfirm }: Props) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[97] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#09111f] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div className="flex gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200"><AlertTriangle className="h-5 w-5" /></div><div><h3 className="text-xl font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></div></div><button className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onClose} type="button"><X className="h-5 w-5" /></button></div><div className="mt-6 flex justify-end gap-3"><button className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200" onClick={onClose} type="button">Cancel</button><button className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} onClick={onConfirm} type="button">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{confirmLabel}</button></div></div></div>;
}
