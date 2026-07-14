import { ArrowLeft, ClipboardCheck, PencilLine, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { DeleteReviewDialog } from '../components/review/DeleteReviewDialog';
import { ReviewFormModal } from '../components/review/ReviewFormModal';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage } from '../lib/api';
import { getStatusTone } from '../lib/analysis';
import { formatDate } from '../lib/formatters';
import { formatEnumLabel } from '../lib/review';
import { adminAnalysisService } from '../services/adminAnalysisService';
import { adminReviewService } from '../services/adminReviewService';
import type { Analysis } from '../types/analysis';
import type { CreateReviewPayload, Review, UpdateReviewPayload } from '../types/review';

function DetailField({ label, value }: { label: string | number; value: string | number | null | undefined }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-200">{value ?? 'Not provided'}</p>
    </div>
  );
}

export function ReviewDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [review, setReview] = useState<Review | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const reviewId = Number(id);
  const canManageReviews = currentUser?.role === 'ADMIN' || currentUser?.role === 'QA';

  const loadReview = async () => {
    if (!Number.isFinite(reviewId)) {
      setError('The requested review id is invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      setReview(await adminReviewService.getReviewById(reviewId));
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyses = async () => {
    if (!canManageReviews) {
      return;
    }

    setLoadingAnalyses(true);

    try {
      const response = await adminAnalysisService.getAnalyses({ page: 0, size: 100, sortBy: 'createdAt', sortDirection: 'desc' });
      setAnalyses(response.content);
    } catch (analysisError) {
      showToast({ type: 'error', title: 'Unable to load analyses', description: getApiErrorMessage(analysisError) });
    } finally {
      setLoadingAnalyses(false);
    }
  };

  useEffect(() => {
    void loadReview();
  }, [reviewId]);

  useEffect(() => {
    void loadAnalyses();
  }, [canManageReviews]);

  const handleEdit = async (payload: CreateReviewPayload | UpdateReviewPayload) => {
    if (!review) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedReview = await adminReviewService.updateReview(review.id, payload as UpdateReviewPayload);
      setReview(updatedReview);
      setEditOpen(false);
      showToast({ type: 'success', title: 'Review updated', description: `Review by ${updatedReview.reviewer} was updated successfully.` });
    } catch (updateError) {
      showToast({ type: 'error', title: 'Update failed', description: getApiErrorMessage(updateError) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!review) {
      return;
    }

    setSubmitting(true);

    try {
      await adminReviewService.deleteReview(review.id);
      showToast({ type: 'success', title: 'Review deleted', description: `Review by ${review.reviewer} has been removed.` });
      navigate('/dashboard/reviews');
    } catch (deleteError) {
      showToast({ type: 'error', title: 'Delete failed', description: getApiErrorMessage(deleteError) });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-16 w-48" />
        <LoadingSkeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !review) {
    return <ErrorState actionLabel="Reload review" description={error ?? 'Unable to load the requested review.'} onAction={() => void loadReview()} title="Review unavailable" />;
  }

  return (
    <div className="space-y-6">
      <button className="inline-flex items-center gap-2 text-sm font-semibold text-brand-200 transition hover:text-white" onClick={() => navigate(-1)} type="button">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <section className="page-shell border-white/10 bg-slate-950/70">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-500/12 text-brand-200">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Review details</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{review.reviewer}</h1>
              <div className="mt-4">
                <StatusBadge label={formatEnumLabel(review.status)} tone={getStatusTone(review.status)} />
              </div>
            </div>
          </div>

          {canManageReviews ? (
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500" onClick={() => setEditOpen(true)} type="button">
                <PencilLine className="h-4 w-4" />
                Edit
              </button>
              <button className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500" onClick={() => setDeleteOpen(true)} type="button">
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailField label="Score" value={review.score} />
        <DetailField label="Project" value={review.project?.title} />
        <DetailField label="Analysis" value={review.analysis?.type ? formatEnumLabel(review.analysis.type) : null} />
        <DetailField label="Created" value={formatDate(review.createdAt)} />
      </section>

      <article className="page-shell border-white/10 bg-slate-950/70">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Comment</p>
        <p className="mt-4 text-sm leading-7 text-slate-300">{review.comment || 'No comment provided yet.'}</p>
      </article>

      {canManageReviews ? (
        <>
          <ReviewFormModal
            analyses={analyses}
            loading={submitting}
            loadingAnalyses={loadingAnalyses}
            onClose={() => setEditOpen(false)}
            onSubmit={(payload) => void handleEdit(payload)}
            open={editOpen}
            review={review}
            subtitle="Update reviewer, score, status, comment, and analysis assignment."
            title="Edit review"
          />
          <DeleteReviewDialog loading={submitting} onCancel={() => setDeleteOpen(false)} onConfirm={() => void handleDelete()} open={deleteOpen} review={review} />
        </>
      ) : null}
    </div>
  );
}
