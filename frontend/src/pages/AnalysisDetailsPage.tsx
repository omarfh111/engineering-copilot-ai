import { ArrowLeft, Boxes, PencilLine, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnalysisFormModal } from '../components/analysis/AnalysisFormModal';
import { DeleteAnalysisDialog } from '../components/analysis/DeleteAnalysisDialog';
import { ImpactAnalysisModal } from '../components/analysis/ImpactAnalysisModal';
import { ReviewDecisionModal } from '../components/analysis/ReviewDecisionModal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage } from '../lib/api';
import { formatEnumLabel, getStatusTone } from '../lib/analysis';
import { formatDate } from '../lib/formatters';
import { adminAnalysisService } from '../services/adminAnalysisService';
import { adminReviewService } from '../services/adminReviewService';
import { adminProjectService } from '../services/adminProjectService';
import type { Analysis, AnalysisFinding, AnalysisProjectSummary, CreateAnalysisPayload, TodoProposal, UpdateAnalysisPayload } from '../types/analysis';
import type { ReviewStatus } from '../types/review';

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
  const [findings, setFindings] = useState<AnalysisFinding[]>([]);
  const [todoProposals, setTodoProposals] = useState<TodoProposal[]>([]);
  const [selectedProposalIds, setSelectedProposalIds] = useState<number[]>([]);
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, ReviewStatus>>({});
  const [reviewDecision, setReviewDecision] = useState<{ finding: AnalysisFinding; status: 'ACCEPTED' | 'REJECTED' } | null>(null);
  const [impactOpen, setImpactOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{ kind: 'TODO' } | { kind: 'KNOWLEDGE'; finding: AnalysisFinding } | null>(null);
  const [projects, setProjects] = useState<AnalysisProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const analysisId = Number(id);

  const canManageAnalyses = currentUser?.role === 'ADMIN' || currentUser?.role === 'QA';
  const canRunImpact = ['ADMIN', 'QA', 'ARCHITECT', 'DEVELOPER', 'AUDITOR'].includes(currentUser?.role ?? '');
  const canConfirmTodos = ['ADMIN', 'QA', 'MANAGER'].includes(currentUser?.role ?? '');
  const canReadReviews = ['ADMIN', 'MANAGER', 'QA', 'AUDITOR'].includes(currentUser?.role ?? '');
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
      setFindings(await adminAnalysisService.getFindings(analysisId));
      const proposals = canConfirmTodos ? await adminAnalysisService.getTodoProposals(analysisId) : [];
      setTodoProposals(proposals);
      setSelectedProposalIds(proposals.filter((proposal) => proposal.status === 'PENDING_CONFIRMATION').map((proposal) => proposal.id));
      const reviews = canReadReviews ? await adminReviewService.getReviewsByAnalysisId(analysisId) : [];
      setReviewStatuses(Object.fromEntries(reviews.filter((review) => review.findingKey).map((review) => [review.findingKey as string, review.status])));
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
  }, [analysisId, canConfirmTodos, canReadReviews]);

  useEffect(() => {
    void loadProjects();
  }, [canManageAnalyses]);

  useEffect(() => {
    if (!analysis || !['PENDING', 'RUNNING'].includes(analysis.status)) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      void adminAnalysisService.getAnalysisById(analysisId).then((updated) => {
        setAnalysis(updated);
        if (!['PENDING', 'RUNNING'].includes(updated.status)) {
          void loadAnalysis();
        }
      }).catch(() => {
        // The explicit reload action remains available if a background refresh fails.
      });
    }, 3000);
    return () => window.clearInterval(interval);
  }, [analysis, analysisId]);

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

  const reviewFinding = async (finding: AnalysisFinding, status: 'ACCEPTED' | 'REJECTED', comment: string) => {
    setSubmitting(true);
    try {
      await adminReviewService.createReview({ reviewer: '', comment, score: status === 'ACCEPTED' ? 100 : 0, status, analysisId, findingKey: finding.findingKey });
      setReviewStatuses((current) => ({ ...current, [finding.findingKey]: status }));
      const proposals = await adminAnalysisService.getTodoProposals(analysisId);
      setTodoProposals(proposals);
      setSelectedProposalIds(proposals.filter((proposal) => proposal.status === 'PENDING_CONFIRMATION').map((proposal) => proposal.id));
      setReviewDecision(null);
      showToast({ type: 'success', title: `Finding ${status.toLowerCase()}`, description: finding.title });
    } catch (reviewError) {
      showToast({ type: 'error', title: 'Review failed', description: getApiErrorMessage(reviewError) });
    } finally { setSubmitting(false); }
  };

  const prepareTodoConfirmation = () => {
    const pendingProposals = todoProposals.filter((proposal) => proposal.status === 'PENDING_CONFIRMATION' && selectedProposalIds.includes(proposal.id));
    if (!pendingProposals.length) { showToast({ type: 'info', title: 'No pending TODO proposals', description: 'Approve a finding before generating and confirming a TODO proposal.' }); return; }
    setConfirmation({ kind: 'TODO' });
  };

  const confirmTodoProposals = async () => {
    const pendingProposals = todoProposals.filter((proposal) => proposal.status === 'PENDING_CONFIRMATION' && selectedProposalIds.includes(proposal.id));
    if (!pendingProposals.length) return;
    setSubmitting(true);
    try { const created = await adminAnalysisService.confirmTodoProposals(analysisId, pendingProposals.map((proposal) => proposal.id)); showToast({ type: 'success', title: 'TODOs created', description: `${created} TODO item(s) were added.` }); const proposals = await adminAnalysisService.getTodoProposals(analysisId); setTodoProposals(proposals); setSelectedProposalIds([]); setConfirmation(null); }
    catch (error) { showToast({ type: 'error', title: 'TODO creation failed', description: getApiErrorMessage(error) }); }
    finally { setSubmitting(false); }
  };

  const publishFeedback = async (finding: AnalysisFinding) => {
    setSubmitting(true);
    try {
      await adminAnalysisService.publishApprovedFeedback(analysisId, finding.findingKey);
      showToast({ type: 'success', title: 'Feedback published', description: 'The approved feedback is now available in project knowledge.' }); setConfirmation(null);
    } catch (publishError) {
      showToast({ type: 'error', title: 'Feedback was not published', description: getApiErrorMessage(publishError) });
    } finally { setSubmitting(false); }
  };

  const requestImpactAnalysis = async (changeDescription: string, paths: string[]) => {
    if (!analysis?.repository) return;
    setSubmitting(true);
    try {
      const impact = await adminAnalysisService.runImpactAnalysis({
        projectId: analysis.project.id,
        repositoryId: analysis.repository.id,
        changeDescription, paths
      });
      showToast({ type: 'success', title: 'Impact analysis started', description: `${impact.title} is running. Its findings will be reviewable when complete.` });
      setImpactOpen(false); navigate(`/dashboard/analyses/${impact.id}`);
    } catch (impactError) {
      showToast({ type: 'error', title: 'Impact analysis failed to start', description: getApiErrorMessage(impactError) });
    } finally { setSubmitting(false); }
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
            {analysis.repository && canRunImpact ? <button className="rounded-2xl border border-brand-400/50 px-4 py-2 text-sm font-semibold text-brand-100" disabled={submitting} onClick={() => setImpactOpen(true)} type="button">Analyse impact</button> : null}
            {canConfirmTodos && selectedProposalIds.length ? <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" disabled={submitting} onClick={prepareTodoConfirmation} type="button">Confirm {selectedProposalIds.length} TODO proposal(s)</button> : null}
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
        {analysis.repository ? <DetailField label="Repository" value={`${analysis.repository.name} (${analysis.repository.branch})`} /> : null}
        {analysis.correlationId ? <DetailField label="Correlation ID" value={analysis.correlationId} /> : null}
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

      {analysis.agentResults ? (
        <section className="page-shell border-white/10 bg-slate-950/70">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Agent results</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {Object.entries(analysis.agentResults).map(([agent, rawResult]) => {
              const result = rawResult as { status?: string; summary?: string; findings?: unknown[]; errors?: string[]; duration_ms?: number; model_trace?: { provider?: string; model?: string } | null };
              return (
                <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-4" key={agent}>
                  <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-white">{formatEnumLabel(agent)}</h3><StatusBadge label={formatEnumLabel(result.status ?? 'PENDING')} tone={getStatusTone(result.status ?? 'PENDING')} /></div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{result.summary ?? 'No summary returned.'}</p>
                  <p className="mt-2 text-xs text-slate-500">{typeof result.duration_ms === 'number' ? `${(result.duration_ms / 1000).toFixed(2)}s` : 'Duration not available'}{result.model_trace?.model ? ` · ${result.model_trace.provider ?? 'model'} / ${result.model_trace.model}` : ''}</p>
                  <p className="mt-3 text-xs text-slate-400">{result.findings?.length ?? 0} finding(s){result.errors?.length ? ` · ${result.errors.length} error(s)` : ''}</p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {findings.length ? (
        <section className="page-shell border-white/10 bg-slate-950/70"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Reviewable findings</p><div className="mt-5 space-y-3">{findings.map((finding) => { const reviewStatus = reviewStatuses[finding.findingKey]; return <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-4" key={finding.id}><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-white">{finding.title}</h3><div className="flex gap-2"><StatusBadge label={formatEnumLabel(finding.severity)} tone={getStatusTone(finding.severity)} />{reviewStatus ? <StatusBadge label={formatEnumLabel(reviewStatus)} tone={getStatusTone(reviewStatus)} /> : null}</div></div><p className="mt-2 text-sm text-slate-300">{finding.evidence}</p>{finding.filePath ? <p className="mt-2 text-xs text-brand-200">{finding.filePath}{finding.lineStart ? `:${finding.lineStart}` : ''}</p> : null}{finding.recommendation ? <p className="mt-2 text-sm text-slate-400">Recommendation: {finding.recommendation}</p> : null}{canManageAnalyses ? <div className="mt-4 flex flex-wrap gap-2">{!reviewStatus ? <><button className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white" disabled={submitting} onClick={() => setReviewDecision({ finding, status: 'ACCEPTED' })} type="button">Approve</button><button className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-semibold text-white" disabled={submitting} onClick={() => setReviewDecision({ finding, status: 'REJECTED' })} type="button">Reject</button></> : null}{reviewStatus === 'ACCEPTED' ? <button className="rounded-xl border border-brand-300/50 px-3 py-2 text-xs font-semibold text-brand-100" disabled={submitting} onClick={() => setConfirmation({ kind: 'KNOWLEDGE', finding })} type="button">Publish to knowledge</button> : null}</div> : null}</article>; })}</div></section>
      ) : null}

      {todoProposals.length ? (
        <section className="page-shell border-white/10 bg-slate-950/70">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Generated TODO proposals</p>
          <p className="mt-2 text-sm text-slate-400">Review these IA suggestions before explicitly creating real TODO items.</p>
          <div className="mt-5 space-y-3">{todoProposals.map((proposal) => (
            <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-4" key={proposal.id}>
              <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3">{canConfirmTodos && proposal.status === 'PENDING_CONFIRMATION' ? <input aria-label={`Select ${proposal.title}`} checked={selectedProposalIds.includes(proposal.id)} className="h-4 w-4" onChange={(event) => setSelectedProposalIds((current) => event.target.checked ? [...current, proposal.id] : current.filter((id) => id !== proposal.id))} type="checkbox" /> : null}<h3 className="font-semibold text-white">{proposal.title}</h3></div><StatusBadge label={formatEnumLabel(proposal.status)} tone={getStatusTone(proposal.status)} /></div>
              <p className="mt-2 text-sm text-slate-300">{proposal.description || 'No description returned.'}</p>
              <p className="mt-2 text-xs text-brand-200">{formatEnumLabel(proposal.priority)}{proposal.filePath ? ` · ${proposal.filePath}${proposal.lineStart ? `:${proposal.lineStart}` : ''}` : ''}</p>
            </article>
          ))}</div>
        </section>
      ) : null}

      <ReviewDecisionModal
        finding={reviewDecision?.finding ?? null}
        loading={submitting}
        onClose={() => setReviewDecision(null)}
        onSubmit={(comment) => reviewDecision && void reviewFinding(reviewDecision.finding, reviewDecision.status, comment)}
        status={reviewDecision?.status ?? null}
      />
      <ImpactAnalysisModal
        loading={submitting}
        onClose={() => setImpactOpen(false)}
        onSubmit={(changeDescription, paths) => void requestImpactAnalysis(changeDescription, paths)}
        open={impactOpen}
      />
      <ConfirmationDialog
        confirmLabel={confirmation?.kind === 'TODO' ? 'Create TODOs' : 'Publish feedback'}
        description={confirmation?.kind === 'TODO'
          ? `Create ${todoProposals.filter((proposal) => proposal.status === 'PENDING_CONFIRMATION' && selectedProposalIds.includes(proposal.id)).length} reviewed TODO item(s) from the selected persisted proposals?`
          : 'Publish this approved finding into the project knowledge base for future project-scoped RAG answers?'}
        loading={submitting}
        onClose={() => setConfirmation(null)}
        onConfirm={() => { if (confirmation?.kind === 'TODO') void confirmTodoProposals(); else if (confirmation?.kind === 'KNOWLEDGE') void publishFeedback(confirmation.finding); }}
        open={confirmation !== null}
        title={confirmation?.kind === 'TODO' ? 'Confirm TODO creation' : 'Publish approved feedback'}
      />

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
