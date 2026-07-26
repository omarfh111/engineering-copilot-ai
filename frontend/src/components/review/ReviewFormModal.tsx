import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ClipboardCheck, LoaderCircle, X } from 'lucide-react';
import { formatEnumLabel } from '../../lib/review';
import { reviewStatusOptions } from '../../lib/review';
import type { Analysis } from '../../types/analysis';
import type { CreateReviewPayload, Review, ReviewStatus, UpdateReviewPayload } from '../../types/review';

interface ReviewFormModalProps {
  open: boolean;
  loading: boolean;
  loadingAnalyses?: boolean;
  title: string;
  subtitle: string;
  review?: Review | null;
  analyses: Analysis[];
  fixedAnalysisId?: number | null;
  onClose: () => void;
  onSubmit: (payload: CreateReviewPayload | UpdateReviewPayload) => void;
}

interface ReviewFormValues {
  reviewer: string;
  comment: string;
  score: string;
  status: ReviewStatus | '';
  analysisId: string;
}

const defaultValues: ReviewFormValues = {
  reviewer: '',
  comment: '',
  score: '0',
  status: 'PENDING',
  analysisId: ''
};

export function ReviewFormModal({
  open,
  loading,
  loadingAnalyses = false,
  title,
  subtitle,
  review,
  analyses,
  fixedAnalysisId,
  onClose,
  onSubmit
}: ReviewFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ReviewFormValues>({ defaultValues });

  const analysisIdRegistration = register('analysisId', {
    required: fixedAnalysisId === undefined || fixedAnalysisId === null ? 'Analysis is required' : false
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }

    reset({
      reviewer: review?.reviewer ?? '',
      comment: review?.comment ?? '',
      score: String(review?.score ?? 0),
      status: review?.status ?? 'PENDING',
      analysisId: String(fixedAnalysisId ?? review?.analysis?.id ?? '')
    });
  }, [fixedAnalysisId, open, reset, review]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="animate-slideUp w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-[#09111f] shadow-[0_30px_80px_-40px_rgba(59,130,246,0.55)]">
        <div className="border-b border-white/10 px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Review management</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
              </div>
            </div>
            <button className="rounded-2xl p-2 text-slate-500 transition hover:bg-white/5 hover:text-white" onClick={onClose} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form
          className="space-y-6 px-6 py-6 sm:px-7"
          onSubmit={handleSubmit((values) => {
            onSubmit({
              // Spring records the authenticated user; the browser must not be
              // able to choose or impersonate a reviewer.
              reviewer: '',
              comment: values.comment.trim(),
              score: Number(values.score),
              status: values.status as ReviewStatus,
              analysisId: fixedAnalysisId ?? Number(values.analysisId)
            });
          })}
        >
          <div className="grid gap-5">
            <p className="rounded-2xl border border-brand-400/20 bg-brand-500/5 p-4 text-sm text-slate-300">The reviewer identity is recorded from the authenticated account.</p>

            <div className="grid gap-5 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Status</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('status', { required: 'Status is required' })}
                >
                  {reviewStatusOptions.map((status) => (
                    <option className="bg-slate-950 text-white" key={status} value={status}>
                      {formatEnumLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Score</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  min={0}
                  max={100}
                  step="0.1"
                  type="number"
                  {...register('score', {
                    required: 'Score is required',
                    min: { value: 0, message: 'Score must be at least 0' },
                    max: { value: 100, message: 'Score must be 100 or lower' }
                  })}
                />
                {errors.score ? <p className="text-sm text-rose-300">{errors.score.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Analysis</span>
                {fixedAnalysisId !== undefined && fixedAnalysisId !== null ? (
                  <input type="hidden" value={String(fixedAnalysisId)} {...analysisIdRegistration} />
                ) : null}
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={loadingAnalyses || fixedAnalysisId !== undefined && fixedAnalysisId !== null}
                  {...(fixedAnalysisId === undefined || fixedAnalysisId === null ? analysisIdRegistration : {})}
                >
                  <option className="bg-slate-950 text-white" value="">
                    {loadingAnalyses ? 'Loading analyses...' : 'Select an analysis'}
                  </option>
                  {analyses.map((analysis) => (
                    <option className="bg-slate-950 text-white" key={analysis.id} value={analysis.id}>
                      {analysis.title}
                    </option>
                  ))}
                </select>
                {errors.analysisId ? <p className="text-sm text-rose-300">{errors.analysisId.message}</p> : null}
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Comment</span>
              <textarea
                className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('comment', { maxLength: { value: 5000, message: 'Comment must be 5000 characters or fewer' } })}
              />
              {errors.comment ? <p className="text-sm text-rose-300">{errors.comment.message}</p> : null}
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
            <button
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Saving review...
                </>
              ) : review ? (
                'Save Review'
              ) : (
                'Create Review'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
