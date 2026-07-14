import { ClipboardCheck, Filter, ShieldPlus, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { DeleteReviewDialog } from '../components/review/DeleteReviewDialog';
import { ReviewFormModal } from '../components/review/ReviewFormModal';
import { ReviewTable } from '../components/review/ReviewTable';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { getApiErrorMessage } from '../lib/api';
import { formatEnumLabel, reviewStatusOptions } from '../lib/review';
import { adminAnalysisService } from '../services/adminAnalysisService';
import { adminReviewService } from '../services/adminReviewService';
import type { Analysis } from '../types/analysis';
import type { CreateReviewPayload, Review, ReviewQueryParams, ReviewStatusFilter, UpdateReviewPayload } from '../types/review';

const defaultFilters: ReviewQueryParams = {
  search: '',
  status: '',
  projectId: '',
  page: 0,
  size: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc'
};

export function ReviewsPage() {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<ReviewQueryParams>(defaultFilters);
  const [reviewPage, setReviewPage] = useState<Awaited<ReturnType<typeof adminReviewService.getReviews>> | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(filters.search ?? '');

  const canManageReviews = currentUser?.role === 'ADMIN' || currentUser?.role === 'QA';

  const loadReviews = async () => {
    setLoading(true);

    try {
      const response = await adminReviewService.getReviews({
        ...filters,
        search: debouncedSearch
      });
      setReviewPage(response);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyses = async () => {
    setLoadingAnalyses(true);

    try {
      const response = await adminAnalysisService.getAnalyses({
        page: 0,
        size: 100,
        sortBy: 'createdAt',
        sortDirection: 'desc'
      });
      setAnalyses(response.content);
    } catch (analysisError) {
      setAnalyses([]);
      showToast({
        type: 'error',
        title: 'Unable to load analyses',
        description: getApiErrorMessage(analysisError)
      });
    } finally {
      setLoadingAnalyses(false);
    }
  };

  useEffect(() => {
    void loadReviews();
  }, [debouncedSearch, filters.page, filters.size, filters.sortBy, filters.sortDirection, filters.status, filters.projectId]);

  useEffect(() => {
    void loadAnalyses();
  }, []);

  const handleSort = (field: string) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      sortBy: field,
      sortDirection: currentFilters.sortBy === field && currentFilters.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreateSubmit = async (payload: CreateReviewPayload | UpdateReviewPayload) => {
    setSubmitting(true);

    try {
      await adminReviewService.createReview(payload as CreateReviewPayload);
      showToast({
        type: 'success',
        title: 'Review created',
        description: `Review by ${payload.reviewer} was created successfully.`
      });
      setCreateOpen(false);
      await loadReviews();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create review',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (payload: CreateReviewPayload | UpdateReviewPayload) => {
    if (!selectedReview) {
      return;
    }

    setSubmitting(true);

    try {
      await adminReviewService.updateReview(selectedReview.id, payload as UpdateReviewPayload);
      showToast({
        type: 'success',
        title: 'Review updated',
        description: `Review by ${payload.reviewer} was updated successfully.`
      });
      setEditOpen(false);
      await loadReviews();
    } catch (updateError) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: getApiErrorMessage(updateError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReview) {
      return;
    }

    setSubmitting(true);

    try {
      await adminReviewService.deleteReview(selectedReview.id);
      showToast({
        type: 'success',
        title: 'Review deleted',
        description: `Review by ${selectedReview.reviewer} has been removed.`
      });
      setDeleteOpen(false);
      setSelectedReview(null);
      await loadReviews();
    } catch (deleteError) {
      showToast({
        type: 'error',
        title: 'Delete failed',
        description: getApiErrorMessage(deleteError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = reviewPage?.content.filter((review) => review.status === 'PENDING').length ?? 0;
  const acceptedCount = reviewPage?.content.filter((review) => review.status === 'ACCEPTED').length ?? 0;
  const rejectedCount = reviewPage?.content.filter((review) => review.status === 'REJECTED').length ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Visible reviews</p>
          <p className="mt-4 text-4xl font-semibold text-white">{reviewPage?.totalElements ?? 0}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Pending on page</p>
          <p className="mt-4 text-4xl font-semibold text-white">{pendingCount}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Accepted on page</p>
          <p className="mt-4 text-4xl font-semibold text-white">{acceptedCount}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Rejected on page</p>
          <p className="mt-4 text-4xl font-semibold text-white">{rejectedCount}</p>
        </div>
      </section>

      <section className="page-shell space-y-5 border-white/10 bg-slate-950/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Review decisions</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Manage analysis reviews</h3>
            <p className="mt-2 text-sm text-slate-400">
              Track reviewer decisions, QA comments, scores, and status against analysis outputs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
              <ClipboardCheck className="h-4 w-4" />
              {reviewPage?.totalElements ?? 0} reviews matched
            </div>
            {canManageReviews ? (
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400"
                onClick={() => setCreateOpen(true)}
                type="button"
              >
                <ShieldPlus className="h-4 w-4" />
                Add Review
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_260px_180px_170px]">
          <SearchBar
            onChange={(value) => setFilters((currentFilters) => ({ ...currentFilters, search: value, page: 0 }))}
            placeholder="Search by reviewer, comment, or project"
            value={filters.search ?? ''}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, status: event.target.value as ReviewStatusFilter, page: 0 }))}
              value={filters.status}
            >
              <option className="bg-slate-950 text-white" value="">
                All statuses
              </option>
              {reviewStatusOptions.map((status) => (
                <option className="bg-slate-950 text-white" key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              disabled={loadingAnalyses}
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  projectId: event.target.value ? Number(event.target.value) : '',
                  page: 0
                }))
              }
              value={filters.projectId === '' ? '' : String(filters.projectId)}
            >
              <option className="bg-slate-950 text-white" value="">
                {loadingAnalyses ? 'Loading analyses...' : 'All projects'}
              </option>
              {Array.from(new Map(analyses.map((analysis) => [analysis.project.id, analysis.project])).values()).map((project) => (
                <option className="bg-slate-950 text-white" key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <SlidersHorizontal className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, size: Number(event.target.value), page: 0 }))}
              value={filters.size}
            >
              {[10, 20, 50].map((sizeOption) => (
                <option className="bg-slate-950 text-white" key={sizeOption} value={sizeOption}>
                  {sizeOption} per page
                </option>
              ))}
            </select>
          </label>

          <button
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-400/30 hover:text-brand-200"
            onClick={() => setFilters(defaultFilters)}
            type="button"
          >
            Reset filters
          </button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-24 w-full" />
          <LoadingSkeleton className="h-72 w-full" />
        </div>
      ) : error ? (
        <ErrorState actionLabel="Reload reviews" description={error} onAction={() => void loadReviews()} title="Unable to load reviews" />
      ) : !reviewPage || reviewPage.content.length === 0 ? (
        <EmptyState
          description={canManageReviews ? 'Try adjusting filters or add the first review decision.' : 'Try adjusting filters to surface readable reviews.'}
          title="No reviews found"
        />
      ) : (
        <>
          <ReviewTable
            canManageReviews={canManageReviews}
            onDelete={(review) => {
              setSelectedReview(review);
              setDeleteOpen(true);
            }}
            onEdit={(review) => {
              setSelectedReview(review);
              setEditOpen(true);
            }}
            onSort={handleSort}
            onView={(review) => navigate(`/dashboard/reviews/${review.id}`)}
            reviews={reviewPage.content}
            sortBy={filters.sortBy ?? 'createdAt'}
            sortDirection={filters.sortDirection ?? 'desc'}
          />
          <Pagination
            currentPage={reviewPage.page}
            onPageChange={(page) => setFilters((currentFilters) => ({ ...currentFilters, page }))}
            totalPages={reviewPage.totalPages}
          />
        </>
      )}

      {canManageReviews ? (
        <>
          <ReviewFormModal
            analyses={analyses}
            loading={submitting}
            loadingAnalyses={loadingAnalyses}
            onClose={() => setCreateOpen(false)}
            onSubmit={(payload) => void handleCreateSubmit(payload)}
            open={createOpen}
            subtitle="Create a review decision connected to an analysis."
            title="Add review"
          />
          <ReviewFormModal
            analyses={analyses}
            loading={submitting}
            loadingAnalyses={loadingAnalyses}
            onClose={() => {
              setEditOpen(false);
              setSelectedReview(null);
            }}
            onSubmit={(payload) => void handleEditSubmit(payload)}
            open={editOpen}
            review={selectedReview}
            subtitle="Update reviewer, score, status, comment, and analysis assignment."
            title="Edit review"
          />
          <DeleteReviewDialog
            loading={submitting}
            onCancel={() => {
              setDeleteOpen(false);
              setSelectedReview(null);
            }}
            onConfirm={() => void handleDeleteConfirm()}
            open={deleteOpen}
            review={selectedReview}
          />
        </>
      ) : null}
    </div>
  );
}
