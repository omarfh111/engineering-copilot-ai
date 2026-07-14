import { ArrowLeft, Boxes, PencilLine, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnalysisFormModal } from '../components/analysis/AnalysisFormModal';
import { DeleteAnalysisDialog } from '../components/analysis/DeleteAnalysisDialog';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage } from '../lib/api';
import { formatEnumLabel, getStatusTone } from '../lib/analysis';
import { formatDate } from '../lib/formatters';
import { adminAnalysisService } from '../services/adminAnalysisService';
import { adminProjectService } from '../services/adminProjectService';
import type { Analysis, AnalysisProjectSummary, CreateAnalysisPayload, UpdateAnalysisPayload } from '../types/analysis';

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-200">{value ?? 'Not provided'}</p>
    </div>
  );
}

export function AnalysisDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [projects, setProjects] = useState<AnalysisProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const analysisId = Number(id);

  const canManageAnalyses = currentUser?.role === 'ADMIN' || currentUser?.role === 'QA';
  const canDeleteAnalyses = currentUser?.role === 'ADMIN';

  const loadAnalysis = async () => {
    if (!Number.isFinite(analysisId)) {
      setError('The requested analysis id is invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      setAnalysis(await adminAnalysisService.getAnalysisById(analysisId));
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    if (!canManageAnalyses) {
      return;
    }

    setLoadingProjects(true);

    try {
      const response = await adminProjectService.getProjects({ page: 0, size: 100, sortBy: 'title', sortDirection: 'asc' });
      setProjects(response.content.map((project) => ({ id: project.id, title: project.title, description: project.description, status: project.status })));
    } catch (projectError) {
      showToast({ type: 'error', title: 'Unable to load projects', description: getApiErrorMessage(projectError) });
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    void loadAnalysis();
  }, [analysisId]);

  useEffect(() => {
    void loadProjects();
  }, [canManageAnalyses]);

  const handleEdit = async (payload: CreateAnalysisPayload | UpdateAnalysisPayload) => {
    if (!analysis) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedAnalysis = await adminAnalysisService.updateAnalysis(analysis.id, payload as UpdateAnalysisPayload);
      setAnalysis(updatedAnalysis);
      setEditOpen(false);
      showToast({ type: 'success', title: 'Analysis updated', description: `${updatedAnalysis.title} was updated successfully.` });
    } catch (updateError) {
      showToast({ type: 'error', title: 'Update failed', description: getApiErrorMessage(updateError) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!analysis) {
      return;
    }

    setSubmitting(true);

    try {
      await adminAnalysisService.deleteAnalysis(analysis.id);
      showToast({ type: 'success', title: 'Analysis deleted', description: `${analysis.title} has been removed.` });
      navigate('/dashboard/analyses');
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

  if (error || !analysis) {
    return <ErrorState actionLabel="Reload analysis" description={error ?? 'Unable to load the requested analysis.'} onAction={() => void loadAnalysis()} title="Analysis unavailable" />;
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
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Analysis details</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{analysis.title}</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge label={formatEnumLabel(analysis.status)} tone={getStatusTone(analysis.status)} />
                <StatusBadge label={formatEnumLabel(analysis.severity)} tone={getStatusTone(analysis.severity)} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {canManageAnalyses ? (
              <button className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500" onClick={() => setEditOpen(true)} type="button">
                <PencilLine className="h-4 w-4" />
                Edit
              </button>
            ) : null}
            {canDeleteAnalyses ? (
              <button className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500" onClick={() => setDeleteOpen(true)} type="button">
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailField label="Type" value={formatEnumLabel(analysis.analysisType)} />
        <DetailField label="Score" value={analysis.score} />
        <DetailField label="Project" value={analysis.project.title} />
        <DetailField label="Created" value={formatDate(analysis.createdAt)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="page-shell border-white/10 bg-slate-950/70">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Summary</p>
          <p className="mt-4 text-sm leading-7 text-slate-300">{analysis.summary || 'No summary provided yet.'}</p>
        </article>
        <article className="page-shell border-white/10 bg-slate-950/70">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Recommendation</p>
          <p className="mt-4 text-sm leading-7 text-slate-300">{analysis.recommendation || 'No recommendation provided yet.'}</p>
        </article>
      </section>

      {canManageAnalyses ? (
        <AnalysisFormModal
          analysis={analysis}
          loading={submitting}
          loadingProjects={loadingProjects}
          onClose={() => setEditOpen(false)}
          onSubmit={(payload) => void handleEdit(payload)}
          open={editOpen}
          projects={projects}
          subtitle="Update the analysis status, scoring, recommendation, and project assignment."
          title="Edit analysis"
        />
      ) : null}

      {canDeleteAnalyses ? (
        <DeleteAnalysisDialog
          analysis={analysis}
          loading={submitting}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => void handleDelete()}
          open={deleteOpen}
        />
      ) : null}
    </div>
  );
}
