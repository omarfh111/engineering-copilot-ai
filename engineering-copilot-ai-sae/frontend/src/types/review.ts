import type { AnalysisType } from './analysis';

export type ReviewStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ReviewStatusFilter = ReviewStatus | '';

export interface ReviewAnalysisSummary {
  id: number;
  analysisId: number;
  type: AnalysisType | string | null;
  status: string | null;
  summary: string | null;
  projectId: number | null;
  projectTitle: string | null;
}

export interface ReviewProjectSummary {
  id: number;
  title: string;
  description: string | null;
  status: string;
}

export interface Review {
  id: number;
  reviewId: number;
  reviewer: string;
  comment: string | null;
  score: number | null;
  status: ReviewStatus;
  analysis: ReviewAnalysisSummary | null;
  project: ReviewProjectSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewQueryParams {
  search?: string;
  status?: ReviewStatusFilter;
  analysisId?: number | '';
  projectId?: number | '';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CreateReviewPayload {
  reviewer: string;
  comment: string;
  score: number;
  status?: ReviewStatus;
  analysisId: number;
}

export interface UpdateReviewPayload {
  reviewer: string;
  comment: string;
  score: number;
  status: ReviewStatus;
  analysisId: number;
}
