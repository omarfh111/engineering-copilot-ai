import { apiClient } from '../lib/api';
import type {
  CreateReviewPayload,
  Review,
  ReviewAnalysisSummary,
  ReviewProjectSummary,
  ReviewQueryParams,
  ReviewStatus,
  UpdateReviewPayload
} from '../types/review';
import type { PagedResponse } from '../types/user';

function removeEmptyValues(params: ReviewQueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

type ApiReviewAnalysis = Partial<ReviewAnalysisSummary> & {
  id?: number | string;
  analysisId?: number | string;
  type?: string | null;
  analysisType?: string | null;
  projectId?: number | string | null;
  projectTitle?: string | null;
};

type ApiReviewProject = Partial<ReviewProjectSummary> & {
  id?: number | string;
  projectId?: number | string;
  title?: string | null;
  projectTitle?: string | null;
  description?: string | null;
  status?: string | null;
};

type ApiReview = Omit<Review, 'analysis' | 'project' | 'status' | 'score'> & {
  id: number | string;
  reviewId?: number | string;
  score?: number | string | null;
  status?: ReviewStatus | string | null;
  analysis?: ApiReviewAnalysis | null;
  project?: ApiReviewProject | null;
  analysisId?: number | string | null;
  analysisType?: string | null;
  projectId?: number | string | null;
  projectTitle?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  findingKey?: string | null;
};

function normalizeAnalysis(review: ApiReview): ReviewAnalysisSummary | null {
  const analysis = review.analysis;
  const id = Number(analysis?.id ?? analysis?.analysisId ?? review.analysisId ?? 0);

  if (!id) {
    return null;
  }

  return {
    id,
    analysisId: id,
    type: analysis?.type ?? analysis?.analysisType ?? review.analysisType ?? null,
    status: analysis?.status ?? null,
    summary: analysis?.summary ?? null,
    projectId: Number(analysis?.projectId ?? review.projectId ?? 0) || null,
    projectTitle: analysis?.projectTitle ?? review.projectTitle ?? null
  };
}

function normalizeProject(review: ApiReview): ReviewProjectSummary | null {
  const project = review.project;
  const id = Number(project?.id ?? project?.projectId ?? review.projectId ?? review.analysis?.projectId ?? 0);

  if (!id) {
    return null;
  }

  return {
    id,
    title: String(project?.title ?? project?.projectTitle ?? review.projectTitle ?? review.analysis?.projectTitle ?? 'Unnamed project'),
    description: project?.description ?? null,
    status: String(project?.status ?? 'UNKNOWN')
  };
}

function normalizeReview(review: ApiReview): Review {
  const id = Number(review.id ?? review.reviewId);

  return {
    id,
    reviewId: Number(review.reviewId ?? id),
    reviewer: review.reviewer,
    comment: review.comment ?? null,
    score: review.score === null || review.score === undefined ? null : Number(review.score),
    status: (review.status ?? 'PENDING') as ReviewStatus,
    findingKey: review.findingKey ?? null,
    analysis: normalizeAnalysis(review),
    project: normalizeProject(review),
    createdAt: String(review.createdAt ?? ''),
    updatedAt: String(review.updatedAt ?? review.createdAt ?? '')
  };
}

function normalizeReviewPage(page: PagedResponse<ApiReview>) {
  return {
    ...page,
    content: page.content.map(normalizeReview)
  } satisfies PagedResponse<Review>;
}

export const adminReviewService = {
  async getReviews(params: ReviewQueryParams) {
    const response = await apiClient.get<PagedResponse<ApiReview>>('/api/reviews', {
      params: removeEmptyValues(params)
    });

    return normalizeReviewPage(response.data);
  },

  async getReviewById(id: number) {
    const response = await apiClient.get<ApiReview>(`/api/reviews/${id}`);
    return normalizeReview(response.data);
  },

  async getReviewsByProjectId(projectId: number) {
    const response = await apiClient.get<ApiReview[]>(`/api/reviews/project/${projectId}`);
    return response.data.map(normalizeReview);
  },

  async getReviewsByAnalysisId(analysisId: number) {
    const response = await apiClient.get<ApiReview[]>(`/api/reviews/analysis/${analysisId}`);
    return response.data.map(normalizeReview);
  },

  async createReview(payload: CreateReviewPayload) {
    const response = await apiClient.post<ApiReview>('/api/reviews', payload);
    return normalizeReview(response.data);
  },

  async updateReview(id: number, payload: UpdateReviewPayload) {
    const response = await apiClient.put<ApiReview>(`/api/reviews/${id}`, payload);
    return normalizeReview(response.data);
  },

  async deleteReview(id: number) {
    await apiClient.delete(`/api/reviews/${id}`);
  }
};
